'use strict';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const OrchestrationDB = require('../src/services/orchestration-db');
import createRegisterAgent from '../src/tools/register_agent';
import createClaimTask from '../src/tools/claim_task';
import createCreateTask from '../src/tools/create_task';
import createCompleteTask from '../src/tools/complete_task';
import createPollEvents from '../src/tools/poll_events';
import createSubscribeEvents from '../src/tools/subscribe_events';
import createGetOrchestrationState from '../src/tools/get_orchestration_state';
import createAcquireFileLock from '../src/tools/acquire_file_lock';
import createWriteMemory from '../src/tools/write_memory';
import createRefineAndWrite from '../src/tools/refine_and_write';
import ConfigureDeadlockPolicyTool from '../src/tools/configure_deadlock_policy';
import GetWriteDiffTool from '../src/tools/get_write_diff';
import QueryAllMemoryTool from '../src/tools/query_all_memory';

import { Container } from '../src/core/Container';
import { Pipeline } from '../src/middleware/Pipeline';
import { AuthMiddleware } from '../src/middleware/AuthMiddleware';
import { ToolExecutionMiddleware } from '../src/middleware/ToolExecutionMiddleware';

describe('ASE MCP Server Phase 2 Upgrades', () => {
  let dbInstance: any;
  let redis: any;
  let container: any;
  let pipeline: any;
  let tokenSecret: string;
  let memoryServiceMock: any;

  beforeEach(async () => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_phase2_${Date.now()}.db`);
    
    // Reset OrchestrationDB singleton
    try { OrchestrationDB.getInstance().close(); } catch (e) {}
    dbInstance = OrchestrationDB.getInstance();
    redis = await dbInstance.getRedisClient();

    // Flush Redis database for clean tests
    await redis.flushdb();

    // Mock MemoryService
    const mockMemories: any[] = [];
    memoryServiceMock = {
      memories: mockMemories,
      remember: async (eventType: string, content: string) => {
        const id = mockMemories.length + 1;
        mockMemories.push({
          id,
          timestamp: new Date().toISOString(),
          event_type: eventType,
          content,
          relevance: '0.8500'
        });
        return id;
      },
      recall: async (query: string, limit: number, threshold: number) => {
        return mockMemories.slice(0, limit);
      }
    };

    // Setup IoC Container
    container = new Container();
    tokenSecret = crypto.randomBytes(32).toString('hex');
    container.register('TokenSecret', tokenSecret);
    container.register('OrchestrationDB', dbInstance);
    container.register('VirtualKeyManager', { isAuthorized: () => true });
    container.register('MemoryService', memoryServiceMock);
    container.register('WorkerPool', {});
    container.register('Metrics', require('../src/utils/metrics'));
    
    // Registry mockup
    const ToolRegistry = require('../src/services/registry');
    const registry = new ToolRegistry();
    container.register('ToolRegistry', registry);

    // Register all tools
    registry.register(new createRegisterAgent());
    registry.register(createCreateTask());
    registry.register(createClaimTask());
    registry.register(createCompleteTask());
    registry.register(createPollEvents());
    registry.register(createSubscribeEvents());
    registry.register(createGetOrchestrationState());
    registry.register(createAcquireFileLock());
    registry.register(createWriteMemory());
    registry.register(new createRefineAndWrite());
    registry.register(new ConfigureDeadlockPolicyTool());
    registry.register(new GetWriteDiffTool());
    registry.register(new QueryAllMemoryTool());

    // Setup Pipeline
    pipeline = new Pipeline()
      .use(new AuthMiddleware())
      .use(new ToolExecutionMiddleware());
  });

  afterEach(async () => {
    if (dbInstance) {
      dbInstance.close();
    }
    const dbPath = process.env.ASE_ORCHESTRATION_DB;
    try {
      await fs.unlink(dbPath);
      await fs.unlink(dbPath + '-wal');
      await fs.unlink(dbPath + '-shm');
    } catch(e) {}
  });

  async function executeTool(name: string, args: any) {
    const context = {
      container,
      reqId: crypto.randomUUID(),
      name,
      args
    };
    await pipeline.execute(context);
    if (context.isError || context.result?.isError) {
      const errorText = context.result.content[0].text;
      try {
        const parsed = JSON.parse(errorText);
        throw new Error(parsed.error || parsed.message || errorText);
      } catch (e) {
        throw new Error(errorText);
      }
    }
    return JSON.parse(context.result.content[0].text);
  }

  describe('T2-A: Push-Based Events / Long-Polling', () => {
    it('supports long polling timeout', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      // Subscribe to events
      await executeTool('subscribe_events', {
        agent_id: dev.agent_id,
        event_types: ['task_created'],
        agent_token: token
      });

      const startTime = Date.now();
      const pollRes = await executeTool('poll_events', {
        agent_id: dev.agent_id,
        long_poll: true,
        timeout_seconds: 1,
        agent_token: token
      });
      const duration = Date.now() - startTime;

      expect(pollRes.events).toHaveLength(0);
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it('returns event immediately if match occurs during long poll', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      await executeTool('subscribe_events', {
        agent_id: dev.agent_id,
        event_types: ['task_created'],
        agent_token: token
      });

      // Start long-poll in background
      const pollPromise = executeTool('poll_events', {
        agent_id: dev.agent_id,
        long_poll: true,
        timeout_seconds: 5,
        agent_token: token
      });

      // Concurrently create a task to trigger an event
      await new Promise(r => setTimeout(r, 100));
      await executeTool('create_task', {
        title: 'Long poll task',
        agent_token: token
      });

      const pollRes = await pollPromise;
      expect(pollRes.events).toHaveLength(1);
      expect(pollRes.events[0].type).toBe('task_created');
      expect(pollRes.events[0].payload.title).toBe('Long poll task');
    });
  });

  describe('T2-B: Cycle Detection & Deadlock Resolution', () => {
    it('detects and resolves deadlocks based on policy', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      // Configure policy
      const policyRes = await executeTool('configure_deadlock_policy', {
        policy: 'priority-based',
        agent_token: token
      });
      expect(policyRes.success).toBe(true);
      expect(policyRes.policy).toBe('priority-based');

      // Create two tasks
      const taskA = await executeTool('create_task', {
        title: 'Task A',
        priority: 5,
        agent_token: token
      });

      const taskB = await executeTool('create_task', {
        title: 'Task B',
        priority: 10,
        agent_token: token
      });

      // Update both SQLite and Redis to form a cycle: A depends on B, B depends on A
      const db = dbInstance.getDB();
      db.prepare(`UPDATE tasks SET depends_on = ? WHERE id = ?`).run(JSON.stringify([taskB.id]), taskA.id);
      db.prepare(`UPDATE tasks SET depends_on = ? WHERE id = ?`).run(JSON.stringify([taskA.id]), taskB.id);

      db.prepare(`INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`).run(taskB.id, taskA.id);
      db.prepare(`INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`).run(taskA.id, taskB.id);

      // Update Redis task objects so they reflect the cycle
      const redis = await dbInstance.getRedisClient();
      const taskAData = JSON.parse(await redis.get(`ase:task:${taskA.id}`));
      taskAData.depends_on = [taskB.id];
      await redis.set(`ase:task:${taskA.id}`, JSON.stringify(taskAData));

      const taskBData = JSON.parse(await redis.get(`ase:task:${taskB.id}`));
      taskBData.depends_on = [taskA.id];
      await redis.set(`ase:task:${taskB.id}`, JSON.stringify(taskBData));

      await redis.sadd(`ase:task:depends_on:${taskA.id}`, taskB.id);
      await redis.sadd(`ase:task:depends_on:${taskB.id}`, taskA.id);

      // Print debug state
      const allSqliteTasks = db.prepare('SELECT id, status, depends_on FROM tasks').all();
      console.log('All SQLite Tasks:', JSON.stringify(allSqliteTasks, null, 2));

      const deadlockStateBefore = dbInstance.getDeadlockState();
      console.log('Deadlock state before:', JSON.stringify(deadlockStateBefore, null, 2));

      // Now call checkForDeadlocks manually or trigger it via claimTask
      const brokenTaskId = await dbInstance.checkForDeadlocks();
      expect(brokenTaskId).toBe(taskA.id); // taskA has lower priority (5 < 10)

      // State should show deadlock broken
      const state = await executeTool('get_orchestration_state', {
        agent_token: token
      });

      expect(state.deadlock_status.has_deadlock).toBe(false); // cycle is broken!
      expect(state.deadlock_status.deadlock_broken_tasks).toHaveLength(1);
      expect(state.deadlock_status.deadlock_broken_tasks[0].id).toBe(taskA.id);

      // Dev should be able to claim Task A despite Task B dependency because deadlock_broken = 1
      const claim = await executeTool('claim_task', {
        agent_id: dev.agent_id,
        agent_token: token
      });
      expect(claim).not.toBeNull();
      expect(claim.id).toBe(taskA.id);
    });
  });

  describe('T2-C: Transform Inspection Tool', () => {
    it('returns stage by stage transform diffs', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      const testFile = path.join(__dirname, 'test_diff.txt');
      await fs.writeFile(testFile, 'initial text', 'utf8');

      try {
        await executeTool('acquire_file_lock', {
          file_path: testFile,
          agent_id: dev.agent_id,
          task_id: 'task-diff',
          agent_token: token
        });

        const refine = await executeTool('refine_and_write', {
          task_id: 'task-diff',
          agent_id: dev.agent_id,
          file_path: testFile,
          code: 'new text',
          agent_token: token
        });

        const sessionId = refine.session_id;
        const diffRes = await executeTool('get_write_diff', {
          write_session_id: sessionId,
          agent_token: token
        });

        expect(diffRes.write_session_id).toBe(sessionId);
        expect(diffRes.stages).toHaveLength(5);
        expect(diffRes.stages[0].loop_number).toBe(1);
        expect(diffRes.stages[0].before).toBeDefined();
        expect(diffRes.stages[0].after).toBeDefined();
      } finally {
        try { await fs.unlink(testFile); } catch(e) {}
      }
    });
  });

  describe('T2-D: Unified Memory Architecture', () => {
    it('returns ranked unified memories', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      // 1. Write structured memory
      const writeMemRes = await executeTool('write_memory', {
        key: 'button_color',
        scope: 'global',
        value: { color: 'blue' },
        agent_id: dev.agent_id,
        agent_token: token
      });
      console.log('writeMemory Result:', JSON.stringify(writeMemRes, null, 2));

      // 2. Add semantic memory to mock
      await memoryServiceMock.remember('action', 'Styled buttons with primary blue color');

      // 3. Query all memory
      const queryRes = await executeTool('query_all_memory', {
        query: 'blue button color',
        scope: 'global',
        limit: 5,
        agent_token: token
      });
      console.log('query_all_memory Result:', JSON.stringify(queryRes, null, 2));

      expect(queryRes.results.length).toBeGreaterThanOrEqual(1);
      expect(queryRes.results[0].score).toBeGreaterThan(0);
      expect(queryRes.results[0].source).toBeDefined(); // structured or semantic
    });
  });
});
