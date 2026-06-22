import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class GetValidationResultTool extends BaseTool<any> {
  name = 'get_validation_result';
  description = 'Poll the validation result of an async validation job. Will long-poll up to 5 seconds if not yet finished.';

  schema = z.object({
    validation_job_id: z.string().describe('The unique validation job ID returned by validate_output')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { validation_job_id } = args;
    const dbManager = context.container.resolve<any>('OrchestrationDB');
    const db = dbManager.getDB();

    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const run = db.prepare(
        `SELECT passed, details FROM validation_runs WHERE id = ?`
      ).get(validation_job_id);

      if (!run) {
        return {
          status: 'error',
          error_code: 'NOT_FOUND',
          message: `Validation job ${validation_job_id} not found.`
        };
      }

      let details: any = {};
      try {
        details = JSON.parse(run.details);
      } catch (e) {}

      if (details.status !== 'running') {
        return {
          status: 'completed',
          validation_job_id,
          passed: run.passed === 1,
          details
        };
      }

      // If still running, sleep for 500ms before checking again
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      status: 'running',
      validation_job_id,
      message: 'Validation still running. Please poll again.'
    };
  }
}
