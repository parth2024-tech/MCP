"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const BaseTool_1 = require("../core/BaseTool");
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0)
        return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
class DeclareTaskIntentTool extends BaseTool_1.BaseTool {
    name = 'declare_task_intent';
    description = 'Declare a task intent. The server automatically resolves dependencies semantically and inserts the task into the DAG.';
    schema = zod_1.z.object({
        title: zod_1.z.string().describe('Short title for the task'),
        description: zod_1.z.string().describe('Detailed description of the intent/work to be done'),
        skill_ids: zod_1.z.array(zod_1.z.string()).optional().default([]).describe('Array of skill IDs relevant to this task'),
        priority: zod_1.z.number().min(1).max(10).optional().default(5).describe('Task priority (1-10)'),
        requires_context: zod_1.z.boolean().optional().default(false)
    });
    async execute(args, context) {
        const { title, description, skill_ids = [], priority = 5 } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const db = dbManager.getDB();
        // 1. Generate unique taskId
        const taskId = crypto_1.default.randomUUID();
        // 2. Fetch all existing active/pending tasks
        const existingTasks = db.prepare(`SELECT id, title, description, status FROM tasks WHERE status != 'completed'`).all();
        const dependsOn = [];
        // Try calculating semantic similarity if EmbeddingService is available
        const embeddingService = context.container.has('EmbeddingService')
            ? context.container.resolve('EmbeddingService')
            : null;
        if (embeddingService && embeddingService.workerPool) {
            try {
                const newEmbedding = await embeddingService.workerPool.generateEmbeddingForeground(description);
                for (const t of existingTasks) {
                    const tText = (t.description || '') + ' ' + t.title;
                    const tEmbedding = await embeddingService.workerPool.generateEmbeddingForeground(tText);
                    const sim = cosineSimilarity(newEmbedding, tEmbedding);
                    // Check for keyword overlaps or high semantic similarity
                    const lowerDesc = description.toLowerCase();
                    const lowerTTitle = t.title.toLowerCase();
                    const lowerTDesc = (t.description || '').toLowerCase();
                    const sharedKeywords = ['auth', 'onboarding', 'database', 'schema', 'test', 'refactor', 'api']
                        .filter(kw => lowerDesc.includes(kw) && (lowerTTitle.includes(kw) || lowerTDesc.includes(kw)));
                    // If similarity is very high or we have keyword overlap in critical context
                    if (sim >= 0.78 || (sim >= 0.65 && sharedKeywords.length > 0)) {
                        dependsOn.push(t.id);
                    }
                }
            }
            catch (err) {
                // Fallback to basic keyword matching on embedding failure
                const lowerDesc = description.toLowerCase();
                for (const t of existingTasks) {
                    const lowerTTitle = t.title.toLowerCase();
                    if (lowerDesc.includes(lowerTTitle) || lowerTTitle.includes(lowerDesc)) {
                        dependsOn.push(t.id);
                    }
                }
            }
        }
        else {
            // Basic keyword matching
            const lowerDesc = description.toLowerCase();
            for (const t of existingTasks) {
                const lowerTTitle = t.title.toLowerCase();
                if (lowerDesc.includes(lowerTTitle) || lowerTTitle.includes(lowerDesc)) {
                    dependsOn.push(t.id);
                }
            }
        }
        // 3. Create the task in the database
        await dbManager.createTask(taskId, title, description, dependsOn, [], skill_ids, priority);
        dbManager.emitEvent('task_created', { task_id: taskId, title }, null, taskId);
        return {
            success: true,
            message: 'Task intent declared and scheduled successfully.',
            depends_on: dependsOn
        };
    }
}
exports.default = DeclareTaskIntentTool;
