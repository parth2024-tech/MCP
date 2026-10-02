---
name: cc-skill-frontend-patterns
description: Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices. Use when the task involves cc skill frontend patterns.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Frontend Development Patterns

Modern frontend patterns for React, Next.js, and performant user interfaces.

## Component Patterns

### Composition Over Inheritance

> See [references/details.md](references/details.md) for full code examples.

### Compound Components

> See [references/details.md](references/details.md) for full code examples.

### Render Props Pattern

> See [references/details.md](references/details.md) for full code examples.

## Custom Hooks Patterns

### State Management Hook

```typescript
export function useToggle(initialValue = false): [boolean, () => void] {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue(v => !v)
  }, [])

  return [value, toggle]
}

// Usage
const [isOpen, toggleOpen] = useToggle()
```

### Async Data Fetching Hook

> See [references/details.md](references/details.md) for full code examples.

### Debounce Hook

> See [references/details.md](references/details.md) for full code examples.

## State Management Patterns

### Context + Reducer Pattern

> See [references/details.md](references/details.md) for full code examples.

## Performance Optimization

### Memoization

> See [references/details.md](references/details.md) for full code examples.

### Code Splitting & Lazy Loading

> See [references/details.md](references/details.md) for full code examples.

### Virtualization for Long Lists

> See [references/details.md](references/details.md) for full code examples.

## Form Handling Patterns

### Controlled Form with Validation

> See [references/details.md](references/details.md) for full code examples.

## Error Boundary Pattern

> See [references/details.md](references/details.md) for full code examples.

## Animation Patterns

### Framer Motion Animations

> See [references/details.md](references/details.md) for full code examples.

## Accessibility Patterns

### Keyboard Navigation

> See [references/details.md](references/details.md) for full code examples.

### Focus Management

> See [references/details.md](references/details.md) for full code examples.

**Remember**: Modern frontend patterns enable maintainable, performant user interfaces. Choose patterns that fit your project complexity.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
