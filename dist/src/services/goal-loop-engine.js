"use strict";
/**
 * GoalLoopEngine — Autonomous Loop Engineering Engine
 *
 * Implements the Loop Engineering framework:
 * - Doer + Checker Architecture: Decouples synthesis (Doer) from verification (Checker).
 * - The Gate: Automated pass/fail filter (AST check, rule compliance, quality score).
 * - Self-Correction Reflexion: Generates actionable feedback for failed iterations.
 * - Hard Iteration Cap: Default 8 tries ceiling to prevent runaway loops.
 * - State Checkpointing: Persists loop progress in SQLite orchestration.db.
 * - Two-Pass Gated Execution: Pass 1 AST structural skeleton -> Pass 2 refinement.
 * - Anti-Marathon Breaker: Convergence monitor halting stagnating loops early.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalLoopEngine = void 0;
const crypto_1 = __importDefault(require("crypto"));
const teleprompter_1 = require("./teleprompter");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrchestrationDB = require('./orchestration-db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('../utils/metrics');
class GoalLoopEngine {
    db;
    constructor(dbHandle) {
        if (dbHandle) {
            this.db = dbHandle;
        }
        else {
            try {
                const orch = OrchestrationDB.getInstance();
                this.db = orch.getDB();
            }
            catch {
                this.db = null;
            }
        }
    }
    /**
     * The Independent Checker: Evaluates work produced by the Doer.
     * "Never let the Doer grade its own work."
     */
    evaluateOutput(content, filePath = 'index.ts', neverDoRules = [], targetScore = 8.0) {
        const astResult = teleprompter_1.MetricEvaluator.evaluateAstSafety(content, filePath);
        const neverDoResult = teleprompter_1.MetricEvaluator.evaluateNeverDo(content, neverDoRules);
        const violations = [...astResult.violations, ...neverDoResult.violations];
        // Compute composite score on a 1.0 - 10.0 scale
        const baseEval = teleprompter_1.MetricEvaluator.evaluateComposite({ code: content, file_path: filePath }, neverDoRules);
        const scaledScore = Number((baseEval.score * 10).toFixed(1));
        const gatePassed = violations.length === 0 && scaledScore >= targetScore;
        let feedback;
        if (!gatePassed) {
            if (violations.length > 0) {
                feedback = `Gate rejected: Found ${violations.length} violation(s):\n${violations.map(v => `- ${v}`).join('\n')}`;
            }
            else {
                feedback = `Gate rejected: Score ${scaledScore}/10 is below the target bar of ${targetScore}/10. Refine code structure and token hygiene.`;
            }
        }
        return {
            passed: gatePassed,
            score: scaledScore,
            violations,
            feedback
        };
    }
    /**
     * Runs the autonomous goal loop.
     */
    async runLoop(options) {
        const startMs = Date.now();
        const runId = crypto_1.default.randomUUID();
        const maxTries = Math.max(1, Math.min(options.maxTries ?? 8, 20)); // Capped between 1 and 20
        const targetScore = options.targetScore ?? 8.0;
        const filePath = options.filePath ?? 'index.ts';
        const neverDo = options.neverDoRules ?? [];
        const twoPass = options.twoPassMode ?? false;
        const antiMarathon = options.antiMarathonBreaker ?? false;
        let currentContent = options.initialContent;
        let feedback;
        const iterationReports = [];
        let currentPhase = twoPass ? 'pass1_skeleton' : 'standard';
        let skeletonVerified = false;
        let consecutiveStagnations = 0;
        // Default Doer implementation: removes trailing whitespace and fixes common linter errors if no custom doer is given
        const doer = options.doerFn ?? ((content, iteration, fb, phase) => {
            let refined = content;
            if (phase === 'pass1_skeleton') {
                refined = refined.trim();
            }
            if (fb && fb.includes('never_do rule') && fb.includes('useEffect')) {
                refined = refined.replace(/\buseEffect\s*\([^)]*\);?/g, '/* useEffect removed per never_do rule */');
            }
            return refined;
        });
        for (let attempt = 1; attempt <= maxTries; attempt++) {
            const iterStart = Date.now();
            const executedPhase = currentPhase;
            // 1. DOER: Synthesizes or refines the content
            currentContent = await doer(currentContent, attempt, feedback, executedPhase);
            // 2. CHECKER: Validation depending on loop phase
            let check;
            let stagnationDetected = false;
            if (twoPass && executedPhase === 'pass1_skeleton') {
                // In Pass 1, evaluate AST structure & syntax
                const astResult = teleprompter_1.MetricEvaluator.evaluateAstSafety(currentContent, filePath);
                const pass1Passed = astResult.passed;
                check = {
                    passed: pass1Passed,
                    score: pass1Passed ? 8.0 : 4.0,
                    violations: astResult.violations,
                    feedback: pass1Passed
                        ? undefined
                        : `Gate rejected (Pass 1 Skeleton): AST structural failure:\n${astResult.violations.map(v => `- ${v}`).join('\n')}`
                };
                if (pass1Passed) {
                    skeletonVerified = true;
                    // Set phase for subsequent iteration
                    currentPhase = 'pass2_refine';
                }
            }
            else {
                // Standard or Pass 2 full gate evaluation
                check = this.evaluateOutput(currentContent, filePath, neverDo, targetScore);
            }
            // Check Anti-Marathon Breaker if enabled
            if (antiMarathon && attempt > 1) {
                const prevReport = iterationReports[iterationReports.length - 1];
                if (check.score <= prevReport.score && check.violations.length >= prevReport.violations.length) {
                    consecutiveStagnations++;
                    if (consecutiveStagnations >= 2) {
                        stagnationDetected = true;
                    }
                }
                else {
                    consecutiveStagnations = 0;
                }
            }
            const report = {
                iteration: attempt,
                score: check.score,
                passed: check.passed,
                violations: check.violations,
                feedback: check.feedback,
                content: currentContent,
                durationMs: Date.now() - iterStart,
                phase: executedPhase,
                stagnationDetected
            };
            iterationReports.push(report);
            // 3. Persist iteration in database if available
            if (this.db) {
                try {
                    const typedDb = this.db;
                    typedDb.prepare(`
            INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
          `).run(runId, options.goal.substring(0, 32), attempt, `LOOP_TRY_${attempt}_${executedPhase}`, options.initialContent, currentContent, check.passed ? 'PASSED_GATE' : `VIOLATIONS: ${check.violations.length}`);
                }
                catch {
                    // Ignore DB logging errors in transient runs
                }
            }
            metrics.increment('goal_loop.iteration');
            // 4. THE GATE: Check if the bar is met
            if (check.passed && (!twoPass || executedPhase === 'pass2_refine')) {
                metrics.increment('goal_loop.success');
                return {
                    runId,
                    goal: options.goal,
                    status: 'passed',
                    totalTries: attempt,
                    finalScore: check.score,
                    finalContent: currentContent,
                    iterations: iterationReports,
                    durationMs: Date.now() - startMs,
                    twoPassCompleted: twoPass
                };
            }
            // If stagnation detected by Anti-Marathon Breaker, halt early
            if (stagnationDetected) {
                metrics.increment('goal_loop.stagnation_halted');
                return {
                    runId,
                    goal: options.goal,
                    status: 'stagnation_halted',
                    totalTries: attempt,
                    finalScore: check.score,
                    finalContent: currentContent,
                    iterations: iterationReports,
                    durationMs: Date.now() - startMs,
                    twoPassCompleted: false
                };
            }
            // Prepare feedback for the next Doer turn
            feedback = check.feedback;
        }
        // Max tries reached without passing the gate
        metrics.increment('goal_loop.max_tries_reached');
        const lastReport = iterationReports[iterationReports.length - 1];
        return {
            runId,
            goal: options.goal,
            status: 'max_tries_reached',
            totalTries: maxTries,
            finalScore: lastReport ? lastReport.score : 0,
            finalContent: currentContent,
            iterations: iterationReports,
            durationMs: Date.now() - startMs,
            twoPassCompleted: false
        };
    }
}
exports.GoalLoopEngine = GoalLoopEngine;
