/**
 * EpisodicLearningService — Autonomous Memory Reinforcement & Lesson Distillation
 *
 * Implements the "Write the correction back" step of the Second Brain loop:
 * - Captures distilled lessons from successful task resolutions and bug fixes.
 * - Tracks reinforcement scores: frequently helpful lessons gain priority.
 * - Computes composite search ranking: Score = 0.7 * Relevance + 0.3 * Reinforcement.
 * - Persists structured lessons in SQLite orchestration.db.
 */

import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrchestrationDB = require('./orchestration-db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('../utils/metrics');

export interface LearnedLesson {
  id: string;
  problem: string;
  solution: string;
  tags: string[];
  sourceTask?: string;
  reinforcementCount: number;
  confidence: number; // 0.0 to 1.0
  createdAt: number;
  lastUsedAt: number;
}

export interface RecordLessonParams {
  problem: string;
  solution: string;
  tags?: string[];
  sourceTask?: string;
  confidence?: number;
}

export class EpisodicLearningService {
  private db: unknown;

  constructor(dbHandle?: unknown) {
    if (dbHandle) {
      this.db = dbHandle;
    } else {
      try {
        const orch = OrchestrationDB.getInstance();
        this.db = orch.getDB();
      } catch {
        this.db = null;
      }
    }
    this.initSchema();
  }

  private initSchema(): void {
    if (!this.db) return;
    const typedDb = this.db as { exec: (sql: string) => void };
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
    } catch {
      // Ignore if table exists
    }
  }

  /**
   * Records a new distilled lesson into episodic memory.
   */
  public recordLesson(params: RecordLessonParams): LearnedLesson {
    const id = `lesson_${crypto.randomUUID().slice(0, 8)}`;
    const now = Math.floor(Date.now() / 1000);
    const tags = params.tags || [];
    const confidence = params.confidence !== undefined ? Math.max(0, Math.min(1, params.confidence)) : 1.0;

    const lesson: LearnedLesson = {
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
      const typedDb = this.db as {
        prepare: (sql: string) => { run: (...args: unknown[]) => void };
      };
      try {
        typedDb.prepare(`
          INSERT INTO learned_lessons (id, problem, solution, tags, source_task, reinforcement_count, confidence, created_at, last_used_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
        `).run(id, params.problem, params.solution, JSON.stringify(tags), params.sourceTask || null, confidence, now, now);
      } catch {
        // Fallback for transient runs
      }
    }

    metrics.increment('second_brain.lesson_recorded');
    return lesson;
  }

  /**
   * Reinforces or decays a lesson based on whether recalling it led to a successful outcome.
   */
  public reinforceLesson(lessonId: string, success: boolean): boolean {
    if (!this.db) return false;

    const typedDb = this.db as {
      prepare: (sql: string) => {
        get: (id: string) => { reinforcement_count: number; confidence: number } | null;
        run: (...args: unknown[]) => void;
      };
    };

    try {
      const existing = typedDb.prepare('SELECT reinforcement_count, confidence FROM learned_lessons WHERE id = ?').get(lessonId);
      if (!existing) return false;

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
    } catch {
      return false;
    }
  }

  /**
   * Searches learned lessons ranked by a composite of keyword relevance and reinforcement weight.
   */
  public searchLessons(query: string, topK = 5): Array<LearnedLesson & { searchScore: number }> {
    if (!this.db) return [];

    const typedDb = this.db as {
      prepare: (sql: string) => {
        all: () => Array<{
          id: string;
          problem: string;
          solution: string;
          tags: string;
          source_task: string | null;
          reinforcement_count: number;
          confidence: number;
          created_at: number;
          last_used_at: number;
        }>;
      };
    };

    try {
      const rows = typedDb.prepare('SELECT * FROM learned_lessons ORDER BY reinforcement_count DESC LIMIT 50').all();
      const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

      const scored: Array<LearnedLesson & { searchScore: number }> = [];

      for (const row of rows) {
        let tagArray: string[] = [];
        try {
          tagArray = JSON.parse(row.tags);
        } catch {
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
    } catch {
      return [];
    }
  }

  /**
   * Retrieves all learned lessons for export or inspection.
   */
  public getAllLessons(): LearnedLesson[] {
    if (!this.db) return [];
    const typedDb = this.db as {
      prepare: (sql: string) => {
        all: () => Array<{
          id: string;
          problem: string;
          solution: string;
          tags: string;
          source_task: string | null;
          reinforcement_count: number;
          confidence: number;
          created_at: number;
          last_used_at: number;
        }>;
      };
    };

    try {
      const rows = typedDb.prepare('SELECT * FROM learned_lessons ORDER BY reinforcement_count DESC').all();
      return rows.map(row => ({
        id: row.id,
        problem: row.problem,
        solution: row.solution,
        tags: (() => { try { return JSON.parse(row.tags); } catch { return []; } })(),
        sourceTask: row.source_task || undefined,
        reinforcementCount: row.reinforcement_count,
        confidence: row.confidence,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at
      }));
    } catch {
      return [];
    }
  }
}
