---
name: ast-grep-enforcer
description: "Enforce AST-level architectural rules, code structural patterns, and pre-commit verification loops using ast-grep (sg), just, and lefthook. Replaces fragile regex linting with syntax-tree checks."
category: quality
risk: safe
date_added: "2026-11-09"
tags: [ast-grep, sg, just, lefthook, linter, guardrails]
---

# AST Structural Enforcer & Deterministic Task Runner

## Core Directives
1. **Syntax-Tree Invariants (`sg`):** Use `ast-grep` (`sg`) to find and enforce structural code rules across TypeScript, Python, Rust, Go, etc. Regex linters are fragile; AST pattern matching never misses edge cases.
2. **Deterministic Recipe Menu (`just`):** Always run tasks and test loops via `just` commands (`just verify`, `just check`, `just push`) so shell flags are never hallucinated.

## Usage

### 1. Interactive Structural Search
```bash
# Find all console.log calls in TypeScript
sg run -p 'console.log($$$A)' -l ts

# Find all unhandled promises or raw fetch calls
sg run -p 'fetch($$$ARGS)' -l ts
```

### 2. Custom Project Invariant Rule (`rules/no-raw-fetch.yml`)
```yaml
id: no-raw-fetch
language: typescript
rule:
  pattern: fetch($$$ARGS)
message: "Do not use raw fetch(). Use apiClient wrapper from src/lib/api.ts"
severity: error
```

Scan codebase against rules:
```bash
sg scan
```

### 3. Unified Justfile Verification Loop
Every project root should have a `justfile`:
```just
default: verify

# Run all deterministic guardrails
verify:
  gitleaks protect --staged
  sg scan
  ase-init --validate

# Format and test
test:
  npm test
```
Run with:
```bash
just verify
```
