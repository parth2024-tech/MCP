"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class CheckOpenHandsStatusTool extends BaseTool_1.BaseTool {
    name = 'check_openhands_status';
    description = 'Checks the status of a headless OpenHands job.';
    schema = zod_1.z.object({
        job_id: zod_1.z.string().describe('The ID of the OpenHands job to check'),
    });
    async execute(args, context) {
        try {
            // First, get the task status
            const res = await fetch(`http://127.0.0.1:3000/api/v1/app-conversations/start-tasks`);
            if (!res.ok) {
                return { success: false, error: 'Failed to contact OpenHands API.' };
            }
            const searchRes = await fetch(`http://127.0.0.1:3000/api/v1/app-conversations/start-tasks/search`);
            const searchData = await searchRes.json();
            const task = (searchData.items || []).find((t) => t.id === args.job_id);
            if (!task) {
                return { success: false, error: `Job ${args.job_id} not found on OpenHands backend.` };
            }
            let recentLogs = "No messages available yet.";
            // If there's an app_conversation_id, we can fetch messages
            if (task.app_conversation_id) {
                try {
                    const evRes = await fetch(`http://127.0.0.1:3000/api/v1/conversation/${task.app_conversation_id}/events`);
                    if (evRes.ok) {
                        const evData = await evRes.json();
                        // Events may be wrapped or an array
                        const evs = evData.events || (Array.isArray(evData) ? evData : []);
                        if (Array.isArray(evs) && evs.length > 0) {
                            const latest = evs.slice(-10).map((e) => `[${e.source || 'agent'}] ${e.message || (e.args ? JSON.stringify(e.args) : JSON.stringify(e))}`.substring(0, 300));
                            recentLogs = latest.join('\n');
                        }
                    }
                }
                catch (e) { }
            }
            return {
                success: true,
                job_id: args.job_id,
                status: task.status,
                app_conversation_id: task.app_conversation_id,
                created_at: task.created_at,
                recent_logs: recentLogs
            };
        }
        catch (err) {
            return { success: false, error: `Error checking status: ${err.message}` };
        }
    }
}
exports.default = CheckOpenHandsStatusTool;
