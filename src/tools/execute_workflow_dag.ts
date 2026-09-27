import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { WorkflowEngine, WorkflowStep } from '../services/workflow-engine';

const ExecuteWorkflowDagSchema = z.object({
  name: z.string().describe('Descriptive name of the workflow execution'),
  description: z.string().optional().describe('Optional workflow objective description'),
  dedupe_key: z.string().optional().describe('Optional idempotency key to prevent duplicate runs'),
  steps: z.array(
    z.object({
      id: z.string().describe('Unique identifier for this step (e.g. step_lint)'),
      tool: z.string().describe('Name of the MCP tool to execute in this step'),
      args: z.record(z.string(), z.unknown()).default({}).describe('Arguments to pass to the tool; supports {{stepId.output}} template substitution'),
      dependsOn: z.array(z.string()).optional().describe('List of prerequisite step IDs that must complete first'),
      continueOnFailure: z.boolean().optional().default(false).describe('If true, subsequent independent steps continue even if this step fails'),
      retryOnFailure: z.boolean().optional().default(true).describe('If true, retries the step on failure'),
      maxRetries: z.number().optional().default(2).describe('Maximum number of attempts if retryOnFailure is true')
    })
  ).min(1).describe('Array of workflow steps with dependencies')
});

type ExecuteWorkflowDagArgs = z.infer<typeof ExecuteWorkflowDagSchema>;

export default class ExecuteWorkflowDagTool extends BaseTool<ExecuteWorkflowDagArgs> {
  name = 'execute_workflow_dag';
  description = 'Executes a multi-step Directed Acyclic Graph (DAG) workflow with dependency resolution, parallel execution, retries, and state persistence.';
  schema = ExecuteWorkflowDagSchema;

  protected async execute(args: ExecuteWorkflowDagArgs, context: ToolContext): Promise<Record<string, unknown>> {
    const toolRegistry = context.container.resolve<{ get: (name: string) => unknown }>('ToolRegistry');
    const engine = new WorkflowEngine(toolRegistry);

    const result = await engine.executeWorkflow(
      {
        name: args.name,
        description: args.description,
        dedupeKey: args.dedupe_key,
        steps: args.steps as WorkflowStep[]
      },
      context.container
    );

    return {
      run_id: result.runId,
      workflow_name: result.workflowName,
      status: result.status,
      duration_ms: result.durationMs,
      steps: result.stepResults
    };
  }
}
