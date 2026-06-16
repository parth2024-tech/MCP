import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class GetLoopStateTool extends BaseTool<any> {
  name = 'get_loop_state';
  description = 'Query the loop completion state for a task or code refinement session';
  schema = z.object({
    task_id: z.string(),
    session_id: z.string().optional(),
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { task_id, session_id } = args;
    const dbManager = context.container.resolve<any>('OrchestrationDB');

    const { taskLoops, codeLoops } = await dbManager.getLoopState(task_id, session_id);

    const taskComplete = taskLoops.length === 5 &&
      (taskLoops[4] as any).completed_at != null;

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          task_id,
          task_loops_completed: taskLoops.length,
          task_loops_remaining: 5 - taskLoops.length,
          all_task_loops_done: taskComplete,
          task_loops: taskLoops,
          code_loops: codeLoops,
        })
      }],
    };
  }
}
