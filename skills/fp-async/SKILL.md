---
name: fp-async
description: Practical async patterns using TaskEither - clean pipelines instead of try/catch hell, with real API examples. Use when the task involves fp async.
risk: unknown
source: community
version: 1.0.0
author: kadu
tags:
  - fp-ts
  - typescript
  - async
  - error-handling
  - practical
  - promises
  - api
  - fetch
---

# Practical Async Patterns with fp-ts

Stop writing nested try/catch blocks. Stop losing error context. Start building clean async pipelines that handle errors properly.

**TaskEither is simply an async operation that tracks success or failure.** That's it. No fancy terminology needed.

## When to Use
- You need async error handling in TypeScript with `TaskEither`.
- The task involves wrapping Promises, composing API calls, or replacing nested `try/catch` flows.
- You want practical fp-ts async patterns instead of academic explanations.

```typescript
// TaskEither<Error, User> means:
// "An async operation that either fails with Error or succeeds with User"
```

---

## 1. Wrapping Promises Safely

### The Problem: Try/Catch Everywhere

> See [references/details.md](references/details.md) for full code examples.

### The Solution: Wrap Once, Handle Cleanly

> See [references/details.md](references/details.md) for full code examples.

### tryCatch Explained

`TE.tryCatch` takes two things:
1. An async function that might throw
2. A function to convert the thrown value into your error type

```typescript
TE.tryCatch(
  () => somePromise,           // The async work
  (thrown) => toError(thrown)  // Convert failures to your error type
)
```

### Creating Success and Failure Values

```typescript
// Wrap a value as success
const success = TE.right<Error, number>(42)

// Wrap a value as failure
const failure = TE.left<Error, number>(new Error('Nope'))

// From a nullable value (null/undefined becomes error)
const fromNullable = TE.fromNullable(new Error('Value was null'))
const result = fromNullable(maybeUser) // TaskEither<Error, User>

// From a condition
const mustBePositive = TE.fromPredicate(
  (n: number) => n > 0,
  (n) => new Error(`Expected positive, got ${n}`)
)
```

---

## 2. Chaining Async Operations

### The Problem: Callback Hell / Nested Awaits

> See [references/details.md](references/details.md) for full code examples.

### The Solution: Clean Pipelines with chain

```typescript
// AFTER: Flat, readable pipeline
const processOrder = (orderId: string) =>
  pipe(
    fetchOrder(orderId),
    TE.chain(order => fetchUser(order.userId)),
    TE.chain(user =>
      pipe(
        checkInventory(order.items),
        TE.chain(inventory => chargePayment(user, order.total))
      )
    ),
    TE.chain(payment => createShipment(order, user, payment))
  )
```

### chain vs map

Use `map` when your transformation is synchronous and can't fail:

```typescript
pipe(
  fetchUser(userId),
  TE.map(user => user.name.toUpperCase())  // Just transforms the value
)
```

Use `chain` (or `flatMap`) when your transformation is async or can fail:

```typescript
pipe(
  fetchUser(userId),
  TE.chain(user => fetchOrders(user.id))  // Returns another TaskEither
)
```

### Building Context with Do Notation

When you need values from multiple steps:

> See [references/details.md](references/details.md) for full code examples.

---

## 3. Parallel vs Sequential Execution

### When to Use Each

**Sequential** (one after another):
- When each operation depends on the previous result
- When you need to respect rate limits
- When order matters

**Parallel** (all at once):
- When operations are independent
- When you want speed
- When fetching multiple resources by ID

### Sequential Chaining

```typescript
// Operations depend on each other - must be sequential
const getUserWithOrg = (userId: string) =>
  pipe(
    fetchUser(userId),                              // First: get user
    TE.chain(user => fetchTeam(user.teamId)),      // Then: get their team
    TE.chain(team => fetchOrganization(team.orgId)) // Finally: get org
  )
```

### Parallel Execution

> See [references/details.md](references/details.md) for full code examples.

### Parallel Array Operations

```typescript
// Fetch multiple users in parallel
const userIds = ['1', '2', '3', '4', '5']

// TE.traverseArray runs all fetches in parallel
const fetchAllUsers = pipe(
  userIds,
  TE.traverseArray(fetchUser)
) // TaskEither<Error, readonly User[]>

// Note: Fails fast - if ANY request fails, the whole thing fails
// All errors after the first are lost
```

### Parallel with Batch Control

When you need to limit concurrent requests:

> See [references/details.md](references/details.md) for full code examples.

### Sequential When Parallel Looks Tempting

> See [references/details.md](references/details.md) for full code examples.

---

