# ASE Agent Instructions

## Context
This project uses the Antigravity Skills Engine (ASE) Second Brain.
ASE MCP server: `node /home/thor/skiils/tools/server/ase-mcp-server.js`

## The 6-Step Second Brain Workflow
1. **Conventions & Memory Recall**: Call `get_project_prompt` to load project conventions from `.ase-project.json`. Recall prior learned lessons to prevent repeating past bugs.
2. **Context Budgeting**: Call `query_skills_ranked` with the task description to select top-3 relevant skills.
3. **Loop Engineering**: For code changes, run with the Doer + Independent Checker + Gate architecture (`run_goal_loop`).
4. **Output Validation**: Call `validate_output` to verify linting, types, and tests pass with zero errors.
5. **Continuous Learning & Auto-Write-Back**: Call `record_learned_lesson` and `update_project_rules` to persist verified fixes and heuristics into the Second Brain.
6. **Automated Git Push to GitHub (Mandatory)**: Always stage all changes, create a descriptive conventional commit (`feat(...)`, `fix(...)`, `docs(...)`), and push to GitHub (`git push origin <branch>`).

## Strict Rules
- Never load more than 3 skills per session.
- Always run validate_output before presenting code.
- Follow .ase-project.json never_do rules strictly.
- Never let an AI grade its own work without independent gate checks.
- Your Second Brain MUST get sharper after every session.
- ALWAYS push all changes to GitHub before concluding any turn or session.

## Self-Improvement & Continuous Learning
- Actively analyze the user's input and execution traces for new technical advice, code preferences, corrections, or constraints.
- When detected, immediately call `record_learned_lesson` and `update_project_rules` with the appropriate `rule_type` to persist the new convention to `.ase-project.json` and episodic memory before completing.
- Acknowledge to the user that the system has successfully "learned" this rule and upgraded itself.
