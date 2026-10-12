# Antigravity Skills Engine (ASE) & Second Brain

An enterprise-grade Model Context Protocol (MCP) server, multi-agent orchestration runtime, and autonomous skills repository built for Google Antigravity and modern AI coding agents.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.29-green.svg)](https://modelcontextprotocol.io/)
[![Engine](https://img.shields.io/badge/Architecture-Loop%20Engineering%20%2B%20DSPy-purple.svg)](#autonomous-agent-subsystems)
[![License](https://img.shields.io/badge/License-ISC-gray.svg)](#license)

---

## Overview

The **Antigravity Skills Engine (ASE)** provides an autonomous intelligence layer for AI coding agents. It pairs a high-performance vector-indexed skills store with a structured execution engine featuring:

- **Strict Loop Engineering**: Autonomous *Doer + Independent Checker + Gate* verification cycles.
- **Stanford DSPy-Style Optimization**: Declarative prompt modules with automatic trajectory harvesting and AST-scored few-shot prompt compilation.
- **Persistent Episodic Memory**: Self-reinforcing Second Brain that records verified heuristics, debugging lessons, and project invariants.
- **AgentSkills.io Spec Compliance**: Native linter and tooling enforcing production-grade progressive disclosure (`scripts/`, `examples/`, `resources/`).
- **Resilient Multi-Transport Architecture**: Zero-overhead stdio transport, streaming transcript ingestion, and SQLite-first fallback degradation.

---

## Architecture & System Overview

```
                      ┌───────────────────────────────────────┐
                      │        Google Antigravity Agent       │
                      │       (IDE / Desktop / CLI agy)       │
                      └──────────────────┬────────────────────┘
                                         │ JSON-RPC / MCP
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ASE Model Context Protocol Server                     │
│                             (ase-mcp-server.ts)                             │
├────────────────────────────────┬───────────────────────────┬────────────────┤
│       Autonomous Runtime       │        Memory & RAG       │   Tool Engine  │
│  • Loop Engineering Engine     │  • HNSW Vector Search     │ • AST Evaluator│
│    (Doer + Checker + Gate)     │  • Episodic Knowledge DB  │ • DAG Runner   │
│  • DSPy Few-Shot Teleprompter  │  • Graph / Neo4j Linkage  │ • Skill Linter │
│  • Worktree Manager Sandbox    │  • Obsidian Vault Sync    │ • Output Check │
└────────────────────────────────┴───────────────────────────┴────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
        ┌───────────────────────┐                 ┌───────────────────────┐
        │   Skills Repository   │                 │   Persistent Storage  │
        │   (/skills, /tools)   │                 │ (SQLite / WAL / Redis)│
        └───────────────────────┘                 └───────────────────────┘
```

---

## Core Capabilities

### 1. Loop Engineering (`run_goal_loop`)
Implements an autonomous self-correcting development cycle:
1. **Doer**: Formulates and executes solutions based on project conventions and AST constraints.
2. **Independent Checker**: Evaluates artifacts against linting rules, syntax safety, and architectural boundaries.
3. **Deterministic Gate**: Rejects defective iterations and feeds diagnostics back into the next loop (hard ceiling of 8 iterations).

### 2. Autonomous Prompt Optimization & DSPy Runtime
Located in `src/core/dspy/` and `src/services/teleprompter.ts`:
- **Declarative Modules**: Standardized `Predict`, `ChainOfThought`, and `ReAct` primitives.
- **Trajectory Harvester**: Mines verified successful trajectories from execution ledgers.
- **Few-Shot Teleprompter**: Compiles optimized prompts using Cobb-Douglas token budgeting and automated AST scoring.

### 3. Episodic Learning & Second Brain
- **Knowledge Reinforcement**: Retains validated resolutions and heuristics using dynamic scoring:
  $$\text{Score} = 0.7 \times \text{Relevance} + 0.3 \times \text{Reinforcement}$$
- **Obsidian Vault Exporter**: Serializes episodic memory, skills, and project invariants into bidirectional `[[wiki-links]]` markdown vaults for graph exploration.

### 4. AgentSkills.io Specification & Tooling
- Includes `tools/bin/skill-lint` for full compliance auditing:
  - Validates progressive disclosure subdirectories (`scripts/`, `examples/`, `resources/`).
  - Enforces formulaic third-person capability descriptions ($\le 1024$ chars).
  - Measures library-level token budgets against discovery context ceilings.

---

## Tooling Reference

| Tool | Category | Description |
| :--- | :--- | :--- |
| `run_goal_loop` | Runtime | Executes autonomous Doer + Independent Checker + Gate loops |
| `execute_workflow_dag` | Orchestration | Executes resilient DAG tool workflows with variable interpolation |
| `record_learned_lesson` | Second Brain | Persists verified debugging solutions into episodic memory |
| `export_second_brain` | Second Brain | Exports skills and memory into an Obsidian-compatible graph vault |
| `compile_optimized_prompt` | Optimization | Compiles demonstration-backed prompts scored via AST metrics |
| `evaluate_prompt_metric` | Validation | Validates syntax, type safety, and `never_do` constraint adherence |
| `search_tools` / `invoke_tool` | MCP Engine | Discovery and dynamic execution layer for internal capabilities |

---

## Getting Started

### Prerequisites

- **Node.js**: `>= 20.0.0`
- **pnpm** or **npm**
- **tsx** (for direct TypeScript runtime execution)

### Installation

```bash
git clone git@github.com:parth2024-tech/MCP.git
cd MCP
npm install
```

### Running the MCP Server

```bash
# Development mode with live reload
npm run dev

# Production start
npm start
```

### Testing & Verification

```bash
# Run unit and integration tests
npm test

# Run validation test suites
npm run verify
```

---

## Antigravity MCP Configuration

Register the ASE server in your Antigravity MCP configuration (`~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "ase": {
      "command": "node",
      "args": ["/absolute/path/to/MCP/dist/ase-mcp-server.js"],
      "env": {
        "NODE_ENV": "development",
        "ASE_ALLOWED_DIRS": "/home/thor",
        "ASE_AUTH_REQUIRED": "false"
      }
    }
  }
}
```

---

## Skill Authoring Standard

All skills in this repository strictly adhere to the **AgentSkills.io** standard:

```text
skills/<skill-name>/
├── SKILL.md           # Routing frontmatter + 9-stage procedure with gates
├── scripts/           # Deterministic, non-interactive helper executables
├── examples/          # Golden input/output reference cases
└── resources/         # Schemas, templates, and conditional deep references
```

### Validating Skills

Use the built-in CLI utility to lint skills and audit discovery token budgets:

```bash
# Lint an individual skill
./tools/bin/skill-lint skills/<skill-name>

# Measure context budget across a skill library
./tools/bin/skill-lint --budget skills/

# Scaffold a new spec-compliant skill
./tools/bin/skill-lint --scaffold my-new-skill skills/
```

---

## License

This project is licensed under the [ISC License](LICENSE).
