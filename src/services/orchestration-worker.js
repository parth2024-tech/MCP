'use strict';

/**
 * orchestration-worker.js — SQLite write worker for OrchestrationDB
 *
 * Runs inside a Piscina worker thread. Executes synchronous better-sqlite3
 * write transactions without blocking the main thread's event loop.
 *
 * DESIGN RATIONALE
 * ────────────────
 * better-sqlite3 is intentionally synchronous. On the main thread, any
 * db.transaction()() call holds the V8 event loop exclusively for its
 * duration. During that hold, the MCP stdio transport cannot read new
 * messages from the OS pipe buffer. If an agent has a timeout shorter
 * than the stall, it will time out and retry, which can create duplicate
 * tasks when the stall unblocks.
 *
 * Solution: dispatch write transactions to this worker via Piscina.
 * The main thread awaits the Piscina promise (non-blocking — it yields
 * to the event loop while waiting). The worker thread runs the synchronous
 * SQLite call without impacting the transport layer.
 *
 * WHAT RUNS HERE vs. MAIN THREAD
 * ───────────────────────────────
 * Worker (this file):
 *   - createTask transaction (INSERT tasks + INSERT task_dependencies)
 *   - writeMemory transaction (UPSERT shared_memory + INSERT memory_changelog)
 *   - completeTask transaction (UPDATE tasks + DELETE from claimed set)
 *   - runTaskLoop INSERT
 *   - recordCodeLoop INSERT
 *
 * Main thread (orchestration-db.js):
 *   - All reads (.get, .all, .prepare().get()) — fast, single-row fetches
 *   - Redis operations — already async/non-blocking
 *   - Event emission — fast in-process fan-out
 *
 * WORKER LIFECYCLE
 * ────────────────
 * Piscina keeps one persistent worker thread for write operations
 * (minThreads: 1). The SQLite connection is opened once on worker
 * startup and reused across tasks. This avoids connection overhead
 * per write and maintains WAL mode state correctly.
 */

const Database = require('better-sqlite3');
const path = require('path');

// One connection per worker thread — opened once, reused for all tasks.
const DB_PATH = process.env.ASE_ORCHESTRATION_DB
  || path.join(__dirname, 'orchestration.db');

let db = null;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ─────────────────────────────────────────────────────────────
// Task: createTask
// ─────────────────────────────────────────────────────────────
function handleCreateTask({ id, title, description, dependsOn, blocks, skillIds, priority, now }) {
  const d = getDb();
  d.transaction(() => {
    d.prepare(`
      INSERT INTO tasks (id, title, description, status, depends_on, blocks, skill_ids, validation_status, created_at, priority, deadlock_broken)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, 'pending', ?, ?, 0)
    `).run(id, title, description, JSON.stringify(dependsOn), JSON.stringify(blocks), JSON.stringify(skillIds), now, priority);

    const insertDep = d.prepare(
      `INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`
    );
    for (const upstreamId of dependsOn) {
      insertDep.run(upstreamId, id);
    }
    for (const downstreamId of blocks) {
      insertDep.run(id, downstreamId);
    }
  })();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: writeMemory
// ─────────────────────────────────────────────────────────────
function handleWriteMemory({ key, scope, value, agentId, taskId, version, expiresAt, oldValue, now }) {
  const d = getDb();
  d.transaction(() => {
    d.prepare(`
      INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id, version, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(key, scope, JSON.stringify(value), agentId, taskId, version, expiresAt, now);

    d.prepare(`
      INSERT INTO memory_changelog (key, scope, old_value, new_value, changed_by, changed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(key, scope, oldValue, JSON.stringify(value), agentId, now);
  })();
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: completeTask
// ─────────────────────────────────────────────────────────────
function handleCompleteTask({ taskId, agentId, status, output, failureReason, now }) {
  const d = getDb();
  d.prepare(`
    UPDATE tasks SET
      status = ?,
      output = ?,
      completed_at = ?,
      validation_status = ?
    WHERE id = ? AND assigned_to = ?
  `).run(
    status,
    JSON.stringify({ ...output, failure_reason: failureReason }),
    now,
    status === 'completed' ? 'passed' : status === 'needs_revision' ? 'failed' : 'pending',
    taskId,
    agentId
  );
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: runTaskLoop
// ─────────────────────────────────────────────────────────────
function handleRunTaskLoop({ taskId, agentId, loopNumber, loopName, loopLens, output, startedAt, completedAt }) {
  const d = getDb();
  d.prepare(`
    INSERT OR REPLACE INTO task_loops (task_id, loop_number, loop_name, loop_lens, output, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(taskId, loopNumber, loopName, loopLens, JSON.stringify(output), startedAt, completedAt);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: recordCodeLoop
// ─────────────────────────────────────────────────────────────
function handleRecordCodeLoop({ sessionId, taskId, loopNumber, loopName, inputCode, outputCode, changes, now }) {
  const d = getDb();
  d.prepare(`
    INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, JSON.stringify(changes), now);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: claimTask (SQLite write-back only — Redis claim happens on main thread)
// ─────────────────────────────────────────────────────────────
function handleClaimTaskWriteback({ taskId, agentId, now, timeoutAt }) {
  const d = getDb();
  d.prepare(`
    UPDATE tasks SET
      status = 'claimed',
      assigned_to = ?,
      claimed_at = ?,
      timeout_at = ?
    WHERE id = ?
  `).run(agentId, now, timeoutAt, taskId);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Piscina dispatch
// ─────────────────────────────────────────────────────────────
module.exports = (task) => {
  const { type, payload } = task;

  switch (type) {
    case 'createTask':         return handleCreateTask(payload);
    case 'writeMemory':        return handleWriteMemory(payload);
    case 'completeTask':       return handleCompleteTask(payload);
    case 'runTaskLoop':        return handleRunTaskLoop(payload);
    case 'recordCodeLoop':     return handleRecordCodeLoop(payload);
    case 'claimTaskWriteback': return handleClaimTaskWriteback(payload);
    default:
      throw new Error(`orchestration-worker: unknown task type "${type}"`);
  }
};
