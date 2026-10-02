---
name: angular-best-practices
description: "Angular performance optimization and best practices guide. Use when writing, reviewing, or refactoring Angular code for optimal performance, bundle size, and rendering efficiency."
risk: safe
source: self
date_added: "2026-02-27"
---

# Angular Best Practices

Comprehensive performance optimization guide for Angular applications. Contains prioritized rules for eliminating performance bottlenecks, optimizing bundles, and improving rendering.

## When to Use
Reference these guidelines when:

- Writing new Angular components or pages
- Implementing data fetching patterns
- Reviewing code for performance issues
- Refactoring existing Angular code
- Optimizing bundle size or load times
- Configuring SSR/hydration

---

## Rule Categories by Priority

> See [references/details.md](references/details.md) for full code examples.

---

## 1. Change Detection (CRITICAL)

### Use OnPush Change Detection

```typescript
// CORRECT - OnPush with Signals
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div>{{ count() }}</div>`,
})
export class CounterComponent {
  count = signal(0);
}

// WRONG - Default change detection
@Component({
  template: `<div>{{ count }}</div>`, // Checked every cycle
})
export class CounterComponent {
  count = 0;
}
```

### Prefer Signals Over Mutable Properties

> See [references/details.md](references/details.md) for full code examples.

### Enable Zoneless for New Projects

```typescript
// main.ts - Zoneless Angular (v20+)
bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

**Benefits:**

- No zone.js patches on async APIs
- Smaller bundle (~15KB savings)
- Clean stack traces for debugging
- Better micro-frontend compatibility

---

## 2. Async Operations & Waterfalls (CRITICAL)

### Eliminate Sequential Data Fetching

> See [references/details.md](references/details.md) for full code examples.

### Avoid Client-Side Waterfalls in SSR

```typescript
// CORRECT - Use resolvers or blocking hydration for critical data
export const route: Route = {
  path: "profile/:id",
  resolve: { data: profileResolver }, // Fetched on server before navigation
  component: ProfileComponent,
};

// WRONG - Component fetches data on init
class ProfileComponent implements OnInit {
  ngOnInit() {
    // Starts ONLY after JS loads and component renders
    this.http.get("/api/profile").subscribe();
  }
}
```

---

## 3. Bundle Optimization (CRITICAL)

### Lazy Load Routes

> See [references/details.md](references/details.md) for full code examples.

### Use @defer for Heavy Components

```html
<!-- CORRECT - Heavy component loads on demand -->
@defer (on viewport) {
<app-analytics-chart [data]="data()" />
} @placeholder {
<div class="chart-skeleton"></div>
}

<!-- WRONG - Heavy component in initial bundle -->
<app-analytics-chart [data]="data()" />
```

### Avoid Barrel File Re-exports

```typescript
// WRONG - Imports entire barrel, breaks tree-shaking
import { Button, Modal, Table } from "@shared/components";

// CORRECT - Direct imports
import { Button } from "@shared/components/button/button.component";
import { Modal } from "@shared/components/modal/modal.component";
```

### Dynamic Import Third-Party Libraries

```typescript
// CORRECT - Load heavy library on demand
async loadChart() {
  const { Chart } = await import('chart.js');
  this.chart = new Chart(this.canvas, config);
}

// WRONG - Bundle Chart.js in main chunk
import { Chart } from 'chart.js';
```

---

## 4. Rendering Performance (HIGH)

### Always Use trackBy with @for

```html
<!-- CORRECT - Efficient DOM updates -->
@for (item of items(); track item.id) {
<app-item-card [item]="item" />
}

<!-- WRONG - Entire list re-renders on any change -->
@for (item of items(); track $index) {
<app-item-card [item]="item" />
}
```

### Use Virtual Scrolling for Large Lists

```typescript
import { CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll } from '@angular/cdk/scrolling';

@Component({
  imports: [CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll],
  template: `
    <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
      <div *cdkVirtualFor="let item of items" class="item">
        {{ item.name }}
      </div>
    </cdk-virtual-scroll-viewport>
  `
})
```

