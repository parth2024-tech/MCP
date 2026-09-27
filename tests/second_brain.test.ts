import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EpisodicLearningService } from '../src/services/episodic-learning';
import { VaultExporter } from '../src/services/vault-exporter';

describe('Second Brain Episodic Learning & Obsidian Vault Subsystem', () => {
  let testDb: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...args: unknown[]) => void;
      get: (...args: unknown[]) => unknown;
      all: (...args: unknown[]) => unknown[];
    };
  };
  let tempVaultDir: string;

  beforeEach(() => {
    testDb = new Database(':memory:');
    tempVaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ase-vault-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempVaultDir)) {
      fs.rmSync(tempVaultDir, { recursive: true, force: true });
    }
  });

  describe('1. EpisodicLearningService', () => {
    it('records a new lesson and retrieves it', () => {
      const service = new EpisodicLearningService(testDb);
      const lesson = service.recordLesson({
        problem: 'TypeError: undefined is not a function when accessing cache',
        solution: 'Always check if cache.isReady() before calling cache.get()',
        tags: ['cache', 'redis', 'guard'],
        confidence: 0.95
      });

      expect(lesson.id).toMatch(/^lesson_/);
      expect(lesson.reinforcementCount).toBe(1);
      expect(lesson.confidence).toBe(0.95);

      const all = service.getAllLessons();
      expect(all.length).toBe(1);
      expect(all[0].problem).toContain('TypeError');
    });

    it('searches lessons and ranks by relevance + reinforcement weight', () => {
      const service = new EpisodicLearningService(testDb);

      service.recordLesson({
        problem: 'How to handle database transaction deadlock in SQLite',
        solution: 'Use WAL journal mode and retry with backoff jitter',
        tags: ['sqlite', 'database', 'deadlock']
      });

      service.recordLesson({
        problem: 'How to style buttons with Tailwind CSS',
        solution: 'Use className="px-4 py-2 bg-blue-600"',
        tags: ['css', 'tailwind']
      });

      const results = service.searchLessons('sqlite deadlock');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].problem).toContain('SQLite');
      expect(results[0].searchScore).toBeGreaterThan(0.5);
    });

    it('reinforces a lesson on successful reuse', () => {
      const service = new EpisodicLearningService(testDb);
      const lesson = service.recordLesson({
        problem: 'Prisma connection pool exhaustion',
        solution: 'Use singleton PrismaClient pattern',
        tags: ['prisma', 'orm']
      });

      const reinforced = service.reinforceLesson(lesson.id, true);
      expect(reinforced).toBe(true);

      const all = service.getAllLessons();
      expect(all[0].reinforcementCount).toBe(2);
      expect(all[0].confidence).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('2. VaultExporter (Obsidian Knowledge Vault)', () => {
    it('generates an Obsidian-compatible vault with bidirectional [[wiki-links]]', () => {
      const service = new EpisodicLearningService(testDb);
      service.recordLesson({
        problem: 'Next.js 15 async headers issue',
        solution: 'Await cookies() and headers() in server components',
        tags: ['nextjs', 'react']
      });

      const exporter = new VaultExporter({
        vaultDir: tempVaultDir,
        projectDir: process.cwd(),
        dbHandle: testDb
      });

      const result = exporter.exportVault();
      expect(result.filesGenerated).toBeGreaterThan(3);
      expect(fs.existsSync(result.indexFile)).toBe(true);

      // Verify Index.md content and wiki-links
      const indexContent = fs.readFileSync(result.indexFile, 'utf8');
      expect(indexContent).toContain('[[Skills_Hub]]');
      expect(indexContent).toContain('[[Conventions]]');
      expect(indexContent).toContain('[[Lessons_Hub]]');

      // Verify Conventions note
      const conventionsFile = path.join(tempVaultDir, 'Conventions', 'Conventions.md');
      expect(fs.existsSync(conventionsFile)).toBe(true);
      const conventionsContent = fs.readFileSync(conventionsFile, 'utf8');
      expect(conventionsContent).toContain('[[Index]]');

      // Verify Lessons note
      const lessonsHubFile = path.join(tempVaultDir, 'Lessons', 'Lessons_Hub.md');
      expect(fs.existsSync(lessonsHubFile)).toBe(true);
      const lessonsHubContent = fs.readFileSync(lessonsHubFile, 'utf8');
      expect(lessonsHubContent).toContain('[[lesson_');
    });
  });
});
