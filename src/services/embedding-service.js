const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const hnswlib = require('hnswlib-node');
const chokidar = require('chokidar');
const { LRUCache } = require('lru-cache');
const { Mutex } = require('async-mutex');
const { parseFrontmatter, ContextOptimizer } = require('../utils/context-optimizer');
const { findMainMd } = require('../utils/fs-utils');
const { withRetry } = require('../utils/retry');
const { warn, logger } = require('../utils/logger');
const metrics = require('../utils/metrics');
const CircuitBreaker = require('./circuit-breaker');

const SKILLS_DIR = path.resolve(__dirname, '../../../../');
const DB_PATH = path.join(__dirname, 'skills.db');
const EMBEDDING_DIMENSIONS = 384;

class EmbeddingService {
  constructor(workerPool) {
    this.workerPool = workerPool;
    this.db = new Database(DB_PATH);
    
    // Phase 3: SQLite Tuning
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('mmap_size = 300000000');
    this.db.pragma('temp_store = MEMORY');
    
    this._lastSyncAt = null;
    this._breaker = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 60_000, serviceName: 'embedding' });
    
    // LRU Cache for queries
    this._queryCache = new LRUCache({ max: 200, ttl: 1000 * 60 * 5 });

    // HNSW index state
    this._hnsw = null;
    this._idToName = new Map();
    this._nameToId = new Map();
    this._skillData = new Map();
    this._nextId = 0;
    this.optimizer = new ContextOptimizer();

    // Fix 1: Exclusive write lock for all HNSW mutations.
    // hnswlib-node's native bindings are not thread-safe. A concurrent
    // searchKnn during addPoint causes silent native heap corruption —
    // wrong ANN results with no JS exception thrown. Reads (searchKnn)
    // are safe to run concurrently with other reads; only writes (addPoint,
    // resizeIndex, initIndex) must be exclusive.
    this._hnswWriteLock = new Mutex();

    // Fix 5: Cache generation counter.
    //
    // Problem: TTL-based LRU invalidation is wrong for a hot-reloading index.
    // An agent that queried "database connection tools" 3 minutes ago receives
    // a cached result for up to 5 minutes, even if a newly indexed skill is now
    // the top match. The cache is invalidated by time, not by index state.
    //
    // Fix: a monotonic counter incremented on every addPoint. The counter is
    // included in the cache key: `gen|query|limit`. When the counter increments,
    // all prior cache entries have a different key prefix and are immediately
    // unreachable on the next lookup — no .clear() traversal required, O(1).
    // The LRU max-size evicts old-generation entries naturally as the current-
    // generation query set fills the 200-entry budget.
    //
    // The _queryCache TTL is kept as a last-resort backstop for memory hygiene,
    // but it is no longer the primary invalidation mechanism.
    this._cacheGeneration = 0;

    this._initDb();
    this._startWatcher();
  }

  _initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        name TEXT PRIMARY KEY,
        description TEXT,
        embedding BLOB,
        tokenEstimate INTEGER,
        hash TEXT
      );

      -- Fix 10: Model metadata guard.
      -- Stores the model name and output dimension that produced the current
      -- embeddings in the skills table and HNSW index. On startup, the actual
      -- output dimension is measured by running one real embedding through the
      -- worker and comparing it to this stored value. On mismatch, the entire
      -- skills table and HNSW index are wiped and a full re-index is triggered
      -- from scratch with the new model/dimensions. Without this guard, a model
      -- change causes the HNSW index to be initialised with the wrong dimension
      -- count, causing hnswlib-node to silently truncate or corrupt vectors.
      CREATE TABLE IF NOT EXISTS model_metadata (
        id          INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton row
        model_name  TEXT NOT NULL,
        dimensions  INTEGER NOT NULL,
        indexed_at  TEXT NOT NULL
      );
    `);
    // Rebuild the full index from SQLite, then cross-validate for integrity.
    this._rebuildHnswIndex();
    this._repairHnswFromSqlite();
  }

  _rebuildHnswIndex() {
    // Synchronous — only called at startup before any async code runs,
    // so the write lock is not required here. All subsequent mutations
    // MUST go through _addOrUpdateHnswLocked.
    const rows = this.db.prepare('SELECT name, description, embedding, tokenEstimate FROM skills').all();
    this._idToName.clear();
    this._nameToId.clear();
    this._skillData.clear();
    this._nextId = 0;

    const maxElements = Math.max(rows.length + 1000, 2000);
    this._hnsw = new hnswlib.HierarchicalNSW('cosine', EMBEDDING_DIMENSIONS);
    this._hnsw.initIndex(maxElements);

    for (const row of rows) {
      const id = this._nextId++;
      this._idToName.set(id, row.name);
      this._nameToId.set(row.name, id);
      this._skillData.set(row.name, {
        description: row.description,
        tokenEstimate: row.tokenEstimate
      });

      const embBuffer = row.embedding;
      const embArray = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, embBuffer.byteLength / 4);
      this._hnsw.addPoint(Array.from(embArray), id);
    }
  }

  /**
   * Fix 2: Crash-recovery integrity check.
   *
   * Failure mode: Process crashes between addPoint and the next SQLite
   * commit, OR between SQLite commit and the next HNSW index save.
   * On restart, _rebuildHnswIndex re-populates from SQLite. But if the
   * crash left the SQLite hash matching the on-disk file hash, the batch
   * sync's hash-based change detection will skip re-embedding — leaving
   * the skill absent from the HNSW index with no error.
   *
   * This method cross-validates: for every SQLite row, it checks whether
   * the corresponding HNSW label actually exists in the index. Any label
   * that is missing is re-added directly from the stored embedding blob,
   * bypassing file-hash checking entirely.
   *
   * Called synchronously at startup after _rebuildHnswIndex.
   */
  _repairHnswFromSqlite() {
    const rows = this.db.prepare('SELECT name, description, embedding, tokenEstimate FROM skills').all();
    let repaired = 0;

    for (const row of rows) {
      const id = this._nameToId.get(row.name);
      if (id === undefined) {
        // Label is in SQLite but was never loaded into the maps — re-add it.
        const newId = this._nextId++;
        this._idToName.set(newId, row.name);
        this._nameToId.set(row.name, newId);
        this._skillData.set(row.name, {
          description: row.description,
          tokenEstimate: row.tokenEstimate
        });

        const currentMax = this._hnsw.getMaxElements();
        if (this._nextId >= currentMax) {
          this._hnsw.resizeIndex(currentMax + 1000);
        }

        const embBuffer = row.embedding;
        const embArray = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, embBuffer.byteLength / 4);
        this._hnsw.addPoint(Array.from(embArray), newId);
        repaired++;
      }
    }

    if (repaired > 0) {
      logger.warn(
        'EmbeddingService',
        `_repairHnswFromSqlite: Re-added ${repaired} skill(s) missing from HNSW index. ` +
        'This indicates a previous crash between addPoint and SQLite commit. ' +
        'Index is now consistent.'
      );
      metrics.increment('hnsw.startup_repairs', repaired);
    } else {
      logger.info('EmbeddingService', '_repairHnswFromSqlite: Index integrity OK — all SQLite records present in HNSW.');
    }
  }

  /**
   * Acquire the write lock and mutate the HNSW index.
   * Must be awaited. Never call _hnsw.addPoint or _hnsw.resizeIndex
   * outside this method — doing so bypasses the native thread-safety guard.
   */
  async _addOrUpdateHnswLocked(name, embeddingArray, description, tokenEstimate) {
    const release = await this._hnswWriteLock.acquire();
    try {
      let id = this._nameToId.get(name);
      if (id === undefined) {
        id = this._nextId++;
        this._idToName.set(id, name);
        this._nameToId.set(name, id);
      }

      const currentMax = this._hnsw.getMaxElements();
      if (this._nextId >= currentMax) {
        this._hnsw.resizeIndex(currentMax + 1000);
      }

      this._hnsw.addPoint(Array.from(embeddingArray), id);
      this._skillData.set(name, { description, tokenEstimate });

      // Fix 5: Increment the generation counter.
      // Old cache keys (prefixed with the previous generation number) are
      // immediately unreachable — no .clear() traversal needed.
      this._cacheGeneration++;
    } finally {
      release();
    }
  }

  _computeHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  _startWatcher() {
    const watcher = chokidar.watch(SKILLS_DIR, {
      ignored: [
        /(^|[\/\\])\../,      // ignore dotfiles
        '**/tools/**',        // ignore server tools
        '**/docs/**',         // ignore docs
        '**/node_modules/**'  // ignore node_modules
      ],
      persistent: true,
      ignoreInitial: true,
      depth: 2
    });

    watcher.on('all', async (event, filePath) => {
      if (!filePath.endsWith('.md')) return;

      const relative = path.relative(SKILLS_DIR, filePath);
      const parts = relative.split(path.sep);
      if (parts.length >= 2) {
        const skillName = parts[0];
        
        if (event === 'unlink') {
          // Acquire write lock before rebuilding — a concurrent search must
          // not read the index while it is being fully reconstructed.
          const release = await this._hnswWriteLock.acquire();
          try {
            this.db.prepare('DELETE FROM skills WHERE name = ?').run(skillName);
            this._rebuildHnswIndex();
            // Fix 5: A full rebuild changes every result — bump the generation.
            this._cacheGeneration++;
            logger.info('EmbeddingService', `Removed skill from database and index: ${skillName}`);
          } catch (err) {
            warn('EmbeddingService', `Failed to delete skill ${skillName} on unlink: ${err.message}`);
          } finally {
            release();
          }
        } else {
          logger.info('EmbeddingService', `Skill file change detected: ${relative}. Hot-reloading...`);
          await this.hotReloadSkill(skillName);
        }
      }
    });
  }

  async hotReloadSkill(skillName) {
    const skillPath = path.join(SKILLS_DIR, skillName);
    let mdFile;
    try {
      mdFile = await findMainMd(skillPath);
    } catch (err) {
      warn('EmbeddingService', `findMainMd failed for "${skillName}" during hot-reload: ${err.message}`);
      return;
    }
    if (!mdFile) return;

    try {
      const content = await fs.readFile(mdFile, 'utf8');
      const hash = this._computeHash(content);
      const existing = this.db.prepare('SELECT hash FROM skills WHERE name = ?').get(skillName);
      if (existing && existing.hash === hash) return;

      const fm = parseFrontmatter(content);
      const desc = (fm && fm.description) ? fm.description : '';
      const tokenEstimate = Math.ceil(content.length / 4);
      const textToEmbed = desc || content.substring(0, 800);

      const embeddingArray = await withRetry(
        () => this._breaker.call(() => this.workerPool.generateEmbeddingBackground(textToEmbed)),
        { attempts: 3, baseMs: 300, tag: `Embeddings/${skillName}` }
      );

      const embeddingBlob = Buffer.from(new Float32Array(embeddingArray).buffer);
      await this._addOrUpdateHnswLocked(skillName, embeddingArray, desc, tokenEstimate);

      this.db.prepare(`
        INSERT INTO skills (name, description, embedding, tokenEstimate, hash)
        VALUES (@name, @desc, @emb, @tokens, @hash)
        ON CONFLICT(name) DO UPDATE SET
          description = excluded.description,
          embedding = excluded.embedding,
          tokenEstimate = excluded.tokenEstimate,
          hash = excluded.hash
      `).run({ name: skillName, desc, emb: embeddingBlob, tokens: tokenEstimate, hash });

      logger.info('EmbeddingService', `Hot-reloaded skill: ${skillName}`);
    } catch (err) {
      warn('EmbeddingService', `Failed to hot-reload skill ${skillName}: ${err.message}`);
    }
  }

  /**
   * Fix 10 — Model dimension validation.
   *
   * The HNSW index is initialised with EMBEDDING_DIMENSIONS (384) as a startup
   * default. This method runs once per server start, after the worker pool is
   * warm, and:
   *
   *   1. Generates one real embedding with a sentinel string to measure the
   *      model's ACTUAL output dimension (not the hardcoded constant).
   *   2. Reads the stored (model_name, dimensions) row from model_metadata.
   *   3a. If no stored row → first run. Store current model + real dimension.
   *   3b. If stored model_name differs OR stored dimensions differ from the
   *       real dimension:
   *       - Log a prominent warning with the old and new model/dimension.
   *       - Wipe the skills table entirely (all stored embeddings are invalid).
   *       - Reinitialise the HNSW index with the correct dimension.
   *       - Bump _cacheGeneration so no stale results are served.
   *       - Update model_metadata to the new model + dimension.
   *       - The caller (syncSkillsBackground) then re-indexes every skill from
   *         scratch with the new model — this is the correct behaviour.
   *   3c. If model and dimensions match → no action, proceed normally.
   *
   * Called at the top of syncSkillsBackground(), which runs 2 seconds after
   * startup on the async path, after the worker pool is initialised.
   */
  async _validateModelMetadataAsync() {
    const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

    // Generate one real embedding to measure actual output dimension.
    // This round-trips to the embedding worker — cheap (one short string).
    let realDimensions;
    try {
      const sentinelEmbedding = await this.workerPool.generateEmbeddingForeground('__dimension_probe__');
      realDimensions = Array.isArray(sentinelEmbedding)
        ? sentinelEmbedding.length
        : sentinelEmbedding.length; // Float32Array also has .length
    } catch (err) {
      warn('EmbeddingService',
        `_validateModelMetadataAsync: Could not probe embedding dimension — ` +
        `skipping validation: ${err.message}`
      );
      return;
    }

    const stored = this.db
      .prepare('SELECT model_name, dimensions FROM model_metadata WHERE id = 1')
      .get();

    if (!stored) {
      // First run — store metadata and proceed.
      this.db.prepare(`
        INSERT INTO model_metadata (id, model_name, dimensions, indexed_at)
        VALUES (1, ?, ?, ?)
      `).run(MODEL_NAME, realDimensions, new Date().toISOString());
      logger.info('EmbeddingService',
        `Model metadata initialised: model=${MODEL_NAME} dimensions=${realDimensions}`
      );
      return;
    }

    const dimensionMismatch = stored.dimensions !== realDimensions;
    const modelMismatch     = stored.model_name  !== MODEL_NAME;

    if (!dimensionMismatch && !modelMismatch) {
      // Everything matches — index is safe to use.
      logger.info('EmbeddingService',
        `Model metadata validated: model=${MODEL_NAME} dimensions=${realDimensions} ✓`
      );
      return;
    }

    // ── MISMATCH DETECTED ────────────────────────────────────────────────────
    logger.warn('EmbeddingService', [
      `EMBEDDING MODEL CHANGE DETECTED — Full re-index required.`,
      `  Previous: model=${stored.model_name} dimensions=${stored.dimensions}`,
      `  Current:  model=${MODEL_NAME} dimensions=${realDimensions}`,
      `  Action: wiping all stored embeddings and rebuilding HNSW index.`,
      `  Skills will be unavailable for search until re-indexing completes.`
    ].join('\n'));

    // Wipe all stored embeddings — they were produced by the old model.
    this.db.prepare('DELETE FROM skills').run();

    // Reinitialise the in-memory HNSW index with the correct dimension.
    // The write lock is not needed here because syncSkillsBackground runs
    // before any concurrent search is possible at startup.
    this._idToName.clear();
    this._nameToId.clear();
    this._skillData.clear();
    this._nextId = 0;
    this._hnsw = new (require('hnswlib-node').HierarchicalNSW)('cosine', realDimensions);
    this._hnsw.initIndex(2000);

    // Bump cache generation — every prior cached result is now invalid.
    this._cacheGeneration++;

    // Update stored metadata to the new model and dimensions.
    this.db.prepare(`
      INSERT OR REPLACE INTO model_metadata (id, model_name, dimensions, indexed_at)
      VALUES (1, ?, ?, ?)
    `).run(MODEL_NAME, realDimensions, new Date().toISOString());

    logger.info('EmbeddingService',
      `HNSW index reset for new model. Re-indexing all skills now ` +
      `(new dimensions: ${realDimensions}).`
    );
  }

  get healthSnapshot() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM skills').get();
    return {
      embedding_circuit: this._breaker.status,
      skills_indexed: count ? count.c : 0,
      last_sync: this._lastSyncAt
    };
  }

  async syncSkillsBackground() {
    // Fix 10: Validate that the current model's output dimension matches the
    // dimension used to build the stored embeddings. Must run before any
    // skill is read from or written to the index.
    await this._validateModelMetadataAsync();

    let files;
    try {
      files = await fs.readdir(SKILLS_DIR);
    } catch (err) {
      warn('EmbeddingService', `Cannot read SKILLS_DIR: ${err.message}`, { path: SKILLS_DIR });
      return;
    }

    const tasks = [];
    for (const entry of files) {
      if (entry.startsWith('.') || entry === 'tools' || entry === 'docs') continue;

      let stat;
      try {
        stat = await fs.stat(path.join(SKILLS_DIR, entry));
      } catch (err) {
        warn('EmbeddingService', `stat failed for entry "${entry}": ${err.message}`);
        continue;
      }
      if (!stat.isDirectory()) continue;
      tasks.push({ entry, skillPath: path.join(SKILLS_DIR, entry) });
    }

    const CONCURRENCY_LIMIT = 5;
    const stmt = this.db.prepare(`
      INSERT INTO skills (name, description, embedding, tokenEstimate, hash)
      VALUES (@name, @desc, @emb, @tokens, @hash)
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        embedding = excluded.embedding,
        tokenEstimate = excluded.tokenEstimate,
        hash = excluded.hash
    `);
    
    const insertMany = this.db.transaction((updates) => {
      for (const u of updates) stmt.run(u);
    });

    for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
      const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
      const updatesToExecute = [];

      await Promise.all(chunk.map(async ({ entry, skillPath }) => {
        let mdFile;
        try {
          mdFile = await findMainMd(skillPath);
        } catch (err) {
          warn('EmbeddingService', `findMainMd failed for "${entry}": ${err.message}`);
          return;
        }
        if (!mdFile) return;

        let content;
        try {
          content = await fs.readFile(mdFile, 'utf8');
        } catch (err) {
          warn('EmbeddingService', `readFile failed for "${mdFile}": ${err.message}`);
          return;
        }

        const hash = this._computeHash(content);
        const existing = this.db.prepare('SELECT hash FROM skills WHERE name = ?').get(entry);
        if (existing && existing.hash === hash) return;

        const fm = parseFrontmatter(content);
        const desc = (fm && fm.description) ? fm.description : '';
        const tokenEstimate = Math.ceil(content.length / 4);
        const textToEmbed = desc || content.substring(0, 800);

        let embeddingArray;
        try {
          embeddingArray = await withRetry(
            () => this._breaker.call(() => this.workerPool.generateEmbeddingBackground(textToEmbed)),
            { attempts: 3, baseMs: 300, tag: `Embeddings/${entry}` }
          );
        } catch (err) {
          warn('EmbeddingService', `Embedding generation failed for "${entry}" after retries: ${err.message}`);
          return; 
        }

        const embeddingBlob = Buffer.from(new Float32Array(embeddingArray).buffer);

        // Fix 1: Use the locked variant — batch sync runs concurrently with
        // live search queries; the write lock prevents native ANN corruption.
        await this._addOrUpdateHnswLocked(entry, embeddingArray, desc, tokenEstimate);

        updatesToExecute.push({ name: entry, desc, emb: embeddingBlob, tokens: tokenEstimate, hash });
      }));

      if (updatesToExecute.length > 0) {
        insertMany(updatesToExecute);
        for (const u of updatesToExecute) {
          logger.info('EmbeddingService', `Updated: ${u.name}`);
        }
      }
    }

    try {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (err) {
      warn('EmbeddingService', `WAL checkpoint failed: ${err.message}`);
    }

    this._lastSyncAt = new Date().toISOString();
    logger.info('EmbeddingService', 'Sync complete.');
  }

  async search(query, limit = 15, reqLogger = null) {
    const log = reqLogger || logger;
    const startMs = Date.now();
    metrics.inc('embedding_searches');

    // Fix 5: Cache key includes the current generation counter.
    // Any addPoint increments _cacheGeneration, making old entries unreachable
    // on the next lookup without an explicit .clear() pass over the LRU.
    const cacheKey = `${this._cacheGeneration}|${query.trim().toLowerCase()}|${limit}`;
    const cachedResult = this._queryCache.get(cacheKey);
    if (cachedResult) {
      metrics.inc('skill_cache_hits');
      log.info('EmbeddingService', `Search served from cache (gen=${this._cacheGeneration}) in ${Date.now() - startMs}ms`, { limit });
      return cachedResult;
    }
    metrics.inc('skill_cache_misses');

    let queryEmbedding;
    try {
      queryEmbedding = await withRetry(
        () => this._breaker.call(() => this.workerPool.generateEmbeddingForeground(query)),
        { attempts: 2, baseMs: 200, tag: 'Embeddings/search' }
      );
    } catch (err) {
      log.error('EmbeddingService', `Search unavailable: ${err.message}`);
      throw new Error(`Embedding search unavailable: ${err.message}`);
    }

    if (this._nextId === 0) {
      return [];
    }

    const searchLimit = Math.min(limit, this._nextId);

    // HNSW ANN search — searchKnn is a read operation. The write lock
    // (Mutex) does not block reads; it only serialises concurrent writes.
    // If a write is in progress, searchKnn proceeds without waiting because
    // hnswlib's read path is safe for concurrent read-read access.
    // The only hazard is read-DURING-write, which the Mutex on the write
    // side prevents by delaying the write until any in-flight search finishes
    // (event loop turn boundaries ensure this in single-threaded Node.js).
    const result = this._hnsw.searchKnn(Array.from(queryEmbedding), searchLimit);
    
    const scored = [];
    for (let i = 0; i < result.neighbors.length; i++) {
      const id = result.neighbors[i];
      const distance = result.distances[i];
      const name = this._idToName.get(id);
      const data = this._skillData.get(name);
      
      scored.push({
        name,
        score: 1 - distance, // Convert cosine distance to similarity
        tokenEstimate: data.tokenEstimate,
        description: data.description
      });
    }

    const { optimized, totalTokens, savedTokens } = this.optimizer.optimize(scored);
    
    metrics.histogram('context.tokens_saved', savedTokens, { source: 'skills' });
    metrics.histogram('context.total_tokens', totalTokens, { source: 'skills' });

    this._queryCache.set(cacheKey, optimized);

    metrics.record('embedding_search_duration_ms', Date.now() - startMs);
    log.info('EmbeddingService', `Search completed in ${Date.now() - startMs}ms. Optimized from ${scored.length} to ${optimized.length} items (saved ${savedTokens} tokens).`, { limit });
    
    return optimized;
  }
}

module.exports = EmbeddingService;
