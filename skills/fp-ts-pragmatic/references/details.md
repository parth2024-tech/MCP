# Fp Ts Pragmatic — Code Reference

## ### 2. Option: Handle Missing Values Without null Checks

```typescript
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Before: Defensive null checking
function getUserCity(user: User | null): string {
  if (user === null) return 'Unknown'
  if (user.address === null) return 'Unknown'
  if (user.address.city === null) return 'Unknown'
  return user.address.city
}

// After: Chain through potential missing values
const getUserCity = (user: User | null): string =>
  pipe(
    O.fromNullable(user),
    O.flatMap(u => O.fromNullable(u.address)),
    O.flatMap(a => O.fromNullable(a.city)),
    O.getOrElse(() => 'Unknown')
  )
```


## ### 3. Either: Make Errors Explicit

```typescript
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

// Before: Hidden failure mode
function parseAge(input: string): number {
  const age = parseInt(input, 10)
  if (isNaN(age)) throw new Error('Invalid age')
  if (age < 0) throw new Error('Age cannot be negative')
  return age
}

// After: Errors are visible in the type
function parseAge(input: string): E.Either<string, number> {
  const age = parseInt(input, 10)
  if (isNaN(age)) return E.left('Invalid age')
  if (age < 0) return E.left('Age cannot be negative')
  return E.right(age)
}

// Using it
const result = parseAge(userInput)
if (E.isRight(result)) {
  console.log(`Age is ${result.right}`)
} else {
  console.log(`Error: ${result.left}`)
}
```


## ### 4. Map: Transform Without Unpacking

```typescript
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'
import * as A from 'fp-ts/Array'
import { pipe } from 'fp-ts/function'

// Transform inside Option
const maybeUser: O.Option<User> = O.some({ name: 'Alice', age: 30 })
const maybeName: O.Option<string> = pipe(
  maybeUser,
  O.map(user => user.name)
)

// Transform inside Either
const result: E.Either<Error, number> = E.right(5)
const doubled: E.Either<Error, number> = pipe(
  result,
  E.map(n => n * 2)
)

// Transform arrays (same concept!)
const numbers = [1, 2, 3]
const doubled = pipe(
  numbers,
  A.map(n => n * 2)
)
```


## ### 5. FlatMap: Chain Operations That Might Fail

```typescript
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

const parseJSON = (s: string): E.Either<string, unknown> =>
  E.tryCatch(() => JSON.parse(s), () => 'Invalid JSON')

const extractEmail = (data: unknown): E.Either<string, string> => {
  if (typeof data === 'object' && data !== null && 'email' in data) {
    return E.right((data as { email: string }).email)
  }
  return E.left('No email field')
}

const validateEmail = (email: string): E.Either<string, string> =>
  email.includes('@') ? E.right(email) : E.left('Invalid email format')

// Chain all steps - if any fails, the whole thing fails
const getValidEmail = (input: string): E.Either<string, string> =>
  pipe(
    parseJSON(input),
    E.flatMap(extractEmail),
    E.flatMap(validateEmail)
  )

// Success path: Right('user@example.com')
// Any failure: Left('specific error message')
```


## ### When Your Team Doesn't Know FP

```typescript
// If your team knows this pattern
async function getUser(id: string): Promise<User | null> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Don't force this on them
const getUser = (id: string): TE.TaskEither<Error, User> =>
  pipe(
    TE.tryCatch(() => fetch(`/api/users/${id}`), E.toError),
    TE.flatMap(r => r.ok ? TE.right(r) : TE.left(new Error('Not found'))),
    TE.flatMap(r => TE.tryCatch(() => r.json(), E.toError))
  )
```


## ### 5. Use const Assertions for Error Types

```typescript
// Create specific error types without classes
const NotFound = (id: string) => ({ _tag: 'NotFound' as const, id })
const Unauthorized = { _tag: 'Unauthorized' as const }
const ValidationFailed = (errors: string[]) =>
  ({ _tag: 'ValidationFailed' as const, errors })

type AppError =
  | ReturnType<typeof NotFound>
  | typeof Unauthorized
  | ReturnType<typeof ValidationFailed>

// Now you can pattern match
const handleError = (error: AppError): string => {
  switch (error._tag) {
    case 'NotFound': return `Item ${error.id} not found`
    case 'Unauthorized': return 'Please log in'
    case 'ValidationFailed': return error.errors.join(', ')
  }
}
```


## ### Callback Hell to Pipe

