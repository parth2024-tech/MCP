import { describe, it, expect, beforeEach } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
import { GoalLoopEngine } from '../src/services/goal-loop-engine';

describe('Loop Engineering Subsystem (GoalLoopEngine)', () => {
  let testDb: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...args: unknown[]) => void;
    };
  };

  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS code_loops (
        session_id    TEXT NOT NULL,
        task_id       TEXT NOT NULL,
        loop_number   INTEGER NOT NULL,
        loop_name     TEXT NOT NULL,
        input_code    TEXT NOT NULL,
        output_code   TEXT NOT NULL,
        changes_made  TEXT,
        completed_at  INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (session_id, loop_number)
      );
    `);
  });

  describe('1. Independent Checker Evaluation', () => {
    it('approves clean code with score >= 8.0', () => {
      const engine = new GoalLoopEngine(testDb);
      const cleanCode = 'export function sum(a: number, b: number): number { return a + b; }';

      const check = engine.evaluateOutput(cleanCode, 'utils.ts', ['never use useEffect for data fetching'], 8.0);
      expect(check.passed).toBe(true);
      expect(check.score).toBeGreaterThanOrEqual(8.0);
      expect(check.violations.length).toBe(0);
      expect(check.feedback).toBeUndefined();
    });

    it('rejects code containing never_do rule violations and provides diagnostics', () => {
      const engine = new GoalLoopEngine(testDb);
      const badCode = 'import { useEffect } from "react"; useEffect(() => { fetch("/api"); }, []);';

      const check = engine.evaluateOutput(badCode, 'component.tsx', ['never use useEffect for data fetching'], 8.0);
      expect(check.passed).toBe(false);
      expect(check.violations.length).toBeGreaterThan(0);
      expect(check.feedback).toContain('Gate rejected: Found');
      expect(check.feedback).toContain('useEffect');
    });

    it('rejects syntax/AST broken code', () => {
      const engine = new GoalLoopEngine(testDb);
      const brokenSyntax = 'function Broken( { const x = ;;; }';

      const check = engine.evaluateOutput(brokenSyntax, 'broken.ts', [], 8.0);
      expect(check.passed).toBe(false);
      expect(check.violations[0]).toContain('Babel AST parse failure');
    });
  });

  describe('2. Autonomous Goal Loop Execution', () => {
    it('completes on Try 1 when initial code satisfies the Gate', async () => {
      const engine = new GoalLoopEngine(testDb);
      const validCode = 'export const API_URL = "https://api.example.com";';

      const result = await engine.runLoop({
        goal: 'Define API URL constant with zero violations',
        initialContent: validCode,
        maxTries: 8,
        targetScore: 8.0
      });

      expect(result.status).toBe('passed');
      expect(result.totalTries).toBe(1);
      expect(result.finalScore).toBeGreaterThanOrEqual(8.0);
      expect(result.iterations.length).toBe(1);
      expect(result.iterations[0].passed).toBe(true);
    });

    it('self-corrects over multiple iterations using Doer + Checker feedback', async () => {
      const engine = new GoalLoopEngine(testDb);
      const offendingCode = 'import { useEffect } from "react"; useEffect(() => {}, []);';

      // Custom Doer that fixes the violation on iteration 2
      const customDoer = (content: string, iteration: number, feedback?: string) => {
        if (iteration === 1) {
          return content; // Keep offending on try 1
        }
        // Fix on try 2 per feedback
        return 'export function fetchData(): Promise<string> { return Promise.resolve("ok"); }';
      };

      const result = await engine.runLoop({
        goal: 'Remove useEffect and replace with clean async function',
        initialContent: offendingCode,
        neverDoRules: ['never use useEffect for data fetching'],
        maxTries: 5,
        targetScore: 8.0,
        doerFn: customDoer
      });

      expect(result.status).toBe('passed');
      expect(result.totalTries).toBe(2);
      expect(result.iterations[0].passed).toBe(false);
      expect(result.iterations[1].passed).toBe(true);
      expect(result.finalContent).toContain('fetchData');
    });

    it('strictly enforces the max_tries cap to prevent infinite loops', async () => {
      const engine = new GoalLoopEngine(testDb);
      const unfixableCode = 'const broken = ;;;;';

      // Doer that fails to fix the syntax error
      const stubbornDoer = (content: string) => content;

      const result = await engine.runLoop({
        goal: 'Fix syntax error',
        initialContent: unfixableCode,
        maxTries: 3,
        targetScore: 8.0,
        doerFn: stubbornDoer
      });

      expect(result.status).toBe('max_tries_reached');
      expect(result.totalTries).toBe(3);
      expect(result.iterations.length).toBe(3);
      expect(result.iterations.every(it => !it.passed)).toBe(true);
    });

    it('executes two-pass gated loop: Pass 1 skeleton verification -> Pass 2 refinement', async () => {
      const engine = new GoalLoopEngine(testDb);
      const phasesRecorded: string[] = [];

      const twoPassDoer = (content: string, iteration: number, feedback?: string, phase?: string) => {
        if (phase) phasesRecorded.push(phase);
        if (phase === 'pass1_skeleton') {
          // Output valid TypeScript structural skeleton
          return 'export interface DataModel { id: string; value: number; }\nexport declare function processData(d: DataModel): Promise<number>;';
        }
        // Pass 2: implement full logic
        return 'export interface DataModel { id: string; value: number; }\nexport async function processData(d: DataModel): Promise<number> { return d.value * 2; }';
      };

      const result = await engine.runLoop({
        goal: 'Generate typed data processor with two-pass execution',
        initialContent: 'const invalid = ;;',
        twoPassMode: true,
        maxTries: 5,
        targetScore: 8.0,
        doerFn: twoPassDoer
      });

      expect(result.status).toBe('passed');
      expect(result.twoPassCompleted).toBe(true);
      expect(result.totalTries).toBe(2);
      expect(result.iterations[0].phase).toBe('pass1_skeleton');
      expect(result.iterations[0].passed).toBe(true);
      expect(result.iterations[1].phase).toBe('pass2_refine');
      expect(result.iterations[1].passed).toBe(true);
      expect(phasesRecorded).toEqual(['pass1_skeleton', 'pass2_refine']);
      expect(result.finalContent).toContain('processData');
    });

    it('trips Anti-Marathon Breaker when consecutive iterations stagnate without progress', async () => {
      const engine = new GoalLoopEngine(testDb);
      const stubbornCode = 'const x = ;;;';

      const result = await engine.runLoop({
        goal: 'Fix stubborn error with Anti-Marathon guard',
        initialContent: stubbornCode,
        antiMarathonBreaker: true,
        maxTries: 8,
        targetScore: 8.0,
        doerFn: (content) => content // never improves
      });

      // Iteration 1 fails, iteration 2 fails (stagnation 1), iteration 3 fails (stagnation 2 -> halts at try 3 instead of try 8)
      expect(result.status).toBe('stagnation_halted');
      expect(result.totalTries).toBe(3);
      expect(result.iterations.length).toBe(3);
      expect(result.iterations[2].stagnationDetected).toBe(true);
    });
  });
});
