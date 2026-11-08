# Justfile — Antigravity Skills Engine (ASE) Deterministic Runner

default: verify

# Run all deterministic guardrails
verify:
    @echo "==> Running Gitleaks (Secret Gate)..."
    gitleaks protect --staged --verbose
    @echo "==> Running AST Structural Scan..."
    sg scan
    @echo "==> Running TypeScript Check..."
    npx tsc --noEmit
    @echo "==> Running Test Suite..."
    npm test
    @echo "==> Running ASE Output Validation..."
    node tools/bin/ase-init --validate

# Quick secret scan of working tree
scan-secrets:
    gitleaks dir . --verbose

# Run AST structural linting
lint-ast:
    sg scan

# Detect dead code, orphaned types, and unused exports
prune-dead-code:
    knip

# Benchmark deterministic verification loop
bench:
    hyperfine --warmup 1 'just verify'

# Declarative schema diffing
schema-diff:
    atlas schema diff

# Export Second Brain Obsidian vault
export-vault:
    node tools/bin/ase-init --export-vault

# Show all learned lessons
lessons:
    node tools/bin/ase-init --lessons
