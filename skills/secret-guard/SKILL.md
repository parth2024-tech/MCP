---
name: secret-guard
description: "Detect, audit, and block hardcoded credentials, API keys, and secrets using Gitleaks."
category: security
risk: safe
date_added: "2026-11-09"
tags: [security, gitleaks, secrets, pre-commit, zero-leak]
---

# Zero-Leak Secret & Token Protection (`gitleaks`)

## Core Directives
1. **Zero Secret Leakage:** Never commit or push any file containing unredacted API keys, private keys, database connection strings, JWTs, or `.env` files with credentials.
2. **Pre-Push Hard Gate:** Before executing `git push`, run `gitleaks protect --staged --verbose` or `gitleaks dir .`. If any secret is detected, abort immediately and sanitize the file.

## Commands & Workflows

### 1. Scan Staged Files (Pre-Commit / Pre-Push)
```bash
gitleaks protect --staged --verbose
```
- Scans only files currently in git staging (`git add`).
- Combines regex signatures for 180+ cloud providers with Shannon entropy scanning.
- Exit code `0` = Clean. Exit code `1` = Leak detected.

### 2. Scan Full Repository History or Directory
```bash
gitleaks git --verbose
# Or scan directory without git history:
gitleaks dir . --verbose
```

### 3. Redaction / Remediation Rule
- If a secret is flagged:
  1. Move the secret to an untracked `.env.local` or environment variable.
  2. Ensure `.env*` (except `.env.example`) is listed in `.gitignore`.
  3. Re-scan with `gitleaks protect --staged` until clean.
