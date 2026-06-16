"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class GetLoopStateTool extends BaseTool_1.BaseTool {
    name = 'get_loop_state';
    description = 'Query the loop completion state for a task or code refinement session';
    schema = zod_1.z.object({
        task_id: zod_1.z.string(),
        session_id: zod_1.z.string().optional(),
    });
    async execute(args, context) {
        const { task_id, session_id } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const { taskLoops, codeLoops } = await dbManager.getLoopState(task_id, session_id);
        const taskComplete = taskLoops.length === 5 &&
            taskLoops[4].completed_at != null;
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
exports.default = GetLoopStateTool;
