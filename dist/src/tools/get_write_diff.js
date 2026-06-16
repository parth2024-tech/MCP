"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class GetWriteDiffTool extends BaseTool_1.BaseTool {
    name = 'get_write_diff';
    description = 'Inspect the 5 internal code transforms performed during a refine_and_write session.';
    schema = zod_1.z.object({
        write_session_id: zod_1.z.string().describe('The session ID of the write operation')
    });
    async execute(args, context) {
        const { write_session_id } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const db = dbManager.getDB();
        const redis = await dbManager.getRedisClient();
        // Try fetching from Redis first
        const loops = [];
        const codeKeys = await redis.keys(`ase:code_loops:${write_session_id}:*`);
        if (codeKeys.length > 0) {
            for (const key of codeKeys) {
                const data = await redis.get(key);
                if (data)
                    loops.push(JSON.parse(data));
            }
            loops.sort((a, b) => a.loop_number - b.loop_number);
        }
        else {
            // Fallback to SQLite
            const dbLoops = db.prepare(`
        SELECT loop_number, loop_name, input_code, output_code, changes_made, completed_at
        FROM code_loops
        WHERE session_id = ?
        ORDER BY loop_number ASC
      `).all(write_session_id);
            for (const dl of dbLoops) {
                loops.push({
                    session_id: write_session_id,
                    loop_number: dl.loop_number,
                    loop_name: dl.loop_name,
                    input_code: dl.input_code,
                    output_code: dl.output_code,
                    changes_made: dl.changes_made,
                    completed_at: dl.completed_at
                });
            }
        }
        if (loops.length === 0) {
            throw new Error(`No write session loops found for session ID: ${write_session_id}`);
        }
        const stages = loops.map(l => {
            let changes = [];
            if (Array.isArray(l.changes_made)) {
                changes = l.changes_made;
            }
            else {
                try {
                    changes = JSON.parse(l.changes_made || '[]');
                }
                catch (e) {
                    changes = [l.changes_made];
                }
            }
            return {
                loop_number: l.loop_number,
                loop_name: l.loop_name,
                before: l.input_code,
                after: l.output_code,
                changes
            };
        });
        return {
            write_session_id,
            stages
        };
    }
}
exports.default = GetWriteDiffTool;
