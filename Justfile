# Justfile — Antigravity Skills Engine (ASE) Deterministic Runner

default: verify

# Run all deterministic guardrails (identical locally and in CI)
verify:
    @just verify-skill-budget
    @just lint-skills
    @just no-hardcoded-paths
    @echo "==> Running Gitleaks (Secret Gate)..."
    @if [ "${CI:-}" = "true" ]; then gitleaks git --log-opts="${GITLEAKS_LOG_OPTS:-HEAD~1..HEAD}" --verbose; else gitleaks protect --staged --verbose; fi
    @echo "==> Running AST Structural Scan..."
    sg scan
    @echo "==> Running TypeScript Check..."
    npx tsc --noEmit
    @echo "==> Running Test Suite..."
    npm test
    @echo "==> Running ASE Output Validation..."
    node tools/bin/ase-init --validate
    @echo "==> Running Report Validator Self-Test..."
    python3 scripts/validate_report.py --self-test

# Enforce max 20 words in active SKILL.md descriptions listed in config/active-skills.txt
verify-skill-budget:
    @echo "==> Verifying Active Skill Frontmatter Token Budget (config/active-skills.txt)..."
    @while IFS= read -r skill; do \
        [ -z "$skill" ] && continue; \
        f="{{justfile_directory()}}/skills/$skill/SKILL.md"; \
        if [ ! -f "$f" ]; then echo "Missing active skill in repo: $f"; exit 1; fi; \
        awk '/^description:/ {if (NF > 21) {print "Token bloat in " FILENAME ": " (NF - 1) " words (max 20)"; exit 1}}' "$f" || exit 1; \
    done < "{{justfile_directory()}}/config/active-skills.txt"
    @echo "Pass: All active skills in config/active-skills.txt are strictly <= 20 words"

# Structural lint across all repo skills
lint-skills:
    @echo "==> Linting Skill Corpus Structure..."
    python3 scripts/lint-skills.py skills

# Reject hardcoded developer home paths anywhere outside ADRs
no-hardcoded-paths:
    @echo "==> Checking for hardcoded home paths..."
    ! git grep -nI '/home/''thor' -- . ':!docs/adr'

# Local-only drift check between repo skills/ and ~/.gemini/config/skills/ (never run in CI)
doctor:
    @echo "==> Checking local installed skills against config/active-skills.txt..."
    @target="${GEMINI_SKILLS_DIR:-$HOME/.gemini/config/skills}"; \
    if [ ! -d "$target" ]; then echo "Install dir not found: $target"; exit 1; fi; \
    while IFS= read -r skill; do \
        [ -z "$skill" ] && continue; \
        diff -rq "{{justfile_directory()}}/skills/$skill" "$target/$skill" || exit 1; \
    done < "{{justfile_directory()}}/config/active-skills.txt"; \
    echo "Pass: Local ~/.gemini/config/skills matches repo source of truth"

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

# Run Section 11 report validator self-test
test-report-validator:
    python3 scripts/validate_report.py --self-test

# Run Tier R skill routing evaluation against committed baseline
eval-routing:
    node evals/routing/run-eval.js

# Record Tier R baseline snapshot (use only on baseline commits)
eval-routing-baseline:
    node evals/routing/run-eval.js --record-baseline
