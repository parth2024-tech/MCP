---
name: angular
description: Modern Angular (v20+) expert with deep knowledge of Signals, Standalone Components, Zoneless applications, SSR/Hydration, and reactive patterns. Use when the task involves angular.
risk: safe
source: self
date_added: '2026-02-27'
---

# Angular Expert

Master modern Angular development with Signals, Standalone Components, Zoneless applications, SSR/Hydration, and the latest reactive patterns.

## When to Use This Skill

- Building new Angular applications (v20+)
- Implementing Signals-based reactive patterns
- Creating Standalone Components and migrating from NgModules
- Configuring Zoneless Angular applications
- Implementing SSR, prerendering, and hydration
- Optimizing Angular performance
- Adopting modern Angular patterns and best practices

## Do Not Use This Skill When

- Migrating from AngularJS (1.x) → use `angular-migration` skill
- Working with legacy Angular apps that cannot upgrade
- General TypeScript issues → use `typescript-expert` skill

## Instructions

1. Assess the Angular version and project structure
2. Apply modern patterns (Signals, Standalone, Zoneless)
3. Implement with proper typing and reactivity
4. Validate with build and tests

## Safety

- Always test changes in development before production
- Gradual migration for existing apps (don't big-bang refactor)
- Keep backward compatibility during transitions

---

## Angular Version Timeline

| Version        | Release | Key Features                                           |
| -------------- | ------- | ------------------------------------------------------ |
| **Angular 20** | Q2 2025 | Signals stable, Zoneless stable, Incremental hydration |
| **Angular 21** | Q4 2025 | Signals-first default, Enhanced SSR                    |
| **Angular 22** | Q2 2026 | Signal Forms, Selectorless components                  |

---

## 1. Signals: The New Reactive Primitive

Signals are Angular's fine-grained reactivity system, replacing zone.js-based change detection.

### Core Concepts

> See [references/details.md](references/details.md) for full code examples.

### Signal-Based Inputs and Outputs

> See [references/details.md](references/details.md) for full code examples.

### Signal Queries (ViewChild/ContentChild)

> See [references/details.md](references/details.md) for full code examples.

### When to Use Signals vs RxJS

| Use Case                | Signals         | RxJS                             |
| ----------------------- | --------------- | -------------------------------- |
| Local component state   | ✅ Preferred    | Overkill                         |
| Derived/computed values | ✅ `computed()` | `combineLatest` works            |
| Side effects            | ✅ `effect()`   | `tap` operator                   |
| HTTP requests           | ❌              | ✅ HttpClient returns Observable |
| Event streams           | ❌              | ✅ `fromEvent`, operators        |
| Complex async flows     | ❌              | ✅ `switchMap`, `mergeMap`       |

---

## 2. Standalone Components

Standalone components are self-contained and don't require NgModule declarations.

### Creating Standalone Components

```typescript
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink], // Direct imports
  template: `
    <header>
      <a routerLink="/">Home</a>
      <a routerLink="/about">About</a>
    </header>
  `,
})
export class HeaderComponent {}
```

### Bootstrapping Without NgModule

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```

### Lazy Loading Standalone Components

```typescript
// app.routes.ts
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
];
```

---

## 3. Zoneless Angular

Zoneless applications don't use zone.js, improving performance and debugging.

### Enabling Zoneless Mode

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideZonelessChangeDetection } from "@angular/core";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

### Zoneless Component Patterns

> See [references/details.md](references/details.md) for full code examples.

### Key Zoneless Benefits

- **Performance**: No zone.js patches on async APIs
- **Debugging**: Clean stack traces without zone wrappers
- **Bundle size**: Smaller without zone.js (~15KB savings)
- **Interoperability**: Better with Web Components and micro-frontends

---

## 4. Server-Side Rendering & Hydration

### SSR Setup with Angular CLI

```bash
ng add @angular/ssr
```

### Hydration Configuration

```typescript
// app.config.ts
import { ApplicationConfig } from "@angular/core";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  providers: [provideClientHydration(withEventReplay())],
};
```

### Incremental Hydration (v20+)

> See [references/details.md](references/details.md) for full code examples.

### Hydration Triggers

| Trigger          | When to Use                             |
| ---------------- | --------------------------------------- |
| `on idle`        | Low-priority, hydrate when browser idle |
| `on viewport`    | Hydrate when element enters viewport    |
| `on interaction` | Hydrate on first user interaction       |
| `on hover`       | Hydrate when user hovers                |
| `on timer(ms)`   | Hydrate after specified delay           |

---

## 5. Modern Routing Patterns

### Functional Route Guards

> See [references/details.md](references/details.md) for full code examples.

### Route-Level Data Resolvers

> See [references/details.md](references/details.md) for full code examples.

---

## 6. Dependency Injection Patterns

### Modern inject() Function

```typescript
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from './user.service';

