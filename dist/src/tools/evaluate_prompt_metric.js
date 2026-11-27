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
const teleprompter_1 = require("../services/teleprompter");
const EvaluatePromptMetricSchema = zod_1.z.object({
    code: zod_1.z.string().describe('Source code or textual completion to evaluate against AST and quality metrics'),
    file_path: zod_1.z.string().optional().default('index.ts').describe('Target file path (determines whether AST parser is triggered)'),
    never_do_rules: zod_1.z.array(zod_1.z.string()).optional().describe('Optional list of custom never_do constraint rules to enforce')
});
class EvaluatePromptMetricTool extends BaseTool_1.BaseTool {
    name = 'evaluate_prompt_metric';
    description = 'Evaluates and scores a code or prompt output against AST parsing validity, never_do constraint compliance, and token efficiency.';
    schema = EvaluatePromptMetricSchema;
    async execute(args, _context) {
        let rules = args.never_do_rules || [];
        // If no custom rules provided, attempt to load from .ase-project.json
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
        const astResult = teleprompter_1.MetricEvaluator.evaluateAstSafety(args.code, args.file_path);
        const compositeResult = teleprompter_1.MetricEvaluator.evaluateComposite({ code: args.code, file_path: args.file_path }, rules);
        return {
            passed: compositeResult.passed,
            score: compositeResult.score,
            ast_valid: astResult.passed,
            violations: compositeResult.violations,
            metrics: compositeResult.metrics
        };
    }
}
exports.default = EvaluatePromptMetricTool;
