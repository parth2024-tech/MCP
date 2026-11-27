"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const index_js_1 = require("../services/fast-jev/index.js");
class FastJevCompactTool extends BaseTool_1.BaseTool {
    name = 'fast_jev_compact';
    description = 'Prunes and compacts conversation transcripts using decision-based context compaction. Preserves verbatim user and assistant turns while selectively dropping stale tool calls and truncating stale tool results using Jev or local heuristics.';
    schema = zod_1.z.object({
        messages: zod_1.z.array(zod_1.z.object({
            role: zod_1.z.string().describe('Message role: user, assistant, system'),
            text: zod_1.z.string().default('').describe('Verbatim message text'),
            toolUses: zod_1.z.array(zod_1.z.object({
                tool_use_id: zod_1.z.string(),
                tool: zod_1.z.string(),
                input: zod_1.z.any().optional(),
                text: zod_1.z.string().optional(),
                isError: zod_1.z.boolean().optional()
            })).default([]),
            toolResults: zod_1.z.array(zod_1.z.object({
                tool_use_id: zod_1.z.string(),
                text: zod_1.z.string(),
                isError: zod_1.z.boolean().optional()
            })).optional()
        })).describe('Transcript messages to compact'),
        goal: zod_1.z.string().optional().describe('Ongoing task goal or description to evaluate tool call relevance against'),
        keepThreshold: zod_1.z.number().min(0).max(1).optional().default(0.5).describe('Minimum keep probability (0.0 to 1.0)'),
        preserveRecentMessages: zod_1.z.number().min(0).optional().default(6).describe('Number of newest messages pinned from compaction'),
        truncateHeadChars: zod_1.z.number().min(0).optional().default(300).describe('Chars retained before note when a tool result is dropped'),
        apiKey: zod_1.z.string().optional().describe('Optional TypeSafe API key (falls back to TYPESAFE_API_KEY environment variable or local heuristics)')
    });
    async execute(args, _context) {
        const { messages, goal, keepThreshold = 0.5, preserveRecentMessages = 6, truncateHeadChars = 300, apiKey } = args;
        const formattedMessages = messages.map((m) => ({
            role: m.role,
            text: m.text || '',
            toolUses: m.toolUses || [],
            ...(m.toolResults && m.toolResults.length > 0 ? { toolResults: m.toolResults } : {})
        }));
        const calls = (0, index_js_1.collectToolCalls)(formattedMessages, preserveRecentMessages);
        const asker = new index_js_1.HybridJevClient(calls, apiKey);
        const result = await (0, index_js_1.compact)(formattedMessages, asker, {
            goal,
            keepThreshold,
            preserveRecentMessages,
            truncateHeadChars
        });
        const ratio = (0, index_js_1.reductionRatio)(result);
        return {
            success: true,
            compacted_messages: result.messages,
            reduction_ratio: Math.round(ratio * 100) / 100,
            reduction_percent: `${Math.round(ratio * 100)}%`,
            decisions: result.decisions,
            stats: result.stats
        };
    }
}
exports.default = FastJevCompactTool;
