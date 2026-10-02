---
name: angular-state-management
description: "Master modern Angular state management with Signals, NgRx, and RxJS. Use when setting up global state, managing component stores, choosing between state solutions, or migrating from legacy patterns."
risk: safe
source: self
date_added: "2026-02-27"
---

# Angular State Management

Comprehensive guide to modern Angular state management patterns, from Signal-based local state to global stores and server state synchronization.

## When to Use This Skill

- Setting up global state management in Angular
- Choosing between Signals, NgRx, or Akita
- Managing component-level stores
- Implementing optimistic updates
- Debugging state-related issues
- Migrating from legacy state patterns

## Do Not Use This Skill When

- The task is unrelated to Angular state management
- You need React state management → use `react-state-management`

---

## Core Concepts

### State Categories

| Type             | Description                  | Solutions             |
| ---------------- | ---------------------------- | --------------------- |
| **Local State**  | Component-specific, UI state | Signals, `signal()`   |
| **Shared State** | Between related components   | Signal services       |
| **Global State** | App-wide, complex            | NgRx, Akita, Elf      |
| **Server State** | Remote data, caching         | NgRx Query, RxAngular |
| **URL State**    | Route parameters             | ActivatedRoute        |
| **Form State**   | Input values, validation     | Reactive Forms        |

### Selection Criteria

```
Small app, simple state → Signal Services
Medium app, moderate state → Component Stores
Large app, complex state → NgRx Store
Heavy server interaction → NgRx Query + Signal Services
Real-time updates → RxAngular + Signals
```

---

## Quick Start: Signal-Based State

### Pattern 1: Simple Signal Service

> See [references/details.md](references/details.md) for full code examples.

### Pattern 2: Feature Signal Store

> See [references/details.md](references/details.md) for full code examples.

### Pattern 3: SignalStore (NgRx Signals)

> See [references/details.md](references/details.md) for full code examples.

---

## NgRx Store (Global State)

### Setup

> See [references/details.md](references/details.md) for full code examples.

### Feature Slice Pattern

```typescript
// store/user/user.actions.ts
import { createActionGroup, props, emptyProps } from "@ngrx/store";

export const UserActions = createActionGroup({
  source: "User",
  events: {
    "Load User": props<{ userId: string }>(),
    "Load User Success": props<{ user: User }>(),
    "Load User Failure": props<{ error: string }>(),
    "Update User": props<{ updates: Partial<User> }>(),
    Logout: emptyProps(),
  },
});
```

> See [references/details.md](references/details.md) for full code examples.



### Component Usage

> See [references/details.md](references/details.md) for full code examples.

---

## RxJS-Based Patterns

### Component Store (Local Feature State)

> See [references/details.md](references/details.md) for full code examples.

---

## Server State with Signals

### HTTP + Signals Pattern

> See [references/details.md](references/details.md) for full code examples.

---

## Best Practices

### Do's

| Practice                           | Why                                |
| ---------------------------------- | ---------------------------------- |
| Use Signals for local state        | Simple, reactive, no subscriptions |
| Use `computed()` for derived data  | Auto-updates, memoized             |
| Colocate state with feature        | Easier to maintain                 |
| Use NgRx for complex flows         | Actions, effects, devtools         |
| Prefer `inject()` over constructor | Cleaner, works in factories        |

### Don'ts

| Anti-Pattern                      | Instead                                               |
| --------------------------------- | ----------------------------------------------------- |
| Store derived data                | Use `computed()`                                      |
| Mutate signals directly           | Use `set()` or `update()`                             |
| Over-globalize state              | Keep local when possible                              |
| Mix RxJS and Signals chaotically  | Choose primary, bridge with `toSignal`/`toObservable` |
| Subscribe in components for state | Use template with signals                             |

---

## Migration Path

### From BehaviorSubject to Signals

> See [references/details.md](references/details.md) for full code examples.

### Bridging Signals and RxJS

> See [references/details.md](references/details.md) for full code examples.

---

## Resources

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [NgRx Documentation](https://ngrx.io/)
- [NgRx SignalStore](https://ngrx.io/guide/signals)
- [RxAngular](https://www.rx-angular.io/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
