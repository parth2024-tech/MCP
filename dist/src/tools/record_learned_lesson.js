"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const episodic_learning_1 = require("../services/episodic-learning");
const RecordLearnedLessonSchema = zod_1.z.object({
    problem: zod_1.z.string().describe('The problem, bug, or failure pattern encountered (e.g. "TypeError: cannot read property extra on MiddlewareContext")'),
    solution: zod_1.z.string().describe('The actionable solution, code pattern, or heuristic that resolved it'),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]).describe('Tags for categorizing this lesson (e.g. ["middleware", "typescript", "types"])'),
    source_task: zod_1.z.string().optional().describe('Optional ID of the task or run that produced this lesson'),
    confidence: zod_1.z.number().min(0.0).max(1.0).optional().default(1.0).describe('Confidence score between 0.0 and 1.0 (default: 1.0)')
});
class RecordLearnedLessonTool extends BaseTool_1.BaseTool {
    name = 'record_learned_lesson';
    description = 'Records an actionable lesson, heuristic, or bugfix into the agent second brain with automatic reinforcement tracking.';
    schema = RecordLearnedLessonSchema;
    async execute(args, context) {
        const orchDb = context.container.resolve('OrchestrationDB');
        let dbHandle = null;
        if (orchDb && typeof orchDb.getDB === 'function') {
            dbHandle = orchDb.getDB();
        }
        const service = new episodic_learning_1.EpisodicLearningService(dbHandle);
        const lesson = service.recordLesson({
            problem: args.problem,
            solution: args.solution,
            tags: args.tags,
            sourceTask: args.source_task,
            confidence: args.confidence
        });
        return {
            status: 'recorded',
            lesson_id: lesson.id,
            problem: lesson.problem,
            solution: lesson.solution,
            reinforcement_count: lesson.reinforcementCount,
            confidence: lesson.confidence
        };
    }
}
exports.default = RecordLearnedLessonTool;
