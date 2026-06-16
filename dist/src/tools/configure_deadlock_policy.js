"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class ConfigureDeadlockPolicyTool extends BaseTool_1.BaseTool {
    name = 'configure_deadlock_policy';
    description = 'Configure the deadlock resolution strategy for the project task graph.';
    schema = zod_1.z.object({
        policy: zod_1.z.enum(['priority-based', 'age-based', 'random'])
            .describe('Deadlock resolution strategy to use')
    });
    async execute(args, context) {
        const { policy } = args;
        const orch = context.container.resolve('OrchestrationDB');
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
exports.default = ConfigureDeadlockPolicyTool;
