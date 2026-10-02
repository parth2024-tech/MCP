---
name: workflow-automation
description: Workflow automation is the infrastructure that makes AI agents. Use when the task involves workflow automation.
  reliable. Without durable execution, a network hiccup during a 10-step payment
  flow means lost money and angry customers. With it, workflows resume exactly
  where they left off.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Workflow Automation

Workflow automation is the infrastructure that makes AI agents reliable.
Without durable execution, a network hiccup during a 10-step payment
flow means lost money and angry customers. With it, workflows resume
exactly where they left off.

This skill covers the platforms (n8n, Temporal, Inngest) and patterns
(sequential, parallel, orchestrator-worker) that turn brittle scripts
into production-grade automation.

Key insight: The platforms make different tradeoffs. n8n optimizes for
accessibility, Temporal for correctness, Inngest for developer experience.
Pick based on your actual needs, not hype.

## Principles

- Durable execution is non-negotiable for money or state-critical workflows
- Events are the universal language of workflow triggers
- Steps are checkpoints - each should be independently retryable
- Start simple, add complexity only when reliability demands it
- Observability isn't optional - you need to see where workflows fail
- Workflows and agents co-evolve - design for both

## Capabilities

- workflow-automation
- workflow-orchestration
- durable-execution
- event-driven-workflows
- step-functions
- job-queues
- background-jobs
- scheduled-tasks

## Scope

- multi-agent-coordination → multi-agent-orchestration
- ci-cd-pipelines → devops
- data-pipelines → data-engineer
- api-design → api-designer

## Tooling

### Platforms

- n8n - When: Low-code automation, quick prototyping, non-technical users Note: Self-hostable, 400+ integrations, great for visual workflows
- Temporal - When: Mission-critical workflows, financial transactions, microservices Note: Strongest durability guarantees, steeper learning curve
- Inngest - When: Event-driven serverless, TypeScript codebases, AI workflows Note: Best developer experience, works with any hosting
- AWS Step Functions - When: AWS-native stacks, existing Lambda functions Note: Tight AWS integration, JSON-based workflow definition
- Azure Durable Functions - When: Azure stacks, .NET or TypeScript Note: Good AI agent support, checkpoint and replay

## Patterns

### Sequential Workflow Pattern

Steps execute in order, each output becomes next input

**When to use**: Content pipelines, data processing, ordered operations

# SEQUENTIAL WORKFLOW:

"""
Step 1 → Step 2 → Step 3 → Output
  ↓         ↓         ↓
(checkpoint at each step)
"""

## Inngest Example (TypeScript)
"""
import { inngest } from "./client";

export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/created" },
  async ({ event, step }) => {
    // Step 1: Validate order
    const validated = await step.run("validate-order", async () => {
      return validateOrder(event.data.order);
    });

    // Step 2: Process payment (durable - survives crashes)
    const payment = await step.run("process-payment", async () => {
      return chargeCard(validated.paymentMethod, validated.total);
    });

    // Step 3: Create shipment
    const shipment = await step.run("create-shipment", async () => {
      return createShipment(validated.items, validated.address);
    });

    // Step 4: Send confirmation
    await step.run("send-confirmation", async () => {
      return sendEmail(validated.email, { payment, shipment });
    });

    return { success: true, orderId: event.data.orderId };
  }
);
"""

## Temporal Example (TypeScript)
"""
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { validateOrder, chargeCard, createShipment, sendEmail } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '30 seconds',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 2,
    }
  });

export async function processOrderWorkflow(order: Order): Promise<void> {
  const validated = await validateOrder(order);
  const payment = await chargeCard(validated.paymentMethod, validated.total);
  const shipment = await createShipment(validated.items, validated.address);
  await sendEmail(validated.email, { payment, shipment });
}
"""

