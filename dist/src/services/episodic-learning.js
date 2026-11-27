"use strict";
/**
 * EpisodicLearningService — Autonomous Memory Reinforcement & Lesson Distillation
 *
 * Implements the "Write the correction back" step of the Second Brain loop:
 * - Captures distilled lessons from successful task resolutions and bug fixes.
 * - Tracks reinforcement scores: frequently helpful lessons gain priority.
 * - Computes composite search ranking: Score = 0.7 * Relevance + 0.3 * Reinforcement.
 * - Persists structured lessons in SQLite orchestration.db.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicLearningService = void 0;
const crypto_1 = __importDefault(require("crypto"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrchestrationDB = require('./orchestration-db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('../utils/metrics');
class EpisodicLearningService {
    db;
    constructor(dbHandle) {
        if (dbHandle) {
            this.db = dbHandle;
        }
        else {
            try {
                const orch = OrchestrationDB.getInstance();
                this.db = orch.getDB();
            }
            catch {
                this.db = null;
            }
        }
        this.initSchema();
    }
    initSchema() {
        if (!this.db)
            return;
        const typedDb = this.db;
        try {
            typedDb.exec(`
        CREATE TABLE IF NOT EXISTS learned_lessons (
          id                  TEXT PRIMARY KEY,
          problem             TEXT NOT NULL,
          solution            TEXT NOT NULL,
          tags                TEXT NOT NULL DEFAULT '[]',
          source_task         TEXT,
          reinforcement_count INTEGER DEFAULT 1,
          confidence          REAL DEFAULT 1.0,
          created_at          INTEGER DEFAULT (unixepoch()),
          last_used_at        INTEGER DEFAULT (unixepoch())
        );
        CREATE INDEX IF NOT EXISTS idx_lessons_created ON learned_lessons(created_at);
        CREATE INDEX IF NOT EXISTS idx_lessons_reinforce ON learned_lessons(reinforcement_count);
      `);
        }
        catch {
            // Ignore if table exists
        }
    }
    /**
     * Records a new distilled lesson into episodic memory.
     */
    recordLesson(params) {
        const id = `lesson_${crypto_1.default.randomUUID().slice(0, 8)}`;
        const now = Math.floor(Date.now() / 1000);
        const tags = params.tags || [];
        const confidence = params.confidence !== undefined ? Math.max(0, Math.min(1, params.confidence)) : 1.0;
        const lesson = {
            id,
            problem: params.problem,
            solution: params.solution,
            tags,
            sourceTask: params.sourceTask,
            reinforcementCount: 1,
            confidence,
            createdAt: now,
            lastUsedAt: now
        };
        if (this.db) {
            const typedDb = this.db;
            try {
                typedDb.prepare(`
          INSERT INTO learned_lessons (id, problem, solution, tags, source_task, reinforcement_count, confidence, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).run(id, params.problem, params.solution, JSON.stringify(tags), params.sourceTask || null, confidence, now, now);
            }
            catch {
                // Fallback for transient runs
            }
        }
        metrics.increment('second_brain.lesson_recorded');
        return lesson;
    }
    /**
     * Reinforces or decays a lesson based on whether recalling it led to a successful outcome.
     */
    reinforceLesson(lessonId, success) {
        if (!this.db)
            return false;
        const typedDb = this.db;
        try {
            const existing = typedDb.prepare('SELECT reinforcement_count, confidence FROM learned_lessons WHERE id = ?').get(lessonId);
            if (!existing)
                return false;
            const newCount = success ? existing.reinforcement_count + 1 : Math.max(1, existing.reinforcement_count - 1);
            const newConfidence = success
                ? Math.min(1.0, existing.confidence + 0.05)
                : Math.max(0.1, existing.confidence - 0.15);
            const now = Math.floor(Date.now() / 1000);
            typedDb.prepare(`
        UPDATE learned_lessons
        SET reinforcement_count = ?, confidence = ?, last_used_at = ?
        WHERE id = ?
      `).run(newCount, newConfidence, now, lessonId);
            metrics.increment(success ? 'second_brain.lesson_reinforced' : 'second_brain.lesson_decayed');
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Searches learned lessons ranked by a composite of keyword relevance and reinforcement weight.
     */
    searchLessons(query, topK = 5) {
        if (!this.db)
            return [];
        const typedDb = this.db;
        try {
            const rows = typedDb.prepare('SELECT * FROM learned_lessons ORDER BY reinforcement_count DESC LIMIT 50').all();
            const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
            const scored = [];
            for (const row of rows) {
                let tagArray = [];
                try {
                    tagArray = JSON.parse(row.tags);
                }
                catch {
                    tagArray = [];
                }
                const searchableText = `${row.problem} ${row.solution} ${tagArray.join(' ')}`.toLowerCase();
                // 1. Text match relevance
                let matchCount = 0;
                for (const term of queryTerms) {
                    if (searchableText.includes(term)) {
                        matchCount++;
                    }
                }
                const textRelevance = queryTerms.length > 0 ? matchCount / queryTerms.length : 0.5;
                // 2. Reinforcement weight: normalizes reinforcement_count (logarithmic scale)
                const reinforcementWeight = Math.min(1.0, Math.log2(row.reinforcement_count + 1) / 4);
                // 3. Composite score
                const searchScore = Number((0.7 * textRelevance + 0.3 * reinforcementWeight * row.confidence).toFixed(3));
                if (textRelevance > 0 || queryTerms.length === 0) {
                    scored.push({
                        id: row.id,
                        problem: row.problem,
                        solution: row.solution,
                        tags: tagArray,
                        sourceTask: row.source_task || undefined,
                        reinforcementCount: row.reinforcement_count,
                        confidence: row.confidence,
                        createdAt: row.created_at,
                        lastUsedAt: row.last_used_at,
                        searchScore
                    });
                }
            }
            scored.sort((a, b) => b.searchScore - a.searchScore);
            return scored.slice(0, topK);
        }
        catch {
            return [];
        }
    }
    /**
     * Retrieves all learned lessons for export or inspection.
     */
    getAllLessons() {
        if (!this.db)
            return [];
        const typedDb = this.db;
        try {
            const rows = typedDb.prepare('SELECT * FROM learned_lessons ORDER BY reinforcement_count DESC').all();
            return rows.map(row => ({
                id: row.id,
                problem: row.problem,
                solution: row.solution,
                tags: (() => { try {
                    return JSON.parse(row.tags);
                }
                catch {
                    return [];
                } })(),
                sourceTask: row.source_task || undefined,
                reinforcementCount: row.reinforcement_count,
                confidence: row.confidence,
                createdAt: row.created_at,
                lastUsedAt: row.last_used_at
            }));
        }
        catch {
            return [];
        }
    }
}
exports.EpisodicLearningService = EpisodicLearningService;
