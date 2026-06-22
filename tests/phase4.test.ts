'use strict';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const OrchestrationDB = require('../src/services/orchestration-db');
const SessionState = require('../src/services/session-state');
const SkillCache = require('../src/services/cache');

import { Container } from '../src/core/Container';
import { Pipeline } from '../src/middleware/Pipeline';
import { AuthMiddleware } from '../src/middleware/AuthMiddleware';
import { ToolExecutionMiddleware } from '../src/middleware/ToolExecutionMiddleware';
import { MetricsMiddleware } from '../src/middleware/MetricsMiddleware';

import createRegisterAgent from '../src/tools/register_agent';
import createCreateTask from '../src/tools/create_task';
import createClaimTask from '../src/tools/claim_task';
import createCompleteTask from '../src/tools/complete_task';
import createUpdateProjectRules from '../src/tools/update_project_rules';
import RefineAndWriteTool from '../src/tools/refine_and_write';
import createLogSkillStep from '../src/tools/log_skill_step';
import PreemptTaskTool from '../src/tools/preempt_task';
import RunTaskLoopTool from '../src/tools/run_task_loop';

describe('ASE MCP Server Phase 4 Upgrades', () => {
  let dbInstance: any;
  let redis: any;
  let container: any;
  let pipeline: any;
  let tokenSecret: string;
  let sessionState: any;
  let skillCache: any;
  let metrics: any;
  let mockASTIndexer: any;
  let indexFileCalledWith: { filePath: string; content: string } | null = null;

  beforeEach(async () => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_phase4_${Date.now()}.db`);
    process.env.ASE_STATE_DB = path.join(__dirname, `test_state_${Date.now()}.db`);

    // Reset OrchestrationDB singleton
    try { OrchestrationDB.getInstance().close(); } catch (e) {}
    dbInstance = OrchestrationDB.getInstance();
    redis = await dbInstance.getRedisClient();

    // Flush Redis database
    await redis.flushdb();

    const sessionId = crypto.randomUUID();
    sessionState = new SessionState(sessionId);
    skillCache = new SkillCache();
    metrics = require('../src/utils/metrics');

    mockASTIndexer = {
      indexFile: async (filePath: string, content: string) => {
        indexFileCalledWith = { filePath, content };
      }
    };
    indexFileCalledWith = null;

    // Setup IoC Container
    container = new Container();
    tokenSecret = crypto.randomBytes(32).toString('hex');
    container.register('TokenSecret', tokenSecret);
    container.register('OrchestrationDB', dbInstance);
    container.register('SessionState', sessionState);
    container.register('SkillCache', skillCache);
    container.register('VirtualKeyManager', { isAuthorized: () => true });
    container.register('Metrics', metrics);
    container.register('WorkerPool', { stats: { foreground: {}, background: {} } });
    container.register('MemoryService', {
      remember: async () => 1,
      recall: async () => []
    });
    container.register('ASTIndexer', mockASTIndexer);

    const ToolRegistry = require('../src/services/registry');
    const registry = new ToolRegistry();
    container.register('ToolRegistry', registry);

    const deps = {
      sessionState,
      skillCache,
      orchestrationDb: dbInstance,
      workerPool: { stats: { foreground: {}, background: {} } }
    };

    // Register tools
    registry.register(new createRegisterAgent());
    registry.register(createCreateTask());
    registry.register(createClaimTask());
    registry.register(createCompleteTask(deps));
    registry.register(createUpdateProjectRules(deps));
    registry.register(new RefineAndWriteTool());
    registry.register(new PreemptTaskTool());
    registry.register(new RunTaskLoopTool());
    registry.register(createLogSkillStep(deps));

    pipeline = new Pipeline()
      .use(new MetricsMiddleware())
      .use(new AuthMiddleware())
      .use(new ToolExecutionMiddleware());
  });

  afterEach(async () => {
    if (redis) {
      try {
        await redis.del('ase:system_degraded');
        await redis.del('ase:alert_thresholds');
      } catch (e) {}
    }

    if (dbInstance) {
      dbInstance.close();
    }
    if (sessionState && sessionState.db) {
      sessionState.db.close();
    }

    try {
      await fs.unlink(process.env.ASE_ORCHESTRATION_DB!);
      await fs.unlink(process.env.ASE_ORCHESTRATION_DB! + '-wal');
      await fs.unlink(process.env.ASE_ORCHESTRATION_DB! + '-shm');
    } catch (e) {}

    try {
      await fs.unlink(process.env.ASE_STATE_DB!);
      await fs.unlink(process.env.ASE_STATE_DB! + '-wal');
      await fs.unlink(process.env.ASE_STATE_DB! + '-shm');
    } catch (e) {}
  });

  async function executeTool(name: string, args: any) {
    const context = {
      container,
      reqId: crypto.randomUUID(),
      name,
      args
    };
    await pipeline.execute(context);

    let result = context.result;
    let parsed;
    try {
      parsed = JSON.parse(result.content[0].text);
    } catch (e) {
      parsed = result.content[0].text;
    }

    const isErrorPayload = result?.isError || (parsed && parsed.isError) || (parsed && parsed.error);

    // Unwrap if result contains inner text content (MCP envelope)
    if (parsed && parsed.content && parsed.content[0] && typeof parsed.content[0].text === 'string') {
      try {
        parsed = JSON.parse(parsed.content[0].text);
      } catch (e) {}
    }

    if (context.isError || isErrorPayload) {
      const errorText = parsed?.error || parsed?.message || (parsed?.content && parsed.content[0]?.text) || JSON.stringify(parsed);
      try {
        const parsedErr = typeof errorText === 'string' ? JSON.parse(errorText) : errorText;
        throw new Error(parsedErr.message || parsedErr.error || JSON.stringify(parsedErr));
      } catch (e) {
        throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
      }
    }
    return parsed;
  }

  describe('T4-A: Simulation / Dry-Run Mode', () => {
    it('refine_and_write with dry_run true does not commit changes to disk or database', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;
      const agentId = dev.agent_id;

      // Acquire lock first
      await redis.set(`ase:lock:dummy_file.js`, JSON.stringify({ locked_by: agentId }));

      const dryRunResult = await executeTool('refine_and_write', {
        task_id: 'task-1',
        agent_id: agentId,
        file_path: 'dummy_file.js',
        code: 'console.log("hello world");',
        dry_run: true,
        agent_token: token
      });

      expect(dryRunResult.status).toBe('DRY_RUN_PREVIEW');
      expect(dryRunResult.refined_code).toContain('console.log("hello world");');
      expect(dryRunResult.loop_summary.length).toBe(5);

      // Verify file does not exist on disk
      let fileExists = true;
      try {
        await fs.access('dummy_file.js');
      } catch (e) {
        fileExists = false;
      }
      expect(fileExists).toBe(false);

      // Verify no snapshots recorded in SQLite
      const db = dbInstance.getDB();
      const snapshots = db.prepare('SELECT COUNT(*) as count FROM file_snapshots').get();
      expect(snapshots.count).toBe(0);
    });

    it('complete_task with dry_run true does not modify task status and simulates downstream unblocking', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;
      const agentId = dev.agent_id;

      // Create Task A (upstream) and Task B (downstream, blocked by A)
      const taskA = await executeTool('create_task', {
        title: 'Task A',
        description: 'Upstream task',
        priority: 5,
        agent_token: token
      });
      const taskB = await executeTool('create_task', {
        title: 'Task B',
        description: 'Downstream task',
        depends_on: [taskA.id],
        priority: 5,
        agent_token: token
      });

      // Claim Task A
      await executeTool('claim_task', {
        agent_id: agentId,
        agent_token: token
      });

      // Initialize test skill
      sessionState.initSkill('test-skill', ['step-1']);

      // Run 5 task loops for Task A to satisfy prerequisites
      for (let i = 1; i <= 5; i++) {
        // Record log skill step for Loop 3 prerequisite
        if (i === 3) {
          await executeTool('log_skill_step', {
            skill_name: 'test-skill',
            step_id: 'step-1',
            status: 'completed',
            agent_token: token
          });
        }
        await executeTool('run_task_loop', {
          task_id: taskA.id,
          agent_id: agentId,
          loop_number: i,
          loop_output: { code: 'console.log();' },
          changes_summary: `Loop ${i}`,
          agent_token: token
        });
      }

      // Record a green validation run
      const validateOutputId = crypto.randomUUID();
      const db = dbInstance.getDB();
      db.prepare(`
        INSERT INTO validation_runs (id, project_dir, passed, details)
        VALUES (?, ?, 1, '{}')
      `).run(validateOutputId, process.cwd());

      // Call complete_task in dry-run mode
      const dryResult = await executeTool('complete_task', {
        agent_id: agentId,
        task_id: taskA.id,
        validate_output_id: validateOutputId,
        status: 'completed',
        dry_run: true,
        agent_token: token
      });

      expect(dryResult.status).toBe('DRY_RUN_PREVIEW');
      expect(dryResult.target_status).toBe('completed');
      expect(dryResult.would_unblock[0].id).toBe(taskB.id);

      // Verify Task A remains claimed in Redis/SQLite
      const taskAData = await redis.get(`ase:task:${taskA.id}`);
      expect(JSON.parse(taskAData!).status).toBe('claimed');

      const dbTaskA = db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskA.id);
      expect(dbTaskA.status).toBe('claimed');
    });

    it('update_project_rules with dry_run true validates mutations in memory but does not save to disk', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;

      // Write a dummy .ase-project.json in current directory for tests
      const testConfigPath = path.join(process.cwd(), '.ase-project.json');
      let originalConfigContent = '';
      try {
        originalConfigContent = await fs.readFile(testConfigPath, 'utf8');
      } catch (e) {}

      await fs.writeFile(testConfigPath, JSON.stringify({
        name: "TestProject",
        description: "Verify config updates",
        tech_stack: ["Node.js"],
        conventions: ["Rule 1"],
        never_do: [],
        sprint_focus: "test"
      }, null, 2), 'utf8');

      try {
        const dryRes = await executeTool('update_project_rules', {
          rule_type: 'conventions',
          action: 'add',
          content: 'Rule 2',
          draft_mode: false,
          dry_run: true,
          agent_token: token
        });

        expect(dryRes.status).toBe('DRY_RUN_PREVIEW');
        expect(dryRes.updated_config.conventions).toContain('Rule 2');

        // Check file on disk still only has Rule 1
        const diskContent = JSON.parse(await fs.readFile(testConfigPath, 'utf8'));
        expect(diskContent.conventions).not.toContain('Rule 2');

      } finally {
        if (originalConfigContent) {
          await fs.writeFile(testConfigPath, originalConfigContent, 'utf8');
        } else {
          try { await fs.unlink(testConfigPath); } catch (e) {}
        }
      }
    });
  });

  describe('T4-B: Task Priorities and Preemption', () => {
    it('claim_task picks the highest-priority pending task first', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;
      const agentId = dev.agent_id;

      // Create task 1: Priority 3, created first
      const task1 = await executeTool('create_task', {
        title: 'Low Priority Task',
        priority: 3,
        agent_token: token
      });

      // Create task 2: Priority 8, created second
      const task2 = await executeTool('create_task', {
        title: 'High Priority Task',
        priority: 8,
        agent_token: token
      });

      // Claim task
      const claimed = await executeTool('claim_task', {
        agent_id: agentId,
        agent_token: token
      });

      // Should claim Task 2 (priority 8) instead of Task 1 (priority 3)
      expect(claimed.id).toBe(task2.id);
    });

    it('preempt_task suspends a lower-priority claimed task back to pending', async () => {
      const dev1 = await executeTool('register_agent', { role: 'dev1', capabilities: ['*'] });
      const dev2 = await executeTool('register_agent', { role: 'dev2', capabilities: ['*'] });

      // Create a low priority task (Priority 3) and a high priority task (Priority 9)
      const lowTask = await executeTool('create_task', {
        title: 'Low Task',
        priority: 3,
        agent_token: dev1.agent_token
      });

      const highTask = await executeTool('create_task', {
        title: 'High Task',
        priority: 9,
        agent_token: dev2.agent_token
      });

      // dev1 claims the low priority task
      await executeTool('claim_task', {
        agent_id: dev1.agent_id,
        agent_token: dev1.agent_token
      });

      // dev2 claims the high priority task
      await executeTool('claim_task', {
        agent_id: dev2.agent_id,
        agent_token: dev2.agent_token
      });

      // dev2 preempts dev1's low task
      const preemptRes = await executeTool('preempt_task', {
        task_id: lowTask.id,
        reason: 'Swarm needs resources for urgent high-priority bugfix',
        preempting_task_id: highTask.id,
        agent_token: dev2.agent_token
      });

      expect(preemptRes.success).toBe(true);
      expect(preemptRes.preempted_task_id).toBe(lowTask.id);
      expect(preemptRes.status).toBe('pending');

      // Verify status in DB and Redis
      const lowTaskData = await redis.get(`ase:task:${lowTask.id}`);
      expect(JSON.parse(lowTaskData!).status).toBe('pending');
      expect(JSON.parse(lowTaskData!).assigned_to).toBeNull();

      const db = dbInstance.getDB();
      const dbTask = db.prepare('SELECT status, assigned_to FROM tasks WHERE id = ?').get(lowTask.id);
      expect(dbTask.status).toBe('pending');
      expect(dbTask.assigned_to).toBeNull();
    });
  });

  describe('T4-C: Cross-Session Codebase Index Invalidation', () => {
    it('refine_and_write synchronously calls ASTIndexer.indexFile on success', async () => {
      const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
      const token = dev.agent_token;
      const agentId = dev.agent_id;

      await redis.set(`ase:lock:index_test.js`, JSON.stringify({ locked_by: agentId }));

      const writeRes = await executeTool('refine_and_write', {
        task_id: 'task-idx',
        agent_id: agentId,
        file_path: 'index_test.js',
        code: 'function test() {}',
        dry_run: false,
        agent_token: token
      });

      try {
        expect(writeRes.status).toBe('WRITTEN');
        expect(writeRes.index_updated).toBe(true);
        expect(indexFileCalledWith).not.toBeNull();
        expect(indexFileCalledWith!.filePath).toBe('index_test.js');
        expect(indexFileCalledWith!.content).toContain('function test() {}');
      } finally {
        try { await fs.unlink('index_test.js'); } catch (e) {}
      }
    });
  });
});
