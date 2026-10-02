---
name: skill-creator
description: To create new CLI skills following Anthropic's official best practices with zero manual configuration. This skill automates brainstorming, template application, validation, and installation processes while maintaining progressive disclosure patterns and writing style standards. Use when the task involves skill creator.
category: meta
risk: safe
source: community
tags: "[automation, scaffolding, skill-creation, meta-skill]"
date_added: "2026-02-27"
---

# skill-creator

## Purpose

To create new CLI skills following Anthropic's official best practices with zero manual configuration. This skill automates brainstorming, template application, validation, and installation processes while maintaining progressive disclosure patterns and writing style standards.

## When to Use This Skill

This skill should be used when:
- User wants to extend CLI functionality with custom capabilities
- User needs to create a skill following official standards
- User wants to automate repetitive CLI tasks with a reusable skill
- User needs to package domain knowledge into a skill format
- User wants both local and global skill installation options

## Core Capabilities

1. **Interactive Brainstorming** - Collaborative session to define skill purpose and scope
2. **Prompt Enhancement** - Optional integration with prompt-engineer skill for refinement
3. **Template Application** - Automatic file generation from standardized templates
4. **Validation** - YAML, content, and style checks against Anthropic standards
5. **Installation** - Local repository or global installation with symlinks
6. **Progress Tracking** - Visual gauge showing completion status at each step

## Step 0: Discovery

Before starting skill creation, gather runtime information:

> See [references/details.md](references/details.md) for full code examples.

**Key Information Needed:**
- Which platforms to target (Copilot, Claude, Codex, or all three)
- Installation preference (local, global, or both)
- Skill name and purpose
- Skill type (general, code, documentation, analysis)

## Main Workflow

### Progress Tracking Guidelines

Throughout the workflow, display a visual progress bar before starting each phase to keep the user informed. The progress bar format is:

```
[████████████░░░░░░] 60% - Step 3/5: Creating SKILL.md
```

**Format specifications:**
- 20 characters wide (use █ for filled, ░ for empty)
- Percentage based on current step (Step 1=20%, Step 2=40%, Step 3=60%, Step 4=80%, Step 5=100%)
- Step counter showing current/total (e.g., "Step 3/5")
- Brief description of current phase

**Display the progress bar using:**
```bash
echo "[████░░░░░░░░░░░░░░] 20% - Step 1/5: Brainstorming & Planning"
```

### Phase 1: Brainstorming & Planning

**Progress:** Display before starting this phase:
```bash
echo "[████░░░░░░░░░░░░░░] 20% - Step 1/5: Brainstorming & Planning"
```

