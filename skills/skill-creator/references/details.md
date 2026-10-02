# Skill Creator — Code Reference

## ## Step 0: Discovery

```bash
# Detect available platforms
COPILOT_INSTALLED=false
CLAUDE_INSTALLED=false
CODEX_INSTALLED=false

if command -v gh &>/dev/null && gh copilot --version &>/dev/null 2>&1; then
    COPILOT_INSTALLED=true
fi

if [[ -d "$HOME/.claude" ]]; then
    CLAUDE_INSTALLED=true
fi

if [[ -d "$HOME/.codex" ]]; then
    CODEX_INSTALLED=true
fi

# Determine working directory
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SKILLS_REPO="$REPO_ROOT"

# Check if in cli-ai-skills repository
if [[ ! -d "$SKILLS_REPO/.github/skills" ]]; then
    echo "⚠️  Not in cli-ai-skills repository. Creating standalone skill."
    STANDALONE=true
fi

# Get user info from git config
AUTHOR=$(git config user.name || echo "Unknown")
EMAIL=$(git config user.email || echo "")
```


## ### Phase 1: Brainstorming & Planning

```

**Ask the user:**

1. **What should this skill do?** (Free-form description)
   - Example: "Help users debug Python code by analyzing stack traces"
   
2. **When should it trigger?** (Provide 3-5 trigger phrases)
   - Example: "debug Python error", "analyze stack trace", "fix Python exception"

3. **What type of skill is this?**
   - [ ] General purpose (default template)
   - [ ] Code generation/modification
   - [ ] Documentation creation/maintenance
   - [ ] Analysis/investigation

4. **Which platforms should support this skill?**
   - [ ] GitHub Copilot CLI
   - [ ] Claude Code
    - [ ] Codex
    - [ ] All three (recommended)

5. **Provide a one-sentence description** (will appear in metadata)
   - Example: "Analyzes Python stack traces and suggests fixes"

**Capture responses and prepare for next phase.**

### Phase 2: Prompt Enhancement (Optional)

**Progress:** Display before starting this phase:
```bash


```

**Ask the user:**
"Would you like to refine the skill description using the prompt-engineer skill?"
- [ ] Yes - Use prompt-engineer to enhance clarity and structure
- [ ] No - Proceed with current description

If **Yes**:
1. Check if prompt-engineer skill is available
2. Invoke with current description as input
3. Review enhanced output with user
4. Ask: "Accept enhanced version or keep original?"

If **No** or prompt-engineer unavailable:
- Proceed with original user input

### Phase 3: File Generation

**Progress:** Display before starting this phase:
```bash


## # Create directories

```

**Apply templates:**

1. **SKILL.md** - Use appropriate template:
   - `skill-template-copilot.md`, `skill-template-claude.md`, or `skill-template-codex.md`
   - Substitute placeholders:
     - `{{SKILL_NAME}}` → kebab-case name
     - `{{DESCRIPTION}}` → one-line description
     - `{{TRIGGERS}}` → comma-separated trigger phrases
     - `{{PURPOSE}}` → detailed purpose from brainstorming
     - `{{AUTHOR}}` → from git config
     - `{{DATE}}` → current date (YYYY-MM-DD)
     - `{{VERSION}}` → "1.0.0"

2. **README.md** - Use `readme-template.md`:
   - User-facing documentation (300-500 words)
   - Include installation instructions
   - Add usage examples

3. **References/** (optional but recommended):
   - Create `detailed-guide.md` for extended documentation (2k-5k words)
   - Move lengthy content here to keep SKILL.md under 2k words

**File creation commands:**

```bash


## ### Phase 5: Installation

```bash
# Detect which platforms to install for
INSTALL_TARGETS=()

if [[ "$COPILOT_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "copilot" ]]; then
    INSTALL_TARGETS+=("copilot")
fi

if [[ "$CLAUDE_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "claude" ]]; then
    INSTALL_TARGETS+=("claude")
fi

if [[ "$CODEX_INSTALLED" == "true" ]] && [[ "$PLATFORM" =~ "codex" ]]; then
    INSTALL_TARGETS+=("codex")
fi

# Ask user to confirm detected platforms
echo "Detected platforms: ${INSTALL_TARGETS[*]}"
echo "Install for these platforms? [Y/n]"
```


