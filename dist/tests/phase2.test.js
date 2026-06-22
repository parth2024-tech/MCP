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
const claim_task_1 = __importDefault(require("../src/tools/claim_task"));
const create_task_1 = __importDefault(require("../src/tools/create_task"));
const complete_task_1 = __importDefault(require("../src/tools/complete_task"));
const poll_events_1 = __importDefault(require("../src/tools/poll_events"));
const subscribe_events_1 = __importDefault(require("../src/tools/subscribe_events"));
const get_orchestration_state_1 = __importDefault(require("../src/tools/get_orchestration_state"));
const acquire_file_lock_1 = __importDefault(require("../src/tools/acquire_file_lock"));
const write_memory_1 = __importDefault(require("../src/tools/write_memory"));
const refine_and_write_1 = __importDefault(require("../src/tools/refine_and_write"));
const configure_deadlock_policy_1 = __importDefault(require("../src/tools/configure_deadlock_policy"));
const get_write_diff_1 = __importDefault(require("../src/tools/get_write_diff"));
const query_all_memory_1 = __importDefault(require("../src/tools/query_all_memory"));
const Container_1 = require("../src/core/Container");
const Pipeline_1 = require("../src/middleware/Pipeline");
const AuthMiddleware_1 = require("../src/middleware/AuthMiddleware");
const ToolExecutionMiddleware_1 = require("../src/middleware/ToolExecutionMiddleware");
(0, vitest_1.describe)('ASE MCP Server Phase 2 Upgrades', () => {
    let dbInstance;
    let redis;
    let container;
    let pipeline;
    let tokenSecret;
    let memoryServiceMock;
    (0, vitest_1.beforeEach)(async () => {
        process.env.ASE_ORCHESTRATION_DB = path_1.default.join(__dirname, `test_phase2_${Date.now()}.db`);
        // Reset OrchestrationDB singleton
        try {
            OrchestrationDB.getInstance().close();
        }
        catch (e) { }
        dbInstance = OrchestrationDB.getInstance();
        redis = await dbInstance.getRedisClient();
        // Flush Redis database for clean tests
        await redis.flushdb();
        // Mock MemoryService
        const mockMemories = [];
        memoryServiceMock = {
            memories: mockMemories,
            remember: async (eventType, content) => {
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
            recall: async (query, limit, threshold) => {
                return mockMemories.slice(0, limit);
            }
        };
        // Setup IoC Container
        container = new Container_1.Container();
        tokenSecret = crypto_1.default.randomBytes(32).toString('hex');
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
        registry.register(new register_agent_1.default());
        registry.register((0, create_task_1.default)());
        registry.register((0, claim_task_1.default)());
        registry.register((0, complete_task_1.default)());
        registry.register((0, poll_events_1.default)());
        registry.register((0, subscribe_events_1.default)());
        registry.register((0, get_orchestration_state_1.default)());
        registry.register((0, acquire_file_lock_1.default)());
        registry.register((0, write_memory_1.default)());
        registry.register(new refine_and_write_1.default());
        registry.register(new configure_deadlock_policy_1.default());
        registry.register(new get_write_diff_1.default());
        registry.register(new query_all_memory_1.default());
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
    (0, vitest_1.describe)('T2-A: Push-Based Events / Long-Polling', () => {
        (0, vitest_1.it)('supports long polling timeout', async () => {
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
            (0, vitest_1.expect)(pollRes.events).toHaveLength(0);
            (0, vitest_1.expect)(duration).toBeGreaterThanOrEqual(1000);
        });
        (0, vitest_1.it)('returns event immediately if match occurs during long poll', async () => {
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
            (0, vitest_1.expect)(pollRes.events).toHaveLength(1);
            (0, vitest_1.expect)(pollRes.events[0].type).toBe('task_created');
            (0, vitest_1.expect)(pollRes.events[0].payload.title).toBe('Long poll task');
        });
    });
    (0, vitest_1.describe)('T2-B: Cycle Detection & Deadlock Resolution', () => {
        (0, vitest_1.it)('detects and resolves deadlocks based on policy', async () => {
            const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
            const token = dev.agent_token;
            // Configure policy
            const policyRes = await executeTool('configure_deadlock_policy', {
                policy: 'priority-based',
                agent_token: token
            });
            (0, vitest_1.expect)(policyRes.success).toBe(true);
            (0, vitest_1.expect)(policyRes.policy).toBe('priority-based');
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
            (0, vitest_1.expect)(brokenTaskId).toBe(taskA.id); // taskA has lower priority (5 < 10)
            // State should show deadlock broken
            const state = await executeTool('get_orchestration_state', {
                agent_token: token
            });
            (0, vitest_1.expect)(state.deadlock_status.has_deadlock).toBe(false); // cycle is broken!
            (0, vitest_1.expect)(state.deadlock_status.deadlock_broken_tasks).toHaveLength(1);
            (0, vitest_1.expect)(state.deadlock_status.deadlock_broken_tasks[0].id).toBe(taskA.id);
            // Dev should be able to claim Task A despite Task B dependency because deadlock_broken = 1
            const claim = await executeTool('claim_task', {
                agent_id: dev.agent_id,
                agent_token: token
            });
            (0, vitest_1.expect)(claim).not.toBeNull();
            (0, vitest_1.expect)(claim.id).toBe(taskA.id);
        });
    });
    (0, vitest_1.describe)('T2-C: Transform Inspection Tool', () => {
        (0, vitest_1.it)('returns stage by stage transform diffs', async () => {
            const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
            const token = dev.agent_token;
            const testFile = path_1.default.join(__dirname, 'test_diff.txt');
            await promises_1.default.writeFile(testFile, 'initial text', 'utf8');
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
                (0, vitest_1.expect)(diffRes.write_session_id).toBe(sessionId);
                (0, vitest_1.expect)(diffRes.stages).toHaveLength(5);
                (0, vitest_1.expect)(diffRes.stages[0].loop_number).toBe(1);
                (0, vitest_1.expect)(diffRes.stages[0].before).toBeDefined();
                (0, vitest_1.expect)(diffRes.stages[0].after).toBeDefined();
            }
            finally {
                try {
                    await promises_1.default.unlink(testFile);
                }
                catch (e) { }
            }
        });
    });
    (0, vitest_1.describe)('T2-D: Unified Memory Architecture', () => {
        (0, vitest_1.it)('returns ranked unified memories', async () => {
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
            (0, vitest_1.expect)(queryRes.results.length).toBeGreaterThanOrEqual(1);
            (0, vitest_1.expect)(queryRes.results[0].score).toBeGreaterThan(0);
            (0, vitest_1.expect)(queryRes.results[0].source).toBeDefined(); // structured or semantic
        });
    });
});