@Component({...})
export class UserComponent {
  // Modern inject() - no constructor needed
  private http = inject(HttpClient);
  private userService = inject(UserService);

  // Works in any injection context
  users = toSignal(this.userService.getUsers());
}
```

### Injection Tokens for Configuration

> See [references/details.md](references/details.md) for full code examples.

---

## 7. Component Composition & Reusability

### Content Projection (Slots)

> See [references/details.md](references/details.md) for full code examples.

### Host Directives (Composition)

> See [references/details.md](references/details.md) for full code examples.

---

## 8. State Management Patterns

### Signal-Based State Service

> See [references/details.md](references/details.md) for full code examples.

### Component Store Pattern with Signals

> See [references/details.md](references/details.md) for full code examples.

---

## 9. Forms with Signals (Coming in v22+)

### Current Reactive Forms

> See [references/details.md](references/details.md) for full code examples.

### Signal-Aware Form Patterns (Preview)

> See [references/details.md](references/details.md) for full code examples.

---

## 10. Performance Optimization

### Change Detection Strategies

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Only checks when:
  // 1. Input signal/reference changes
  // 2. Event handler runs
  // 3. Async pipe emits
  // 4. Signal value changes
})
```

### Defer Blocks for Lazy Loading

```typescript
@Component({
  template: `
    <!-- Immediate loading -->
    <app-header />

    <!-- Lazy load when visible -->
    @defer (on viewport) {
      <app-heavy-chart />
    } @placeholder {
      <div class="skeleton" />
    } @loading (minimum 200ms) {
      <app-spinner />
    } @error {
      <p>Failed to load chart</p>
    }
  `
})
```

### NgOptimizedImage

> See [references/details.md](references/details.md) for full code examples.

---

## 11. Testing Modern Angular

### Testing Signal Components

> See [references/details.md](references/details.md) for full code examples.

### Testing with Signal Inputs

> See [references/details.md](references/details.md) for full code examples.

---

## Best Practices Summary

| Pattern              | ✅ Do                          | ❌ Don't                        |
| -------------------- | ------------------------------ | ------------------------------- |
| **State**            | Use Signals for local state    | Overuse RxJS for simple state   |
| **Components**       | Standalone with direct imports | Bloated SharedModules           |
| **Change Detection** | OnPush + Signals               | Default CD everywhere           |
| **Lazy Loading**     | `@defer` and `loadComponent`   | Eager load everything           |
| **DI**               | `inject()` function            | Constructor injection (verbose) |
| **Inputs**           | `input()` signal function      | `@Input()` decorator (legacy)   |
| **Zoneless**         | Enable for new projects        | Force on legacy without testing |

---

## Resources

- [Angular.dev Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Angular Update Guide](https://angular.dev/update-guide)
- [Angular Blog](https://blog.angular.dev)

---

## Common Troubleshooting

| Issue                          | Solution                                            |
| ------------------------------ | --------------------------------------------------- |
| Signal not updating UI         | Ensure `OnPush` + call signal as function `count()` |
| Hydration mismatch             | Check server/client content consistency             |
| Circular dependency            | Use `inject()` with `forwardRef`                    |
| Zoneless not detecting changes | Trigger via signal updates, not mutations           |
| SSR fetch fails                | Use `TransferState` or `withFetch()`                |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
