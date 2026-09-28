import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import {
  compact,
  reductionRatio,
  collectToolCalls,
  HybridJevClient,
  type Message,
  type CompactResult
} from '../services/fast-jev/index.js';

export default class FastJevCompactTool extends BaseTool<any> {
  name = 'fast_jev_compact';
  description = 'Prunes and compacts conversation transcripts using decision-based context compaction. Preserves verbatim user and assistant turns while selectively dropping stale tool calls and truncating stale tool results using Jev or local heuristics.';

  schema = z.object({
    messages: z.array(z.object({
      role: z.string().describe('Message role: user, assistant, system'),
      text: z.string().default('').describe('Verbatim message text'),
      toolUses: z.array(z.object({
        tool_use_id: z.string(),
        tool: z.string(),
        input: z.any().optional(),
        text: z.string().optional(),
        isError: z.boolean().optional()
      })).default([]),
      toolResults: z.array(z.object({
        tool_use_id: z.string(),
        text: z.string(),
        isError: z.boolean().optional()
      })).optional()
    })).describe('Transcript messages to compact'),
    goal: z.string().optional().describe('Ongoing task goal or description to evaluate tool call relevance against'),
    keepThreshold: z.number().min(0).max(1).optional().default(0.5).describe('Minimum keep probability (0.0 to 1.0)'),
    preserveRecentMessages: z.number().min(0).optional().default(6).describe('Number of newest messages pinned from compaction'),
    truncateHeadChars: z.number().min(0).optional().default(300).describe('Chars retained before note when a tool result is dropped'),
    apiKey: z.string().optional().describe('Optional TypeSafe API key (falls back to TYPESAFE_API_KEY environment variable or local heuristics)')
  });

  protected async execute(args: any, _context: ToolContext): Promise<any> {
    const {
      messages,
      goal,
      keepThreshold = 0.5,
      preserveRecentMessages = 6,
      truncateHeadChars = 300,
      apiKey
    } = args;

    const formattedMessages: Message[] = messages.map((m: any) => ({
      role: m.role,
      text: m.text || '',
      toolUses: m.toolUses || [],
      ...(m.toolResults && m.toolResults.length > 0 ? { toolResults: m.toolResults } : {})
    }));

    const calls = collectToolCalls(formattedMessages, preserveRecentMessages);
    const asker = new HybridJevClient(calls, apiKey);

    const result: CompactResult = await compact(formattedMessages, asker, {
      goal,
      keepThreshold,
      preserveRecentMessages,
      truncateHeadChars
    });

    const ratio = reductionRatio(result);

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
