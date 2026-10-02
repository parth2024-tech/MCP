---
name: fp-refactor
description: Comprehensive guide for refactoring imperative TypeScript code to fp-ts functional patterns. Use when the task involves fp refactor.
risk: unknown
source: community
version: 1.0.0
author: fp-ts-skills
tags:
  - fp-ts
  - refactoring
  - functional-programming
  - typescript
  - migration
  - either
  - option
  - task
  - reader
---

# Refactoring Imperative Code to fp-ts

This skill provides comprehensive patterns and strategies for migrating existing imperative TypeScript code to fp-ts functional programming patterns.

## When to Use
- You are refactoring an existing imperative TypeScript codebase toward fp-ts patterns.
- The task involves converting `try/catch`, null checks, callbacks, DI, or loops into functional equivalents.
- You need migration guidance and tradeoffs, not just isolated fp-ts examples.

## Table of Contents

1. [Converting try-catch to Either/TaskEither](#1-converting-try-catch-to-eithertaskeither)
2. [Converting null checks to Option](#2-converting-null-checks-to-option)
3. [Converting callbacks to Task](#3-converting-callbacks-to-task)
4. [Converting class-based DI to Reader](#4-converting-class-based-di-to-reader)
5. [Converting imperative loops to functional operations](#5-converting-imperative-loops-to-functional-operations)
6. [Migrating Promise chains to TaskEither](#6-migrating-promise-chains-to-taskeither)
7. [Common Pitfalls](#7-common-pitfalls)
8. [Gradual Adoption Strategies](#8-gradual-adoption-strategies)
9. [When NOT to Refactor](#9-when-not-to-refactor)

---

## 1. Converting try-catch to Either/TaskEither

### The Problem with try-catch

Traditional try-catch blocks have several issues:
- Error handling is implicit and easy to forget
- The type system doesn't track which functions can throw
- Control flow is non-linear and harder to reason about
- Composing multiple fallible operations is verbose

### Pattern: Synchronous try-catch to Either

#### Before (Imperative)

> See [references/details.md](references/details.md) for full code examples.

#### After (fp-ts Either)

> See [references/details.md](references/details.md) for full code examples.

### Step-by-Step Refactoring Guide

1. **Identify the error type**: Determine what errors can occur and create appropriate error types
2. **Change return type**: From `T` to `Either<E, T>` where `E` is your error type
3. **Replace throw statements**: Convert `throw new Error(...)` to `E.left(new Error(...))`
4. **Replace return statements**: Convert `return value` to `E.right(value)`
5. **Remove try-catch blocks**: They're no longer needed
6. **Update callers**: Use `pipe` with `E.flatMap` to chain operations

### Pattern: Async try-catch to TaskEither

#### Before (Imperative)


#### After (fp-ts TaskEither)

> See [references/details.md](references/details.md) for full code examples.

### Helper: tryCatch Utility

Create a reusable wrapper for functions that might throw:

```typescript
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

// For sync functions
const tryCatchSync = <A>(f: () => A): E.Either<Error, A> =>
  E.tryCatch(f, (e) => (e instanceof Error ? e : new Error(String(e))));

// For async functions
const tryCatchAsync = <A>(f: () => Promise<A>): TE.TaskEither<Error, A> =>
  TE.tryCatch(f, (e) => (e instanceof Error ? e : new Error(String(e))));
```

---

## 2. Converting null checks to Option

### The Problem with null/undefined

- TypeScript's strict null checks help, but null still spreads through code
- Chained property access requires verbose null guards
- The distinction between "missing" and "present but null" is unclear
- Easy to forget null checks leading to runtime errors

### Pattern: Simple null checks to Option

#### Before (Imperative)


#### After (fp-ts Option)

> See [references/details.md](references/details.md) for full code examples.

### Pattern: Array find operations

#### Before (Imperative)


#### After (fp-ts Option)


### Step-by-Step Refactoring Guide

1. **Identify nullable values**: Find all `T | null`, `T | undefined`, or optional properties
2. **Wrap with fromNullable**: Convert nullable values to Option at system boundaries
3. **Change return types**: From `T | null` to `Option<T>`
4. **Replace null checks**: Use `O.map`, `O.flatMap`, `O.filter` instead of if statements
5. **Handle at boundaries**: Use `O.getOrElse`, `O.match`, or `O.toNullable` when interfacing with non-fp code

### Converting Between Option and Either

> See [references/details.md](references/details.md) for full code examples.

---

## 3. Converting callbacks to Task

### The Problem with Callbacks

- Callback hell makes code hard to read
- Error handling is inconsistent
- Difficult to compose and sequence
- No standard way to handle async operations

### Pattern: Node-style callbacks to Task

#### Before (Imperative)


#### After (fp-ts Task/TaskEither)

> See [references/details.md](references/details.md) for full code examples.

### Pattern: Converting callback-based APIs

> See [references/details.md](references/details.md) for full code examples.

---

## 4. Converting class-based DI to Reader

### The Problem with Class-based DI

- Tight coupling between classes and their dependencies
- Testing requires mocking entire class hierarchies
- Dependency injection containers add runtime complexity
- Hard to trace data flow through the application

### Pattern: Service classes to Reader

#### Before (Imperative with Classes)

> See [references/details.md](references/details.md) for full code examples.

#### After (fp-ts Reader)

> See [references/details.md](references/details.md) for full code examples.

### Testing with Reader

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Converting imperative loops to functional operations

### Pattern: for loops to map/filter/reduce

#### Before (Imperative)


#### After (fp-ts functional operations)

> See [references/details.md](references/details.md) for full code examples.

### Pattern: Nested loops to flatMap

#### Before (Imperative)


#### After (fp-ts)

> See [references/details.md](references/details.md) for full code examples.

### Pattern: while loops to recursion/unfold

#### Before (Imperative)


#### After (fp-ts)


---

## 6. Migrating Promise chains to TaskEither

### Pattern: Promise.then chains to pipe

#### Before (Imperative)


#### After (fp-ts TaskEither)


### Pattern: Promise.all to traverse

#### Before (Imperative)

```typescript
async function fetchAllUsers(ids: string[]): Promise<User[]> {
  const promises = ids.map((id) => fetchUser(id));
  return Promise.all(promises);
}

// With error handling for individual items
async function fetchUsersWithFallback(ids: string[]): Promise<Array<User | null>> {
  const promises = ids.map(async (id) => {
    try {
      return await fetchUser(id);
    } catch {
      return null;
    }
  });
  return Promise.all(promises);
}
```

#### After (fp-ts)


### Pattern: Promise.race to alternative

> See [references/details.md](references/details.md) for full code examples.

---

## 7. Common Pitfalls

### Pitfall 1: Forgetting to run Tasks

```typescript
// WRONG: Task is not executed
const fetchData = (): TE.TaskEither<Error, Data> => /* ... */;
const result = fetchData(); // This is still a Task, not the result!

// CORRECT: Execute the Task
const result = await fetchData()(); // Note the double invocation
```

### Pitfall 2: Mixing async/await with fp-ts incorrectly

```typescript
// WRONG: Breaking out of the fp-ts ecosystem
const processData = async (input: string): Promise<Result> => {
  const parsed = parseInput(input); // Returns Either
  if (E.isLeft(parsed)) {
    throw new Error(parsed.left.message); // Don't do this!
  }
  return await fetchData(parsed.right)();
};

// CORRECT: Stay in the ecosystem
const processData = (input: string): TE.TaskEither<Error, Result> =>
  pipe(
    parseInput(input),
    TE.fromEither,
    TE.flatMap(fetchData)
  );
```

### Pitfall 3: Using map when flatMap is needed

```typescript
// WRONG: Results in nested Either
const result: E.Either<Error, E.Either<Error, User>> = pipe(
  parseUserId(input), // E.Either<Error, string>
  E.map(fetchUser) // Returns E.Either<Error, User>, so we get nested Either
);

// CORRECT: Use flatMap to flatten
const result: E.Either<Error, User> = pipe(
  parseUserId(input),
  E.flatMap(fetchUser)
);
```

### Pitfall 4: Losing error information

> See [references/details.md](references/details.md) for full code examples.

### Pitfall 5: Overusing fromNullable

```typescript
// WRONG: Unnecessary wrapping and unwrapping
const getName = (user: User | null): string => {
  const optUser = O.fromNullable(user);
  const name = pipe(optUser, O.map(u => u.name), O.toNullable);
  return name ?? 'Unknown';
};

// CORRECT: Use Option only when you need its composition benefits
const getName = (user: User | null): string => user?.name ?? 'Unknown';

// BETTER: Use Option when chaining multiple operations
const getManagerName = (user: User | null): O.Option<string> =>
  pipe(
    O.fromNullable(user),
    O.flatMap(u => O.fromNullable(u.manager)),
    O.map(m => m.name)
  );
```

### Pitfall 6: Not handling the left case

```typescript
// WRONG: Ignoring potential errors
const processUser = (input: string): User => {
  const result = parseUser(input); // E.Either<Error, User>
  return (result as E.Right<User>).right; // Unsafe cast!
};

// CORRECT: Always handle both cases
const processUser = (input: string): User =>
  pipe(
    parseUser(input),
    E.getOrElse((error) => {
      console.error('Parse failed:', error);
      return defaultUser;
    })
  );
```

---

## 8. Gradual Adoption Strategies

### Strategy 1: Start at the Boundaries

Begin by converting functions at the edges of your system:
- API response handlers
- Database query results
- File system operations
- User input validation

> See [references/details.md](references/details.md) for full code examples.

### Strategy 2: Create Bridge Functions

Build helpers to convert between fp-ts and imperative code:

> See [references/details.md](references/details.md) for full code examples.

### Strategy 3: Module-by-Module Migration

1. **Pick a module** with clear boundaries
2. **Add fp-ts types** to internal functions
3. **Keep external API unchanged** initially
4. **Test thoroughly** before moving on
5. **Update external API** once internals are stable

> See [references/details.md](references/details.md) for full code examples.

### Strategy 4: Type-Driven Development

Use TypeScript's type system to guide the migration:

```typescript
// Step 1: Change type signature first
type OldGetUser = (id: string) => Promise<User | null>;
type NewGetUser = (id: string) => TE.TaskEither<UserError, User>;

// Step 2: Compiler will show all call sites that need updating
const getUser: NewGetUser = (id) => /* implement */;

// Step 3: Update call sites one by one
// The compiler ensures you handle all cases
```

### Strategy 5: Testing as Documentation

Write tests that demonstrate the expected behavior:

> See [references/details.md](references/details.md) for full code examples.

---

## 9. When NOT to Refactor

### Simple Synchronous Code

Don't refactor straightforward code that doesn't benefit from fp-ts:

```typescript
// This is fine as-is
function formatName(first: string, last: string): string {
  return `${first} ${last}`;
}

// Don't do this - it adds complexity without benefit
const formatName = (first: string, last: string): string =>
  pipe(
    first,
    (f) => `${f} ${last}`
  );
```

### Performance-Critical Loops

fp-ts operations create intermediate arrays. For hot paths, keep imperative code:

```typescript
// Keep this for performance-critical code processing millions of items
function sumLargeArray(numbers: number[]): number {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}

// This creates intermediate arrays
const sumWithFpts = (numbers: number[]): number =>
  pipe(numbers, A.reduce(0, (acc, n) => acc + n));
```

### Third-Party Library Interfaces

When working with libraries that expect specific patterns:

```typescript
// Express middleware must match Express's interface
app.get('/users/:id', async (req, res) => {
  // Keep imperative here, convert at boundaries
  const result = await getUser(req.params.id)();

  if (E.isLeft(result)) {
    res.status(404).json({ error: result.left.message });
  } else {
    res.json(result.right);
  }
});
```

### Code Touched by Non-FP Team Members

If your team isn't familiar with fp-ts, forced adoption will hurt productivity:

> See [references/details.md](references/details.md) for full code examples.

### Trivial Null Checks

Don't use Option for simple, one-off null checks:

```typescript
// This is fine
const name = user?.name ?? 'Anonymous';

// Overkill for simple cases
const name = pipe(
  O.fromNullable(user),
  O.map((u) => u.name),
  O.getOrElse(() => 'Anonymous')
);
```

### When the Error Type Doesn't Matter

If you're going to throw/log anyway and don't need error composition:

```typescript
// If this is your error handling anyway...
