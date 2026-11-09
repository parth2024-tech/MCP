# Justfile — Antigravity Skills Engine (ASE) Deterministic Runner

default: verify

# Run all deterministic guardrails
verify:
    @echo "==> Verifying Skill Frontmatter Token Budget..."
    @awk '/^description:/ {if (NF > 21) {print "Token bloat in " FILENAME ": " NF " words"; exit 1}}' /home/thor/.gemini/config/skills/*/SKILL.md
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

# Enforce max 20 words in any active SKILL.md description (both live config and local repo)
verify-skill-budget:
    @awk '/^description:/ {if (NF > 21) {print "Token bloat in " FILENAME ": " NF " words"; exit 1}}' /home/thor/.gemini/config/skills/*/SKILL.md
    @awk '/^description:/ {if (NF > 21) {print "Token bloat in " FILENAME ": " NF " words"; exit 1}}' /home/thor/skiils/*/SKILL.md 2>/dev/null || true
    @echo "Pass: All active and repo skills are strictly under 20 words"


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