### Prefer Pure Pipes Over Methods

```typescript
// CORRECT - Pure pipe, memoized
@Pipe({ name: 'filterActive', standalone: true, pure: true })
export class FilterActivePipe implements PipeTransform {
  transform(items: Item[]): Item[] {
    return items.filter(i => i.active);
  }
}

// Template
@for (item of items() | filterActive; track item.id) { ... }

// WRONG - Method called every change detection
@for (item of getActiveItems(); track item.id) { ... }
```

### Use computed() for Derived Data

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Server-Side Rendering (HIGH)

### Configure Incremental Hydration

```typescript
// app.config.ts
import {
  provideClientHydration,
  withIncrementalHydration,
} from "@angular/platform-browser";

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration(), withEventReplay()),
  ],
};
```

### Defer Non-Critical Content

```html
<!-- Critical above-the-fold content -->
<app-header />
<app-hero />

<!-- Below-fold deferred with hydration triggers -->
@defer (hydrate on viewport) {
<app-product-grid />
} @defer (hydrate on interaction) {
<app-chat-widget />
}
```

### Use TransferState for SSR Data

> See [references/details.md](references/details.md) for full code examples.

---

## 6. Template Optimization (MEDIUM)

### Use New Control Flow Syntax

```html
<!-- CORRECT - New control flow (faster, smaller bundle) -->
@if (user()) {
<span>{{ user()!.name }}</span>
} @else {
<span>Guest</span>
} @for (item of items(); track item.id) {
<app-item [item]="item" />
} @empty {
<p>No items</p>
}

<!-- WRONG - Legacy structural directives -->
<span *ngIf="user; else guest">{{ user.name }}</span>
<ng-template #guest><span>Guest</span></ng-template>
```

### Avoid Complex Template Expressions

```typescript
// CORRECT - Precompute in component
class Component {
  items = signal<Item[]>([]);
  sortedItems = computed(() =>
    [...this.items()].sort((a, b) => a.name.localeCompare(b.name))
  );
}

// Template
@for (item of sortedItems(); track item.id) { ... }

// WRONG - Sorting in template every render
@for (item of items() | sort:'name'; track item.id) { ... }
```

---

## 7. State Management (MEDIUM)

### Use Selectors to Prevent Re-renders

> See [references/details.md](references/details.md) for full code examples.

### Colocate State with Features

```typescript
// CORRECT - Feature-scoped store
@Injectable() // NOT providedIn: 'root'
export class ProductStore { ... }

@Component({
  providers: [ProductStore], // Scoped to component tree
})
export class ProductPageComponent {
  store = inject(ProductStore);
}

// WRONG - Everything in global store
@Injectable({ providedIn: 'root' })
export class GlobalStore {
  // Contains ALL app state - hard to tree-shake
}
```

---

## 8. Memory Management (LOW-MEDIUM)

### Use takeUntilDestroyed for Subscriptions

> See [references/details.md](references/details.md) for full code examples.

### Prefer Signals Over Subscriptions

> See [references/details.md](references/details.md) for full code examples.

---

## Quick Reference Checklist

### New Component

- [ ] `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] `standalone: true`
- [ ] Signals for state (`signal()`, `input()`, `output()`)
- [ ] `inject()` for dependencies
- [ ] `@for` with `track` expression

### Performance Review

- [ ] No methods in templates (use pipes or computed)
- [ ] Large lists virtualized
- [ ] Heavy components deferred
- [ ] Routes lazy-loaded
- [ ] Third-party libs dynamically imported

### SSR Check

- [ ] Hydration configured
- [ ] Critical content renders first
- [ ] Non-critical content uses `@defer (hydrate on ...)`
- [ ] TransferState for server-fetched data

---

## Resources

- [Angular Performance Guide](https://angular.dev/best-practices/performance)
- [Zoneless Angular](https://angular.dev/guide/experimental/zoneless)
- [Angular SSR Guide](https://angular.dev/guide/ssr)
- [Change Detection Deep Dive](https://angular.dev/guide/change-detection)
## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
