---
name: saga-orchestration
description: Patterns for managing distributed transactions and long-running business processes. Use when the task involves saga orchestration.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Saga Orchestration

Patterns for managing distributed transactions and long-running business processes.

## Do not use this skill when

- The task is unrelated to saga orchestration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Coordinating multi-service transactions
- Implementing compensating transactions
- Managing long-running business workflows
- Handling failures in distributed systems
- Building order fulfillment processes
- Implementing approval workflows

## Core Concepts

### 1. Saga Types

```
Choreography                    Orchestration
┌─────┐  ┌─────┐  ┌─────┐     ┌─────────────┐
│Svc A│─►│Svc B│─►│Svc C│     │ Orchestrator│
└─────┘  └─────┘  └─────┘     └──────┬──────┘
   │        │        │               │
   ▼        ▼        ▼         ┌─────┼─────┐
 Event    Event    Event       ▼     ▼     ▼
                            ┌────┐┌────┐┌────┐
                            │Svc1││Svc2││Svc3│
                            └────┘└────┘└────┘
```

### 2. Saga Execution States

| State            | Description                    |
| ---------------- | ------------------------------ |
| **Started**      | Saga initiated                 |
| **Pending**      | Waiting for step completion    |
| **Compensating** | Rolling back due to failure    |
| **Completed**    | All steps succeeded            |
| **Failed**       | Saga failed after compensation |

## Templates

### Template 1: Saga Orchestrator Base

> See [references/details.md](references/details.md) for full code examples.

### Template 2: Order Fulfillment Saga

> See [references/details.md](references/details.md) for full code examples.

### Template 3: Choreography-Based Saga

> See [references/details.md](references/details.md) for full code examples.

### Template 4: Saga with Timeouts

> See [references/details.md](references/details.md) for full code examples.

## Durable Execution Alternative

The templates above build saga infrastructure from scratch — saga stores, event publishers, compensation tracking. **Durable execution frameworks** (like DBOS) eliminate much of this boilerplate: the workflow runtime automatically persists state to a database, retries failed steps, and resumes from the last checkpoint after crashes. Instead of building a `SagaOrchestrator` base class, you write a workflow function with steps — the framework handles persistence, crash recovery, and exactly-once execution semantics. Consider durable execution when you want saga-like reliability without managing the coordination infrastructure yourself.

## Best Practices

### Do's

- **Make steps idempotent** - Safe to retry
- **Design compensations carefully** - They must work
- **Use correlation IDs** - For tracing across services
- **Implement timeouts** - Don't wait forever
- **Log everything** - For debugging failures

### Don'ts

- **Don't assume instant completion** - Sagas take time
- **Don't skip compensation testing** - Most critical part
- **Don't couple services** - Use async messaging
- **Don't ignore partial failures** - Handle gracefully

## Related Skills

Works well with: `event-sourcing-architect`, `workflow-automation`, `dbos-*`

## Resources

- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Designing Data-Intensive Applications](https://dataintensive.net/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
