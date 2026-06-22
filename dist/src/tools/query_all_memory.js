"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class QueryAllMemoryTool extends BaseTool_1.BaseTool {
    name = 'query_all_memory';
    description = 'Query both structured shared memory (SQLite) and semantic episodic memory (HNSW) in a unified ranked search.';
    schema = zod_1.z.object({
        query: zod_1.z.string().describe('The search query or concept'),
        scope: zod_1.z.string().optional().default('global').describe('Scope for the structured memory search'),
        limit: zod_1.z.number().optional().default(5).describe('Maximum number of unified results to return')
    });
    async execute(args, context) {
        const { query, scope, limit } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const db = dbManager.getDB();
        dbManager.expireMemory();
        // 1. Structured Search: query the shared_memory table
        const rows = db.prepare(`
      SELECT key, scope, value, written_by, version, created_at
      FROM shared_memory
      WHERE scope = ?
    `).all(scope);
        const structuredResults = [];
        const tokenize = (text) => {
            const stopwords = new Set([
                "the", "a", "an", "of", "and", "in", "to", "for", "is", "with", "by", "on", "at", "from",
                "it", "this", "that", "how", "what", "where", "why", "who", "your", "my", "our", "me", "i"
            ]);
            return text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(w => w.length > 0 && !stopwords.has(w));
        };
        const queryTokens = tokenize(query);
        for (const row of rows) {
            let valStr = '';
            try {
                valStr = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
            }
            catch (e) {
                valStr = String(row.value);
            }
            let score = 0;
            if (queryTokens.length > 0) {
                const content = `${row.key} ${valStr}`.toLowerCase();
                const contentTokens = tokenize(content);
                const contentSet = new Set(contentTokens);
                let matches = 0;
                for (const token of queryTokens) {
                    if (contentSet.has(token)) {
                        matches++;
                    }
                }
                score = matches / queryTokens.length;
            }
            else {
                score = 0.1;
            }
            if (score > 0) {
                let parsedVal = row.value;
                try {
                    if (typeof row.value === 'string') {
                        parsedVal = JSON.parse(row.value);
                    }
                }
                catch (e) { }
                structuredResults.push({
                    key: row.key,
                    value: parsedVal,
                    score: parseFloat(score.toFixed(4)),
                    source: 'structured',
                    metadata: {
                        scope: row.scope,
                        written_by: row.written_by,
                        version: row.version,
                        created_at: row.created_at
                    }
                });
            }
        }
        // 2. Semantic Search: query the MemoryService
        const memService = context.container.resolve('MemoryService');
        const semanticMemories = await memService.recall(query, limit, 0.0);
        const semanticResults = semanticMemories.map((m) => ({
            key: m.event_type,
            value: m.content,
            score: parseFloat(m.relevance),
            source: 'semantic',
            metadata: {
                id: m.id,
                timestamp: m.timestamp
            }
        }));
        // 3. Merge and rank
        const unified = [...structuredResults, ...semanticResults];
        unified.sort((a, b) => b.score - a.score);
        return {
            query,
            results: unified.slice(0, limit)
        };
    }
}
exports.default = QueryAllMemoryTool;
