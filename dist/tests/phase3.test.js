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
const SessionState = require('../src/services/session-state');
const SkillCache = require('../src/services/cache');
const Container_1 = require("../src/core/Container");
const Pipeline_1 = require("../src/middleware/Pipeline");
const AuthMiddleware_1 = require("../src/middleware/AuthMiddleware");
const ToolExecutionMiddleware_1 = require("../src/middleware/ToolExecutionMiddleware");
const MetricsMiddleware_1 = require("../src/middleware/MetricsMiddleware");
const register_agent_1 = __importDefault(require("../src/tools/register_agent"));
const create_task_1 = __importDefault(require("../src/tools/create_task"));
const claim_task_1 = __importDefault(require("../src/tools/claim_task"));
const load_skill_1 = __importDefault(require("../src/tools/load_skill"));
const log_skill_step_1 = __importDefault(require("../src/tools/log_skill_step"));
const get_health_1 = __importDefault(require("../src/tools/get_health"));
const upgrade_skill_pin_1 = __importDefault(require("../src/tools/upgrade_skill_pin"));
const configure_alert_thresholds_1 = __importDefault(require("../src/tools/configure_alert_thresholds"));
const run_task_loop_1 = __importDefault(require("../src/tools/run_task_loop"));
(0, vitest_1.describe)('ASE MCP Server Phase 3 Upgrades', () => {
    let dbInstance;
    let redis;
    let container;
    let pipeline;
    let tokenSecret;
    let sessionState;
    let skillCache;
    let metrics;
    (0, vitest_1.beforeEach)(async () => {
        process.env.ASE_ORCHESTRATION_DB = path_1.default.join(__dirname, `test_phase3_${Date.now()}.db`);
        process.env.ASE_STATE_DB = path_1.default.join(__dirname, `test_state_${Date.now()}.db`);
        // Reset OrchestrationDB singleton
        try {
            OrchestrationDB.getInstance().close();
        }
        catch (e) { }
        dbInstance = OrchestrationDB.getInstance();
        redis = await dbInstance.getRedisClient();
        // Flush Redis database for clean tests
        await redis.flushdb();
        // Setup SessionState and SkillCache
        const sessionId = crypto_1.default.randomUUID();
        sessionState = new SessionState(sessionId);
        skillCache = new SkillCache();
        metrics = require('../src/utils/metrics');
        // Reset metrics store
        const snap = metrics.snapshot();
        for (const key of Object.keys(snap.counters)) {
            // no direct clear, but we can set them to 0 or rely on new test labels
        }
        // Setup IoC Container
        container = new Container_1.Container();
        tokenSecret = crypto_1.default.randomBytes(32).toString('hex');
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
        // Registry mockup
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
        registry.register(new register_agent_1.default());
        registry.register((0, create_task_1.default)());
        registry.register((0, claim_task_1.default)());
        registry.register((0, load_skill_1.default)(deps));
        registry.register((0, log_skill_step_1.default)(deps));
        registry.register((0, get_health_1.default)(deps));
        registry.register(new upgrade_skill_pin_1.default());
        registry.register(new configure_alert_thresholds_1.default());
        registry.register(new run_task_loop_1.default());
        // Setup Pipeline with MetricsMiddleware
        pipeline = new Pipeline_1.Pipeline()
            .use(new MetricsMiddleware_1.MetricsMiddleware())
            .use(new AuthMiddleware_1.AuthMiddleware())
            .use(new ToolExecutionMiddleware_1.ToolExecutionMiddleware());
    });
    (0, vitest_1.afterEach)(async () => {
        // Clear Redis degraded key
        if (redis) {
            try {
                await redis.del('ase:system_degraded');
                await redis.del('ase:alert_thresholds');
            }
            catch (e) { }
        }
        if (dbInstance) {
            dbInstance.close();
        }
        if (sessionState && sessionState.db) {
            sessionState.db.close();
        }
        try {
            await promises_1.default.unlink(process.env.ASE_ORCHESTRATION_DB);
            await promises_1.default.unlink(process.env.ASE_ORCHESTRATION_DB + '-wal');
            await promises_1.default.unlink(process.env.ASE_ORCHESTRATION_DB + '-shm');
        }
        catch (e) { }
        try {
            await promises_1.default.unlink(process.env.ASE_STATE_DB);
            await promises_1.default.unlink(process.env.ASE_STATE_DB + '-wal');
            await promises_1.default.unlink(process.env.ASE_STATE_DB + '-shm');
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
        // Unwrap if result contains inner text content (MCP envelope)
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
    (0, vitest_1.describe)('T3-B: Skill Versioning and Session Pinning', () => {
        (0, vitest_1.it)('pins loaded skill version and ignores updates until upgraded', async () => {
            const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
            const token = dev.agent_token;
            // 1. Create a dummy skill folder on disk
            const skillsDir = path_1.default.resolve(__dirname, '../../../');
            const tempSkillName = `test-skill-${Date.now()}`;
            const tempSkillPath = path_1.default.join(skillsDir, tempSkillName);
            await promises_1.default.mkdir(tempSkillPath, { recursive: true });
            const skillFile = path_1.default.join(tempSkillPath, 'SKILL.md');
            try {
                // Write v1.0.0
                await promises_1.default.writeFile(skillFile, `---\nname: Test Skill\nversion: 1.0.0\nrisk: safe\ndescription: Test description\n---\n<!-- step_id: step1 -->\nStep content v1`, 'utf8');
                // Load skill (first time)
                const load1 = await executeTool('load_skill', {
                    skill_name: tempSkillName,
                    agent_token: token
                });
                (0, vitest_1.expect)(load1.version).toBe('1.0.0');
                (0, vitest_1.expect)(load1.content).toContain('Step content v1');
                // Verify pinning in sessionState database
                const pinned = sessionState.getPinnedSkill(tempSkillName);
                (0, vitest_1.expect)(pinned.version).toBe('1.0.0');
                // 2. Update skill file to v2.0.0 on disk
                await promises_1.default.writeFile(skillFile, `---\nname: Test Skill\nversion: 2.0.0\nrisk: safe\ndescription: Test description\n---\n<!-- step_id: step1 -->\nStep content v2`, 'utf8');
                // Invalidate skillCache so it would re-read if not pinned
                skillCache.cache.delete(tempSkillName);
                // Load skill again (should still return v1.0.0 and old content)
                const load2 = await executeTool('load_skill', {
                    skill_name: tempSkillName,
                    agent_token: token
                });
                (0, vitest_1.expect)(load2.version).toBe('1.0.0');
                (0, vitest_1.expect)(load2.content).toContain('Step content v1');
                // 3. Explicitly upgrade the pin to v2.0.0
                const upgradeRes = await executeTool('upgrade_skill_pin', {
                    skill_id: tempSkillName,
                    new_version: '2.0.0',
                    agent_token: token
                });
                (0, vitest_1.expect)(upgradeRes.success).toBe(true);
                // Load skill again (should now return v2.0.0 and new content)
                const load3 = await executeTool('load_skill', {
                    skill_name: tempSkillName,
                    agent_token: token
                });
                (0, vitest_1.expect)(load3.version).toBe('2.0.0');
                (0, vitest_1.expect)(load3.content).toContain('Step content v2');
            }
            finally {
                try {
                    await promises_1.default.unlink(skillFile);
                    await promises_1.default.rmdir(tempSkillPath);
                }
                catch (e) { }
            }
        });
    });
    (0, vitest_1.describe)('T3-C: Enforce log_skill_step at the Server Level', () => {
        (0, vitest_1.it)('blocks Loop 3 of task execution until log_skill_step is recorded', async () => {
            const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
            const token = dev.agent_token;
            // Create a task
            const task = await executeTool('create_task', {
                title: 'Task C',
                agent_token: token
            });
            // Claim it
            await executeTool('claim_task', {
                agent_id: dev.agent_id,
                agent_token: token
            });
            // Try running Loop 3 immediately (should fail because loop 1 and 2 not run yet, but let's run loop 1 and 2 first)
            await executeTool('run_task_loop', {
                task_id: task.id,
                agent_id: dev.agent_id,
                loop_number: 1,
                loop_output: { code: 'code1' },
                changes_summary: 'init',
                agent_token: token
            });
            await executeTool('run_task_loop', {
                task_id: task.id,
                agent_id: dev.agent_id,
                loop_number: 2,
                loop_output: { code: 'code2' },
                changes_summary: 'hardened',
                agent_token: token
            });
            // Try running Loop 3 without log_skill_step. Should fail!
            await (0, vitest_1.expect)(executeTool('run_task_loop', {
                task_id: task.id,
                agent_id: dev.agent_id,
                loop_number: 3,
                loop_output: { code: 'code3' },
                changes_summary: 'performance',
                agent_token: token
            })).rejects.toThrow(/Loop 3 \(PERFORMANCE_AND_RESILIENCE\) cannot begin/);
            // Now log a skill step
            await sessionState.initSkill('some-skill', ['stepA']);
            await executeTool('log_skill_step', {
                skill_name: 'some-skill',
                step_id: 'stepA',
                status: 'completed',
                agent_token: token
            });
            // Try running Loop 3 again. Should now succeed!
            const loop3Res = await executeTool('run_task_loop', {
                task_id: task.id,
                agent_id: dev.agent_id,
                loop_number: 3,
                loop_output: { code: 'code3' },
                changes_summary: 'performance',
                agent_token: token
            });
            (0, vitest_1.expect)(loop3Res.completed_loop).toBe(3);
        });
    });
    (0, vitest_1.describe)('T3-D: Real-Time Alerting Layer on get_metrics', () => {
        (0, vitest_1.it)('sets system degraded status on threshold breach and blocks claim_task', async () => {
            const dev = await executeTool('register_agent', { role: 'dev', capabilities: ['*'] });
            const token = dev.agent_token;
            // 1. Configure alert thresholds with extremely low latency threshold
            await executeTool('configure_alert_thresholds', {
                p99_latency_ms: 1, // 1 ms threshold is very easy to breach
                agent_token: token
            });
            // 2. Perform a tool call that takes > 1ms (any tool call will do)
            // The MetricsMiddleware will record this latency, see it breaches 1ms, and mark system degraded.
            await executeTool('get_health', { agent_token: token });
            // 3. get_health should now show status: degraded
            const health1 = await executeTool('get_health', { agent_token: token });
            (0, vitest_1.expect)(health1.status).toBe('degraded');
            // 4. claim_task should be blocked / paused
            const claimRes = await executeTool('claim_task', {
                agent_id: dev.agent_id,
                agent_token: token
            });
            (0, vitest_1.expect)(claimRes.error_code).toBe('SERVICE_DEGRADED');
            (0, vitest_1.expect)(claimRes.retry_after).toBe(30);
            // 5. Restore healthy state by setting higher threshold
            await executeTool('configure_alert_thresholds', {
                p99_latency_ms: 10000, // 10 seconds is well above the duration
                agent_token: token
            });
            // Run another tool call to trigger metrics evaluation
            await executeTool('get_health', { agent_token: token });
            // get_health should show healthy again
            const health2 = await executeTool('get_health', { agent_token: token });
            (0, vitest_1.expect)(health2.status).toBe('healthy');
        });
    });
});
