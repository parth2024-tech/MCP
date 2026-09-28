import { describe, it, expect } from 'vitest';
import FastJevCompactTool from '../src/tools/fast_jev_compact';
import {
  compact,
  reductionRatio,
  collectToolCalls,
  HeuristicJevAsker,
  HybridJevClient,
  type Message
} from '../src/services/fast-jev/index.js';

describe('Fast Jev Compaction Subsystem', () => {
  const sampleTranscript: Message[] = [
    {
      role: 'user',
      text: 'Please inspect the project structure and build the application. Never edit generated code.',
      toolUses: []
    },
    {
      role: 'assistant',
      text: 'Running initial filesystem check.',
      toolUses: [
        {
          tool_use_id: 'call_1',
          tool: 'ls',
          input: { path: '/home/thor/project' }
        }
      ]
    },
    {
      role: 'user',
      text: '',
      toolUses: [],
      toolResults: [
        {
          tool_use_id: 'call_1',
          text: 'file1.ts\nfile2.ts\nfile3.ts\n'
        }
      ]
    },
    {
      role: 'assistant',
      text: 'Reading large source file.',
      toolUses: [
        {
          tool_use_id: 'call_2',
          tool: 'read_file',
          input: { file: 'file1.ts' }
        }
      ]
    },
    {
      role: 'user',
      text: '',
      toolUses: [],
      toolResults: [
        {
          tool_use_id: 'call_2',
          text: 'x'.repeat(4000) // 4000 characters of bulk file content
        }
      ]
    },
    {
      role: 'assistant',
      text: 'Code has been analyzed. Now running the build.',
      toolUses: [
        {
          tool_use_id: 'call_3',
          tool: 'run_build',
          input: { command: 'npm run build' }
        }
      ]
    },
    {
      role: 'user',
      text: '',
      toolUses: [],
      toolResults: [
        {
          tool_use_id: 'call_3',
          text: 'Build successful. Exit code 0.'
        }
      ]
    },
    {
      role: 'assistant',
      text: 'Build complete and all checks verified.',
      toolUses: []
    }
  ];

  it('1. collects tool calls and distinguishes pinned from unpinned calls', () => {
    const calls = collectToolCalls(sampleTranscript, 2);
    expect(calls.length).toBe(3);
    // Newest call in last 2 messages is call_3
    const call3 = calls.find((c) => c.tool_use_id === 'call_3');
    expect(call3?.pinned).toBe(true);
    // Older calls should not be pinned
    const call1 = calls.find((c) => c.tool_use_id === 'call_1');
    expect(call1?.pinned).toBe(false);
  });

  it('2. compacts transcript using HeuristicJevAsker without loss of user text', async () => {
    const calls = collectToolCalls(sampleTranscript, 2);
    const asker = new HeuristicJevAsker(calls);
    const result = await compact(sampleTranscript, asker, {
      preserveRecentMessages: 2,
      truncateHeadChars: 100
    });

    expect(result.messages.length).toBeGreaterThan(0);
    // First message user text must be preserved verbatim
    expect(result.messages[0].text).toBe(
      'Please inspect the project structure and build the application. Never edit generated code.'
    );

    // Reduction ratio should be significant due to bulky 4000 char file result
    const ratio = reductionRatio(result);
    expect(ratio).toBeGreaterThan(0.4);
    expect(result.stats.charsAfter).toBeLessThan(result.stats.charsBefore);
  });

  it('3. executes FastJevCompactTool end-to-end via BaseTool interface', async () => {
    const tool = new FastJevCompactTool();
    const context: any = {
      container: { resolve: () => null },
      reqId: 'test-compact'
    };

    const res = await (tool as any).execute(
      {
        messages: sampleTranscript,
        goal: 'Build application without editing generated files',
        preserveRecentMessages: 2,
        truncateHeadChars: 150
      },
      context
    );

    expect(res.success).toBe(true);
    expect(res.compacted_messages.length).toBeGreaterThan(0);
    expect(res.reduction_ratio).toBeGreaterThan(0);
    expect(typeof res.reduction_percent).toBe('string');
    expect(res.decisions.length).toBe(3);
    expect(res.stats.calls).toBe(3);
  });

  it('4. HybridJevClient falls back smoothly when no API key is provided', async () => {
    const calls = collectToolCalls(sampleTranscript, 4);
    const hybrid = new HybridJevClient(calls); // no key
    const result = await compact(sampleTranscript, hybrid, {
      preserveRecentMessages: 4
    });

    expect(result.stats.messagesAfter).toBeGreaterThan(0);
    expect(result.decisions.length).toBe(3);
  });
});
