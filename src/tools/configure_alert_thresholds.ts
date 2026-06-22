import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class ConfigureAlertThresholdsTool extends BaseTool<any> {
  name = 'configure_alert_thresholds';
  description = 'Configures real-time alert thresholds for system health monitoring.';

  schema = z.object({
    p99_latency_ms: z.number().optional().describe('p99 latency threshold in milliseconds'),
    max_error_rate: z.number().optional().describe('Maximum allowed error rate (0.0 to 1.0)'),
    min_cache_hit_ratio: z.number().optional().describe('Minimum allowed cache hit ratio (0.0 to 1.0)')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { p99_latency_ms, max_error_rate, min_cache_hit_ratio } = args;
    const orch = context.container.resolve<any>('OrchestrationDB');
    const redis = orch.getRedisClient();

    const currentThresholdsRaw = await redis.get('ase:alert_thresholds');
    const currentThresholds = currentThresholdsRaw ? JSON.parse(currentThresholdsRaw) : {};

    if (p99_latency_ms !== undefined) currentThresholds.p99_latency_ms = p99_latency_ms;
    if (max_error_rate !== undefined) currentThresholds.max_error_rate = max_error_rate;
    if (min_cache_hit_ratio !== undefined) currentThresholds.min_cache_hit_ratio = min_cache_hit_ratio;

    await redis.set('ase:alert_thresholds', JSON.stringify(currentThresholds));

    orch.emitEvent('alert_thresholds_configured', currentThresholds);

    return {
      success: true,
      thresholds: currentThresholds,
      message: 'Alert thresholds configured successfully.'
    };
  }
}
