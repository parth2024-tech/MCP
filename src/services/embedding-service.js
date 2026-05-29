const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const hnswlib = require('hnswlib-node');
const { LRUCache } = require('lru-cache');
const { parseFrontmatter } = require('./context-budget');
const { findMainMd } = require('../utils/fs-utils');
const { withRetry } = require('../utils/retry');
const { warn, logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

const SKILLS_DIR = path.resolve(__dirname, '../../../../');
const DB_PATH = path.join(__dirname, 'skills.db');
const EMBEDDING_DIMENSIONS = 384;

// ─────────────────────────────────────────────────────────────
// Circuit Breaker
// ─────────────────────────────────────────────────────────────
class CircuitBreaker {
  constructor({ failureThreshold = 3, recoveryMs = 60000 } = {}) {
    this.failureThreshold = failureThreshold;
    this.recoveryMs = recoveryMs;
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  get status() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null
    };
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt >= this.recoveryMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('CircuitBreaker OPEN — embedding worker unavailable');
      }
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (err) {
      this._onFailure(err);
      throw err;
    }
  }

  _onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.openedAt = null;
  }

  _onFailure(err) {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      warn('CircuitBreaker', `Embedding worker circuit OPENED after ${this.failureCount} failures. Will retry in ${this.recoveryMs / 1000}s.`, { error: err.message });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// EmbeddingService
// ─────────────────────────────────────────────────────────────
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
    this._breaker = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 60000 });
    
    // LRU Cache for queries
    this._queryCache = new LRUCache({ max: 200, ttl: 1000 * 60 * 5 });

    // HNSW index state
    this._hnsw = null;
    this._idToName = new Map();
    this._nameToId = new Map();
    this._skillData = new Map();
    this._nextId = 0;

    this._initDb();
  }

  _initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        name TEXT PRIMARY KEY,
        description TEXT,
        embedding BLOB,
        tokenEstimate INTEGER,
        hash TEXT
      )
    `);
    this._rebuildHnswIndex();
  }

  _rebuildHnswIndex() {
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

  _addOrUpdateHnsw(name, embeddingArray, description, tokenEstimate) {
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
    
    // Invalidate caches when index updates
    this._queryCache.clear();
  }

  _computeHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
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
        
        // HNSW incremental patch
        this._addOrUpdateHnsw(entry, embeddingArray, desc, tokenEstimate);
        
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

  async search(query, limit = 3, reqLogger = null) {
    const log = reqLogger || logger;
    const startMs = Date.now();
    metrics.inc('embedding_searches');

    // LRU Cache Check
    const cacheKey = query.trim().toLowerCase() + '|' + limit;
    const cachedResult = this._queryCache.get(cacheKey);
    if (cachedResult) {
      metrics.inc('skill_cache_hits');
      log.info('EmbeddingService', `Search served from cache in ${Date.now() - startMs}ms`, { limit });
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
    
    // HNSW Sub-millisecond ANN search
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

    this._queryCache.set(cacheKey, scored);

    metrics.record('embedding_search_duration_ms', Date.now() - startMs);
    log.info('EmbeddingService', `Search completed in ${Date.now() - startMs}ms via HNSW`, { limit });
    
    return scored;
  }
}

module.exports = EmbeddingService;
