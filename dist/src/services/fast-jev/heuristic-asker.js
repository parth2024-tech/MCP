"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridJevClient = exports.HeuristicJevAsker = void 0;
const client_js_1 = require("./client.js");
class HeuristicJevAsker {
    calls;
    constructor(calls = []) {
        this.calls = calls;
    }
    async ask(_state, questions) {
        const answers = {};
        const callsById = new Map(this.calls.map((c) => [c.id, c]));
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
            const isEphemeral = ['ls', 'dir', 'pwd', 'which', 'ps', 'git_status', 'ping'].some((t) => toolLower.includes(t));
            const isRead = ['read', 'view', 'cat', 'grep', 'search'].some((t) => toolLower.includes(t));
            if (isEphemeral) {
                // Ephemeral inspection commands can drop entirely when older
                answers[key] = { type: 'noul', noul: isCall ? 0.3 : 0.1 };
            }
            else if (isRead) {
                // File reads: retain record that file was examined, but prune/truncate bulk file contents
                answers[key] = { type: 'noul', noul: isCall ? 0.75 : 0.25 };
            }
            else if (call.resultChars > 3000) {
                // Large tool results: retain invocation input, truncate bulk output
                answers[key] = { type: 'noul', noul: isCall ? 0.85 : 0.3 };
            }
            else {
                answers[key] = { type: 'noul', noul: 0.8 };
            }
        }
        return { answers };
    }
}
exports.HeuristicJevAsker = HeuristicJevAsker;
class HybridJevClient {
    client;
    heuristic;
    constructor(calls = [], apiKey) {
        const key = apiKey || process.env.TYPESAFE_API_KEY;
        if (key) {
            this.client = new client_js_1.JevClient({ apiKey: key });
        }
        this.heuristic = new HeuristicJevAsker(calls);
    }
    async ask(state, questions) {
        if (this.client) {
            try {
                return await this.client.ask(state, questions);
            }
            catch (err) {
                // Failover gracefully to local heuristic asker
                return this.heuristic.ask(state, questions);
            }
        }
        return this.heuristic.ask(state, questions);
    }
}
exports.HybridJevClient = HybridJevClient;
