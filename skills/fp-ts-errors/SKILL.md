---
name: fp-ts-errors
description: "Handle errors as values using fp-ts Either and TaskEither for cleaner, more predictable TypeScript code. Use when implementing error handling patterns with fp-ts."
risk: safe
source: "https://github.com/whatiskadudoing/fp-ts-skills"
date_added: "2026-02-27"
---

# Practical Error Handling with fp-ts

This skill teaches you how to handle errors without try/catch spaghetti. No academic jargon - just practical patterns for real problems.

## When to Use This Skill

- When you want type-safe error handling in TypeScript
- When replacing try/catch with Either and TaskEither patterns
- When building APIs or services that need explicit error types
- When accumulating multiple validation errors

The core idea: **Errors are just data**. Instead of throwing them into the void and hoping someone catches them, return them as values that TypeScript can track.

---

## 1. Stop Throwing Everywhere

### The Problem with Exceptions

Exceptions are invisible in your types. They break the contract between functions.

```typescript
// What this function signature promises:
function getUser(id: string): User

// What it actually does:
function getUser(id: string): User {
  if (!id) throw new Error('ID required')
  const user = db.find(id)
  if (!user) throw new Error('User not found')
  return user
}

// The caller has no idea this can fail
const user = getUser(id) // Might explode!
```

You end up with code like this:

> See [references/details.md](references/details.md) for full code examples.

### The Solution: Return Errors as Values

```typescript
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

// Now TypeScript KNOWS this can fail
function getUser(id: string): E.Either<string, User> {
  if (!id) return E.left('ID required')
  const user = db.find(id)
  if (!user) return E.left('User not found')
  return E.right(user)
}

// The caller is forced to handle both cases
const result = getUser(id)
// result is Either<string, User> - error OR success, never both
```

---

## 2. The Result Pattern (Either)

`Either<E, A>` is simple: it holds either an error (`E`) or a value (`A`).

- `Left` = error case
- `Right` = success case (think "right" as in "correct")

> See [references/details.md](references/details.md) for full code examples.

### Converting Throwing Code to Either

```typescript
// Wrap any throwing function with tryCatch
const parseJSON = (json: string): E.Either<Error, unknown> =>
  E.tryCatch(
    () => JSON.parse(json),
    (e) => (e instanceof Error ? e : new Error(String(e)))
  )

parseJSON('{"valid": true}')  // Right({ valid: true })
parseJSON('not json')          // Left(SyntaxError: ...)

// For functions you'll reuse, use tryCatchK
const safeParseJSON = E.tryCatchK(
  JSON.parse,
  (e) => (e instanceof Error ? e : new Error(String(e)))
)
```

### Common Either Operations

> See [references/details.md](references/details.md) for full code examples.

---

## 3. Chaining Operations That Might Fail

The real power comes from chaining. Each step can fail, but you write it as a clean pipeline.

### Before: Nested Try/Catch Hell

> See [references/details.md](references/details.md) for full code examples.

### After: Clean Chain with Either

> See [references/details.md](references/details.md) for full code examples.

### Different Error Types? Use chainW

```typescript
type ValidationError = { type: 'validation'; message: string }
type DbError = { type: 'db'; message: string }

const validateInput = (id: string): E.Either<ValidationError, string> => { ... }
const fetchFromDb = (id: string): E.Either<DbError, User> => { ... }

// chainW (W = "wider") automatically unions the error types
const process = (id: string): E.Either<ValidationError | DbError, User> =>
  pipe(
    validateInput(id),
    E.chainW(validId => fetchFromDb(validId))
  )
```

---

## 4. Collecting Multiple Errors

Sometimes you want ALL errors, not just the first one. Form validation is the classic example.

### Before: Collecting Errors Manually

> See [references/details.md](references/details.md) for full code examples.

### After: Validation with Error Accumulation

> See [references/details.md](references/details.md) for full code examples.

