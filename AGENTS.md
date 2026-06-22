# ASE Agent Instructions

## Context
This project uses the Antigravity Skills Engine (ASE).
ASE MCP server: `node /home/thor/skiils/tools/server/ase-mcp-server.js`

## Workflow
1. Call `get_project_prompt` to load project conventions from `.ase-project.json`
2. Call `query_skills_ranked` with the task description to select top-3 relevant skills
3. Call `get_model_config` to get the correct temperature for the task type
4. Generate code using loaded skills and project conventions
5. Call `validate_output` to verify linting, types, and tests pass

## Rules
- Never load more than 3 skills per session
- Always run validate_output before presenting code
- Follow .ase-project.json never_do rules strictly

## Self-Improvement & Continuous Learning
- Actively analyze the user's input for any new technical advice, code preferences, corrections, or constraints.
- When detected, immediately call `update_project_rules` with the appropriate `rule_type` to persist the new convention to `.ase-project.json` before writing the code.
- Acknowledge to the user that the system has successfully "learned" this rule and upgraded itself.
