'use strict';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const OrchestrationDB = require('../src/services/orchestration-db');
const fs = require('fs');
const path = require('path');

const createCreateTask = require('../src/tools/create_task');
const createClaimTask = require('../src/tools/claim_task');
const createCompleteTask = require('../src/tools/complete_task');
const createWriteMemory = require('../src/tools/write_memory');
const createReadMemory = require('../src/tools/read_memory');
const createAcquireFileLock = require('../src/tools/acquire_file_lock');
const createReleaseFileLock = require('../src/tools/release_file_lock');
const createSubscribeEvents = require('../src/tools/subscribe_events');
const createPollEvents = require('../src/tools/poll_events');
const createHeartbeat = require('../src/tools/heartbeat');
const createGetOrchestrationState = require('../src/tools/get_orchestration_state');

describe('Orchestration Tools Integration', () => {
  let dbInstance;
  let tools;

  beforeEach(async () => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_orchestration_tools_${Date.now()}.db`);
    const dbPath = process.env.ASE_ORCHESTRATION_DB;
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');

    // Ensure singleton is clear
    try { OrchestrationDB.getInstance().close(); } catch(e) {}
    dbInstance = OrchestrationDB.getInstance();

    const redis = await dbInstance.getRedisClient();
    await redis.flushdb();

    tools = {
      create_task: createCreateTask().handler,
      claim_task: createClaimTask().handler,
      complete_task: createCompleteTask().handler,
      write_memory: createWriteMemory().handler,
      read_memory: createReadMemory().handler,
      acquire_file_lock: createAcquireFileLock().handler,
      release_file_lock: createReleaseFileLock().handler,
      subscribe_events: createSubscribeEvents().handler,
      poll_events: createPollEvents().handler,
      heartbeat: createHeartbeat().handler,
      get_orchestration_state: createGetOrchestrationState().handler,
    };
  });

  afterEach(() => {
    if (dbInstance) {
      dbInstance.close();
    }
    const dbPath = process.env.ASE_ORCHESTRATION_DB;
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  });

  it('orchestrates a full task lifecycle across multiple agents', async () => {
    // 1. Create a DAG of tasks
    const taskA = await tools.create_task({ title: 'Task A', skill_ids: ['frontend'] });
    const taskB = await tools.create_task({ title: 'Task B', depends_on: [taskA.id] });

    // 2. Agent 1 claims task A (affinity match)
    const claimedA = await tools.claim_task({ agent_id: 'agent-1', skill_affinity: ['frontend'] });
    expect(claimedA.id).toBe(taskA.id);

    // 3. Agent 2 tries to claim, but task B is blocked
    const claimAttempt = await tools.claim_task({ agent_id: 'agent-2' });
    expect(claimAttempt.status).toBe('no_work_available');

    // 4. Agent 1 writes output to shared memory
    await tools.write_memory({
      key: 'auth_token',
      value: { token: '123' },
      agent_id: 'agent-1'
    });

    // 5. Agent 1 completes task A
    dbInstance.getDB().prepare("INSERT INTO task_loops (task_id, loop_number, loop_name, loop_lens, completed_at) VALUES (?, 5, 'TEST', 'TEST', unixepoch())").run(taskA.id);
    dbInstance.getDB().prepare("INSERT INTO validation_runs (id, project_dir, passed, details) VALUES (?, ?, ?, ?)").run('val-ok', 'dir', 1, '{}');
    const completion = await tools.complete_task({
      agent_id: 'agent-1',
      task_id: taskA.id,
      status: 'completed',
      validate_output_id: 'val-ok',
      output: { success: true }
    });
    
    expect(completion.unblocked_tasks).toHaveLength(1);
    expect(completion.unblocked_tasks[0].id).toBe(taskB.id);

    // 6. Agent 2 can now claim task B
    const claimedB = await tools.claim_task({ agent_id: 'agent-2' });
    expect(claimedB.id).toBe(taskB.id);

    // 7. Agent 2 reads memory written by Agent 1
    const memory = await tools.read_memory({ key: 'auth_token' });
    expect(memory.found).toBe(true);
    expect(memory.value.token).toBe('123');
  });

  it('manages file locks correctly', async () => {
    // Agent 1 gets exclusive lock
    const lock1 = await tools.acquire_file_lock({
      file_path: '/src/main.js',
      agent_id: 'agent-1',
      task_id: 'task-1'
    });
    expect(lock1.granted).toBe(true);

    // Agent 2 fails to get lock
    const lock2 = await tools.acquire_file_lock({
      file_path: '/src/main.js',
      agent_id: 'agent-2',
      task_id: 'task-2'
    });
    expect(lock2.granted).toBe(false);
    expect(lock2.blocked_by).toBe('agent-1');

    // Agent 1 releases lock
    const release = await tools.release_file_lock({
      file_path: '/src/main.js',
      agent_id: 'agent-1'
    });
    expect(release.released).toBe(true);

    // Agent 2 succeeds
    const lock3 = await tools.acquire_file_lock({
      file_path: '/src/main.js',
      agent_id: 'agent-2',
      task_id: 'task-2'
    });
    expect(lock3.granted).toBe(true);
  });

  it('manages event subscriptions and polling', async () => {
    // Agent 1 subscribes
    await tools.subscribe_events({
      agent_id: 'agent-1',
      event_types: ['task_completed']
    });

    // Create a task and claim it
    const task = await tools.create_task({ title: 'Task 1' });
    await tools.claim_task({ agent_id: 'a1' });

    // Seed loop 5 and validation run
    const db = dbInstance.getDB();
    db.prepare("INSERT INTO task_loops (task_id, loop_number, loop_name, loop_lens, completed_at) VALUES (?, 5, 'TEST', 'TEST', unixepoch())").run(task.id);
    db.prepare("INSERT INTO validation_runs (id, project_dir, passed, details) VALUES (?, ?, ?, ?)").run('val-ok', 'dir', 1, '{}');

    // Complete task
    await tools.complete_task({
      agent_id: 'a1',
      task_id: task.id,
      status: 'completed',
      validate_output_id: 'val-ok'
    });

    // Poll
    const pollResult = await tools.poll_events({ agent_id: 'agent-1' });
    expect(pollResult.events).toHaveLength(1);
    expect(pollResult.events[0].type).toBe('task_completed');
  });

  it('handles dead agent recovery via heartbeat', async () => {
    // Create task
    const task = await tools.create_task({ title: 'Test Task' });
    
    // Dead agent heartbeats to register
    await dbInstance.registerAgentHeartbeat('dead-agent', task.id);
    
    // Dead agent claims the task
    const claimed = await tools.claim_task({ agent_id: 'dead-agent' });
    expect(claimed.id).toBe(task.id);
    
    // Manually backdate the dead agent's heartbeat in SQLite and Redis to make it look dead (> 105s)
    const db = dbInstance.getDB();
    const deadTime = Math.floor(Date.now() / 1000) - 120;
    db.prepare(`
      UPDATE agents SET last_heartbeat = ? WHERE agent_id = 'dead-agent'
    `).run(deadTime);
    
    const agentKey = `ase:agent:dead-agent`;
    const agentData = await dbInstance.getRedisClient().get(agentKey);
    if (agentData) {
      const agentObj = JSON.parse(agentData);
      agentObj.last_heartbeat = deadTime;
      await dbInstance.getRedisClient().set(agentKey, JSON.stringify(agentObj));
    }

    // Trigger heartbeat from a living agent
    const hb = await tools.heartbeat({ agent_id: 'living-agent' });
    
    expect(hb.recovered_agents).toContain('dead-agent');
    
    // Check if task was requeued in SQLite
    const dbTask = db.prepare(`SELECT status, assigned_to FROM tasks WHERE id = ?`).get(task.id);
    expect(dbTask.status).toBe('pending');
    expect(dbTask.assigned_to).toBeNull();

    // Check if task was requeued in Redis
    const redisTaskData = await dbInstance.getRedisClient().get(`ase:task:${task.id}`);
    const redisTask = JSON.parse(redisTaskData);
    expect(redisTask.status).toBe('pending');
    expect(redisTask.assigned_to).toBeNull();
  });
});
