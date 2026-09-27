import { describe, it, expect, beforeEach } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Database = require('better-sqlite3');
import { SignatureDefinition } from '../src/core/dspy/types';
import { PredictModule, ChainOfThoughtModule, ReActModule } from '../src/core/dspy/modules';
import { MetricEvaluator, BootstrapFewShotOptimizer } from '../src/services/teleprompter';
import { WorkflowEngine, WorkflowStep } from '../src/services/workflow-engine';

describe('DSPy Teleprompter & Workflow DAG Subsystem', () => {
  let testDb: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...args: unknown[]) => void;
      all: () => unknown[];
    };
  };

  beforeEach(() => {
    testDb = new Database(':memory:');
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'pending',
        output        TEXT,
        completed_at  INTEGER DEFAULT (unixepoch())
      );
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
      CREATE TABLE IF NOT EXISTS workflow_runs (
        run_id        TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        dedupe_key    TEXT,
        status        TEXT NOT NULL,
        step_results  TEXT NOT NULL,
        created_at    INTEGER DEFAULT (unixepoch()),
        completed_at  INTEGER
      );
    `);
  });

  const testSignature: SignatureDefinition = {
    name: 'CodeGenerator',
    description: 'Generates TypeScript code for a requested component',
    inputs: [
      { name: 'requirement', description: 'Functional requirement', type: 'string', required: true }
    ],
    outputs: [
      { name: 'code', description: 'TypeScript source code', type: 'code', prefix: 'Code' }
    ]
  };

  describe('1. Declarative Modules', () => {
    it('PredictModule formats inputs and renders system prompt correctly', () => {
      const predict = new PredictModule(testSignature);
      const prompt = predict.renderSystemPrompt();

      expect(prompt).toContain('TASK: Generates TypeScript code');
      expect(prompt).toContain('- requirement (string): Functional requirement [REQUIRED]');
      expect(prompt).toContain('- Code: TypeScript source code (code)');

      const inputStr = predict.formatInputs({ requirement: 'Create a button component' });
      expect(inputStr).toContain('requirement: Create a button component');
    });

    it('ChainOfThoughtModule augments signature with reasoning prefix', () => {
      const cot = new ChainOfThoughtModule(testSignature);
      const prompt = cot.renderSystemPrompt();

      expect(prompt).toContain('Reasoning: Step-by-step thinking process');
      expect(prompt).toContain('Code: TypeScript source code');
    });

    it('ReActModule provides tools and Thought-Action-Observation schema', () => {
      const react = new ReActModule(testSignature, [
        { name: 'search_codebase', description: 'Search existing code' }
      ]);
      const prompt = react.renderSystemPrompt();

      expect(prompt).toContain('AVAILABLE TOOLS FOR REACT ACTIONS:');
      expect(prompt).toContain('search_codebase: Search existing code');
      expect(prompt).toContain('Thought');
      expect(prompt).toContain('Action');
    });

    it('parseOutputs extracts expected output fields cleanly', () => {
      const predict = new PredictModule(testSignature);
      const rawResponse = 'Code:\n```typescript\nexport const Button = () => <button>Click</button>;\n```';
      const parsed = predict.parseOutputs(rawResponse);

      expect(parsed.code).toContain('export const Button');
    });
  });

  describe('2. MetricEvaluator', () => {
    it('evaluates AST safety and catches syntax errors', () => {
      const validCode = 'const x: number = 42; export default x;';
      const validCheck = MetricEvaluator.evaluateAstSafety(validCode, 'test.ts');
      expect(validCheck.passed).toBe(true);

      const invalidCode = 'const x = ;;; syntax error!';
      const invalidCheck = MetricEvaluator.evaluateAstSafety(invalidCode, 'test.ts');
      expect(invalidCheck.passed).toBe(false);
      expect(invalidCheck.violations.length).toBeGreaterThan(0);
    });

    it('detects violations of never_do rules', () => {
      const offendingCode = 'import { useEffect } from "react"; useEffect(() => {}, []);';
      const result = MetricEvaluator.evaluateNeverDo(offendingCode, ['never use useEffect for data fetching']);

      expect(result.passed).toBe(false);
      expect(result.violations[0]).toContain('useEffect');
    });

    it('calculates Cobb-Douglas composite score correctly', () => {
      const goodCode = 'export function add(a: number, b: number): number { return a + b; }';
      const evalResult = MetricEvaluator.evaluateComposite({ code: goodCode });

      expect(evalResult.passed).toBe(true);
      expect(evalResult.score).toBeGreaterThan(0.6);
    });
  });

  describe('3. BootstrapFewShotOptimizer', () => {
    it('harvests historical traces and compiles an optimized prompt', () => {
      // Seed test database with a successful task
      testDb.prepare(`
        INSERT INTO tasks (id, title, description, status, output)
        VALUES ('task_1', 'Build counter', 'Counter spec', 'completed', ?)
      `).run(JSON.stringify({ code: 'export const count = 1;' }));

      const optimizer = new BootstrapFewShotOptimizer(testDb);
      const traces = optimizer.harvestTraces();
      expect(traces.length).toBe(1);
      expect(traces[0].inputs.task).toBe('Build counter');

      const compiled = optimizer.compile(testSignature, { requirement: 'Build a toggle switch' }, {
        maxDemonstrations: 2
      });

      expect(compiled.signatureName).toBe('CodeGenerator');
      expect(compiled.demonstrations.length).toBe(1);
      expect(compiled.userPromptTemplate).toContain('Build counter');
      expect(compiled.userPromptTemplate).toContain('Build a toggle switch');
      expect(compiled.estimatedTokens).toBeGreaterThan(0);
    });
  });

  describe('4. Workflow DAG Execution Engine', () => {
    it('orders execution layers topologically and detects cycles', () => {
      const engine = new WorkflowEngine();
      const steps: WorkflowStep[] = [
        { id: 'step_c', tool: 'test', args: {}, dependsOn: ['step_b'] },
        { id: 'step_a', tool: 'test', args: {} },
        { id: 'step_b', tool: 'test', args: {}, dependsOn: ['step_a'] }
      ];

      const plan = engine.buildExecutionPlan(steps);
      expect(plan.length).toBe(3);
      expect(plan[0][0].id).toBe('step_a');
      expect(plan[1][0].id).toBe('step_b');
      expect(plan[2][0].id).toBe('step_c');

      const cycleSteps: WorkflowStep[] = [
        { id: 'step_1', tool: 'test', args: {}, dependsOn: ['step_2'] },
        { id: 'step_2', tool: 'test', args: {}, dependsOn: ['step_1'] }
      ];
      expect(() => engine.buildExecutionPlan(cycleSteps)).toThrow('Cycle detected');
    });

    it('executes workflow graph and supports variable interpolation', async () => {
      const engine = new WorkflowEngine();
      const workflow = {
        name: 'test_pipeline',
        steps: [
          { id: 'step1', tool: 'gen_data', args: { val: 42 } },
          { id: 'step2', tool: 'consume_data', args: { received: '{{step1.output.args.val}}' }, dependsOn: ['step1'] }
        ]
      };

      const result = await engine.executeWorkflow(workflow);
      expect(result.status).toBe('completed');
      expect(result.stepResults['step1'].status).toBe('completed');
      expect(result.stepResults['step2'].status).toBe('completed');
    });
  });
});
