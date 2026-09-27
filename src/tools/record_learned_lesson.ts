import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { EpisodicLearningService } from '../services/episodic-learning';

const RecordLearnedLessonSchema = z.object({
  problem: z.string().describe('The problem, bug, or failure pattern encountered (e.g. "TypeError: cannot read property extra on MiddlewareContext")'),
  solution: z.string().describe('The actionable solution, code pattern, or heuristic that resolved it'),
  tags: z.array(z.string()).optional().default([]).describe('Tags for categorizing this lesson (e.g. ["middleware", "typescript", "types"])'),
  source_task: z.string().optional().describe('Optional ID of the task or run that produced this lesson'),
  confidence: z.number().min(0.0).max(1.0).optional().default(1.0).describe('Confidence score between 0.0 and 1.0 (default: 1.0)')
});

type RecordLearnedLessonArgs = z.infer<typeof RecordLearnedLessonSchema>;

export default class RecordLearnedLessonTool extends BaseTool<RecordLearnedLessonArgs> {
  name = 'record_learned_lesson';
  description = 'Records an actionable lesson, heuristic, or bugfix into the agent second brain with automatic reinforcement tracking.';
  schema = RecordLearnedLessonSchema;

  protected async execute(args: RecordLearnedLessonArgs, context: ToolContext): Promise<Record<string, unknown>> {
    const orchDb = context.container.resolve<unknown>('OrchestrationDB');
    let dbHandle = null;
    if (orchDb && typeof (orchDb as { getDB?: () => unknown }).getDB === 'function') {
      dbHandle = (orchDb as { getDB: () => unknown }).getDB();
    }

    const service = new EpisodicLearningService(dbHandle);
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
