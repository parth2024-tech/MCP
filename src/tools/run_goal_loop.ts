import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { GoalLoopEngine } from '../services/goal-loop-engine';

const RunGoalLoopSchema = z.object({
  goal: z.string().describe('The strict definition of what "done" looks like (e.g. "Clean syntax, zero AST violations, pass all never_do checks")'),
  code: z.string().describe('The source code or text to iterate and refine in the autonomous loop'),
  file_path: z.string().optional().default('index.ts').describe('Target file path used for AST rule detection (e.g. src/auth.ts)'),
  max_tries: z.number().optional().default(8).describe('Hard iteration limit to prevent infinite loops (default: 8, max: 20)'),
  target_score: z.number().optional().default(8.0).describe('Minimum quality bar out of 10.0 required to pass the Gate (default: 8.0)'),
  never_do_rules: z.array(z.string()).optional().describe('Custom constraint rules to enforce. If omitted, loaded from .ase-project.json')
});

type RunGoalLoopArgs = z.infer<typeof RunGoalLoopSchema>;

export default class RunGoalLoopTool extends BaseTool<RunGoalLoopArgs> {
  name = 'run_goal_loop';
  description = 'Executes an autonomous Loop Engineering cycle (Doer + Independent Checker + Gate) with iterative self-correction up to a hard iteration ceiling.';
  schema = RunGoalLoopSchema;

  protected async execute(args: RunGoalLoopArgs, context: ToolContext): Promise<Record<string, unknown>> {
    let rules = args.never_do_rules || [];

    // Auto-load rules from .ase-project.json if omitted
    if (rules.length === 0) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const configPath = path.join(process.cwd(), '.ase-project.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(raw);
          if (Array.isArray(config.never_do)) {
            rules = config.never_do;
          }
        }
      } catch {
        // Fallback to empty rules
      }
    }

    const orchDb = context.container.resolve<unknown>('OrchestrationDB');
    let dbHandle = null;
    if (orchDb && typeof (orchDb as { getDB?: () => unknown }).getDB === 'function') {
      dbHandle = (orchDb as { getDB: () => unknown }).getDB();
    }

    const engine = new GoalLoopEngine(dbHandle);

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
