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
const Redis = require('ioredis');
const path = require('path');
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

let _instance = null;

class OrchestrationDB {
  constructor() {
    const dbPath = process.env.ASE_ORCHESTRATION_DB
      || path.join(__dirname, 'orchestration.db');
    this.db = new Database(dbPath);

    const redisUrl = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    });
    this.redis.on('error', (err) => {
      logger.error('OrchestrationDB-Redis', `Redis error: ${err.message}`);
    });

    // Performance pragmas (matches existing ASE pattern)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');

    this._initSchema();
    this.listeners = [];
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

  /**
   * Get the Redis client instance.
   */
  getRedisClient() {
    return this.redis;
  }

  /**
   * Register a local event listener callback.
   * @param {function} callback
   * @returns {function} Unsubscribe function
   */
  registerListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
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
          CHECK(status IN ('pending','claimed','running','blocked','completed','failed','needs_revision')),
        assigned_to   TEXT,
        depends_on    TEXT,            -- JSON array of upstream task IDs (denormalized for reads)
        blocks        TEXT,            -- JSON array of downstream task IDs (denormalized for reads)
        skill_ids     TEXT,            -- JSON array of relevant skill IDs
        output        TEXT,            -- JSON structured output
        validation_status TEXT NOT NULL DEFAULT 'pending' CHECK(validation_status IN ('passed', 'failed', 'pending')),
        created_at    INTEGER DEFAULT (unixepoch()),
        claimed_at    INTEGER,
        completed_at  INTEGER,
        timeout_at    INTEGER,
        priority      INTEGER DEFAULT 0,
        deadlock_broken INTEGER DEFAULT 0
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
      -- ═══════════════════════════════════════════════════════════
      -- Loop Engineering
      -- ═══════════════════════════════════════════════════════════
      CREATE TABLE IF NOT EXISTS task_loops (
        task_id       TEXT NOT NULL,
        loop_number   INTEGER NOT NULL CHECK(loop_number BETWEEN 1 AND 5),
        loop_name     TEXT NOT NULL,
        loop_lens     TEXT NOT NULL,
        output        TEXT,
        started_at    INTEGER DEFAULT (unixepoch()),
        completed_at  INTEGER,
        PRIMARY KEY (task_id, loop_number)
      );

      CREATE TABLE IF NOT EXISTS code_loops (
        session_id    TEXT NOT NULL,
        task_id       TEXT NOT NULL,
        loop_number   INTEGER NOT NULL CHECK(loop_number BETWEEN 1 AND 5),
        loop_name     TEXT NOT NULL,
        input_code    TEXT NOT NULL,
        output_code   TEXT NOT NULL,
        changes_made  TEXT,
        completed_at  INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (session_id, loop_number)
      );

      CREATE TABLE IF NOT EXISTS loop_artifacts (
        task_id       TEXT PRIMARY KEY,
        final_code    TEXT NOT NULL,
        final_output  TEXT NOT NULL,
        total_loops   INTEGER DEFAULT 5,
        written_at    INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS validation_runs (
        id            TEXT PRIMARY KEY,
        project_dir   TEXT NOT NULL,
        passed        INTEGER NOT NULL CHECK(passed IN (0, 1)),
        details       TEXT NOT NULL, -- JSON
        created_at    INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS file_snapshots (
        id           TEXT PRIMARY KEY,
        file_path    TEXT NOT NULL,
        content      TEXT, -- Nullable to represent non-existence (new files)
        timestamp    INTEGER NOT NULL,
        created_at   INTEGER DEFAULT (unixepoch())
      );
    `);

    // Migration for existing database files
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending';`);
    } catch (e) {
      // Ignore if column already exists
    }
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0;`);
    } catch (e) {
      // Ignore if column already exists
    }
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN deadlock_broken INTEGER DEFAULT 0;`);
    } catch (e) {
      // Ignore if column already exists
    }
    try {
      this.db.exec(`ALTER TABLE file_locks ADD COLUMN lock_token TEXT;`);
    } catch (e) {
      // Ignore if column already exists
    }
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

  emitEvent(type, payload, sourceAgent = null, taskId = null) {
    const serializedPayload = JSON.stringify(payload);
    const info = this.db.prepare(`
      INSERT INTO events (type, payload, source_agent, task_id)
      VALUES (?, ?, ?, ?)
    `).run(type, serializedPayload, sourceAgent, taskId);

    const event = {
      id: info.lastInsertRowid,
      type,
      payload: serializedPayload,
      source_agent: sourceAgent,
      task_id: taskId,
      created_at: Math.floor(Date.now() / 1000)
    };

    if (this.redis) {
      this.redis.publish('ase:events', JSON.stringify(event)).catch(() => {});
    }

    if (this.listeners) {
      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (err) {
          logger.error('OrchestrationDB', `Event listener error: ${err.message}`);
        }
      }
    }
  }

  /**
   * Verify if an agent is authorized to use a specific Spoke server.
   */
  isSpokeAuthorized(agentId, spokeName) {
    if (!agentId) return true; // IDE calls without agentId
    const agent = this.db.prepare(`SELECT status FROM agents WHERE agent_id = ?`).get(agentId);
    if (!agent) return true;
    return agent.status !== 'dead';
  }

  /**
   * Close the database connection. Used in tests.
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
    _instance = null;
  }

  // ═══════════════════════════════════════════════════════════
  // Dual-Layer Storage Architecture (T1-A, T1-C, T1-D)
  // ═══════════════════════════════════════════════════════════

  async acquireFileLock(filePath, agentId, taskId, lockType = 'exclusive', ttlSeconds = 120) {
    const now = Math.floor(Date.now() / 1000);
    const forcedTtl = 30; // Lock heartbeat lease defaults to 30 seconds
    const expiresAt = now + forcedTtl;
    const lockKey = `ase:lock:${filePath}`;
    const lockToken = require('crypto').randomUUID();

    this.expireStaleLocks();

    const lockData = await this.redis.get(lockKey);
    if (lockData) {
      const lockObj = JSON.parse(lockData);
      if (lockObj.lock_type === 'exclusive' || lockType === 'exclusive') {
        return {
          granted: false,
          blocked_by: lockObj.locked_by || (lockObj.locks && lockObj.locks[0] && lockObj.locks[0].locked_by) || 'unknown',
          blocked_by_task: lockObj.task_id || (lockObj.locks && lockObj.locks[0] && lockObj.locks[0].task_id) || 'unknown',
          retry_after_seconds: Math.max(0, lockObj.expires_at - now),
        };
      } else {
        const locks = lockObj.locks || [];
        const activeLocks = locks.filter(l => l.expires_at > now);
        activeLocks.push({ locked_by: agentId, task_id: taskId, expires_at: expiresAt, lock_token: lockToken });
        
        const maxExpiresAt = Math.max(...activeLocks.map(l => l.expires_at));
        const newLockObj = {
          lock_type: 'shared',
          expires_at: maxExpiresAt,
          locks: activeLocks
        };

        const remainingTtl = Math.max(1, maxExpiresAt - now);
        await this.redis.set(lockKey, JSON.stringify(newLockObj), 'EX', remainingTtl);
        await this.redis.set(`ase:lock_token:${lockToken}`, filePath, 'EX', remainingTtl);

        this.db.prepare(`
          INSERT OR REPLACE INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at, lock_token)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(filePath, agentId, taskId, lockType, expiresAt, lockToken);

        return { granted: true, expires_at: expiresAt, lock_token: lockToken };
      }
    }

    const newLockObj = {
      lock_type: lockType,
      locked_by: agentId,
      task_id: taskId,
      expires_at: expiresAt,
      lock_token: lockToken,
      locks: lockType === 'shared' ? [{ locked_by: agentId, task_id: taskId, expires_at: expiresAt, lock_token: lockToken }] : []
    };

    await this.redis.set(lockKey, JSON.stringify(newLockObj), 'EX', forcedTtl);
    await this.redis.set(`ase:lock_token:${lockToken}`, filePath, 'EX', forcedTtl);

    this.db.prepare(`
      INSERT OR REPLACE INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at, lock_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(filePath, agentId, taskId, lockType, expiresAt, lockToken);

    return { granted: true, expires_at: expiresAt, lock_token: lockToken };
  }

  async releaseFileLock(filePath, agentId) {
    const lockKey = `ase:lock:${filePath}`;
    const now = Math.floor(Date.now() / 1000);

    const lockData = await this.redis.get(lockKey);
    if (!lockData) {
      const changes = this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
      return { released: changes.changes > 0, file_path: filePath };
    }

    const lockObj = JSON.parse(lockData);
    if (lockObj.lock_type === 'exclusive') {
      if (lockObj.locked_by === agentId) {
        await this.redis.del(lockKey);
        this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
        return { released: true, file_path: filePath };
      }
    } else {
      const activeLocks = (lockObj.locks || []).filter(l => l.locked_by !== agentId && l.expires_at > now);
      if (activeLocks.length === 0) {
        await this.redis.del(lockKey);
      } else {
        const maxExpiresAt = Math.max(...activeLocks.map(l => l.expires_at));
        lockObj.locks = activeLocks;
        lockObj.expires_at = maxExpiresAt;
        const remainingTtl = Math.max(1, maxExpiresAt - now);
        await this.redis.set(lockKey, JSON.stringify(lockObj), 'EX', remainingTtl);
      }
      this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
      return { released: true, file_path: filePath };
    }

    return { released: false, file_path: filePath };
  }

  async writeMemory(key, scope, value, agentId, taskId, ttlSeconds = null) {
    const now = Math.floor(Date.now() / 1000);
    const memKey = `ase:memory:${scope}:${key}`;

    const existingData = await this.redis.get(memKey);
    let version = 1;
    let oldValue = null;
    if (existingData) {
      const existing = JSON.parse(existingData);
      version = (existing.version || 1) + 1;
      oldValue = JSON.stringify(existing.value);
    }

    const expiresAt = ttlSeconds ? now + ttlSeconds : null;
    const memObj = {
      key,
      scope,
      value,
      written_by: agentId,
      task_id: taskId,
      version,
      expires_at: expiresAt,
      created_at: now
    };

    if (ttlSeconds) {
      await this.redis.set(memKey, JSON.stringify(memObj), 'EX', ttlSeconds);
    } else {
      await this.redis.set(memKey, JSON.stringify(memObj));
    }

    this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id, version, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(key, scope, JSON.stringify(value), agentId, taskId, version, expiresAt, now);

      this.db.prepare(`
        INSERT INTO memory_changelog (key, scope, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(key, scope, oldValue, JSON.stringify(value), agentId, now);
    })();

    return { key, scope, version, written_by: agentId };
  }

  async readMemory(key, scope) {
    const memKey = `ase:memory:${scope}:${key}`;
    const data = await this.redis.get(memKey);
    if (!data) {
      return { found: false };
    }
    const memObj = JSON.parse(data);
    return {
      found: true,
      key: memObj.key,
      scope: memObj.scope,
      value: memObj.value,
      version: memObj.version,
      written_by: memObj.written_by
    };
  }

  async createTask(id, title, description, dependsOn = [], blocks = [], skillIds = [], priority = 0) {
    const now = Math.floor(Date.now() / 1000);
    const taskKey = `ase:task:${id}`;

    const taskObj = {
      id,
      title,
      description,
      status: 'pending',
      assigned_to: null,
      depends_on: dependsOn,
      blocks,
      skill_ids: skillIds,
      output: null,
      validation_status: 'pending',
      created_at: now,
      claimed_at: null,
      completed_at: null,
      timeout_at: null,
      priority,
      deadlock_broken: 0
    };

    this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO tasks (id, title, description, status, depends_on, blocks, skill_ids, validation_status, created_at, priority, deadlock_broken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(id, title, description, 'pending', JSON.stringify(dependsOn), JSON.stringify(blocks), JSON.stringify(skillIds), 'pending', now, priority);

      const insertDep = this.db.prepare(
        `INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`
      );
      for (const upstreamId of dependsOn) {
        insertDep.run(upstreamId, id);
      }
      for (const downstreamId of blocks) {
        insertDep.run(id, downstreamId);
      }
    })();

    await this.redis.set(taskKey, JSON.stringify(taskObj));
    await this.redis.sadd('ase:tasks:pending', id);

    if (dependsOn.length > 0) {
      await this.redis.sadd(`ase:task:depends_on:${id}`, ...dependsOn);
    }
    for (const upstreamId of dependsOn) {
      await this.redis.sadd(`ase:task:blocked_by:${upstreamId}`, id);
    }
    for (const downstreamId of blocks) {
      await this.redis.sadd(`ase:task:blocked_by:${id}`, downstreamId);
      await this.redis.sadd(`ase:task:depends_on:${downstreamId}`, id);
    }

    await this.checkForDeadlocks();
    return taskObj;
  }

  async claimTask(agentId, skillAffinity = []) {
    const now = Math.floor(Date.now() / 1000);
    const timeoutAt = now + 300;

    const pendingIds = await this.redis.sunion('ase:tasks:pending', 'ase:tasks:needs_revision');
    if (pendingIds.length === 0) return null;

    const tasks = [];
    for (const id of pendingIds) {
      const data = await this.redis.get(`ase:task:${id}`);
      if (data) tasks.push(JSON.parse(data));
    }

    const affinitySet = new Set(skillAffinity);
    tasks.sort((a, b) => {
      // 1. Priority descending (highest priority first)
      const aPriority = a.priority || 0;
      const bPriority = b.priority || 0;
      if (bPriority !== aPriority) {
        return bPriority - aPriority;
      }
      // 2. Skill affinity match
      const aMatches = a.skill_ids && a.skill_ids.some(s => affinitySet.has(s));
      const bMatches = b.skill_ids && b.skill_ids.some(s => affinitySet.has(s));
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      // 3. Creation time ascending
      return a.created_at - b.created_at;
    });

    for (const task of tasks) {
      const upstreamIds = await this.redis.smembers(`ase:task:depends_on:${task.id}`);
      let allCompleted = true;
      if (task.deadlock_broken !== 1 && task.deadlock_broken !== '1') {
        for (const upId of upstreamIds) {
          const isCompleted = await this.redis.sismember('ase:tasks:completed', upId);
          if (!isCompleted) {
            allCompleted = false;
            break;
          }
        }
      }

      if (allCompleted) {
        const multi = this.redis.multi();
        multi.srem('ase:tasks:pending', task.id);
        multi.srem('ase:tasks:needs_revision', task.id);
        multi.sadd('ase:tasks:claimed', task.id);

        const updatedTask = {
          ...task,
          status: 'claimed',
          assigned_to: agentId,
          claimed_at: now,
          timeout_at: timeoutAt
        };
        multi.set(`ase:task:${task.id}`, JSON.stringify(updatedTask));

        const results = await multi.exec();
        const remPending = results[0][1];
        const remRevision = results[1][1];
        
        if (remPending > 0 || remRevision > 0) {
          this.db.prepare(`
            UPDATE tasks SET
              status = 'claimed',
              assigned_to = ?,
              claimed_at = ?,
              timeout_at = ?
            WHERE id = ?
          `).run(agentId, now, timeoutAt, task.id);

          await this.checkForDeadlocks();
          return updatedTask;
        }
      }
    }

    return null;
  }

  async completeTask(taskId, agentId, status, output = {}, failureReason = null) {
    const now = Math.floor(Date.now() / 1000);
    const taskKey = `ase:task:${taskId}`;

    const data = await this.redis.get(taskKey);
    if (!data) {
      throw new Error(`Task ${taskId} not found in Redis`);
    }

    const task = JSON.parse(data);
    if (task.assigned_to !== agentId) {
      throw new Error(`Agent ${agentId} does not own task ${taskId}`);
    }

    const multi = this.redis.multi();
    multi.srem('ase:tasks:claimed', taskId);

    const updatedTask = {
      ...task,
      status,
      output: { ...output, failure_reason: failureReason },
      completed_at: now
    };

    if (status === 'completed') {
      updatedTask.validation_status = 'passed';
      multi.sadd('ase:tasks:completed', taskId);
    } else if (status === 'needs_revision') {
      updatedTask.validation_status = 'failed';
      multi.sadd('ase:tasks:needs_revision', taskId);
      updatedTask.assigned_to = null;
      updatedTask.claimed_at = null;
      updatedTask.timeout_at = null;
    } else {
      multi.sadd('ase:tasks:failed', taskId);
    }

    multi.set(taskKey, JSON.stringify(updatedTask));
    await multi.exec();

    this.db.prepare(`
      UPDATE tasks SET
        status = ?,
        assigned_to = ?,
        output = ?,
        validation_status = ?,
        claimed_at = ?,
        completed_at = ?,
        timeout_at = ?
      WHERE id = ?
    `).run(
      updatedTask.status,
      updatedTask.assigned_to,
      JSON.stringify(updatedTask.output),
      updatedTask.validation_status,
      updatedTask.claimed_at,
      updatedTask.completed_at,
      updatedTask.timeout_at,
      taskId
    );

    if (status === 'completed' || status === 'failed') {
      const loopKeys = await this.redis.keys(`ase:task_loops:${taskId}:*`);
      for (const lKey of loopKeys) {
        const loopData = await this.redis.get(lKey);
        if (loopData) {
          const l = JSON.parse(loopData);
          this.db.prepare(`
            INSERT OR REPLACE INTO task_loops (task_id, loop_number, loop_name, loop_lens, output, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(taskId, l.loop_number, l.loop_name, l.loop_lens, l.output, l.started_at, l.completed_at);
        }
        await this.redis.del(lKey);
      }

      if (status === 'completed') {
        this.db.prepare(`
          INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id, created_at)
          VALUES (?, 'global', ?, ?, ?, ?)
        `).run(`task_output:${taskId}`, JSON.stringify(output), agentId, taskId, now);
      }
    }

    await this.checkForDeadlocks();
    return updatedTask;
  }

  async runTaskLoop(taskId, agentId, loopNumber, loopName, loopLens, output, startedAt, completedAt) {
    const loopKey = `ase:task_loops:${taskId}:${loopNumber}`;
    const loopObj = {
      task_id: taskId,
      loop_number: loopNumber,
      loop_name: loopName,
      loop_lens: loopLens,
      output: JSON.stringify(output),
      started_at: startedAt,
      completed_at: completedAt
    };
    await this.redis.set(loopKey, JSON.stringify(loopObj));
    return loopObj;
  }

  async getLoopState(taskId, sessionId) {
    const loopKeys = await this.redis.keys(`ase:task_loops:${taskId}:*`);
    const taskLoops = [];
    for (const key of loopKeys) {
      const data = await this.redis.get(key);
      if (data) taskLoops.push(JSON.parse(data));
    }
    taskLoops.sort((a, b) => a.loop_number - b.loop_number);

    // If redis loops are empty, try falling back to SQLite cold archive
    if (taskLoops.length === 0) {
      const dbLoops = this.db.prepare(`
        SELECT loop_number, loop_name, loop_lens, output, started_at, completed_at
        FROM task_loops WHERE task_id = ? ORDER BY loop_number
      `).all(taskId);
      taskLoops.push(...dbLoops);
    }

    const codeLoops = [];
    if (sessionId) {
      const codeKeys = await this.redis.keys(`ase:code_loops:${sessionId}:*`);
      for (const key of codeKeys) {
        const data = await this.redis.get(key);
        if (data) codeLoops.push(JSON.parse(data));
      }
      codeLoops.sort((a, b) => a.loop_number - b.loop_number);
    }

    return { taskLoops, codeLoops };
  }

  async recordCodeLoop(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, changesMade, completedAt) {
    const key = `ase:code_loops:${sessionId}:${loopNumber}`;
    const loopObj = {
      session_id: sessionId,
      task_id: taskId,
      loop_number: loopNumber,
      loop_name: loopName,
      input_code: inputCode,
      output_code: outputCode,
      changes_made: JSON.stringify(changesMade),
      completed_at: completedAt
    };
    await this.redis.set(key, JSON.stringify(loopObj));

    this.db.prepare(`
      INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, JSON.stringify(changesMade), completedAt);

    return loopObj;
  }

  async registerAgentHeartbeat(agentId, currentTask = null) {
    const agentKey = `ase:agent:${agentId}`;
    const now = Math.floor(Date.now() / 1000);
    const agentObj = {
      agent_id: agentId,
      last_heartbeat: now,
      current_task: currentTask,
      status: 'active'
    };
    await this.redis.set(agentKey, JSON.stringify(agentObj), 'EX', 120);

    this.db.prepare(`
      INSERT OR REPLACE INTO agents (agent_id, last_heartbeat, current_task, status)
      VALUES (?, ?, ?, 'active')
    `).run(agentId, now, currentTask);
  }

  async recoverDeadAgents() {
    const now = Math.floor(Date.now() / 1000);
    const recovered = [];

    const deadAgents = this.db.prepare(`
      SELECT agent_id FROM agents
      WHERE status = 'active' AND last_heartbeat < ?
    `).all(now - 30);

    for (const agent of deadAgents) {
      const claimedIds = await this.redis.smembers('ase:tasks:claimed');
      for (const tId of claimedIds) {
        const data = await this.redis.get(`ase:task:${tId}`);
        if (data) {
          const task = JSON.parse(data);
          if (task.assigned_to === agent.agent_id) {
            await this.redis.multi()
               .srem('ase:tasks:claimed', tId)
               .sadd('ase:tasks:pending', tId)
               .set(`ase:task:${tId}`, JSON.stringify({
                 ...task,
                 status: 'pending',
                 assigned_to: null,
                 claimed_at: null,
                 timeout_at: null
               }))
               .exec();

            this.db.prepare(`
              UPDATE tasks SET status = 'pending', assigned_to = NULL, claimed_at = NULL, timeout_at = NULL
              WHERE id = ?
            `).run(tId);
          }
        }
      }

      this.db.prepare(`UPDATE agents SET status = 'dead' WHERE agent_id = ?`).run(agent.agent_id);
      recovered.push(agent.agent_id);
    }

    await this.checkForDeadlocks();
    return recovered;
  }

  getDeadlockState() {
    const activeTasks = this.db.prepare(`
      SELECT id, status, depends_on, created_at, priority, deadlock_broken
      FROM tasks
      WHERE status NOT IN ('completed', 'failed')
    `).all();

    const inDegree = {};
    const adj = {};
    const nodeMap = {};
    for (const task of activeTasks) {
      inDegree[task.id] = 0;
      adj[task.id] = [];
      nodeMap[task.id] = task;
    }

    for (const task of activeTasks) {
      if (task.deadlock_broken === 1) {
        continue;
      }
      let deps = [];
      try {
        deps = JSON.parse(task.depends_on || '[]');
      } catch (e) {}
      
      for (const depId of deps) {
        if (nodeMap[depId]) {
          adj[depId].push(task.id);
          inDegree[task.id]++;
        }
      }
    }

    const queue = [];
    for (const task of activeTasks) {
      if (inDegree[task.id] === 0) {
        queue.push(task.id);
      }
    }

    const topoOrder = [];
    while (queue.length > 0) {
      const u = queue.shift();
      topoOrder.push(u);
      for (const v of adj[u]) {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      }
    }

    const cycles = [];
    const hasDeadlock = topoOrder.length < activeTasks.length;
    
    if (hasDeadlock) {
      const cycleNodeIds = activeTasks
        .map(t => t.id)
        .filter(id => !topoOrder.includes(id));
      
      const visited = new Set();
      const path = [];
      const pathSet = new Set();

      const dfs = (nodeId) => {
        if (pathSet.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          cycles.push(path.slice(cycleStart));
          return;
        }
        if (visited.has(nodeId)) return;

        visited.add(nodeId);
        path.push(nodeId);
        pathSet.add(nodeId);

        const task = nodeMap[nodeId];
        let deps = [];
        try {
          deps = JSON.parse(task.depends_on || '[]');
        } catch (e) {}

        for (const depId of deps) {
          if (cycleNodeIds.includes(depId)) {
            dfs(depId);
          }
        }

        path.pop();
        pathSet.delete(nodeId);
      };

      for (const id of cycleNodeIds) {
        if (!visited.has(id)) {
          dfs(id);
        }
      }
    }

    const deadlockBrokenTasks = this.db.prepare(`
      SELECT id, title, priority, status FROM tasks WHERE deadlock_broken = 1
    `).all();

    return {
      has_deadlock: hasDeadlock,
      cycles,
      deadlock_broken_tasks: deadlockBrokenTasks
    };
  }

  async checkForDeadlocks() {
    const deadlockState = this.getDeadlockState();
    if (!deadlockState.has_deadlock || deadlockState.cycles.length === 0) {
      return null;
    }

    const policy = await this.redis.get('ase:deadlock_policy') || 'priority-based';
    
    const cycle = deadlockState.cycles[0];
    
    const activeTasks = this.db.prepare(`
      SELECT id, title, created_at, priority, assigned_to
      FROM tasks
      WHERE status NOT IN ('completed', 'failed')
    `).all();
    const nodeMap = {};
    for (const t of activeTasks) {
      nodeMap[t.id] = t;
    }

    const cycleTasks = cycle.map(id => nodeMap[id]).filter(Boolean);
    if (cycleTasks.length === 0) return null;

    let victim = null;
    if (policy === 'priority-based') {
      cycleTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.created_at - b.created_at;
      });
      victim = cycleTasks[0];
    } else if (policy === 'age-based') {
      cycleTasks.sort((a, b) => a.created_at - b.created_at);
      victim = cycleTasks[0];
    } else {
      const idx = Math.floor(Math.random() * cycleTasks.length);
      victim = cycleTasks[idx];
    }

    const victimKey = `ase:task:${victim.id}`;
    const victimData = await this.redis.get(victimKey);
    if (victimData) {
      const t = JSON.parse(victimData);
      t.status = 'pending';
      t.deadlock_broken = 1;
      t.assigned_to = null;
      t.claimed_at = null;
      t.timeout_at = null;

      await this.redis.multi()
        .set(victimKey, JSON.stringify(t))
        .srem('ase:tasks:claimed', victim.id)
        .srem('ase:tasks:needs_revision', victim.id)
        .sadd('ase:tasks:pending', victim.id)
        .exec();
    }

    this.db.prepare(`
      UPDATE tasks
      SET status = 'pending', deadlock_broken = 1, assigned_to = NULL, claimed_at = NULL, timeout_at = NULL
      WHERE id = ?
    `).run(victim.id);

    metrics.increment('deadlock.resolved', { strategy: policy });

    this.emitEvent('deadlock_broken', {
      task_id: victim.id,
      title: victim.title,
      assigned_to: victim.assigned_to,
      policy
    }, null, victim.id);

    logger.warn('OrchestrationDB', `Deadlock detected and broken! Victim: ${victim.title} (${victim.id}) returned to pending via policy ${policy}`);

    await this.checkForDeadlocks();

    return victim.id;
  }
}

module.exports = OrchestrationDB;
