import type { JevAsker, JevQuestions, JevResponse, JevState, NoulAnswer, ToolCall } from './types.js';
import { JevClient } from './client.js';

export class HeuristicJevAsker implements JevAsker {
  private readonly calls: readonly ToolCall[];

  constructor(calls: readonly ToolCall[] = []) {
    this.calls = calls;
  }

  async ask(_state: JevState, questions: JevQuestions): Promise<JevResponse> {
    const answers: Record<string, NoulAnswer> = {};
    const callsById = new Map<string, ToolCall>(this.calls.map((c) => [c.id, c]));

    for (const key of Object.keys(questions)) {
      const isCall = key.startsWith('call_');
      const callId = key.replace(/^(call_|result_)/, '');
      const call = callsById.get(callId);

      if (!call) {
        answers[key] = { type: 'noul', noul: 0.8 };
        continue;
      }

      if (call.pinned) {
        answers[key] = { type: 'noul', noul: 1.0 };
        continue;
      }

      const toolLower = (call.tool || '').toLowerCase();
      const isEphemeral = ['ls', 'dir', 'pwd', 'which', 'ps', 'git_status', 'ping'].some((t) =>
        toolLower.includes(t),
      );
      const isRead = ['read', 'view', 'cat', 'grep', 'search'].some((t) => toolLower.includes(t));

      if (isEphemeral) {
        // Ephemeral inspection commands can drop entirely when older
        answers[key] = { type: 'noul', noul: isCall ? 0.3 : 0.1 };
      } else if (isRead) {
        // File reads: retain record that file was examined, but prune/truncate bulk file contents
        answers[key] = { type: 'noul', noul: isCall ? 0.75 : 0.25 };
      } else if (call.resultChars > 3000) {
        // Large tool results: retain invocation input, truncate bulk output
        answers[key] = { type: 'noul', noul: isCall ? 0.85 : 0.3 };
      } else {
        answers[key] = { type: 'noul', noul: 0.8 };
      }
    }

    return { answers };
  }
}

export class HybridJevClient implements JevAsker {
  private readonly client?: JevClient;
  private readonly heuristic: HeuristicJevAsker;

  constructor(calls: readonly ToolCall[] = [], apiKey?: string) {
    const key = apiKey || process.env.TYPESAFE_API_KEY;
    if (key) {
      this.client = new JevClient({ apiKey: key });
    }
    this.heuristic = new HeuristicJevAsker(calls);
  }

  async ask(state: JevState, questions: JevQuestions): Promise<JevResponse> {
    if (this.client) {
      try {
        return await this.client.ask(state, questions);
      } catch (err: any) {
        // Failover gracefully to local heuristic asker
        return this.heuristic.ask(state, questions);
      }
    }
    return this.heuristic.ask(state, questions);
  }
}
