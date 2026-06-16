"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class ConfigureAlertThresholdsTool extends BaseTool_1.BaseTool {
    name = 'configure_alert_thresholds';
    description = 'Configures real-time alert thresholds for system health monitoring.';
    schema = zod_1.z.object({
        p99_latency_ms: zod_1.z.number().optional().describe('p99 latency threshold in milliseconds'),
        max_error_rate: zod_1.z.number().optional().describe('Maximum allowed error rate (0.0 to 1.0)'),
        min_cache_hit_ratio: zod_1.z.number().optional().describe('Minimum allowed cache hit ratio (0.0 to 1.0)')
    });
    async execute(args, context) {
        const { p99_latency_ms, max_error_rate, min_cache_hit_ratio } = args;
        const orch = context.container.resolve('OrchestrationDB');
        const redis = orch.getRedisClient();
        const currentThresholdsRaw = await redis.get('ase:alert_thresholds');
        const currentThresholds = currentThresholdsRaw ? JSON.parse(currentThresholdsRaw) : {};
        if (p99_latency_ms !== undefined)
            currentThresholds.p99_latency_ms = p99_latency_ms;
        if (max_error_rate !== undefined)
            currentThresholds.max_error_rate = max_error_rate;
        if (min_cache_hit_ratio !== undefined)
            currentThresholds.min_cache_hit_ratio = min_cache_hit_ratio;
        await redis.set('ase:alert_thresholds', JSON.stringify(currentThresholds));
        orch.emitEvent('alert_thresholds_configured', currentThresholds);
        return {
            success: true,
            thresholds: currentThresholds,
            message: 'Alert thresholds configured successfully.'
        };
    }
}
exports.default = ConfigureAlertThresholdsTool;