```bash
# GitHub Copilot CLI
if [[ " ${INSTALL_TARGETS[*]} " =~ " copilot " ]]; then
    ln -sf "$SKILLS_REPO/.github/skills/$SKILL_NAME" \
           "$HOME/.copilot/skills/$SKILL_NAME"
    echo "✅ Installed for GitHub Copilot CLI"
fi

# Claude Code
if [[ " ${INSTALL_TARGETS[*]} " =~ " claude " ]]; then
    ln -sf "$SKILLS_REPO/.claude/skills/$SKILL_NAME" \
           "$HOME/.claude/skills/$SKILL_NAME"
    echo "✅ Installed for Claude Code"
fi

# Codex
if [[ " ${INSTALL_TARGETS[*]} " =~ " codex " ]]; then
    ln -sf "$SKILLS_REPO/.codex/skills/$SKILL_NAME" \
           "$HOME/.codex/skills/$SKILL_NAME"
    echo "✅ Installed for Codex"
fi
```


## ### Phase 6: Completion

```
🎉 Skill created successfully!

📦 Skill Name: your-skill-name
📁 Location: .github/skills/your-skill-name/
🔗 Installed: Global (Copilot + Claude)

📋 Files Created:
   ✅ SKILL.md (1,847 words)
   ✅ README.md (423 words)
   ✅ references/ (empty, ready for extended docs)
   ✅ examples/ (empty, ready for code samples)
   ✅ scripts/ (empty, ready for utilities)

🚀 Next Steps:
   1. Test the skill: Try trigger phrases in CLI
   2. Add examples: Create working code samples in examples/
   3. Extend docs: Add detailed guides to references/
   4. Commit changes: git add .github/skills/your-skill-name && git commit
   5. Share: Push to repository for team use

💡 Pro Tips:
   - Keep SKILL.md under 2,000 words (currently: 1,847)
   - Move detailed content to references/ folder
   - Add executable scripts to scripts/ folder
   - Update README.md with real usage examples
   - Run validation before committing: scripts/validate-skill-yaml.sh
```


## ### Installation Conflicts

```

## Bundled Resources

This skill includes additional resources in subdirectories:

### references/

Detailed documentation loaded when needed:
- `anthropic-best-practices.md` - Official Anthropic skill development guidelines
- `writing-style-guide.md` - Writing standards and examples
- `progressive-disclosure.md` - Content organization patterns
- `validation-checklist.md` - Pre-commit quality checks

### examples/

Working examples demonstrating skill usage:
- `basic-skill-creation.md` - Simple skill creation walkthrough
- `advanced-skill-bundled-resources.md` - Complex skill with references/
- `global-installation.md` - Installing skills system-wide

### scripts/

Executable utilities for skill maintenance:
- `validate-all-skills.sh` - Batch validation of all skills in repository
- `update-skill-version.sh` - Bump version and update changelog
- `generate-skill-index.sh` - Auto-generate skills catalog

## Technical Implementation Notes

**Template Substitution:**
- Use `sed` for simple replacements
- Preserve YAML formatting exactly
- Handle multi-line descriptions with proper escaping

**Symlink Strategy:**
- Always use absolute paths: `ln -sf /full/path/to/source ~/.copilot/skills/name`
- Verify symlink before considering installation complete
- Benefits: Auto-updates when repository is pulled

**Validation Integration:**
- Run validation before installation
- Block installation if critical errors found
- Warnings are informational only

**Git Integration:**
- Extract author from `git config user.name`
- Use repository root detection: `git rev-parse --show-toplevel`
- Respect `.gitignore` patterns

## Quality Standards

**SKILL.md Requirements:**
- 1,500-2,000 words (ideal)
- Under 5,000 words (maximum)
- Third-person description format
- Imperative/infinitive writing style
- Progressive disclosure pattern

**README.md Requirements:**
- 300-500 words
- User-facing language
- Clear installation instructions
- Practical usage examples

**Validation Checks:**
- YAML frontmatter completeness
- Description format (third-person)
- Word count limits
- Writing style (no second-person)
- Required fields present

## References

- **Anthropic Official Skill Development Guide:** https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/skill-development/SKILL.md
- **Repository:** https://github.com/yourusername/cli-ai-skills
- **Writing Style Guide:** `resources/templates/writing-style-guide.md`
- **Progress Tracker Template:** `resources/templates/progress-tracker.md`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


