---
name: fp-backend
description: Functional programming patterns for Node.js/Deno backend development using fp-ts, ReaderTaskEither, and functional dependency injection. Use when the task involves fp backend.
risk: unknown
source: community
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - typescript
  - backend
  - functional-programming
  - node
  - deno
  - dependency-injection
  - reader-task-either
---

# fp-ts Backend Patterns

Functional programming patterns for building type-safe, testable backend services using fp-ts.

## When to Use
- You are building or refactoring a Node.js or Deno backend with fp-ts.
- The task involves dependency injection, service composition, or typed backend errors with `ReaderTaskEither`.
- You need functional backend architecture patterns rather than isolated utility snippets.

## Core Concepts

### ReaderTaskEither (RTE)

The `ReaderTaskEither<R, E, A>` type is the backbone of functional backend development:
- **R** (Reader): Dependencies/environment (database, config, logger)
- **E** (Either left): Error type
- **A** (Either right): Success value

> See [references/details.md](references/details.md) for full code examples.

## Service Layer Patterns

### Defining Service Modules

Structure services as modules exporting RTE functions:

> See [references/details.md](references/details.md) for full code examples.

### Composing Services

> See [references/details.md](references/details.md) for full code examples.

## Functional Dependency Injection

### Building the Dependency Container

> See [references/details.md](references/details.md) for full code examples.

### Running Programs with Dependencies

> See [references/details.md](references/details.md) for full code examples.

## Database Operations

### Prisma Wrappers

> See [references/details.md](references/details.md) for full code examples.

### Transaction Handling

> See [references/details.md](references/details.md) for full code examples.

## Middleware Patterns

### Express Middleware

> See [references/details.md](references/details.md) for full code examples.

### Hono Middleware

> See [references/details.md](references/details.md) for full code examples.

### Request Context Pattern

> See [references/details.md](references/details.md) for full code examples.

## Error Handling Patterns

### Typed Error Hierarchy

> See [references/details.md](references/details.md) for full code examples.

### Error Recovery

> See [references/details.md](references/details.md) for full code examples.

## Testing Strategies

### Mocking Dependencies

> See [references/details.md](references/details.md) for full code examples.

### Integration Testing with Test Containers

> See [references/details.md](references/details.md) for full code examples.

### Property-Based Testing

> See [references/details.md](references/details.md) for full code examples.

## Quick Reference

### Common Imports

```typescript
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import * as T from 'fp-ts/Task'
import { pipe, flow } from 'fp-ts/function'
> See [references/details.md](references/details.md) for full code examples.
// Template for a new service
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'

type MyServiceDeps = {
  db: DatabaseClient
  // ... other dependencies
}

type MyServiceError =
  | { _tag: 'NotFound'; id: string }
  | { _tag: 'ValidationFailed'; reason: string }

export const myOperation = (
  input: Input
): RTE.ReaderTaskEither<MyServiceDeps, MyServiceError, Output> =>
  pipe(
    RTE.ask<MyServiceDeps>(),
    RTE.flatMap(deps =>
      // Your implementation here
      RTE.right(output)
    )
  )
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
