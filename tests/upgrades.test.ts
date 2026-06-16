'use strict';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import OrchestrationDB from '../src/services/orchestration-db';
import createRegisterAgent from '../src/tools/register_agent';
import createClaimTask from '../src/tools/claim_task';
import createCreateTask from '../src/tools/create_task';
import createCompleteTask from '../src/tools/complete_task';
import createAcquireFileLock from '../src/tools/acquire_file_lock';
import createReleaseFileLock from '../src/tools/release_file_lock';
import createWriteMemory from '../src/tools/write_memory';
import createReadMemory from '../src/tools/read_memory';
import createRefineAndWrite from '../src/tools/refine_and_write';
import createRollbackWrite from '../src/tools/rollback_write';
import createValidateOutput from '../src/tools/validate_output';

import { Container } from '../src/core/Container';
import { Pipeline } from '../src/middleware/Pipeline';
import { AuthMiddleware } from '../src/middleware/AuthMiddleware';
import { ToolExecutionMiddleware } from '../src/middleware/ToolExecutionMiddleware';

describe('ASE MCP Server Upgrades', () => {
  let dbInstance;
  let redis;
  let container;
  let pipeline;
  let tokenSecret;

  beforeEach(async () => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_upgrades_${Date.now()}.db`);
    
    // Reset OrchestrationDB singleton
    try { OrchestrationDB.getInstance().close(); } catch (e) {}
    dbInstance = OrchestrationDB.getInstance();
    redis = await dbInstance.getRedisClient();

    // Flush Redis database for clean tests
    await redis.flushdb();

    // Setup IoC Container
    container = new Container();
    tokenSecret = crypto.randomBytes(32).toString('hex');
    container.register('TokenSecret', tokenSecret);
    container.register('OrchestrationDB', dbInstance);
    container.register('VirtualKeyManager', { isAuthorized: () => true });
    
    // Registry mockup
    const ToolRegistry = require('../src/services/registry');
    const registry = new ToolRegistry();
    container.register('ToolRegistry', registry);

    // Register upgrades tools
    registry.register(new createRegisterAgent());
    registry.register(createCreateTask());
    registry.register(createClaimTask());
    registry.register(createCompleteTask());
    registry.register(createAcquireFileLock());
    registry.register(createReleaseFileLock());
    registry.register(createWriteMemory());
    registry.register(createReadMemory());
    registry.register(new createRefineAndWrite());
    registry.register(new createRollbackWrite());
    registry.register(createValidateOutput({}));

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

  it('verifies signed token registration and capability enforcement', async () => {
    // 1. Bootstrap agent registration
    const regRes = await executeTool('register_agent', {
      role: 'audit',
      capabilities: ['get_health', 'read_memory']
    });

    expect(regRes.agent_token).toBeDefined();
    const token = regRes.agent_token;

    // 2. Call authorized tool (read_memory) - should not fail auth, but might return not found
    const readRes = await executeTool('read_memory', {
      key: 'test_key',
      agent_token: token
    });
    expect(readRes.found).toBe(false);

    // 3. Call unauthorized tool (claim_task) - should fail auth/capability check
    await expect(executeTool('claim_task', {
      agent_id: regRes.agent_id,
      agent_token: token
    })).rejects.toThrow(/possess capability/);
  });

  it('verifies Redis dual-layer storage task claims and lock management', async () => {
    // Register developer agent with full access
    const dev = await executeTool('register_agent', {
      role: 'developer',
      capabilities: ['*']
    });
    const token = dev.agent_token;

    // Create tasks
    const taskA = await executeTool('create_task', {
      title: 'Upgrade Task A',
      agent_token: token
    });
    expect(taskA.id).toBeDefined();

    // Claim task
    const claimRes = await executeTool('claim_task', {
      agent_id: dev.agent_id,
      agent_token: token
    });
    expect(claimRes.id).toBe(taskA.id);

    // Verify lock management
    const lockRes = await executeTool('acquire_file_lock', {
      file_path: '/tmp/test.ts',
      agent_id: dev.agent_id,
      task_id: taskA.id,
      agent_token: token
    });
    expect(lockRes.granted).toBe(true);

    // Conflicting lock
    const dev2 = await executeTool('register_agent', { role: 'dev2', capabilities: ['*'] });
    const lockConflict = await executeTool('acquire_file_lock', {
      file_path: '/tmp/test.ts',
      agent_id: dev2.agent_id,
      task_id: taskA.id,
      agent_token: dev2.agent_token
    });
    expect(lockConflict.granted).toBe(false);
  });

  it('verifies validate_output coupling and revision state transition', async () => {
    const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
    const token = dev.agent_token;

    // Create task and claim it
    const task = await executeTool('create_task', { title: 'Coupled Task', agent_token: token });
    await executeTool('claim_task', { agent_id: dev.agent_id, agent_token: token });

    // Populate loop 5 so we can complete
    for (let i = 1; i <= 5; i++) {
      await dbInstance.runTaskLoop(task.id, dev.agent_id, i, 'loop', 'lens', { done: true }, 0, 1);
    }

    // Run failed validation (with bad code)
    const valResFail = await executeTool('validate_output', {
      code: 'import useEffect from "react"; useEffect();', // matches useEffect restriction
      file_path: 'test.tsx',
      agent_token: token
    });
    expect(valResFail.validation_run_id).toBeDefined();

    // Call complete_task with failed validation ID -> status should transition to needs_revision
    const completeResFail = await executeTool('complete_task', {
      agent_id: dev.agent_id,
      task_id: task.id,
      validate_output_id: valResFail.validation_run_id,
      status: 'completed',
      agent_token: token
    });
    expect(completeResFail.status).toBe('needs_revision');

    // Run green validation (clean code)
    const valResSuccess = await executeTool('validate_output', {
      code: 'const x = 42;',
      file_path: 'test.tsx',
      agent_token: token
    });
    
    // Re-claim task (since it went to needs_revision)
    await executeTool('claim_task', { agent_id: dev.agent_id, agent_token: token });

    // Call complete_task with green validation ID -> status should transition to completed
    const completeResSuccess = await executeTool('complete_task', {
      agent_id: dev.agent_id,
      task_id: task.id,
      validate_output_id: valResSuccess.validation_run_id,
      status: 'completed',
      agent_token: token
    });
    expect(completeResSuccess.status).toBe('completed');
  });

  it('verifies refine_and_write snapshot and rollback_write lock releases', async () => {
    const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
    const token = dev.agent_token;

    const testFile = path.join(__dirname, 'test_refine.txt');
    await fs.writeFile(testFile, 'initial content', 'utf8');

    try {
      // Get lock
      await executeTool('acquire_file_lock', {
        file_path: testFile,
        agent_id: dev.agent_id,
        task_id: 'task-refine',
        agent_token: token
      });

      // Write via refine_and_write
      const refineRes = await executeTool('refine_and_write', {
        task_id: 'task-refine',
        agent_id: dev.agent_id,
        file_path: testFile,
        code: 'refined content',
        agent_token: token
      });

      expect(refineRes.snapshot_id).toBeDefined();
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('refined content\n');

      // Rollback
      const rollbackRes = await executeTool('rollback_write', {
        file_path: testFile,
        snapshot_id: refineRes.snapshot_id,
        agent_token: token
      });
      expect(rollbackRes.status).toBe('ROLLED_BACK');

      // File should be restored
      const contentRestored = await fs.readFile(testFile, 'utf8');
      expect(contentRestored).toBe('initial content');

      // Lock should be released (can acquire it again)
      const lockRes = await executeTool('acquire_file_lock', {
        file_path: testFile,
        agent_id: dev.agent_id,
        task_id: 'task-refine',
        agent_token: token
      });
      expect(lockRes.granted).toBe(true);

    } finally {
      try { await fs.unlink(testFile); } catch(e) {}
    }
  });
});
