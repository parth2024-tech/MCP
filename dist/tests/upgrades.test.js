'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const orchestration_db_1 = __importDefault(require("../src/services/orchestration-db"));
const register_agent_1 = __importDefault(require("../src/tools/register_agent"));
const claim_task_1 = __importDefault(require("../src/tools/claim_task"));
const create_task_1 = __importDefault(require("../src/tools/create_task"));
const complete_task_1 = __importDefault(require("../src/tools/complete_task"));
const acquire_file_lock_1 = __importDefault(require("../src/tools/acquire_file_lock"));
const release_file_lock_1 = __importDefault(require("../src/tools/release_file_lock"));
const write_memory_1 = __importDefault(require("../src/tools/write_memory"));
const read_memory_1 = __importDefault(require("../src/tools/read_memory"));
const refine_and_write_1 = __importDefault(require("../src/tools/refine_and_write"));
const rollback_write_1 = __importDefault(require("../src/tools/rollback_write"));
const validate_output_1 = __importDefault(require("../src/tools/validate_output"));
const Container_1 = require("../src/core/Container");
const Pipeline_1 = require("../src/middleware/Pipeline");
const AuthMiddleware_1 = require("../src/middleware/AuthMiddleware");
const ToolExecutionMiddleware_1 = require("../src/middleware/ToolExecutionMiddleware");
(0, vitest_1.describe)('ASE MCP Server Upgrades', () => {
    let dbInstance;
    let redis;
    let container;
    let pipeline;
    let tokenSecret;
    (0, vitest_1.beforeEach)(async () => {
        process.env.ASE_ORCHESTRATION_DB = path_1.default.join(__dirname, `test_upgrades_${Date.now()}.db`);
        // Reset OrchestrationDB singleton
        try {
            orchestration_db_1.default.getInstance().close();
        }
        catch (e) { }
        dbInstance = orchestration_db_1.default.getInstance();
        redis = await dbInstance.getRedisClient();
        // Flush Redis database for clean tests
        await redis.flushdb();
        // Setup IoC Container
        container = new Container_1.Container();
        tokenSecret = crypto_1.default.randomBytes(32).toString('hex');
        container.register('TokenSecret', tokenSecret);
        container.register('OrchestrationDB', dbInstance);
        container.register('VirtualKeyManager', { isAuthorized: () => true });
        // Registry mockup
        const ToolRegistry = require('../src/services/registry');
        const registry = new ToolRegistry();
        container.register('ToolRegistry', registry);
        // Register upgrades tools
        registry.register(new register_agent_1.default());
        registry.register((0, create_task_1.default)());
        registry.register((0, claim_task_1.default)());
        registry.register((0, complete_task_1.default)());
        registry.register((0, acquire_file_lock_1.default)());
        registry.register((0, release_file_lock_1.default)());
        registry.register((0, write_memory_1.default)());
        registry.register((0, read_memory_1.default)());
        registry.register(new refine_and_write_1.default());
        registry.register(new rollback_write_1.default());
        registry.register((0, validate_output_1.default)({}));
        // Setup Pipeline
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
        if (context.isError || context.result?.isError) {
            const errorText = context.result.content[0].text;
            try {
                const parsed = JSON.parse(errorText);
                throw new Error(parsed.error || parsed.message || errorText);
            }
            catch (e) {
                throw new Error(errorText);
            }
        }
        return JSON.parse(context.result.content[0].text);
    }
    (0, vitest_1.it)('verifies signed token registration and capability enforcement', async () => {
        // 1. Bootstrap agent registration
        const regRes = await executeTool('register_agent', {
            role: 'audit',
            capabilities: ['get_health', 'read_memory']
        });
        (0, vitest_1.expect)(regRes.agent_token).toBeDefined();
        const token = regRes.agent_token;
        // 2. Call authorized tool (read_memory) - should not fail auth, but might return not found
        const readRes = await executeTool('read_memory', {
            key: 'test_key',
            agent_token: token
        });
        (0, vitest_1.expect)(readRes.found).toBe(false);
        // 3. Call unauthorized tool (claim_task) - should fail auth/capability check
        await (0, vitest_1.expect)(executeTool('claim_task', {
            agent_id: regRes.agent_id,
            agent_token: token
        })).rejects.toThrow(/possess capability/);
    });
    (0, vitest_1.it)('verifies Redis dual-layer storage task claims and lock management', async () => {
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
        (0, vitest_1.expect)(taskA.id).toBeDefined();
        // Claim task
        const claimRes = await executeTool('claim_task', {
            agent_id: dev.agent_id,
            agent_token: token
        });
        (0, vitest_1.expect)(claimRes.id).toBe(taskA.id);
        // Verify lock management
        const lockRes = await executeTool('acquire_file_lock', {
            file_path: '/tmp/test.ts',
            agent_id: dev.agent_id,
            task_id: taskA.id,
            agent_token: token
        });
        (0, vitest_1.expect)(lockRes.granted).toBe(true);
        // Conflicting lock
        const dev2 = await executeTool('register_agent', { role: 'dev2', capabilities: ['*'] });
        const lockConflict = await executeTool('acquire_file_lock', {
            file_path: '/tmp/test.ts',
            agent_id: dev2.agent_id,
            task_id: taskA.id,
            agent_token: dev2.agent_token
        });
        (0, vitest_1.expect)(lockConflict.granted).toBe(false);
    });
    (0, vitest_1.it)('verifies validate_output coupling and revision state transition', async () => {
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
        (0, vitest_1.expect)(valResFail.validation_run_id).toBeDefined();
        // Call complete_task with failed validation ID -> status should transition to needs_revision
        const completeResFail = await executeTool('complete_task', {
            agent_id: dev.agent_id,
            task_id: task.id,
            validate_output_id: valResFail.validation_run_id,
            status: 'completed',
            agent_token: token
        });
        (0, vitest_1.expect)(completeResFail.status).toBe('needs_revision');
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
        (0, vitest_1.expect)(completeResSuccess.status).toBe('completed');
    });
    (0, vitest_1.it)('verifies refine_and_write snapshot and rollback_write lock releases', async () => {
        const dev = await executeTool('register_agent', { role: 'developer', capabilities: ['*'] });
        const token = dev.agent_token;
        const testFile = path_1.default.join(__dirname, 'test_refine.txt');
        await promises_1.default.writeFile(testFile, 'initial content', 'utf8');
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
            (0, vitest_1.expect)(refineRes.snapshot_id).toBeDefined();
            const content = await promises_1.default.readFile(testFile, 'utf8');
            (0, vitest_1.expect)(content).toBe('refined content\n');
            // Rollback
            const rollbackRes = await executeTool('rollback_write', {
                file_path: testFile,
                snapshot_id: refineRes.snapshot_id,
                agent_token: token
            });
            (0, vitest_1.expect)(rollbackRes.status).toBe('ROLLED_BACK');
            // File should be restored
            const contentRestored = await promises_1.default.readFile(testFile, 'utf8');
            (0, vitest_1.expect)(contentRestored).toBe('initial content');
            // Lock should be released (can acquire it again)
            const lockRes = await executeTool('acquire_file_lock', {
                file_path: testFile,
                agent_id: dev.agent_id,
                task_id: 'task-refine',
                agent_token: token
            });
            (0, vitest_1.expect)(lockRes.granted).toBe(true);
        }
        finally {
            try {
                await promises_1.default.unlink(testFile);
            }
            catch (e) { }
        }
    });
});
