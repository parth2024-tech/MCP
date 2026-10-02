#!/usr/bin/env python3
"""
Official Claude Skill Authoring Linter
Validates SKILL.md files against https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

Rules enforced:
1. Name: <= 64 chars, lowercase alphanumeric + hyphens only (^[a-z0-9-]+$), no reserved words ('claude', 'anthropic').
2. Description: Non-empty, <= 1024 chars, written in 3rd person, contains trigger context ('Use when...').
3. Line Budget: SKILL.md body <= 500 lines (recommends progressive disclosure).
4. Paths: Forward slashes only (no Windows '\\').
5. No XML tags in name or description.
"""

import sys
import os
import glob
import re

RESERVED_WORDS = {'claude', 'anthropic'}
FIRST_PERSON_PATTERNS = [
    re.compile(r'\bI can\b', re.IGNORECASE),
    re.compile(r'\bI will\b', re.IGNORECASE),
    re.compile(r'\bYou can use this\b', re.IGNORECASE),
    re.compile(r'\bALWAYS use this skill\b', re.IGNORECASE)
]

def lint_skill(file_path):
    issues = []
    warnings = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
    except Exception as e:
        return [f"Could not read file: {e}"], []

    lines = content.splitlines()
    line_count = len(lines)

    # 1. Budget check
    if line_count > 500:
        issues.append(f"Line budget exceeded: {line_count} lines (maximum recommended is 500 lines). Extract large code/tables to references/*.md.")

    # 2. Windows path check
    for idx, line in enumerate(lines, 1):
        if re.search(r'[a-zA-Z0-9_-]+\\[a-zA-Z0-9_-]+', line):
            warnings.append(f"Line {idx}: Found possible Windows backslash path. Always use Unix-style forward slashes ('/').")

    # 3. Frontmatter checks
    fm_match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not fm_match:
        issues.append("Missing YAML frontmatter block (must start with '---' and end with '---').")
        return issues, warnings

    fm = fm_match.group(1)

    # Check name
    name_m = re.search(r'^name:\s*([^\n]+)', fm, re.MULTILINE)
    if not name_m:
        issues.append("Missing 'name' in frontmatter.")
    else:
        name = name_m.group(1).strip('\"\' ')
        if len(name) > 64:
            issues.append(f"Name exceeds 64 characters ({len(name)} chars): '{name}'")
        if not re.match(r'^[a-z0-9-]+$', name):
            issues.append(f"Name contains invalid characters: '{name}'. Only lowercase letters, digits, and hyphens are allowed.")
        for r in RESERVED_WORDS:
            if r in name.lower():
                issues.append(f"Name contains reserved word '{r}': '{name}'")
        if '<' in name or '>' in name:
            issues.append("Name must not contain XML tags.")

    # Check description
    desc_m = re.search(r'^description:\s*(>|\|)?\s*\n?([^\n]+(?:\n\s+[^\n]+)*)', fm, re.MULTILINE)
    if not desc_m:
        issues.append("Missing or empty 'description' in frontmatter.")
    else:
        desc = desc_m.group(2).strip()
        # Clean multi-line indentation
        desc_clean = re.sub(r'\s+', ' ', desc).strip('\"\' ')
        if len(desc_clean) == 0:
            issues.append("Description is empty.")
        if len(desc_clean) > 1024:
            issues.append(f"Description exceeds 1024 characters ({len(desc_clean)} chars).")
        if '<' in desc_clean or '>' in desc_clean:
            issues.append("Description must not contain XML tags.")

        for pat in FIRST_PERSON_PATTERNS:
            if pat.search(desc_clean):
                warnings.append(f"Description should be written in 3rd person. Found: '{pat.pattern}'")

        if 'use when' not in desc_clean.lower() and 'trigger' not in desc_clean.lower():
            warnings.append("Description should specify trigger conditions ('Use when...').")

    return issues, warnings

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else 'skills'
    if os.path.isfile(target):
        files = [target]
    else:
        files = sorted(glob.glob(f'{target}/**/SKILL.md', recursive=True))

    print(f"Auditing {len(files)} skill(s) against Claude Best Practices...\n")
    total_issues = 0
    total_warnings = 0
    failed_files = 0

    for f in files:
        issues, warnings = lint_skill(f)
        if issues or warnings:
            skill_name = os.path.basename(os.path.dirname(f))
            print(f"[{skill_name}] ({f})")
            for iss in issues:
                print(f"  ❌ Error: {iss}")
                total_issues += 1
            for w in warnings:
                print(f"  ⚠️  Warn:  {w}")
                total_warnings += 1
            if issues:
                failed_files += 1

    print("\n" + "=" * 50)
    print(f"Total Skills Checked: {len(files)}")
    print(f"Errors: {total_issues} in {failed_files} file(s)")
    print(f"Warnings: {total_warnings}")

    if total_issues > 0:
        sys.exit(1)
    else:
        print("✅ Core audit passed!")
        sys.exit(0)

if __name__ == '__main__':
    main()
