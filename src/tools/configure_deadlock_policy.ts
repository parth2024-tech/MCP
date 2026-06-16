import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class ConfigureDeadlockPolicyTool extends BaseTool<any> {
  name = 'configure_deadlock_policy';
  description = 'Configure the deadlock resolution strategy for the project task graph.';
  
  schema = z.object({
    policy: z.enum(['priority-based', 'age-based', 'random'])
      .describe('Deadlock resolution strategy to use')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { policy } = args;
    const orch = context.container.resolve<any>('OrchestrationDB');
    const redis = orch.getRedisClient();

    await redis.set('ase:deadlock_policy', policy);

    orch.emitEvent('deadlock_policy_changed', { policy });

    return {
      success: true,
      policy,
      message: `Deadlock resolution strategy configured to ${policy}.`
    };
  }
}
