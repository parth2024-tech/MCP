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

  beforeEach(() => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_orchestration_tools_${Date.now()}.db`);
    const dbPath = process.env.ASE_ORCHESTRATION_DB;
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');

    // Ensure singleton is clear
    try { OrchestrationDB.getInstance().close(); } catch(e) {}
    dbInstance = OrchestrationDB.getInstance();

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
    const completion = await tools.complete_task({
      agent_id: 'agent-1',
      task_id: taskA.id,
      status: 'completed',
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

    // Generate an event
    await tools.create_task({ title: 'Task 1' }); // task_created (should be ignored)
    
    // Fake a completion to generate event
    dbInstance.getDB().prepare("INSERT INTO tasks (id, title, assigned_to) VALUES ('t1', 'T', 'a1')").run();
    await tools.complete_task({ agent_id: 'a1', task_id: 't1', status: 'completed' });

    // Poll
    const pollResult = await tools.poll_events({ agent_id: 'agent-1' });
    expect(pollResult.events).toHaveLength(1);
    expect(pollResult.events[0].type).toBe('task_completed');
  });

  it('handles dead agent recovery via heartbeat', async () => {
    // Create and claim a task manually
    const db = dbInstance.getDB();
    db.prepare(`
      INSERT INTO tasks (id, title, status, assigned_to) 
      VALUES ('task-1', 'Test', 'claimed', 'dead-agent')
    `).run();
    
    // Manually insert a dead agent record
    db.prepare(`
      INSERT INTO agents (agent_id, last_heartbeat, status)
      VALUES ('dead-agent', unixepoch() - 100, 'active')
    `).run();

    // Trigger heartbeat from a living agent
    const hb = await tools.heartbeat({ agent_id: 'living-agent' });
    
    expect(hb.recovered_agents).toContain('dead-agent');
    
    // Check if task was requeued
    const task = db.prepare(`SELECT status, assigned_to FROM tasks WHERE id = 'task-1'`).get();
    expect(task.status).toBe('pending');
    expect(task.assigned_to).toBeNull();
  });
});
