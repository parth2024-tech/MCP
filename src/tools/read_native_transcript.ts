import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { TranscriptReader } from '../services/transcript-reader';
import { compact, reductionRatio, HybridJevClient } from '../services/fast-jev/index.js';

export default class ReadNativeTranscriptTool extends BaseTool<any> {
  name = 'read_native_transcript';
  description = 'Reads and parses native agent execution transcripts directly from disk (Antigravity JSONL, Claude Code, or generic logs) without running a PTY wrapper or background daemon. Can extract metrics and optionally run fast-jev compaction.';

  schema = z.object({
    transcript_path: z.string().optional().describe('Path to the transcript file or conversation ID. If omitted or set to "latest", discovers the latest session automatically.'),
    tail: z.number().min(1).optional().default(50).describe('Number of recent steps to return (defaults to 50)'),
    compact: z.boolean().optional().default(false).describe('If true, runs fast-jev compaction on the parsed messages'),
    goal: z.string().optional().describe('Optional goal context if compaction is enabled')
  });

  protected async execute(args: any, _context: ToolContext): Promise<any> {
    const {
      transcript_path,
      tail = 50,
      compact: shouldCompact = false,
      goal
    } = args;

    let targetPath = transcript_path;
    if (!targetPath || targetPath === 'latest') {
      const recent = await TranscriptReader.discoverRecentTranscripts(process.cwd(), 1);
      if (recent.length === 0) {
        throw new Error('No recent transcript files discovered in the workspace or system logs.');
      }
      targetPath = recent[0];
    }

    const parsed = await TranscriptReader.readTranscript(targetPath, { tail });

    let compactionSummary = null;
    let finalMessages = parsed.messages;

    if (shouldCompact) {
      const asker = new HybridJevClient([]);
      const result = await compact(parsed.messages, asker, {
        goal,
        keepThreshold: 0.5,
        preserveRecentMessages: 6
      });
      const ratio = reductionRatio(result);
      finalMessages = result.messages;
      compactionSummary = {
        reduction_ratio: Math.round(ratio * 100) / 100,
        reduction_percent: `${Math.round(ratio * 100)}%`,
        stats: result.stats
      };
    }

    return {
      success: true,
      source_file: parsed.sourcePath,
      total_steps_in_tail: parsed.steps.length,
      metrics: parsed.metrics,
      compaction: compactionSummary,
      messages: finalMessages
    };
  }
}
