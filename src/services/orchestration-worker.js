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
 *   - createTask transaction (Fix 6: cycle detection + INSERT tasks + INSERT task_dependencies)
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

let db = null;
let currentDbPath = null;

function getDb(providedDbPath) {
  const dbPath = providedDbPath || process.env.ASE_ORCHESTRATION_DB
    || path.join(__dirname, 'orchestration.db');

  if (!db || currentDbPath !== dbPath) {
    if (db) {
      try { db.close(); } catch (e) {}
    }
    db = new Database(dbPath);
    currentDbPath = dbPath;
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

// ─────────────────────────────────────────────────────────────
// Fix 6: Cycle detection helper
//
// PROBLEM: The task_dependencies table stores directed edges. The schema
// enforces a composite PK (no duplicate edges) but has no constraint or
// trigger preventing cycles. A cycle (A → B → C → A) means no task in
// the cycle can ever be claimed — each waits on the next. The system
// deadlocks silently with tasks stuck in 'pending' forever.
//
// FIX: Before inserting edge (upstream → downstream), run a recursive CTE
// that walks the existing graph from `downstream` forward (following
// upstream_task_id → downstream_task_id edges). If any reachable node
// equals `upstream`, inserting this edge would create a cycle.
//
// The check runs INSIDE the same db.transaction() as the INSERT, so no
// concurrent writer can create a cycle between the check and the insert.
//
// SQLite supports recursive CTEs since 3.8.3 (2014). better-sqlite3
// requires SQLite >= 3.31.0, so this is guaranteed available.
// ─────────────────────────────────────────────────────────────

/**
 * Check whether inserting edge (upstreamId → downstreamId) into
 * `task_dependencies` would create a directed cycle.
 *
 * Uses a recursive CTE to find all nodes reachable FROM `downstreamId`
 * by following existing dependency edges. If `upstreamId` is reachable,
 * the new edge would close a cycle.
 *
 * Must be called inside an open transaction to guarantee the read is
 * consistent with any prior writes in the same transaction.
 *
 * @param {Database} d           - better-sqlite3 Database instance
 * @param {string}   upstreamId  - The task that must complete first
 * @param {string}   downstreamId - The task that depends on upstreamId
 * @returns {{ cycle: boolean, path: string[] }}
 */
function checkForCycle(d, upstreamId, downstreamId) {
  // Walk the graph from downstreamId forward: if we can reach upstreamId,
  // the proposed edge closes a cycle.
  //
  // The CTE also tracks the path so we can surface a useful error message.
  //
  // Note: SQLite recursive CTEs use a FIFO queue (breadth-first). The depth
  // is bounded by the number of existing tasks, which is always finite.
  const rows = d.prepare(`
    WITH RECURSIVE reachable(node_id, path) AS (
      -- Base case: start from the node that will become the downstream task.
      SELECT
        td.downstream_task_id,
        $downstreamId || ' → ' || td.downstream_task_id
      FROM task_dependencies td
      WHERE td.upstream_task_id = $downstreamId

      UNION ALL

      -- Recursive case: follow edges forward.
      SELECT
        td.downstream_task_id,
        r.path || ' → ' || td.downstream_task_id
      FROM task_dependencies td
      INNER JOIN reachable r ON td.upstream_task_id = r.node_id
      -- Guard: stop if we've already found the upstream (avoid full traversal).
      WHERE r.node_id != $upstreamId
    )
    SELECT node_id, path FROM reachable WHERE node_id = $upstreamId LIMIT 1
  `).all({ upstreamId, downstreamId });

  if (rows.length > 0) {
    // The CTE found a path from downstreamId back to upstreamId.
    // The full cycle would be: upstreamId → downstreamId → ... → upstreamId
    return {
      cycle: true,
      path: upstreamId + ' → ' + rows[0].path
    };
  }

  return { cycle: false, path: null };
}

// ─────────────────────────────────────────────────────────────
// Task: createTask
// ─────────────────────────────────────────────────────────────
function handleCreateTask(d, { id, title, description, dependsOn, blocks, skillIds, priority, now }) {

  // All edges to validate and insert, collected before the transaction
  // so error messages are clear about which edge caused the cycle.
  //
  // dependsOn[i] means: upstreamId=dependsOn[i], downstreamId=id
  //   (id waits for dependsOn[i] to complete)
  // blocks[i] means: upstreamId=id, downstreamId=blocks[i]
  //   (blocks[i] waits for id to complete)
  const edges = [
    ...dependsOn.map(upstreamId => ({ upstreamId, downstreamId: id })),
    ...blocks.map(downstreamId => ({ upstreamId: id, downstreamId }))
  ];

  d.transaction(() => {
    d.prepare(`
      INSERT INTO tasks (id, title, description, status, depends_on, blocks, skill_ids, validation_status, created_at, priority, deadlock_broken)
      VALUES (?, ?, ?, 'pending', ?, ?, ?, 'pending', ?, ?, 0)
    `).run(id, title, description, JSON.stringify(dependsOn), JSON.stringify(blocks), JSON.stringify(skillIds), now, priority);

    const insertDep = d.prepare(
      `INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`
    );

    for (const { upstreamId, downstreamId } of edges) {
      // Fix 6: Cycle detection before every edge insert.
      // The check runs inside the transaction — no concurrent writer can
      // create a cycle between the check and the INSERT.
      const { cycle, path } = checkForCycle(d, upstreamId, downstreamId);
      if (cycle) {
        // Throwing inside db.transaction() causes automatic rollback.
        throw Object.assign(
          new Error(
            `Dependency cycle detected: inserting edge (${upstreamId} → ${downstreamId}) ` +
            `would create the cycle: ${path}. Task "${id}" was not created.`
          ),
          { code: 'ERR_TASK_DEPENDENCY_CYCLE', cycleEdge: { upstreamId, downstreamId }, cyclePath: path }
        );
      }
      insertDep.run(upstreamId, downstreamId);
    }
  })();

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: writeMemory
// ─────────────────────────────────────────────────────────────
function handleWriteMemory(d, { key, scope, value, agentId, taskId, version, expiresAt, oldValue, now }) {
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
function handleCompleteTask(d, { taskId, agentId, status, output, failureReason, now }) {
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
function handleRunTaskLoop(d, { taskId, agentId, loopNumber, loopName, loopLens, output, startedAt, completedAt }) {
  d.prepare(`
    INSERT OR REPLACE INTO task_loops (task_id, loop_number, loop_name, loop_lens, output, started_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(taskId, loopNumber, loopName, loopLens, JSON.stringify(output), startedAt, completedAt);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: recordCodeLoop
// ─────────────────────────────────────────────────────────────
function handleRecordCodeLoop(d, { sessionId, taskId, loopNumber, loopName, inputCode, outputCode, changes, now }) {
  d.prepare(`
    INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, JSON.stringify(changes), now);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Task: claimTask (SQLite write-back only — Redis claim happens on main thread)
// ─────────────────────────────────────────────────────────────
function handleClaimTaskWriteback(d, { taskId, agentId, now, timeoutAt }) {
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
  const { type, dbPath, payload } = task;
  const d = getDb(dbPath);

  try {
    switch (type) {
      case 'createTask':         return handleCreateTask(d, payload);
      case 'writeMemory':        return handleWriteMemory(d, payload);
      case 'completeTask':       return handleCompleteTask(d, payload);
      case 'runTaskLoop':        return handleRunTaskLoop(d, payload);
      case 'recordCodeLoop':     return handleRecordCodeLoop(d, payload);
      case 'claimTaskWriteback': return handleClaimTaskWriteback(d, payload);
      default:
        throw new Error(`orchestration-worker: unknown task type "${type}"`);
    }
  } catch (err) {
    const errorObj = new Error(`${err.message} (dbPath: ${currentDbPath}, env: ${process.env.ASE_ORCHESTRATION_DB})`);
    errorObj.stack = err.stack;
    Object.assign(errorObj, {
      code: err.code || 'WORKER_ERROR',
    }, err);
    throw errorObj;
  }
};
