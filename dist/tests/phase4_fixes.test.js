'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const OrchestrationDB = require('../src/services/orchestration-db');
const register_agent_1 = __importDefault(require("../src/tools/register_agent"));
const create_task_1 = __importDefault(require("../src/tools/create_task"));
const claim_task_1 = __importDefault(require("../src/tools/claim_task"));
const complete_task_1 = __importDefault(require("../src/tools/complete_task"));
const acquire_file_lock_1 = __importDefault(require("../src/tools/acquire_file_lock"));
const release_file_lock_1 = __importDefault(require("../src/tools/release_file_lock"));
const refine_and_write_1 = __importDefault(require("../src/tools/refine_and_write"));
const validate_output_1 = __importDefault(require("../src/tools/validate_output"));
const run_task_loop_1 = __importDefault(require("../src/tools/run_task_loop"));
const renew_lock_ttl_1 = __importDefault(require("../src/tools/renew_lock_ttl"));
const declare_task_intent_1 = __importDefault(require("../src/tools/declare_task_intent"));
const get_validation_result_1 = __importDefault(require("../src/tools/get_validation_result"));
const Container_1 = require("../src/core/Container");
const Pipeline_1 = require("../src/middleware/Pipeline");
const AuthMiddleware_1 = require("../src/middleware/AuthMiddleware");
const ToolExecutionMiddleware_1 = require("../src/middleware/ToolExecutionMiddleware");
(0, vitest_1.describe)('ASE MCP Server Phase 4 Fixes Verification', () => {
    let dbInstance;
    let redis;
    let container;
    let pipeline;
    let tokenSecret;
    let registry;
    (0, vitest_1.beforeEach)(async () => {
        process.env.ASE_ORCHESTRATION_DB = path_1.default.join(__dirname, `test_fixes_${Date.now()}.db`);
        // Reset OrchestrationDB singleton
        try {
            OrchestrationDB.getInstance().close();
        }
        catch (e) { }
        dbInstance = OrchestrationDB.getInstance();
        redis = await dbInstance.getRedisClient();
        // Flush Redis database for clean tests
        await redis.flushdb();
        // Setup IoC Container
        container = new Container_1.Container();
        tokenSecret = crypto_1.default.randomBytes(32).toString('hex');
        container.register('TokenSecret', tokenSecret);
        container.register('OrchestrationDB', dbInstance);
        container.register('VirtualKeyManager', { isAuthorized: () => true });
        container.register('MemoryService', {
            remember: async () => 1,
            recall: async () => []
        });
        const ToolRegistry = require('../src/services/registry');
        registry = new ToolRegistry();
        container.register('ToolRegistry', registry);
        // Register all tools
        registry.register(new register_agent_1.default());
        registry.register((0, create_task_1.default)());
        registry.register((0, claim_task_1.default)());
        registry.register((0, complete_task_1.default)());
        registry.register((0, acquire_file_lock_1.default)());
        registry.register((0, release_file_lock_1.default)());
        registry.register(new refine_and_write_1.default());
        registry.register((0, validate_output_1.default)({}));
        registry.register(new run_task_loop_1.default());
        registry.register(new renew_lock_ttl_1.default());
        registry.register(new declare_task_intent_1.default());
        registry.register(new get_validation_result_1.default());
        pipeline = new Pipeline_1.Pipeline()
            .use(new AuthMiddleware_1.AuthMiddleware())
            .use(new ToolExecutionMiddleware_1.ToolExecutionMiddleware());
    });
    (0, vitest_1.afterEach)(async () => {
        if (dbInstance) {
            dbInstance.close();
        }
        const dbPath = process.env.ASE_ORCHESTRATION_DB;
        try {
            await promises_1.default.unlink(dbPath);
            await promises_1.default.unlink(dbPath + '-wal');
            await promises_1.default.unlink(dbPath + '-shm');
        }
        catch (e) { }
    });
    async function executeTool(name, args) {
        const context = {
            container,
            reqId: crypto_1.default.randomUUID(),
            name,
            args
        };
        await pipeline.execute(context);
        let result = context.result;
        let parsed;
        try {
            parsed = JSON.parse(result.content[0].text);
        }
        catch (e) {
            parsed = result.content[0].text;
        }
        const isErrorPayload = result?.isError || (parsed && parsed.isError) || (parsed && parsed.error);
        if (parsed && parsed.content && parsed.content[0] && typeof parsed.content[0].text === 'string') {
            try {
                parsed = JSON.parse(parsed.content[0].text);
            }
            catch (e) { }
        }
        if (context.isError || isErrorPayload) {
            const errorText = parsed?.error || parsed?.message || (parsed?.content && parsed.content[0]?.text) || JSON.stringify(parsed);
            try {
                const parsedErr = typeof errorText === 'string' ? JSON.parse(errorText) : errorText;
                throw new Error(parsedErr.message || parsedErr.error || JSON.stringify(parsedErr));
            }
            catch (e) {
                throw new Error(typeof errorText === 'string' ? errorText : JSON.stringify(errorText));
            }
        }
        return parsed;
    }
    (0, vitest_1.describe)('Fix 1: Tiered Execution Model', () => {
        (0, vitest_1.it)('automatically executes loops 2, 3, and 4 when loop 1 finishes', async () => {
            const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
            const token = dev.agent_token;
            // Create a task
            const task = await executeTool('create_task', {
                title: 'Tiered Loop Task',
                priority: 5,
                agent_token: token
            });
            // Claim it
            await executeTool('claim_task', {
                agent_id: dev.agent_id,
                agent_token: token
            });
            // Run loop 1
            const loop1Res = await executeTool('run_task_loop', {
                task_id: task.id,
                agent_id: dev.agent_id,
                loop_number: 1,
                loop_output: { code: 'console.log("hello");' },
                changes_summary: 'Implementation of loop 1',
                agent_token: token
            });
            (0, vitest_1.expect)(loop1Res.status).toBe('LOOP_COMPLETE');
            (0, vitest_1.expect)(loop1Res.completed_loop).toBe(1);
            (0, vitest_1.expect)(loop1Res.intermediate_loops_completed).toEqual([2, 3, 4]);
            (0, vitest_1.expect)(loop1Res.next_loop).toBe(5);
            // Verify that loop 2, 3, and 4 exist and are recorded in the DB
            const loopState = await dbInstance.getLoopState(task.id);
            (0, vitest_1.expect)(loopState.taskLoops).toHaveLength(4);
            (0, vitest_1.expect)(loopState.taskLoops[0].loop_number).toBe(1);
            (0, vitest_1.expect)(loopState.taskLoops[1].loop_number).toBe(2);
            (0, vitest_1.expect)(loopState.taskLoops[2].loop_number).toBe(3);
            (0, vitest_1.expect)(loopState.taskLoops[3].loop_number).toBe(4);
        });
    });
    (0, vitest_1.describe)('Fix 2: Lock Heartbeat with Auto-Renewal', () => {
        (0, vitest_1.it)('acquires lock with token and extends TTL via renew_lock_ttl', async () => {
            const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
            const token = dev.agent_token;
            const filePath = 'test_lock_heartbeat.js';
            const lockRes = await executeTool('acquire_file_lock', {
                file_path: filePath,
                agent_id: dev.agent_id,
                task_id: 'task-lock',
                agent_token: token
            });
            (0, vitest_1.expect)(lockRes.granted).toBe(true);
            (0, vitest_1.expect)(lockRes.lock_token).toBeDefined();
            const renewRes = await executeTool('renew_lock_ttl', {
                lock_token: lockRes.lock_token,
                agent_token: token
            });
            (0, vitest_1.expect)(renewRes.success).toBe(true);
            (0, vitest_1.expect)(renewRes.file_path).toBe(filePath);
            (0, vitest_1.expect)(renewRes.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });
    (0, vitest_1.describe)('Fix 3: Topology-Blind Task Interface', () => {
        (0, vitest_1.it)('creates tasks via declare_task_intent and resolves dependencies semantically', async () => {
            const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
            const token = dev.agent_token;
            // First task
            await executeTool('declare_task_intent', {
                title: 'Database Schema Setup',
                description: 'Initialize PostgreSQL tables for user onboarding and profile storage.',
                agent_token: token
            });
            // Second task (dependent semantically due to "onboarding" keyword/similarity)
            const res = await executeTool('declare_task_intent', {
                title: 'User Onboarding Flow',
                description: 'Build registration UI and onboarding screen that hooks into database schema setup.',
                agent_token: token
            });
            (0, vitest_1.expect)(res.success).toBe(true);
            (0, vitest_1.expect)(res.depends_on).toBeDefined();
            (0, vitest_1.expect)(res.depends_on.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('Fix 4: Async Validation', () => {
        (0, vitest_1.it)('runs validate_output asynchronously and polls completion using get_validation_result', async () => {
            const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
            const token = dev.agent_token;
            const validateRes = await executeTool('validate_output', {
                code: 'const x = 5;',
                file_path: 'index.ts',
                agent_token: token
            });
            (0, vitest_1.expect)(validateRes.status).toBe('running');
            (0, vitest_1.expect)(validateRes.validation_job_id).toBeDefined();
            const pollRes = await executeTool('get_validation_result', {
                validation_job_id: validateRes.validation_job_id,
                agent_token: token
            });
            (0, vitest_1.expect)(pollRes.status).toBe('completed');
            (0, vitest_1.expect)(pollRes.passed).toBe(true);
        });
    });
    (0, vitest_1.describe)('Fix 5: Validation Feedback Compression', () => {
        (0, vitest_1.it)('refine_and_write throws a compressed JSON violations summary on rules failure', async () => {
            const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
            const token = dev.agent_token;
            const filePath = 'test_violations.js';
            await executeTool('acquire_file_lock', {
                file_path: filePath,
                agent_id: dev.agent_id,
                task_id: 'task-violations',
                agent_token: token
            });
            // Code with explicit ASE violations
            const badCode = `
        const x = 1;
        /* ⚠️ ASE_VIOLATION[Rule 'never_do' violated: useEffect usage]: useEffect(() => {}) */
        // ⚠️ ASE_UNUSED_IMPORT: import fs from 'fs'
        // ⚠️ ASE_TYPE[type-error]: expected string, got number
      `;
            await (0, vitest_1.expect)(executeTool('refine_and_write', {
                task_id: 'task-violations',
                agent_id: dev.agent_id,
                file_path: filePath,
                code: badCode,
                agent_token: token
            })).rejects.toThrow(/violations_summary/);
            // Verify structure of parsed error JSON
            try {
                await executeTool('refine_and_write', {
                    task_id: 'task-violations',
                    agent_id: dev.agent_id,
                    file_path: filePath,
                    code: badCode,
                    agent_token: token
                });
            }
            catch (err) {
                const errorData = JSON.parse(err.message);
                (0, vitest_1.expect)(errorData.error_code).toBe('VALIDATION_FAILED');
                (0, vitest_1.expect)(errorData.violations_summary.total_count).toBe(3);
                (0, vitest_1.expect)(errorData.violations_summary.categories.rules.count).toBe(1);
                (0, vitest_1.expect)(errorData.violations_summary.categories.unused_imports.count).toBe(1);
                (0, vitest_1.expect)(errorData.violations_summary.categories.types.count).toBe(1);
                (0, vitest_1.expect)(errorData.violations_summary.categories.rules.violations[0]).toContain("never_do' violated: useEffect usage");
            }
        });
    });
});