Display progress:
```
╔══════════════════════════════════════════════════════════════╗
║     🛠️  SKILL CREATOR - Creating New Skill                  ║
╠══════════════════════════════════════════════════════════════╣
║ → Phase 1: Brainstorming                 [10%]               ║
║ ○ Phase 2: Prompt Refinement                                 ║
║ ○ Phase 3: File Generation                                   ║
║ ○ Phase 4: Validation                                        ║
║ ○ Phase 5: Installation                                      ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ███░░░░░░░░░░░░░░░░░░░░░░░░░░░  10%              ║
╚══════════════════════════════════════════════════════════════╝
> See [references/details.md](references/details.md) for full code examples.
echo "[████████░░░░░░░░░░] 40% - Step 2/5: Prompt Enhancement"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 1: Brainstorming                                     ║
║ → Phase 2: Prompt Refinement             [30%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: █████████░░░░░░░░░░░░░░░░░░░░░  30%              ║
╚══════════════════════════════════════════════════════════════╝
echo "[████████████░░░░░░] 60% - Step 3/5: File Generation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 1: Brainstorming                                     ║
║ ✓ Phase 2: Prompt Refinement                                 ║
║ → Phase 3: File Generation               [50%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ███████████████░░░░░░░░░░░░░░░  50%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Generate skill structure:**

```bash
# Convert skill name to kebab-case
SKILL_NAME=$(echo "$USER_INPUT" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Create directories
if [[ "$PLATFORM" =~ "copilot" ]]; then
    mkdir -p ".github/skills/$SKILL_NAME"/{references,examples,scripts}
fi

if [[ "$PLATFORM" =~ "claude" ]]; then
    mkdir -p ".claude/skills/$SKILL_NAME"/{references,examples,scripts}
fi

if [[ "$PLATFORM" =~ "codex" ]]; then
    mkdir -p ".codex/skills/$SKILL_NAME"/{references,examples,scripts}
fi
> See [references/details.md](references/details.md) for full code examples.
# Apply template with substitution
sed "s/{{SKILL_NAME}}/$SKILL_NAME/g; \
     s/{{DESCRIPTION}}/$DESCRIPTION/g; \
     s/{{AUTHOR}}/$AUTHOR/g; \
     s/{{DATE}}/$(date +%Y-%m-%d)/g" \
    resources/templates/skill-template-copilot.md \
    > ".github/skills/$SKILL_NAME/SKILL.md"

# Create README
sed "s/{{SKILL_NAME}}/$SKILL_NAME/g" \
    resources/templates/readme-template.md \
    > ".github/skills/$SKILL_NAME/README.md"

# Apply template for Codex if selected
if [[ "$PLATFORM" =~ "codex" ]]; then
    sed "s/{{SKILL_NAME}}/$SKILL_NAME/g; \
         s/{{DESCRIPTION}}/$DESCRIPTION/g; \
         s/{{AUTHOR}}/$AUTHOR/g; \
         s/{{DATE}}/$(date +%Y-%m-%d)/g" \
        resources/templates/skill-template-codex.md \
        > ".codex/skills/$SKILL_NAME/SKILL.md"
    
    sed "s/{{SKILL_NAME}}/$SKILL_NAME/g" \
        resources/templates/readme-template.md \
        > ".codex/skills/$SKILL_NAME/README.md"
fi
```

**Display created structure:**
```
✅ Created:
   .github/skills/your-skill-name/ (if Copilot selected)
   .claude/skills/your-skill-name/ (if Claude selected)
   .codex/skills/your-skill-name/ (if Codex selected)
   ├── SKILL.md (832 lines)
   ├── README.md (347 lines)
   ├── references/
   ├── examples/
   └── scripts/
```

### Phase 4: Validation

**Progress:** Display before starting this phase:
```bash
echo "[████████████████░░] 80% - Step 4/5: Validation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 3: File Generation                                   ║
║ → Phase 4: Validation                    [70%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: █████████████████████░░░░░░░░░  70%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Run validation scripts:**

```bash
# Validate YAML frontmatter
scripts/validate-skill-yaml.sh ".github/skills/$SKILL_NAME"

# Validate content quality
scripts/validate-skill-content.sh ".github/skills/$SKILL_NAME"
```

**Expected output:**
```
🔍 Validating YAML frontmatter...
✅ YAML frontmatter valid!

🔍 Validating content...
✅ Word count excellent: 1847 words
✅ Content validation complete!
```

**If validation fails:**
- Display specific errors
- Offer to fix automatically (common issues)
- Ask user to manually correct complex issues

**Common auto-fixes:**
- Convert second-person to imperative form
- Reformat description to third-person
- Add missing required fields

### Phase 5: Installation

**Progress:** Display before starting this phase:
```bash
echo "[████████████████████] 100% - Step 5/5: Installation"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 4: Validation                                        ║
║ → Phase 5: Installation                  [90%]               ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ██████████████████████████░░░░░  90%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Ask the user:**
"How would you like to install this skill?"

- [ ] **Repository only** - Files created in `.github/skills/` (works when in repo)
- [ ] **Global installation** - Create symlinks in `~/.copilot/skills/` (works everywhere)
- [ ] **Both** - Repository + global symlinks (recommended, auto-updates with git pull)
- [ ] **Skip installation** - Just create files

**If global installation selected:**

> See [references/details.md](references/details.md) for full code examples.

**Installation process:**


**Verify installation:**

```bash
# Check symlinks
ls -la ~/.copilot/skills/$SKILL_NAME 2>/dev/null
ls -la ~/.claude/skills/$SKILL_NAME 2>/dev/null
ls -la ~/.codex/skills/$SKILL_NAME 2>/dev/null
```

### Phase 6: Completion

**Progress:** Display completion message:
```bash
echo "[████████████████████] 100% - ✓ Skill created successfully!"
```

Update progress:
```
╔══════════════════════════════════════════════════════════════╗
║ ✓ Phase 5: Installation                                      ║
║ ✅ SKILL CREATION COMPLETE!                                  ║
╠══════════════════════════════════════════════════════════════╣
║ Progress: ██████████████████████████████  100%              ║
╚══════════════════════════════════════════════════════════════╝
```

**Display summary:**

> See [references/details.md](references/details.md) for full code examples.

## Error Handling

### Platform Detection Issues

If platforms cannot be detected:
```
⚠️  Unable to detect GitHub Copilot CLI or Claude Code
    
Would you like to:
1. Install for repository only (works when in repo)
2. Specify platform manually
3. Skip installation
```

### Template Not Found

If templates are missing:
```
❌ Error: Template not found at resources/templates/

This skill requires the cli-ai-skills repository structure.

Options:
1. Clone cli-ai-skills: git clone <repo-url>
2. Create minimal skill structure manually
3. Exit and set up templates first
```

### Validation Failures

If content doesn't meet standards:
```
⚠️  Validation Issues Found:

1. YAML: Description not in third-person format
   Expected: "This skill should be used when..."
   Found: "Use this skill when..."
   
2. Content: Word count too high (5,342 words, max 5,000)
   Suggestion: Move detailed sections to references/

Fix automatically? [Y/n]
```

### Installation Conflicts

If symlink already exists:
```
⚠️  Skill already installed at ~/.copilot/skills/your-skill-name

Options:
1. Overwrite existing installation
2. Rename new skill
3. Skip installation
4. Install to different location
> See [references/details.md](references/details.md) for full code examples.
