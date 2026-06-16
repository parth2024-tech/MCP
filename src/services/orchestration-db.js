/**
 * orchestration-db.js — Autonomous Multi-Agent Orchestration Database
 *
 * Manages the SQLite database for:
 *   - Task graph (DAG with dependency resolution)
 *   - Shared memory (namespaced, versioned, TTL-aware)
 *   - File locks (exclusive/shared with auto-expiry)
 *   - Event bus (subscribe/poll)
 *   - Agent registry (heartbeat + dead agent recovery)
 *
 * Uses a SEPARATE database file (orchestration.db) from session_state.db
 * to avoid schema collisions. Lazy-initialized — zero startup cost if
 * orchestration tools are never called.
 */

'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { logger } = require('../utils/logger');

let _instance = null;

class OrchestrationDB {
  constructor() {
    const dbPath = process.env.ASE_ORCHESTRATION_DB
      || path.join(__dirname, 'orchestration.db');
    this.db = new Database(dbPath);

    // Performance pragmas (matches existing ASE pattern)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this._initSchema();
    logger.info('OrchestrationDB', `Initialized at ${dbPath}`);
  }

  /**
   * Get the singleton instance. Creates DB lazily on first access.
   */
  static getInstance() {
    if (!_instance) {
      _instance = new OrchestrationDB();
    }
    return _instance;
  }

  /**
   * Get the raw better-sqlite3 Database handle.
   */
  getDB() {
    return this.db;
  }

  _initSchema() {
    this.db.exec(`
      -- ═══════════════════════════════════════════════════════════
      -- Task Graph
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS tasks (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending','claimed','running','blocked','completed','failed')),
        assigned_to   TEXT,
        depends_on    TEXT,            -- JSON array of upstream task IDs (denormalized for reads)
        blocks        TEXT,            -- JSON array of downstream task IDs (denormalized for reads)
        skill_ids     TEXT,            -- JSON array of relevant skill IDs
        output        TEXT,            -- JSON structured output
        created_at    INTEGER DEFAULT (unixepoch()),
        claimed_at    INTEGER,
        completed_at  INTEGER,
        timeout_at    INTEGER
      );

      CREATE TABLE IF NOT EXISTS task_dependencies (
        upstream_task_id   TEXT NOT NULL,
        downstream_task_id TEXT NOT NULL,
        PRIMARY KEY (upstream_task_id, downstream_task_id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_deps_upstream ON task_dependencies(upstream_task_id);
      CREATE INDEX IF NOT EXISTS idx_deps_downstream ON task_dependencies(downstream_task_id);

      -- ═══════════════════════════════════════════════════════════
      -- Shared Memory
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS shared_memory (
        key         TEXT NOT NULL,
        scope       TEXT NOT NULL DEFAULT 'global',
        value       TEXT NOT NULL,           -- JSON
        written_by  TEXT NOT NULL,           -- agent_id
        task_id     TEXT,                    -- which task produced this
        version     INTEGER DEFAULT 1,       -- increments on update
        expires_at  INTEGER,                 -- NULL = permanent
        created_at  INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (key, scope)
      );

      CREATE TABLE IF NOT EXISTS memory_changelog (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        key         TEXT NOT NULL,
        scope       TEXT NOT NULL,
        old_value   TEXT,
        new_value   TEXT NOT NULL,
        changed_by  TEXT NOT NULL,
        changed_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_memory_scope ON shared_memory(scope);
      CREATE INDEX IF NOT EXISTS idx_changelog_key ON memory_changelog(key, scope);

      -- ═══════════════════════════════════════════════════════════
      -- File Locks
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS file_locks (
        file_path   TEXT PRIMARY KEY,
        locked_by   TEXT NOT NULL,           -- agent_id
        task_id     TEXT NOT NULL,
        lock_type   TEXT NOT NULL CHECK(lock_type IN ('exclusive', 'shared')),
        locked_at   INTEGER DEFAULT (unixepoch()),
        expires_at  INTEGER NOT NULL         -- auto-expire if agent crashes
      );

      CREATE TABLE IF NOT EXISTS file_intentions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path   TEXT NOT NULL,
        agent_id    TEXT NOT NULL,
        task_id     TEXT NOT NULL,
        intention   TEXT NOT NULL CHECK(intention IN ('create','modify','delete','read')),
        declared_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_locks_agent ON file_locks(locked_by);
      CREATE INDEX IF NOT EXISTS idx_intentions_file ON file_intentions(file_path);

      -- ═══════════════════════════════════════════════════════════
      -- Event Bus
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        payload     TEXT NOT NULL,           -- JSON
        source_agent TEXT,
        task_id     TEXT,
        created_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS event_subscriptions (
        agent_id    TEXT NOT NULL,
        event_type  TEXT NOT NULL,
        PRIMARY KEY (agent_id, event_type)
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

      -- ═══════════════════════════════════════════════════════════
      -- Agent Registry
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS agents (
        agent_id       TEXT PRIMARY KEY,
        last_heartbeat INTEGER NOT NULL,
        current_task   TEXT,
        status         TEXT DEFAULT 'active'
          CHECK(status IN ('active','idle','dead'))
      );
    `);
  }

  // ─────────────────────────────────────────────────────────────
  // Utility helpers used across multiple tools
  // ─────────────────────────────────────────────────────────────

  /**
   * Expire stale file locks. Call before any lock check.
   */
  expireStaleLocks() {
    this.db.prepare(
      `DELETE FROM file_locks WHERE expires_at < unixepoch()`
    ).run();
  }

  /**
   * Expire TTL'd shared memory entries. Call before any memory read.
   */
  expireMemory() {
    this.db.prepare(
      `DELETE FROM shared_memory WHERE expires_at IS NOT NULL AND expires_at < unixepoch()`
    ).run();
  }

  /**
   * Emit an event to the event bus.
   */
  emitEvent(type, payload, sourceAgent = null, taskId = null) {
    this.db.prepare(`
      INSERT INTO events (type, payload, source_agent, task_id)
      VALUES (?, ?, ?, ?)
    `).run(type, JSON.stringify(payload), sourceAgent, taskId);
  }

  /**
   * Close the database connection. Used in tests.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    _instance = null;
  }
}

module.exports = OrchestrationDB;