## 4. Error Recovery Patterns

### Fallback to Alternative

```typescript
// Try primary API, fall back to cache
const getUserWithFallback = (userId: string) =>
  pipe(
    fetchUserFromApi(userId),
    TE.orElse(() => fetchUserFromCache(userId))
  )

// Chain multiple fallbacks
const getConfigRobust = () =>
  pipe(
    fetchRemoteConfig(),
    TE.orElse(() => loadLocalConfig()),
    TE.orElse(() => TE.right(defaultConfig))
  )
```

### Conditional Recovery

```typescript
// Only recover from specific errors
const fetchUserOrCreate = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.orElse(error =>
      error.message.includes('404') || error.message.includes('not found')
        ? createDefaultUser(userId)
        : TE.left(error)  // Re-throw other errors
    )
  )
```

### Typed Error Recovery

> See [references/details.md](references/details.md) for full code examples.

### Retry with Exponential Backoff

> See [references/details.md](references/details.md) for full code examples.

### Default Values

```typescript
// Get value or use default (removes the error channel)
const getUsernameOrDefault = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.map(user => user.name),
    TE.getOrElse(() => T.of('Anonymous'))
  ) // Task<string> - no more error tracking

// Keep error channel but provide fallback value
const getUserWithDefault = (userId: string) =>
  pipe(
    fetchUser(userId),
    TE.orElse(() => TE.right(defaultUser))
  ) // TaskEither<Error, User> - error channel still exists but always succeeds
```

---

## 5. Real API Examples

### Complete Fetch Wrapper

> See [references/details.md](references/details.md) for full code examples.

### Database Operations (Prisma Example)

> See [references/details.md](references/details.md) for full code examples.

### File Operations (Node.js)

> See [references/details.md](references/details.md) for full code examples.

---

## 6. Handling Results

### Pattern Matching with fold/match

```typescript
// fold: Handle both success and failure, returns a Task (no more error channel)
const displayResult = pipe(
  fetchUser(userId),
  TE.fold(
    (error) => T.of(`Error: ${error.message}`),
    (user) => T.of(`Welcome, ${user.name}!`)
  )
) // Task<string>

// Execute and get the string
const message = await displayResult()
```

### Getting the Raw Either

```typescript
// Sometimes you need to work with the Either directly
const result = await fetchUser(userId)() // Either<Error, User>

if (E.isLeft(result)) {
  console.error('Failed:', result.left)
} else {
  console.log('User:', result.right)
}
```

### In Express/Hono Handlers

> See [references/details.md](references/details.md) for full code examples.

---

## 7. Common Patterns Reference

### Quick Transformations

```typescript
// Transform success value
TE.map(user => user.name)

// Transform error
TE.mapLeft(error => ({ ...error, timestamp: Date.now() }))

// Transform both at once
TE.bimap(
  error => enhanceError(error),
  user => user.profile
)
```

### Filtering

```typescript
// Fail if condition not met
pipe(
  fetchUser(userId),
  TE.filterOrElse(
    user => user.isActive,
    user => new Error(`User ${user.id} is not active`)
  )
)
```

### Side Effects Without Changing Value

```typescript
// Log on success, keep the value unchanged
pipe(
  fetchUser(userId),
  TE.tap(user => TE.fromIO(() => console.log(`Fetched user: ${user.id}`)))
)

// Log on error, keep the error unchanged
pipe(
  fetchUser(userId),
  TE.tapError(error => TE.fromIO(() => console.error(`Failed: ${error.message}`)))
)

// chainFirst is like tap but for operations that return TaskEither
pipe(
  createUser(userData),
  TE.chainFirst(user => sendWelcomeEmail(user.email))
) // Returns the created user, not the email result
```

### Converting From Other Types

```typescript
// From Either
const fromEither = TE.fromEither(E.right(42))

// From Option
import * as O from 'fp-ts/Option'
const fromOption = TE.fromOption(() => new Error('Value was None'))
const result = fromOption(O.some(42))

// From boolean
const fromBoolean = TE.fromPredicate(
  (x: number) => x > 0,
  () => new Error('Must be positive')
)
> See [references/details.md](references/details.md) for full code examples.
// BEFORE
async function getUser(id: string) {
  try {
    const res = await fetch(`/api/users/${id}`)
    if (!res.ok) throw new Error('Not found')
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

// AFTER
const getUser = (id: string) =>
  TE.tryCatch(
    async () => {
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json()
    },
    E.toError
  )
```

### Chained Operations

> See [references/details.md](references/details.md) for full code examples.

### Error Recovery

> See [references/details.md](references/details.md) for full code examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
