---
name: autonomous-agent-patterns
description: "Design patterns for building autonomous coding agents, inspired by [Cline](https://github.com/cline/cline) and [OpenAI Codex](https://github.com/openai/codex). Use when the task involves autonomous agent patterns."
risk: critical
source: community
date_added: "2026-02-27"
---

# 🕹️ Autonomous Agent Patterns

> Design patterns for building autonomous coding agents, inspired by [Cline](https://github.com/cline/cline) and [OpenAI Codex](https://github.com/openai/codex).

## When to Use This Skill

Use this skill when:

- Building autonomous AI agents
- Designing tool/function calling APIs
- Implementing permission and approval systems
- Creating browser automation for agents
- Designing human-in-the-loop workflows

---

## 1. Core Agent Architecture

### 1.1 Agent Loop

```
┌─────────────────────────────────────────────────────────────┐
│                     AGENT LOOP                               │
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  Think   │───▶│  Decide  │───▶│   Act    │              │
│  │ (Reason) │    │ (Plan)   │    │ (Execute)│              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       ▲                               │                     │
│       │         ┌──────────┐          │                     │
│       └─────────│ Observe  │◀─────────┘                     │
│                 │ (Result) │                                │
│                 └──────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

> See [references/details.md](references/details.md) for full code examples.

### 1.2 Multi-Model Architecture

> See [references/details.md](references/details.md) for full code examples.

---

## 2. Tool Design Patterns

### 2.1 Tool Schema

> See [references/details.md](references/details.md) for full code examples.

### 2.2 Essential Agent Tools

> See [references/details.md](references/details.md) for full code examples.

### 2.3 Edit Tool Design

> See [references/details.md](references/details.md) for full code examples.

---

## 3. Permission & Safety Patterns

### 3.1 Permission Levels

> See [references/details.md](references/details.md) for full code examples.

### 3.2 Approval UI Pattern

> See [references/details.md](references/details.md) for full code examples.

### 3.3 Sandboxing

> See [references/details.md](references/details.md) for full code examples.

---

## 4. Browser Automation

### 4.1 Browser Tool Pattern

> See [references/details.md](references/details.md) for full code examples.

### 4.2 Visual Agent Pattern

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Context Management

### 5.1 Context Injection Patterns

> See [references/details.md](references/details.md) for full code examples.

### 5.2 Checkpoint/Resume

> See [references/details.md](references/details.md) for full code examples.

---

## 6. MCP (Model Context Protocol) Integration

### 6.1 MCP Server Pattern

> See [references/details.md](references/details.md) for full code examples.

---

## Best Practices Checklist

### Agent Design

- [ ] Clear task decomposition
- [ ] Appropriate tool granularity
- [ ] Error handling at each step
- [ ] Progress visibility to user

### Safety

- [ ] Permission system implemented
- [ ] Dangerous operations blocked
- [ ] Sandbox for untrusted code
- [ ] Audit logging enabled

### UX

- [ ] Approval UI is clear
- [ ] Progress updates provided
- [ ] Undo/rollback available
- [ ] Explanation of actions

---

## Resources

- [Cline](https://github.com/cline/cline)
- [OpenAI Codex](https://github.com/openai/codex)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Anthropic Tool Use](https://docs.anthropic.com/claude/docs/tool-use)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
