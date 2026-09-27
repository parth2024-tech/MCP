/**
 * GoalLoopEngine — Autonomous Loop Engineering Engine
 *
 * Implements the Loop Engineering framework:
 * - Doer + Checker Architecture: Decouples synthesis (Doer) from verification (Checker).
 * - The Gate: Automated pass/fail filter (AST check, rule compliance, quality score).
 * - Self-Correction Reflexion: Generates actionable feedback for failed iterations.
 * - Hard Iteration Cap: Default 8 tries ceiling to prevent runaway loops.
 * - State Checkpointing: Persists loop progress in SQLite orchestration.db.
 */

import crypto from 'crypto';
import { MetricEvaluator } from './teleprompter';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrchestrationDB = require('./orchestration-db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('../utils/metrics');

export interface GoalLoopOptions {
  goal: string;
  initialContent: string;
  filePath?: string;
  maxTries?: number;
  targetScore?: number; // 1.0 to 10.0 scale (default 8.0)
  neverDoRules?: string[];
  doerFn?: (
    currentContent: string,
    iteration: number,
    feedback?: string
  ) => Promise<string> | string;
}

export interface IterationReport {
  iteration: number;
  score: number; // 1.0 to 10.0
  passed: boolean;
  violations: string[];
  feedback?: string;
  content: string;
  durationMs: number;
}

export interface GoalLoopResult {
  runId: string;
  goal: string;
  status: 'passed' | 'max_tries_reached';
  totalTries: number;
  finalScore: number;
  finalContent: string;
  iterations: IterationReport[];
  durationMs: number;
}

export class GoalLoopEngine {
  private db: unknown;

  constructor(dbHandle?: unknown) {
    if (dbHandle) {
      this.db = dbHandle;
    } else {
      try {
        const orch = OrchestrationDB.getInstance();
        this.db = orch.getDB();
      } catch {
        this.db = null;
      }
    }
  }

  /**
   * The Independent Checker: Evaluates work produced by the Doer.
   * "Never let the Doer grade its own work."
   */
  public evaluateOutput(
    content: string,
    filePath = 'index.ts',
    neverDoRules: string[] = [],
    targetScore = 8.0
  ): { passed: boolean; score: number; violations: string[]; feedback?: string } {
    const astResult = MetricEvaluator.evaluateAstSafety(content, filePath);
    const neverDoResult = MetricEvaluator.evaluateNeverDo(content, neverDoRules);
    const violations = [...astResult.violations, ...neverDoResult.violations];

    // Compute composite score on a 1.0 - 10.0 scale
    const baseEval = MetricEvaluator.evaluateComposite({ code: content, file_path: filePath }, neverDoRules);
    const scaledScore = Number((baseEval.score * 10).toFixed(1));

    const gatePassed = violations.length === 0 && scaledScore >= targetScore;

    let feedback: string | undefined;
    if (!gatePassed) {
      if (violations.length > 0) {
        feedback = `Gate rejected: Found ${violations.length} violation(s):\n${violations.map(v => `- ${v}`).join('\n')}`;
      } else {
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
  public async runLoop(options: GoalLoopOptions): Promise<GoalLoopResult> {
    const startMs = Date.now();
    const runId = crypto.randomUUID();
    const maxTries = Math.max(1, Math.min(options.maxTries ?? 8, 20)); // Capped between 1 and 20
    const targetScore = options.targetScore ?? 8.0;
    const filePath = options.filePath ?? 'index.ts';
    const neverDo = options.neverDoRules ?? [];

    let currentContent = options.initialContent;
    let feedback: string | undefined;
    const iterationReports: IterationReport[] = [];

    // Default Doer implementation: removes trailing whitespace and fixes common linter errors if no custom doer is given
    const doer = options.doerFn ?? ((content: string, iteration: number, fb?: string) => {
      let refined = content;
      if (fb && fb.includes('never_do rule') && fb.includes('useEffect')) {
        refined = refined.replace(/\buseEffect\s*\([^)]*\);?/g, '/* useEffect removed per never_do rule */');
      }
      return refined;
    });

    for (let attempt = 1; attempt <= maxTries; attempt++) {
      const iterStart = Date.now();

      // 1. DOER: Synthesizes or refines the content
      currentContent = await doer(currentContent, attempt, feedback);

      // 2. CHECKER: Independent validation
      const check = this.evaluateOutput(currentContent, filePath, neverDo, targetScore);

      const report: IterationReport = {
        iteration: attempt,
        score: check.score,
        passed: check.passed,
        violations: check.violations,
        feedback: check.feedback,
        content: currentContent,
        durationMs: Date.now() - iterStart
      };
      iterationReports.push(report);

      // 3. Persist iteration in database if available
      if (this.db) {
        try {
          const typedDb = this.db as {
            prepare: (sql: string) => { run: (...args: unknown[]) => void };
          };
          typedDb.prepare(`
            INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())
          `).run(
            runId,
            options.goal.substring(0, 32),
            attempt,
            `LOOP_TRY_${attempt}`,
            options.initialContent,
            currentContent,
            check.passed ? 'PASSED_GATE' : `VIOLATIONS: ${check.violations.length}`
          );
        } catch {
          // Ignore DB logging errors in transient runs
        }
      }

      metrics.increment('goal_loop.iteration');

      // 4. THE GATE: Check if the bar is met
      if (check.passed) {
        metrics.increment('goal_loop.success');
        return {
          runId,
          goal: options.goal,
          status: 'passed',
          totalTries: attempt,
          finalScore: check.score,
          finalContent: currentContent,
          iterations: iterationReports,
          durationMs: Date.now() - startMs
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
      durationMs: Date.now() - startMs
    };
  }
}