### Field-Level Errors for Forms

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Async Operations (TaskEither)

For async operations that can fail, use `TaskEither`. It's like `Either` but for promises.

- `TaskEither<E, A>` = a function that returns `Promise<Either<E, A>>`
- Lazy: nothing runs until you execute it

> See [references/details.md](references/details.md) for full code examples.

### Before: Promise Chain with Error Handling

> See [references/details.md](references/details.md) for full code examples.

### After: Clean TaskEither Pipeline

> See [references/details.md](references/details.md) for full code examples.

### Retry Failed Operations

> See [references/details.md](references/details.md) for full code examples.

### Fallback to Alternative

```typescript
// Try cache first, fall back to API
const getUserData = (id: string) =>
  pipe(
    fetchFromCache(id),
    TE.orElse(() => fetchFromApi(id)),
    TE.orElse(() => TE.right(defaultUser)) // Last resort default
  )
```

---

## 6. Converting Between Patterns

Real codebases have throwing functions, nullable values, and promises. Here's how to work with them.

### From Nullable to Either

```typescript
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'

// Direct conversion
const user = users.find(u => u.id === id) // User | undefined
const result = E.fromNullable('User not found')(user)

// From Option
const maybeUser: O.Option<User> = O.fromNullable(user)
const eitherUser = pipe(
  maybeUser,
  E.fromOption(() => 'User not found')
)
```

### From Throwing Function to Either

```typescript
// Wrap at the boundary
const safeParse = <T>(schema: ZodSchema<T>) => (data: unknown): E.Either<ZodError, T> =>
  E.tryCatch(
    () => schema.parse(data),
    (e) => e as ZodError
  )

// Use throughout your code
const parseUser = safeParse(UserSchema)
const result = parseUser(rawData) // Either<ZodError, User>
```

### From Promise to TaskEither

```typescript
import * as TE from 'fp-ts/TaskEither'

// Wrap external async functions
const fetchJson = <T>(url: string): TE.TaskEither<Error, T> =>
  TE.tryCatch(
    () => fetch(url).then(r => r.json()),
    (e) => new Error(`Fetch failed: ${e}`)
  )

// Wrap axios, prisma, any async library
const getUserFromDb = (id: string): TE.TaskEither<DbError, User> =>
  TE.tryCatch(
    () => prisma.user.findUniqueOrThrow({ where: { id } }),
    (e) => ({ code: 'DB_ERROR', cause: e })
  )
```

### Back to Promise (Escape Hatch)

Sometimes you need a plain Promise for external APIs.

> See [references/details.md](references/details.md) for full code examples.

---

## Real Scenarios

### Parse User Input Safely

> See [references/details.md](references/details.md) for full code examples.

### API Call with Full Error Handling

> See [references/details.md](references/details.md) for full code examples.

### Process List Where Some Items Might Fail

> See [references/details.md](references/details.md) for full code examples.

### Bulk Operations with Partial Success

> See [references/details.md](references/details.md) for full code examples.

---

## Quick Reference

> See [references/details.md](references/details.md) for full code examples.

### TaskEither Equivalents

All Either operations have TaskEither equivalents:
- `TE.right`, `TE.left`, `TE.tryCatch`
- `TE.map`, `TE.mapLeft`, `TE.chain`, `TE.chainW`
- `TE.fold`, `TE.getOrElse`, `TE.filterOrElse`
- `TE.orElse` for fallbacks

---

## Summary

1. **Return errors as values** - Use Either/TaskEither instead of throwing
2. **Chain with confidence** - `chain` stops at first error automatically
3. **Collect all errors when needed** - Use validation applicative for forms
4. **Wrap at boundaries** - Convert throwing/Promise code at the edges
5. **Match at the end** - Use `fold` to handle both cases when you're ready to act

The payoff: TypeScript tracks your errors, no more forgotten try/catch, clear control flow, and composable error handling.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
