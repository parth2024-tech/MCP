const fs = require('fs').promises;
const path = require('path');
const Database = require('better-sqlite3');
const hnswlib = require('hnswlib-node');
const { withRetry } = require('../utils/retry');
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

const DB_PATH = path.join(__dirname, 'memory.db');
const EMBEDDING_DIMENSIONS = 384;

class MemoryService {
  constructor(workerPool) {
    this.workerPool = workerPool;
    this.db = new Database(DB_PATH);
    
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    this._hnsw = null;
    this._idToRow = new Map();
    this._nextId = 0;
    
    this._initDb();
  }

  _initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL
      )
    `);
    this._rebuildHnswIndex();
  }

  _rebuildHnswIndex() {
    const rows = this.db.prepare('SELECT id, timestamp, event_type, content, embedding FROM episodic_memory').all();
    this._idToRow.clear();
    this._nextId = 0;

    const maxElements = Math.max(rows.length + 1000, 2000);
    this._hnsw = new hnswlib.HierarchicalNSW('cosine', EMBEDDING_DIMENSIONS);
    this._hnsw.initIndex(maxElements);

    for (const row of rows) {
      const internalId = this._nextId++;
      this._idToRow.set(internalId, {
        dbId: row.id,
        timestamp: row.timestamp,
        event_type: row.event_type,
        content: row.content
      });
      
      const embBuffer = row.embedding;
      const embArray = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, embBuffer.byteLength / 4);
      this._hnsw.addPoint(Array.from(embArray), internalId);
    }
    logger.info('MemoryService', `Loaded ${rows.length} episodic memories into HNSW index.`);
  }

  async remember(eventType, content) {
    const textToEmbed = `[${eventType}] ${content}`;
    let embeddingArray;
    
    try {
      embeddingArray = await withRetry(
        () => this.workerPool.generateEmbeddingForeground(textToEmbed),
        { attempts: 3, baseMs: 300, tag: 'MemoryService/Embed' }
      );
    } catch (err) {
      logger.error('MemoryService', `Failed to generate embedding: ${err.message}`);
      throw new Error('Embedding generation failed for memory.');
    }

    const floats = new Float32Array(embeddingArray.buffer || embeddingArray);
    const embeddingBlob = Buffer.from(floats.buffer);
    const timestamp = new Date().toISOString();

    const result = this.db.prepare(`
      INSERT INTO episodic_memory (timestamp, event_type, content, embedding)
      VALUES (?, ?, ?, ?)
    `).run(timestamp, eventType, content, embeddingBlob);

    // Update in-memory index
    const internalId = this._nextId++;
    const currentMax = this._hnsw.getMaxElements();
    if (this._nextId >= currentMax) {
      this._hnsw.resizeIndex(currentMax + 1000);
    }

    this._hnsw.addPoint(Array.from(floats), internalId);
    this._idToRow.set(internalId, {
      dbId: result.lastInsertRowid,
      timestamp,
      event_type: eventType,
      content
    });

    metrics.increment('memory.stored', { type: eventType });
    logger.info('MemoryService', `Remembered new episode: [${eventType}]`);
    return result.lastInsertRowid;
  }

  /**
   * Recall memories semantically similar to the query.
   * @param {string} query - Natural language search query
   * @param {number} [limit=5] - Maximum number of results
   * @param {number} [similarityThreshold=0.4] - Minimum similarity score (0.0–1.0); memories below this are excluded
   * @returns {Promise<object[]>}
   */
  async recall(query, limit = 5, similarityThreshold = 0.4) {
    if (this._nextId === 0) return [];

    metrics.increment('memory.recalled');

    let queryEmbedding;
    try {
      queryEmbedding = await withRetry(
        () => this.workerPool.generateEmbeddingForeground(query),
        { attempts: 3, baseMs: 300, tag: 'MemoryService/Recall' }
      );
    } catch (err) {
      logger.error('MemoryService', `Failed to embed recall query: ${err.message}`);
      throw new Error('Embedding generation failed for recall query.');
    }

    // Convert similarity threshold to HNSW distance threshold (distance = 1 - similarity)
    const distanceThreshold = 1 - Math.max(0, Math.min(1, similarityThreshold));

    const floats = new Float32Array(queryEmbedding.buffer || queryEmbedding);
    const searchLimit = Math.min(limit, this._nextId);
    const result = this._hnsw.searchKnn(Array.from(floats), searchLimit);

    const memories = [];
    for (let i = 0; i < result.neighbors.length; i++) {
      const id = result.neighbors[i];
      const distance = result.distances[i];
      const row = this._idToRow.get(id);

      if (distance < distanceThreshold) {
        memories.push({
          id: row.dbId,
          timestamp: row.timestamp,
          event_type: row.event_type,
          content: row.content,
          relevance: (1 - distance).toFixed(4)
        });
      }
    }

    return memories;
  }
}

module.exports = MemoryService;
