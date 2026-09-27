/**
 * Workflow DAG Execution Engine
 *
 * Implements a resilient Directed Acyclic Graph (DAG) workflow engine:
 * - Topological dependency resolution and cycle detection
 * - Parallel execution of ready nodes
 * - Variable interpolation across steps (e.g. {{step1.output}})
 * - Step-level error handling (retryOnFailure, continueOnFailure)
 * - State checkpointing and deduplication in OrchestrationDB
 */

import crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OrchestrationDB = require('./orchestration-db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { logger } = require('../utils/logger');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metrics = require('../utils/metrics');

export interface WorkflowStep {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  dependsOn?: string[];
  continueOnFailure?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  dedupeKey?: string;
}

export interface WorkflowStepResult {
  stepId: string;
  tool: string;
  status: 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  durationMs: number;
}

export interface WorkflowExecutionResult {
  runId: string;
  workflowName: string;
  status: 'completed' | 'failed' | 'partially_completed';
  stepResults: Record<string, WorkflowStepResult>;
  durationMs: number;
  error?: string;
}

export class WorkflowEngine {
  private db: unknown;
  private toolRegistry: { get: (name: string) => unknown } | null = null;

  constructor(toolRegistry?: { get: (name: string) => unknown }) {
    try {
      const orch = OrchestrationDB.getInstance();
      this.db = orch.getDB();
      this.initSchema();
    } catch {
      this.db = null;
    }
    this.toolRegistry = toolRegistry || null;
  }

  private initSchema(): void {
    if (!this.db) return;
    const typedDb = this.db as { exec: (sql: string) => void };
    try {
      typedDb.exec(`
        CREATE TABLE IF NOT EXISTS workflow_runs (
          run_id        TEXT PRIMARY KEY,
          name          TEXT NOT NULL,
          dedupe_key    TEXT,
          status        TEXT NOT NULL,
          step_results  TEXT NOT NULL,
          created_at    INTEGER DEFAULT (unixepoch()),
          completed_at  INTEGER
        );
        CREATE INDEX IF NOT EXISTS idx_workflow_dedupe ON workflow_runs(dedupe_key);
      `);
    } catch {
      // Ignore if table exists
    }
  }

  /**
   * Performs topological sort and returns execution layers (steps in the same layer can run concurrently).
   */
  public buildExecutionPlan(steps: WorkflowStep[]): WorkflowStep[][] {
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();
    const stepMap = new Map<string, WorkflowStep>();

    for (const step of steps) {
      stepMap.set(step.id, step);
      inDegree.set(step.id, 0);
      graph.set(step.id, []);
    }

    for (const step of steps) {
      if (step.dependsOn && step.dependsOn.length > 0) {
        for (const depId of step.dependsOn) {
          if (!stepMap.has(depId)) {
            throw new Error(`Step "${step.id}" depends on unknown step "${depId}".`);
          }
          graph.get(depId)?.push(step.id);
          inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
        }
      }
    }

    const layers: WorkflowStep[][] = [];
    let ready = steps.filter(s => inDegree.get(s.id) === 0);

    const visitedCount = new Set<string>();

    while (ready.length > 0) {
      layers.push(ready);
      const nextReady: WorkflowStep[] = [];

      for (const step of ready) {
        visitedCount.add(step.id);
        const children = graph.get(step.id) || [];
        for (const childId of children) {
          const currentInDegree = (inDegree.get(childId) ?? 1) - 1;
          inDegree.set(childId, currentInDegree);
          if (currentInDegree === 0) {
            const childStep = stepMap.get(childId);
            if (childStep) nextReady.push(childStep);
          }
        }
      }

      ready = nextReady;
    }

    if (visitedCount.size !== steps.length) {
      throw new Error('Cycle detected in workflow graph dependencies.');
    }

    return layers;
  }

  /**
   * Resolves mustache-style variable substitutions in step args (e.g. {{step1.output.id}}).
   */
  private interpolateArgs(
    args: Record<string, unknown>,
    stepResults: Record<string, WorkflowStepResult>
  ): Record<string, unknown> {
    const rawJson = JSON.stringify(args);
    const replaced = rawJson.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
      const parts = path.trim().split('.');
      const stepId = parts[0];
      const stepResult = stepResults[stepId];
      if (!stepResult) return '';

      let current: unknown = stepResult;
      for (let i = 1; i < parts.length; i++) {
        if (current && typeof current === 'object' && parts[i] in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[parts[i]];
        } else {
          return '';
        }
      }
      return typeof current === 'string' ? current : JSON.stringify(current);
    });

    try {
      return JSON.parse(replaced);
    } catch {
      return args;
    }
  }

  /**
   * Executes a workflow definition according to its DAG topology.
   */
  public async executeWorkflow(
    workflow: WorkflowDefinition,
    contextContainer?: unknown
  ): Promise<WorkflowExecutionResult> {
    const startMs = Date.now();
    const runId = crypto.randomUUID();

    // 1. Check idempotency if dedupeKey is provided
    if (workflow.dedupeKey && this.db) {
      const typedDb = this.db as {
        prepare: (sql: string) => { get: (key: string) => { step_results: string } | null };
      };
      try {
        const existing = typedDb
          .prepare("SELECT step_results FROM workflow_runs WHERE dedupe_key = ? AND status = 'completed'")
          .get(workflow.dedupeKey);
        if (existing) {
          const parsed = JSON.parse(existing.step_results);
          metrics.increment('workflow.dedupe_hit');
          return {
            runId,
            workflowName: workflow.name,
            status: 'completed',
            stepResults: parsed,
            durationMs: 0
          };
        }
      } catch {
        // Continue if cache check fails
      }
    }

    const stepResults: Record<string, WorkflowStepResult> = {};
    const executionLayers = this.buildExecutionPlan(workflow.steps);

    let workflowFailed = false;

    // Execute layer by layer
    for (const layer of executionLayers) {
      if (workflowFailed) break;

      const layerPromises = layer.map(async (step): Promise<void> => {
        const stepStart = Date.now();

        // Check if any prerequisite step failed
        if (step.dependsOn) {
          const prereqFailed = step.dependsOn.some(depId => stepResults[depId]?.status === 'failed');
          if (prereqFailed) {
            stepResults[step.id] = {
              stepId: step.id,
              tool: step.tool,
              status: 'skipped',
              durationMs: 0,
              error: 'Prerequisite step failed'
            };
            return;
          }
        }

        const resolvedArgs = this.interpolateArgs(step.args, stepResults);
        const maxRetries = step.retryOnFailure ? (step.maxRetries ?? 2) : 1;

        let stepError: string | null = null;
        let stepOutput: unknown = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (this.toolRegistry) {
              const toolInstance = this.toolRegistry.get(step.tool) as {
                validateAndExecute?: (args: unknown, ctx: unknown) => Promise<unknown>;
                handler?: (args: unknown, ctx: unknown) => Promise<unknown>;
              } | null;

              if (!toolInstance) {
                throw new Error(`Tool "${step.tool}" not found in registry.`);
              }

              const toolCtx = { container: contextContainer, reqId: runId };
              if (toolInstance.validateAndExecute) {
                stepOutput = await toolInstance.validateAndExecute(resolvedArgs, toolCtx);
              } else if (toolInstance.handler) {
                stepOutput = await toolInstance.handler(resolvedArgs, toolCtx);
              } else {
                throw new Error(`Tool "${step.tool}" has no valid execution handler.`);
              }
            } else {
              // Simulated execution for standalone testing
              stepOutput = { executed: step.tool, args: resolvedArgs };
            }

            stepError = null;
            break; // Success
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            stepError = msg;
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 200 * attempt));
            }
          }
        }

        if (stepError) {
          stepResults[step.id] = {
            stepId: step.id,
            tool: step.tool,
            status: 'failed',
            error: stepError,
            durationMs: Date.now() - stepStart
          };

          if (!step.continueOnFailure) {
            workflowFailed = true;
          }
        } else {
          stepResults[step.id] = {
            stepId: step.id,
            tool: step.tool,
            status: 'completed',
            output: stepOutput,
            durationMs: Date.now() - stepStart
          };
        }
      });

      await Promise.all(layerPromises);
    }

    const overallStatus = workflowFailed ? 'failed' : 'completed';
    const totalDuration = Date.now() - startMs;

    // Record in database
    if (this.db) {
      const typedDb = this.db as {
        prepare: (sql: string) => {
          run: (...params: unknown[]) => void;
        };
      };
      try {
        typedDb
          .prepare(
            'INSERT OR REPLACE INTO workflow_runs (run_id, name, dedupe_key, status, step_results, completed_at) VALUES (?, ?, ?, ?, ?, unixepoch())'
          )
          .run(runId, workflow.name, workflow.dedupeKey || null, overallStatus, JSON.stringify(stepResults));
      } catch {
        // Non-fatal
      }
    }

    metrics.increment(`workflow.runs.${overallStatus}`);

    return {
      runId,
      workflowName: workflow.name,
      status: overallStatus,
      stepResults,
      durationMs: totalDuration
    };
  }
}