## n8n Pattern
"""
[Webhook: order.created]
    ↓
[HTTP Request: Validate Order]
    ↓
[HTTP Request: Process Payment]
    ↓
[HTTP Request: Create Shipment]
    ↓
[Send Email: Confirmation]

Configure each node with retry on failure.
Use Error Trigger for dead letter handling.
"""

### Parallel Workflow Pattern

Independent steps run simultaneously, aggregate results

**When to use**: Multiple independent analyses, data from multiple sources

# PARALLEL WORKFLOW:

"""
        ┌→ Step A ─┐
Input ──┼→ Step B ─┼→ Aggregate → Output
        └→ Step C ─┘
"""

## Inngest Example
"""
export const analyzeDocument = inngest.createFunction(
  { id: "analyze-document" },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    // Run analyses in parallel
    const [security, performance, compliance] = await Promise.all([
      step.run("security-analysis", () =>
        analyzeForSecurityIssues(event.data.document)
      ),
      step.run("performance-analysis", () =>
        analyzeForPerformance(event.data.document)
      ),
      step.run("compliance-analysis", () =>
        analyzeForCompliance(event.data.document)
      ),
    ]);

    // Aggregate results
    const report = await step.run("generate-report", () =>
      generateReport({ security, performance, compliance })
    );

    return report;
  }
);
"""

## AWS Step Functions (Amazon States Language)
"""
{
  "Type": "Parallel",
  "Branches": [
    {
      "StartAt": "SecurityAnalysis",
      "States": {
        "SecurityAnalysis": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...:security-analyzer",
          "End": true
        }
      }
    },
    {
      "StartAt": "PerformanceAnalysis",
      "States": {
        "PerformanceAnalysis": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...:performance-analyzer",
          "End": true
        }
      }
    }
  ],
  "Next": "AggregateResults"
}
"""

### Orchestrator-Worker Pattern

Central coordinator dispatches work to specialized workers

**When to use**: Complex tasks requiring different expertise, dynamic subtask creation

# ORCHESTRATOR-WORKER PATTERN:

"""
┌─────────────────────────────────────┐
│          ORCHESTRATOR               │
│  - Analyzes task                    │
│  - Creates subtasks                 │
│  - Dispatches to workers            │
│  - Aggregates results               │
└─────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Worker1│  │Worker2│  │Worker3│
│Create │  │Modify │  │Delete │
└───────┘  └───────┘  └───────┘
"""

## Temporal Example
"""
export async function orchestratorWorkflow(task: ComplexTask) {
  // Orchestrator decides what work needs to be done
  const plan = await analyzeTask(task);

  // Dispatch to specialized worker workflows
  const results = await Promise.all(
    plan.subtasks.map(subtask => {
      switch (subtask.type) {
        case 'create':
          return executeChild(createWorkerWorkflow, { args: [subtask] });
        case 'modify':
          return executeChild(modifyWorkerWorkflow, { args: [subtask] });
        case 'delete':
          return executeChild(deleteWorkerWorkflow, { args: [subtask] });
      }
    })
  );

  // Aggregate results
  return aggregateResults(results);
}
"""

## Inngest with AI Orchestration
"""
export const aiOrchestrator = inngest.createFunction(
  { id: "ai-orchestrator" },
  { event: "task/complex" },
  async ({ event, step }) => {
    // AI decides what needs to be done
    const plan = await step.run("create-plan", async () => {
      return await llm.chat({
        messages: [
          { role: "system", content: "Break this task into subtasks..." },
          { role: "user", content: event.data.task }
        ]
      });
    });

    // Execute each subtask as a durable step
    const results = [];
    for (const subtask of plan.subtasks) {
      const result = await step.run(`execute-${subtask.id}`, async () => {
        return executeSubtask(subtask);
      });
      results.push(result);
    }

    // Final synthesis
    return await step.run("synthesize", async () => {
      return synthesizeResults(results);
    });
  }
);
"""

### Event-Driven Trigger Pattern

Workflows triggered by events, not schedules

**When to use**: Reactive systems, user actions, webhook integrations

