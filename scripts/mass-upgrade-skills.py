#!/usr/bin/env python3
"""
Mass upgrade all skills in the library to Anthropic Claude Best Practices.

Fixes:
  1. Invalid names (lifecycle/, reference/ prefix, underscores, reserved words)
  2. Missing "Use when..." trigger in description
  3. XML tags in description
  4. Over-500-line body: extract large code blocks/tables to references/*.md
  5. Windows backslash paths → forward slashes
"""
import os
import re
import sys
import shutil

SKILLS_DIR = os.path.join(os.path.dirname(__file__), "..", "skills")
DRY_RUN = "--dry-run" in sys.argv
VERBOSE = "--verbose" in sys.argv

RESERVED = {"claude", "anthropic"}
VALID_NAME_RE = re.compile(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$')

fixes_applied = 0
files_modified = 0

def log(msg):
    if VERBOSE:
        print(msg)

def extract_frontmatter(content):
    """Return (frontmatter_dict, body_start_line, raw_front) or None."""
    if not content.startswith("---"):
        return None
    end = content.find("\n---", 3)
    if end == -1:
        return None
    raw_front = content[3:end]
    body_start = end + 4  # skip \n---
    fm = {}
    for line in raw_front.splitlines():
        m = re.match(r'^(\w+):\s*(.*)$', line)
        if m:
            fm[m.group(1)] = m.group(2).strip().strip('"\'')
    return fm, body_start, raw_front, content[body_start:]

def fix_name(name, dir_name):
    """Return (fixed_name, changed)."""
    original = name
    # Strip known invalid prefixes
    for prefix in ("lifecycle/", "reference/"):
        if name.startswith(prefix):
            name = name[len(prefix):]
    # Replace underscores with hyphens
    name = name.replace("_", "-")
    # Remove reserved words by prefixing with 'skill-'
    for word in RESERVED:
        if word in name.split("-"):
            name = name.replace(word, "").strip("-")
    # Fallback: use dir_name
    if not VALID_NAME_RE.match(name) or not name:
        name = dir_name.replace("_", "-")
    # Trim to 64
    name = name[:64].rstrip("-")
    return name, name != original

def fix_description(desc, name, dir_name):
    """Ensure description is 3rd person with 'Use when...' trigger, no XML tags."""
    original = desc
    # Strip XML tags
    desc = re.sub(r'<[^>]+>', '', desc).strip()
    # If empty after stripping, generate from name
    if not desc:
        human_name = dir_name.replace("-", " ").replace("_", " ").title()
        desc = f"Provides {human_name} guidance. Use when working with {human_name.lower()} tasks."
    # Add trigger if missing (heuristic: "Use when" or "use when" not in desc)
    if "use when" not in desc.lower():
        # Generate a generic trigger appended to existing description
        desc = desc.rstrip(".") + f". Use when the task involves {dir_name.replace('-', ' ')}."
    # Truncate to 1024
    if len(desc) > 1024:
        desc = desc[:1021] + "..."
    return desc, desc != original

def extract_large_blocks(skill_path, dir_name, body):
    """
    Extract large code blocks and markdown tables from body to references/details.md.
    Returns (new_body, extracted_content, changed).
    """
    ref_dir = os.path.join(os.path.dirname(skill_path), "references")
    ref_file = os.path.join(ref_dir, "details.md")

    lines = body.splitlines(keepends=True)
    if len(lines) <= 500:
        return body, None, False

    # Find all fenced code blocks and large tables
    to_extract = []  # list of (start_line, end_line, header_context)
    
    i = 0
    current_section = ""
    while i < len(lines):
        line = lines[i]
        # Track current section header
        if line.startswith("#"):
            current_section = line.strip()
        
        # Fenced code block
        if line.strip().startswith("```"):
            fence = line.strip()[:3]
            j = i + 1
            while j < len(lines):
                if lines[j].strip().startswith(fence) and j > i:
                    break
                j += 1
            block_len = j - i + 1
            if block_len >= 20:  # Only extract code blocks >= 20 lines
                to_extract.append((i, j, current_section))
                i = j + 1
                continue
        
        # Large table (5+ consecutive | lines)
        if line.strip().startswith("|"):
            j = i
            while j < len(lines) and lines[j].strip().startswith("|"):
                j += 1
            table_len = j - i
            if table_len >= 10:
                to_extract.append((i, j - 1, current_section))
                i = j
                continue
        
        i += 1

    if not to_extract:
        # Nothing obvious to extract — just trim aggressively: cut body at line 480
        # and add a references pointer
        trimmed = lines[:480]
        cut_content = lines[480:]
        if not cut_content:
            return body, None, False
        
        ref_content = f"# {dir_name.replace('-',' ').title()} — Extended Reference\n\n"
        ref_content += "".join(cut_content)
        new_body = "".join(trimmed)
        new_body += f"\n\n> See [references/details.md](references/details.md) for extended content.\n"
        return new_body, ref_content, True

    # Build extracted reference content
    extracted_sections = {}
    for (start, end, section) in to_extract:
        extracted_sections.setdefault(section, []).append("".join(lines[start:end+1]))

    # Build replacement body: replace extracted ranges with reference pointers
    excluded = set()
    for start, end, _ in to_extract:
        for idx in range(start, end + 1):
            excluded.add(idx)

    new_body_lines = []
    pointer_added = set()
    for idx, line in enumerate(lines):
        if idx in excluded:
            # Find which block this belongs to and add pointer once
            for (start, end, section) in to_extract:
                if start == idx and section not in pointer_added:
                    new_body_lines.append(
                        f"> See [references/details.md](references/details.md) for full code examples.\n"
                    )
                    pointer_added.add(section)
            continue
        new_body_lines.append(line)

    new_body = "".join(new_body_lines)

    ref_content = f"# {dir_name.replace('-', ' ').title()} — Code Reference\n\n"
    for section, blocks in extracted_sections.items():
        ref_content += f"## {section}\n\n"
        for block in blocks:
            ref_content += block + "\n\n"

    return new_body, ref_content, True

def fix_backslashes(content):
    """Replace Windows-style backslash paths in code blocks."""
    # Replace \\ used as path separators (not escape sequences) 
    fixed = re.sub(r'(?<!\\)\\(?=[A-Za-z0-9_])', '/', content)
    return fixed, fixed != content

def process_skill(dir_name):
    global fixes_applied, files_modified
    skill_path = os.path.join(SKILLS_DIR, dir_name, "SKILL.md")
    if not os.path.isfile(skill_path):
        return

    with open(skill_path, encoding="utf-8", errors="replace") as f:
        content = f.read()

    result = extract_frontmatter(content)
    if result is None:
        log(f"  SKIP {dir_name}: no frontmatter")
        return

    fm, body_start, raw_front, body = result
    changed = False
    fm_changes = {}

    # 1. Fix name
    name = fm.get("name", dir_name)
    new_name, name_changed = fix_name(name, dir_name)
    if name_changed:
        fm_changes["name"] = new_name
        fixes_applied += 1
        log(f"  [name] {name} → {new_name}")
        changed = True

    # 2. Fix description
    desc = fm.get("description", "")
    new_desc, desc_changed = fix_description(desc, name, dir_name)
    if desc_changed:
        fm_changes["description"] = new_desc
        fixes_applied += 1
        log(f"  [desc] fixed for {dir_name}")
        changed = True

    # 3. Fix backslashes
    body_fixed, bs_changed = fix_backslashes(body)
    if bs_changed:
        body = body_fixed
        fixes_applied += 1
        log(f"  [paths] fixed backslashes in {dir_name}")
        changed = True

    # 4. Extract large blocks (only if over 500 lines)
    total_lines = content.count("\n")
    ref_written = False
    if total_lines > 500:
        new_body, ref_content, extracted = extract_large_blocks(skill_path, dir_name, body)
        if extracted:
            body = new_body
            fixes_applied += 1
            log(f"  [size] extracted content from {dir_name} ({total_lines} lines)")
            changed = True
            # Write reference file
            ref_dir = os.path.join(SKILLS_DIR, dir_name, "references")
            ref_file = os.path.join(ref_dir, "details.md")
            if not DRY_RUN:
                os.makedirs(ref_dir, exist_ok=True)
                with open(ref_file, "w", encoding="utf-8") as f:
                    f.write(ref_content)
            ref_written = True

    if not changed:
        return

    # Rebuild frontmatter
    def rebuild_frontmatter(fm, fm_changes, raw_front):
        lines = raw_front.splitlines()
        result = []
        for line in lines:
            m = re.match(r'^(\w+):\s*(.*)$', line)
            if m and m.group(1) in fm_changes:
                key = m.group(1)
                val = fm_changes[key]
                # Quote if contains special chars
                if ":" in val or '"' in val or val.startswith(" "):
                    val = '"' + val.replace('"', '\\"') + '"'
                result.append(f'{key}: {val}')
            else:
                result.append(line)
        return "\n".join(result)

    new_front = rebuild_frontmatter(fm, fm_changes, raw_front)
    new_content = f"---{new_front}\n---{body}"

    if not DRY_RUN:
        with open(skill_path, "w", encoding="utf-8") as f:
            f.write(new_content)

    files_modified += 1
    print(f"✓ {dir_name}")

def main():
    print(f"Scanning {SKILLS_DIR}...")
    if DRY_RUN:
        print("DRY RUN — no files will be written")

    dirs = sorted(os.listdir(SKILLS_DIR))
    for i, d in enumerate(dirs):
        if i % 100 == 0:
            print(f"  Progress: {i}/{len(dirs)}...")
        process_skill(d)

    print(f"\n{'='*50}")
    print(f"Files modified: {files_modified}")
    print(f"Fixes applied:  {fixes_applied}")
    if DRY_RUN:
        print("(DRY RUN — nothing written)")

if __name__ == "__main__":
    main()
