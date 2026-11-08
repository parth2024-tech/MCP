# 2. Enforce Deterministic CLI Guardrails via Lefthook and Just

Date: 2026-11-09

## Status

Accepted

## Context

AI agent workflows across multi-model environments (Antigravity, Claude Code, Cursor) require strict deterministic verification before code changes reach production branches or git commits. Relying on fragile regex linters, hallucinated command flags, or manual checks leads to:
1. Hardcoded secrets, keys, or tokens accidentally committed to Git.
2. Silent syntax or structural regressions not caught by regex-based linters.
3. Inconsistent pre-commit validation between human operators and autonomous agents.
4. Slow, nondeterministic dev loops.

## Decision

We enforce a deterministic, zero-cloud, single-binary CLI guardrail stack across all ongoing and upcoming projects:
1. **Lefthook (`lefthook.yml`)**: Fast, parallel pre-commit hook runner orchestrating local verification.
2. **Just (`Justfile`)**: Deterministic task runner ensuring standardized recipes (`just verify`, `just scan-secrets`, `just lint-ast`) without CLI flag drift.
3. **Gitleaks (`gitleaks protect --staged`)**: Standalone Go binary verifying zero secret leakage on staged git diffs.
4. **ast-grep (`sg scan`)**: Abstract Syntax Tree structural linter enforcing syntactic invariants across TypeScript and JavaScript.
5. **TypeSpec (`tsp`) & D2 (`d2`)**: Contract-first API specifications and declarative architecture diagrams.
6. **Typst (`typst`)**: Single typesetting engine for research papers and formal documentation.

## Consequences

### Positive
- Zero risk of API secret leakage in staged commits.
- Deterministic AST rules catch anti-patterns without false positives.
- `just verify` provides a single command test/gate loop for both humans and autonomous agents.
- Zero external daemon or cloud dependency; runs 100% locally on Arch Linux.

### Mitigations
- Rules configured in `rules/` must maintain low false-positive rates to avoid blocking autonomous execution loops.
- `Justfile` and `lefthook.yml` are automatically scaffolded by `ase-init` for all new projects.
