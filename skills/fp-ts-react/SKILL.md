---
name: fp-ts-react
description: "Practical patterns for using fp-ts with React - hooks, state, forms, data fetching. Use when building React apps with functional programming patterns. Works with React 18/19, Next.js 14/15."
risk: safe
source: "https://github.com/whatiskadudoing/fp-ts-skills"
date_added: "2026-02-27"
---

# Functional Programming in React

Practical patterns for React apps. No jargon, just code that works.

## When to Use This Skill

- When building React apps with fp-ts for type-safe state management
- When handling loading/error/success states in data fetching
- When implementing form validation with error accumulation
- When using React 18/19 or Next.js 14/15 with functional patterns

---

## Quick Reference

| Pattern | Use When |
|---------|----------|
| `Option` | Value might be missing (user not loaded yet) |
| `Either` | Operation might fail (form validation) |
| `TaskEither` | Async operation might fail (API calls) |
| `RemoteData` | Need to show loading/error/success states |
| `pipe` | Chaining multiple transformations |

---

## 1. State with Option (Maybe It's There, Maybe Not)

Use `Option` instead of `null | undefined` for clearer intent.

### Basic Pattern

> See [references/details.md](references/details.md) for full code examples.

### Chaining Optional Values

> See [references/details.md](references/details.md) for full code examples.

---

## 2. Form Validation with Either

Either is perfect for validation: `Left` = errors, `Right` = valid data.

### Simple Form Validation

> See [references/details.md](references/details.md) for full code examples.

### Collecting All Errors (Not Just First One)

> See [references/details.md](references/details.md) for full code examples.

### Field-Level Errors (Better UX)

```typescript
type FieldErrors = Partial<Record<keyof SignupForm, string>>

function validateFormWithFieldErrors(form: SignupForm): E.Either<FieldErrors, ValidatedForm> {
  const errors: FieldErrors = {}

  pipe(validateName(form.name), E.mapLeft(e => { errors.name = e }))
  pipe(validateEmail(form.email), E.mapLeft(e => { errors.email = e }))
  pipe(validatePassword(form.password), E.mapLeft(e => { errors.password = e }))

  return Object.keys(errors).length > 0
    ? E.left(errors)
    : E.right({ name: form.name.trim(), email: form.email, password: form.password })
}

// In component
{errors.email && <span className="error">{errors.email}</span>}
```

---

## 3. Data Fetching with TaskEither

TaskEither = async operation that might fail. Perfect for API calls.

### Basic Fetch Hook

> See [references/details.md](references/details.md) for full code examples.

### Chaining API Calls

```typescript
// Fetch user, then fetch their posts
const fetchUserWithPosts = (userId: string) => pipe(
  fetchJson<User>(`/api/users/${userId}`),
  TE.flatMap(user => pipe(
    fetchJson<Post[]>(`/api/users/${userId}/posts`),
    TE.map(posts => ({ ...user, posts }))
  ))
)
```

### Parallel API Calls

```typescript
import { sequenceT } from 'fp-ts/Apply'

// Fetch multiple things at once
const fetchDashboardData = () => pipe(
  sequenceT(TE.ApplyPar)(
    fetchJson<User>('/api/user'),
    fetchJson<Stats>('/api/stats'),
    fetchJson<Notifications[]>('/api/notifications')
  ),
  TE.map(([user, stats, notifications]) => ({
    user,
    stats,
    notifications
  }))
)
```

---

## 4. RemoteData Pattern (The Right Way to Handle Async State)

Stop using `{ data, loading, error }` booleans. Use a proper state machine.

### The Pattern

> See [references/details.md](references/details.md) for full code examples.

### Hook with RemoteData

> See [references/details.md](references/details.md) for full code examples.

### Why RemoteData Beats Booleans

