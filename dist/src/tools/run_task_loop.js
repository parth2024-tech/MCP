"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const task_loops_1 = require("../loops/task-loops");
class RunTaskLoopTool extends BaseTool_1.BaseTool {
    name = 'run_task_loop';
    description = 'Execute one loop iteration for the current task. Must be called 5 times in sequence.';
    schema = zod_1.z.object({
        task_id: zod_1.z.string(),
        agent_id: zod_1.z.string(),
        loop_number: zod_1.z.union([
            zod_1.z.literal(1), zod_1.z.literal(2), zod_1.z.literal(3), zod_1.z.literal(4), zod_1.z.literal(5)
        ]),
        loop_output: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
        changes_summary: zod_1.z.string(),
    });
    async execute(args, context) {
        const { task_id, agent_id, loop_number, loop_output, changes_summary } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        if (loop_number > 1) {
            const loopState = await dbManager.getLoopState(task_id);
            const previous = loopState.taskLoops.find((l) => l.loop_number === loop_number - 1);
            if (!previous || !previous.completed_at) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error_code: "INVALID_INPUT",
                                message: `Loop ${loop_number} cannot run — Loop ${loop_number - 1} has not completed.`,
                                retryable: false,
                                fix_hint: `Call run_task_loop with loop_number=${loop_number - 1} first.`
                            })
                        }],
                    isError: true
                };
            }
        }
        if (loop_number === 3) {
            const sessionState = context.container.resolve('SessionState');
            const stepCount = sessionState.db.prepare('SELECT COUNT(*) as c FROM session_step_history WHERE session_id = ?').get(sessionState.sessionId);
            if (!stepCount || stepCount.c === 0) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                error_code: "PRE_REQUISITE_FAILED",
                                message: `Loop 3 (PERFORMANCE_AND_RESILIENCE) cannot begin until at least one log_skill_step has been recorded.`,
                                retryable: false,
                                fix_hint: `Call log_skill_step first to record a skill step before starting Loop 3.`
                            })
                        }],
                    isError: true
                };
            }
        }
        const loopDef = task_loops_1.TASK_LOOPS[loop_number - 1];
        const now = Math.floor(Date.now() / 1000);
        await dbManager.runTaskLoop(task_id, agent_id, loop_number, loopDef.name, loopDef.lens, loop_output, now, now);
        await dbManager.writeMemory(`loop_output:${task_id}:${loop_number}`, "global", { loop_number, loop_name: loopDef.name, output: loop_output, changes_summary }, agent_id, task_id);
        const db = dbManager.getDB();
        db.prepare(`
      INSERT INTO events (type, payload, source_agent, task_id)
      VALUES ('loop_completed', ?, ?, ?)
    `).run(JSON.stringify({ task_id, loop_number, loop_name: loopDef.name }), agent_id, task_id);
        if (loop_number === 5) {
            db.prepare(`
        INSERT OR REPLACE INTO loop_artifacts (task_id, final_code, final_output)
        VALUES (?, ?, ?)
      `).run(task_id, JSON.stringify(loop_output.code ?? ""), JSON.stringify(loop_output));
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            status: "ALL_LOOPS_COMPLETE",
                            task_id,
                            message: "Loop 5 finished. You may now call complete_task.",
                            final_artifact_written: true,
                        }),
                    }],
            };
        }
        const nextLoop = task_loops_1.TASK_LOOPS[loop_number];
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        status: "LOOP_COMPLETE",
                        completed_loop: loop_number,
                        next_loop: loop_number + 1,
                        next_loop_name: nextLoop.name,
                        next_loop_instruction: nextLoop.instruction,
                    }),
                }],
        };
    }
}
exports.default = RunTaskLoopTool;