# EVENT-DRIVEN TRIGGERS:

## Inngest Event-Based
"""
// Define events with TypeScript types
type Events = {
  "user/signed.up": {
    data: { userId: string; email: string };
  };
  "order/completed": {
    data: { orderId: string; total: number };
  };
};

// Function triggered by event
export const onboardUser = inngest.createFunction(
  { id: "onboard-user" },
  { event: "user/signed.up" },  // Trigger on this event
  async ({ event, step }) => {
    // Wait 1 hour, then send welcome email
    await step.sleep("wait-for-exploration", "1 hour");

    await step.run("send-welcome", async () => {
      return sendWelcomeEmail(event.data.email);
    });

    // Wait 3 days for engagement check
    await step.sleep("wait-for-engagement", "3 days");

    const engaged = await step.run("check-engagement", async () => {
      return checkUserEngagement(event.data.userId);
    });

    if (!engaged) {
      await step.run("send-nudge", async () => {
        return sendNudgeEmail(event.data.email);
      });
    }
  }
);

// Send events from anywhere
await inngest.send({
  name: "user/signed.up",
  data: { userId: "123", email: "user@example.com" }
});
"""

## n8n Webhook Trigger
"""
[Webhook: POST /api/webhooks/order]
    ↓
[Switch: event.type]
    ↓ order.created
[Process New Order Subworkflow]
    ↓ order.cancelled
[Handle Cancellation Subworkflow]
"""

### Retry and Recovery Pattern

Automatic retry with backoff, dead letter handling

**When to use**: Any workflow with external dependencies

# RETRY AND RECOVERY:

## Temporal Retry Configuration
"""
const activities = proxyActivities<typeof activitiesType>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 5,
    nonRetryableErrorTypes: [
      'ValidationError',      // Don't retry validation failures
      'InsufficientFunds',    // Don't retry payment failures
    ]
  }
});
"""

## Inngest Retry Configuration
"""
export const processPayment = inngest.createFunction(
  {
    id: "process-payment",
    retries: 5,  // Retry up to 5 times
  },
  { event: "payment/initiated" },
  async ({ event, step, attempt }) => {
    // attempt is 0-indexed retry count

    const result = await step.run("charge-card", async () => {
      try {
        return await stripe.charges.create({...});
      } catch (error) {
        if (error.code === 'card_declined') {
          // Don't retry card declines
          throw new NonRetriableError("Card declined");
        }
        throw error;  // Retry other errors
      }
    });

    return result;
  }
);
"""

## Dead Letter Handling
"""
// n8n: Use Error Trigger node
[Error Trigger]
    ↓
[Log to Error Database]
    ↓
[Send Alert to Slack]
    ↓
[Create Ticket in Jira]

// Inngest: Handle in onFailure
export const myFunction = inngest.createFunction(
  {
    id: "my-function",
    onFailure: async ({ error, event, step }) => {
      await step.run("alert-team", async () => {
        await slack.postMessage({
          channel: "#errors",
          text: `Function failed: ${error.message}`
        });
      });
    }
  },
  { event: "..." },
  async ({ step }) => { ... }
);
"""

### Scheduled Workflow Pattern

Time-based triggers for recurring tasks

**When to use**: Daily reports, periodic sync, batch processing

# SCHEDULED WORKFLOWS:

## Inngest Cron
"""
export const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 9 * * *" },  // Every day at 9 AM
  async ({ step }) => {
    const data = await step.run("gather-metrics", async () => {
      return gatherDailyMetrics();
    });

    await step.run("generate-report", async () => {
      return generateAndSendReport(data);
    });
  }
);

export const syncInventory = inngest.createFunction(
  { id: "sync-inventory" },
  { cron: "*/15 * * * *" },  // Every 15 minutes
  async ({ step }) => {
    await step.run("sync", async () => {
      return syncWithSupplier();
    });
  }
);
"""

## Temporal Cron Workflow


> See [references/details.md](references/details.md) for extended content.
