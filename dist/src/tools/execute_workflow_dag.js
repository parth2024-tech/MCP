"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const workflow_engine_1 = require("../services/workflow-engine");
const ExecuteWorkflowDagSchema = zod_1.z.object({
    name: zod_1.z.string().describe('Descriptive name of the workflow execution'),
    description: zod_1.z.string().optional().describe('Optional workflow objective description'),
    dedupe_key: zod_1.z.string().optional().describe('Optional idempotency key to prevent duplicate runs'),
    steps: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().describe('Unique identifier for this step (e.g. step_lint)'),
        tool: zod_1.z.string().describe('Name of the MCP tool to execute in this step'),
        args: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}).describe('Arguments to pass to the tool; supports {{stepId.output}} template substitution'),
        dependsOn: zod_1.z.array(zod_1.z.string()).optional().describe('List of prerequisite step IDs that must complete first'),
        continueOnFailure: zod_1.z.boolean().optional().default(false).describe('If true, subsequent independent steps continue even if this step fails'),
        retryOnFailure: zod_1.z.boolean().optional().default(true).describe('If true, retries the step on failure'),
        maxRetries: zod_1.z.number().optional().default(2).describe('Maximum number of attempts if retryOnFailure is true')
    })).min(1).describe('Array of workflow steps with dependencies')
});
class ExecuteWorkflowDagTool extends BaseTool_1.BaseTool {
    name = 'execute_workflow_dag';
    description = 'Executes a multi-step Directed Acyclic Graph (DAG) workflow with dependency resolution, parallel execution, retries, and state persistence.';
    schema = ExecuteWorkflowDagSchema;
    async execute(args, context) {
        const toolRegistry = context.container.resolve('ToolRegistry');
        const engine = new workflow_engine_1.WorkflowEngine(toolRegistry);
        const result = await engine.executeWorkflow({
            name: args.name,
            description: args.description,
            dedupeKey: args.dedupe_key,
            steps: args.steps
        }, context.container);
        return {
            run_id: result.runId,
            workflow_name: result.workflowName,
            status: result.status,
            duration_ms: result.durationMs,
            steps: result.stepResults
        };
    }
}
exports.default = ExecuteWorkflowDagTool;
