import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { MetricEvaluator } from '../services/teleprompter';

const EvaluatePromptMetricSchema = z.object({
  code: z.string().describe('Source code or textual completion to evaluate against AST and quality metrics'),
  file_path: z.string().optional().default('index.ts').describe('Target file path (determines whether AST parser is triggered)'),
  never_do_rules: z.array(z.string()).optional().describe('Optional list of custom never_do constraint rules to enforce')
});

type EvaluatePromptMetricArgs = z.infer<typeof EvaluatePromptMetricSchema>;

export default class EvaluatePromptMetricTool extends BaseTool<EvaluatePromptMetricArgs> {
  name = 'evaluate_prompt_metric';
  description = 'Evaluates and scores a code or prompt output against AST parsing validity, never_do constraint compliance, and token efficiency.';
  schema = EvaluatePromptMetricSchema;

  protected async execute(args: EvaluatePromptMetricArgs, _context: ToolContext): Promise<Record<string, unknown>> {
    let rules = args.never_do_rules || [];

    // If no custom rules provided, attempt to load from .ase-project.json
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

    const astResult = MetricEvaluator.evaluateAstSafety(args.code, args.file_path);
    const compositeResult = MetricEvaluator.evaluateComposite(
      { code: args.code, file_path: args.file_path },
      rules
    );

    return {
      passed: compositeResult.passed,
      score: compositeResult.score,
      ast_valid: astResult.passed,
      violations: compositeResult.violations,
      metrics: compositeResult.metrics
    };
  }
}