```typescript
// ❌ BAD: Impossible states are possible
interface BadState {
  data: User | null
  loading: boolean
  error: Error | null
}
// Can have: { data: user, loading: true, error: someError } - what does that mean?!

// ✅ GOOD: Only valid states exist
type GoodState = RemoteData<Error, User>
// Can only be: NotAsked | Loading | Failure | Success
```

---

## 5. Referential Stability (Preventing Re-renders)

fp-ts values like `O.some(1)` create new objects each render. React sees them as "changed".

### The Problem

```typescript
// ❌ BAD: Creates new Option every render
function BadComponent() {
  const [value, setValue] = useState(O.some(1))

  useEffect(() => {
    // This runs EVERY render because O.some(1) !== O.some(1)
    console.log('value changed')
  }, [value])
}
```

### Solution 1: useMemo

```typescript
// ✅ GOOD: Memoize Option creation
function GoodComponent() {
  const [rawValue, setRawValue] = useState<number | null>(1)

  const value = useMemo(
    () => O.fromNullable(rawValue),
    [rawValue]  // Only recreate when rawValue changes
  )

  useEffect(() => {
    // Now this only runs when rawValue actually changes
    console.log('value changed')
  }, [rawValue])  // Depend on raw value, not Option
}
```

### Solution 2: fp-ts-react-stable-hooks

```bash
npm install fp-ts-react-stable-hooks
```

```typescript
import { useStableO, useStableEffect } from 'fp-ts-react-stable-hooks'
import * as O from 'fp-ts/Option'
import * as Eq from 'fp-ts/Eq'

function StableComponent() {
  // Uses fp-ts equality instead of reference equality
  const [value, setValue] = useStableO(O.some(1))

  // Effect that understands Option equality
  useStableEffect(
    () => { console.log('value changed') },
    [value],
    Eq.tuple(O.getEq(Eq.eqNumber))  // Custom equality
  )
}
```

---

## 6. Dependency Injection with Context

Use ReaderTaskEither for testable components with injected dependencies.

### Setup Dependencies

> See [references/details.md](references/details.md) for full code examples.

### Use in Components

```typescript
function UserProfile({ userId }: { userId: string }) {
  const { api, analytics } = useDeps()
  const [user, setUser] = useState<RemoteData<Error, User>>(notAsked())

  useEffect(() => {
    setUser(loading())
    api.getUser(userId)
      .then(u => {
        setUser(success(u))
        analytics.track('user_viewed', { userId })
      })
      .catch(e => setUser(failure(e)))
  }, [userId, api, analytics])

  // render...
}
```

### Testing with Mock Dependencies

> See [references/details.md](references/details.md) for full code examples.

---

## 7. React 19 Patterns

### use() for Promises (React 19+)

> See [references/details.md](references/details.md) for full code examples.

### useActionState for Forms (React 19+)

> See [references/details.md](references/details.md) for full code examples.

### useOptimistic for Instant Feedback (React 19+)

> See [references/details.md](references/details.md) for full code examples.

---

## 8. Common Patterns Cheat Sheet

### Render Based on Option

> See [references/details.md](references/details.md) for full code examples.

### Render Based on Either

```typescript
pipe(
  validationResult,
  E.match(
    (errors) => <ErrorList errors={errors} />,
    (data) => <SuccessMessage data={data} />
  )
)
```

### Safe Array Rendering

```typescript
import * as A from 'fp-ts/Array'

// Get first item safely
const firstUser = pipe(
  users,
  A.head,
  O.map(user => <Featured user={user} />),
  O.getOrElse(() => <NoFeaturedUser />)
)

// Find specific item
const adminUser = pipe(
  users,
  A.findFirst(u => u.role === 'admin'),
  O.map(admin => <AdminBadge user={admin} />),
  O.toNullable  // or O.getOrElse(() => null)
)
```

### Conditional Props

```typescript
// Add props only if value exists
const modalProps = {
  isOpen: true,
  ...pipe(
    maybeTitle,
    O.map(title => ({ title })),
    O.getOrElse(() => ({}))
  )
}
> See [references/details.md](references/details.md) for full code examples.