```typescript
// Before
fetchUser(id, (user) => {
  if (!user) return handleNoUser()
  fetchPosts(user.id, (posts) => {
    if (!posts) return handleNoPosts()
    fetchComments(posts[0].id, (comments) => {
      render(user, posts, comments)
    })
  })
})

// After (with TaskEither for async)
import * as TE from 'fp-ts/TaskEither'

const loadData = (id: string) =>
  pipe(
    fetchUser(id),
    TE.flatMap(user => pipe(
      fetchPosts(user.id),
      TE.map(posts => ({ user, posts }))
    )),
    TE.flatMap(({ user, posts }) => pipe(
      fetchComments(posts[0].id),
      TE.map(comments => ({ user, posts, comments }))
    ))
  )

// Execute
const result = await loadData('123')()
pipe(
  result,
  E.fold(handleError, ({ user, posts, comments }) => render(user, posts, comments))
)
```


## ### Multiple null Checks to Option Chain

```typescript
// Before
function getManagerEmail(employee: Employee): string | null {
  if (!employee.department) return null
  if (!employee.department.manager) return null
  if (!employee.department.manager.email) return null
  return employee.department.manager.email
}

// After
const getManagerEmail = (employee: Employee): O.Option<string> =>
  pipe(
    O.fromNullable(employee.department),
    O.flatMap(d => O.fromNullable(d.manager)),
    O.flatMap(m => O.fromNullable(m.email))
  )

// Use it
pipe(
  getManagerEmail(employee),
  O.fold(
    () => sendToDefault(),
    (email) => sendTo(email)
  )
)
```


## ### Validation with Multiple Checks

```typescript
// Before: Throws on first error
function validateUser(data: unknown): User {
  if (!data || typeof data !== 'object') throw new Error('Must be object')
  const obj = data as Record<string, unknown>
  if (typeof obj.email !== 'string') throw new Error('Email required')
  if (!obj.email.includes('@')) throw new Error('Invalid email')
  if (typeof obj.age !== 'number') throw new Error('Age required')
  if (obj.age < 0) throw new Error('Age must be positive')
  return obj as User
}

// After: Returns first error, type-safe
const validateUser = (data: unknown): E.Either<string, User> =>
  pipe(
    E.Do,
    E.bind('obj', () =>
      typeof data === 'object' && data !== null
        ? E.right(data as Record<string, unknown>)
        : E.left('Must be object')
    ),
    E.bind('email', ({ obj }) =>
      typeof obj.email === 'string' && obj.email.includes('@')
        ? E.right(obj.email)
        : E.left('Valid email required')
    ),
    E.bind('age', ({ obj }) =>
      typeof obj.age === 'number' && obj.age >= 0
        ? E.right(obj.age)
        : E.left('Valid age required')
    ),
    E.map(({ email, age }) => ({ email, age }))
  )
```


## ### Promise Chain to TaskEither

```typescript
// Before
async function processOrder(orderId: string): Promise<Receipt> {
  const order = await fetchOrder(orderId)
  if (!order) throw new Error('Order not found')

  const validated = await validateOrder(order)
  if (!validated.success) throw new Error(validated.error)

  const payment = await processPayment(validated.order)
  if (!payment.success) throw new Error('Payment failed')

  return generateReceipt(payment)
}

// After
const processOrder = (orderId: string): TE.TaskEither<string, Receipt> =>
  pipe(
    fetchOrderTE(orderId),
    TE.flatMap(order =>
      order ? TE.right(order) : TE.left('Order not found')
    ),
    TE.flatMap(validateOrderTE),
    TE.flatMap(processPaymentTE),
    TE.map(generateReceipt)
  )
```


## ### The Middle Ground (Often Best)

```

---

## Cheat Sheet

| What you want | Plain language | fp-ts |
|--------------|----------------|-------|
| Handle null/undefined | "Wrap this nullable" | `O.fromNullable(x)` |
| Default for missing | "Use this if nothing" | `O.getOrElse(() => default)` |
| Transform if present | "If something, change it" | `O.map(fn)` |
| Chain nullable operations | "If something, try this" | `O.flatMap(fn)` |
| Return success | "Worked, here's the value" | `E.right(value)` |
| Return failure | "Failed, here's why" | `E.left(error)` |
| Wrap throwing function | "Try this, catch errors" | `E.tryCatch(fn, onError)` |
| Handle both cases | "Do this for error, that for success" | `E.fold(onLeft, onRight)` |
| Chain operations | "Then do this, then that" | `pipe(x, fn1, fn2, fn3)` |

---

## When to Level Up

Once comfortable with these patterns, explore:

1. **TaskEither** - Async operations that can fail (replaces Promise + try/catch)
2. **Validation** - Collect ALL errors instead of stopping at first
3. **Reader** - Dependency injection without classes
4. **Do notation** - Cleaner syntax for multiple bindings

But don't rush. The basics here will handle 80% of real-world scenarios. Get comfortable with these before adding more tools to your belt.

---

## Summary

1. **Use pipe** for 3+ operations
2. **Use Option** for nullable chains
3. **Use Either** for operations that can fail
4. **Use map** to transform wrapped values
5. **Use flatMap** to chain operations that might fail
6. **Skip FP** when it hurts readability
7. **Keep it simple** - if your team can't read it, it's not good code

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


