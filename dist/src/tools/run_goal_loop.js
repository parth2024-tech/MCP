"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const goal_loop_engine_1 = require("../services/goal-loop-engine");
const RunGoalLoopSchema = zod_1.z.object({
    goal: zod_1.z.string().describe('The strict definition of what "done" looks like (e.g. "Clean syntax, zero AST violations, pass all never_do checks")'),
    code: zod_1.z.string().describe('The source code or text to iterate and refine in the autonomous loop'),
    file_path: zod_1.z.string().optional().default('index.ts').describe('Target file path used for AST rule detection (e.g. src/auth.ts)'),
    max_tries: zod_1.z.number().optional().default(8).describe('Hard iteration limit to prevent infinite loops (default: 8, max: 20)'),
    target_score: zod_1.z.number().optional().default(8.0).describe('Minimum quality bar out of 10.0 required to pass the Gate (default: 8.0)'),
    never_do_rules: zod_1.z.array(zod_1.z.string()).optional().describe('Custom constraint rules to enforce. If omitted, loaded from .ase-project.json')
});
class RunGoalLoopTool extends BaseTool_1.BaseTool {
    name = 'run_goal_loop';
    description = 'Executes an autonomous Loop Engineering cycle (Doer + Independent Checker + Gate) with iterative self-correction up to a hard iteration ceiling.';
    schema = RunGoalLoopSchema;
    async execute(args, context) {
        let rules = args.never_do_rules || [];
        // Auto-load rules from .ase-project.json if omitted
        if (rules.length === 0) {
            try {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                const path = await Promise.resolve().then(() => __importStar(require('path')));
                const configPath = path.join(process.cwd(), '.ase-project.json');
                if (fs.existsSync(configPath)) {
                    const raw = fs.readFileSync(configPath, 'utf8');
                    const config = JSON.parse(raw);
                    if (Array.isArray(config.never_do)) {
                        rules = config.never_do;
                    }
                }
            }
            catch {
                // Fallback to empty rules
            }
        }
        const orchDb = context.container.resolve('OrchestrationDB');
        let dbHandle = null;
        if (orchDb && typeof orchDb.getDB === 'function') {
            dbHandle = orchDb.getDB();
        }
        const engine = new goal_loop_engine_1.GoalLoopEngine(dbHandle);
        const result = await engine.runLoop({
            goal: args.goal,
            initialContent: args.code,
            filePath: args.file_path,
            maxTries: args.max_tries,
            targetScore: args.target_score,
            neverDoRules: rules
        });
        return {
            run_id: result.runId,
            goal: result.goal,
            status: result.status,
            total_tries: result.totalTries,
            final_score: result.finalScore,
            passed: result.status === 'passed',
            final_content: result.finalContent,
            duration_ms: result.durationMs,
            history: result.iterations.map(it => ({
                try: it.iteration,
                score: it.score,
                passed: it.passed,
                violations: it.violations,
                feedback: it.feedback
            }))
        };
    }
}
exports.default = RunGoalLoopTool;
