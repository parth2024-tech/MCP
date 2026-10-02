---
name: angular-ui-patterns
description: "Modern Angular UI patterns for loading states, error handling, and data display. Use when building UI components, handling async data, or managing component states."
risk: safe
source: self
date_added: "2026-02-27"
---

# Angular UI Patterns

## Core Principles

1. **Never show stale UI** - Loading states only when actually loading
2. **Always surface errors** - Users must know when something fails
3. **Optimistic updates** - Make the UI feel instant
4. **Progressive disclosure** - Use `@defer` to show content as available
5. **Graceful degradation** - Partial data is better than no data

---

## Loading State Patterns

### The Golden Rule

**Show loading indicator ONLY when there's no data to display.**

> See [references/details.md](references/details.md) for full code examples.

### Loading State Decision Tree

```
Is there an error?
  → Yes: Show error state with retry option
  → No: Continue

Is it loading AND we have no data?
  → Yes: Show loading indicator (spinner/skeleton)
  → No: Continue

Do we have data?
  → Yes, with items: Show the data
  → Yes, but empty: Show empty state
  → No: Show loading (fallback)
```

### Skeleton vs Spinner

| Use Skeleton When    | Use Spinner When      |
| -------------------- | --------------------- |
| Known content shape  | Unknown content shape |
| List/card layouts    | Modal actions         |
| Initial page load    | Button submissions    |
| Content placeholders | Inline operations     |

---

## Control Flow Patterns

### @if/@else for Conditional Rendering

```html
@if (user(); as user) {
<span>Welcome, {{ user.name }}</span>
} @else if (loading()) {
<app-spinner size="small" />
} @else {
<a routerLink="/login">Sign In</a>
}
```

### @for with Track

```html
@for (item of items(); track item.id) {
<app-item-card [item]="item" (delete)="remove(item.id)" />
} @empty {
<app-empty-state
  icon="inbox"
  message="No items yet"
  actionLabel="Create Item"
  (action)="create()"
/>
}
```

### @defer for Progressive Loading

```html
<!-- Critical content loads immediately -->
<app-header />
<app-hero-section />

<!-- Non-critical content deferred -->
@defer (on viewport) {
<app-comments [postId]="postId()" />
} @placeholder {
<div class="h-32 bg-gray-100 animate-pulse"></div>
} @loading (minimum 200ms) {
<app-spinner />
} @error {
<app-error-state message="Failed to load comments" />
}
```

---

## Error Handling Patterns

### Error Handling Hierarchy

```
1. Inline error (field-level) → Form validation errors
2. Toast notification → Recoverable errors, user can retry
3. Error banner → Page-level errors, data still partially usable
4. Full error screen → Unrecoverable, needs user action
```

### Always Show Errors

**CRITICAL: Never swallow errors silently.**

> See [references/details.md](references/details.md) for full code examples.

### Error State Component Pattern

> See [references/details.md](references/details.md) for full code examples.

---

## Button State Patterns

### Button Loading State

```html
<button
  (click)="handleSubmit()"
  [disabled]="isSubmitting() || !form.valid"
  class="btn-primary"
>
  @if (isSubmitting()) {
  <app-spinner size="small" class="mr-2" />
  Saving... } @else { Save Changes }
</button>
```

### Disable During Operations

**CRITICAL: Always disable triggers during async operations.**

> See [references/details.md](references/details.md) for full code examples.

---

## Empty States

### Empty State Requirements

Every list/collection MUST have an empty state:

```html
@for (item of items(); track item.id) {
<app-item-card [item]="item" />
} @empty {
<app-empty-state
  icon="folder-open"
  title="No items yet"
  description="Create your first item to get started"
  actionLabel="Create Item"
  (action)="openCreateDialog()"
/>
}
```

### Contextual Empty States

> See [references/details.md](references/details.md) for full code examples.

---

## Form Patterns

### Form with Loading and Validation

> See [references/details.md](references/details.md) for full code examples.

---

## Dialog/Modal Patterns

### Confirmation Dialog

> See [references/details.md](references/details.md) for full code examples.

---

## Anti-Patterns

### Loading States

```typescript
// WRONG - Spinner when data exists (causes flash on refetch)
@if (loading()) {
  <app-spinner />
}

// CORRECT - Only show loading without data
@if (loading() && !items().length) {
  <app-spinner />
}
```

### Error Handling

```typescript
// WRONG - Error swallowed
try {
  await this.service.save();
} catch (e) {
  console.log(e); // User has no idea!
}

// CORRECT - Error surfaced
try {
  await this.service.save();
} catch (e) {
  console.error("Save failed:", e);
  this.toast.error("Failed to save. Please try again.");
}
```

### Button States

```html
<!-- WRONG - Button not disabled during submission -->
<button (click)="submit()">Submit</button>

<!-- CORRECT - Disabled and shows loading -->
<button (click)="submit()" [disabled]="loading()">
  @if (loading()) {
  <app-spinner size="sm" />
  } Submit
</button>
> See [references/details.md](references/details.md) for full code examples.
