"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const transcript_reader_1 = require("../services/transcript-reader");
const index_js_1 = require("../services/fast-jev/index.js");
class ReadNativeTranscriptTool extends BaseTool_1.BaseTool {
    name = 'read_native_transcript';
    description = 'Reads and parses native agent execution transcripts directly from disk (Antigravity JSONL, Claude Code, or generic logs) without running a PTY wrapper or background daemon. Can extract metrics and optionally run fast-jev compaction.';
    schema = zod_1.z.object({
        transcript_path: zod_1.z.string().optional().describe('Path to the transcript file or conversation ID. If omitted or set to "latest", discovers the latest session automatically.'),
        tail: zod_1.z.number().min(1).optional().default(50).describe('Number of recent steps to return (defaults to 50)'),
        compact: zod_1.z.boolean().optional().default(false).describe('If true, runs fast-jev compaction on the parsed messages'),
        goal: zod_1.z.string().optional().describe('Optional goal context if compaction is enabled')
    });
    async execute(args, _context) {
        const { transcript_path, tail = 50, compact: shouldCompact = false, goal } = args;
        let targetPath = transcript_path;
        if (!targetPath || targetPath === 'latest') {
            const recent = await transcript_reader_1.TranscriptReader.discoverRecentTranscripts(process.cwd(), 1);
            if (recent.length === 0) {
                throw new Error('No recent transcript files discovered in the workspace or system logs.');
            }
            targetPath = recent[0];
        }
        const parsed = await transcript_reader_1.TranscriptReader.readTranscript(targetPath, { tail });
        let compactionSummary = null;
        let finalMessages = parsed.messages;
        if (shouldCompact) {
            const asker = new index_js_1.HybridJevClient([]);
            const result = await (0, index_js_1.compact)(parsed.messages, asker, {
                goal,
                keepThreshold: 0.5,
                preserveRecentMessages: 6
            });
            const ratio = (0, index_js_1.reductionRatio)(result);
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
exports.default = ReadNativeTranscriptTool;
