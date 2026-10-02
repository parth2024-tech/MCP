---
name: llm-app-patterns
description: "Production-ready patterns for building LLM applications, inspired by [Dify](https://github.com/langgenius/dify) and industry best practices. Use when the task involves llm app patterns."
risk: unknown
source: community
date_added: "2026-02-27"
---

# 🤖 LLM Application Patterns

> Production-ready patterns for building LLM applications, inspired by [Dify](https://github.com/langgenius/dify) and industry best practices.

## When to Use This Skill

Use this skill when:

- Designing LLM-powered applications
- Implementing RAG (Retrieval-Augmented Generation)
- Building AI agents with tools
- Setting up LLMOps monitoring
- Choosing between agent architectures

---

## 1. RAG Pipeline Architecture

### Overview

RAG (Retrieval-Augmented Generation) grounds LLM responses in your data.

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Ingest    │────▶│   Retrieve  │────▶│   Generate  │
│  Documents  │     │   Context   │     │   Response  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
 ┌─────────┐       ┌───────────┐       ┌───────────┐
 │ Chunking│       │  Vector   │       │    LLM    │
 │Embedding│       │  Search   │       │  + Context│
 └─────────┘       └───────────┘       └───────────┘
```

### 1.1 Document Ingestion

> See [references/details.md](references/details.md) for full code examples.

### 1.2 Embedding & Storage

> See [references/details.md](references/details.md) for full code examples.

### 1.3 Retrieval Strategies

> See [references/details.md](references/details.md) for full code examples.

### 1.4 Generation with Context

> See [references/details.md](references/details.md) for full code examples.

---

## 2. Agent Architectures

### 2.1 ReAct Pattern (Reasoning + Acting)

```
Thought: I need to search for information about X
Action: search("X")
Observation: [search results]
Thought: Based on the results, I should...
Action: calculate(...)
Observation: [calculation result]
Thought: I now have enough information
Action: final_answer("The answer is...")
```

> See [references/details.md](references/details.md) for full code examples.

### 2.2 Function Calling Pattern

> See [references/details.md](references/details.md) for full code examples.

### 2.3 Plan-and-Execute Pattern

> See [references/details.md](references/details.md) for full code examples.

### 2.4 Multi-Agent Collaboration

> See [references/details.md](references/details.md) for full code examples.

---

## 3. Prompt IDE Patterns

### 3.1 Prompt Templates with Variables

> See [references/details.md](references/details.md) for full code examples.

### 3.2 Prompt Versioning & A/B Testing

> See [references/details.md](references/details.md) for full code examples.

### 3.3 Prompt Chaining

> See [references/details.md](references/details.md) for full code examples.

---

## 4. LLMOps & Observability

### 4.1 Metrics to Track

> See [references/details.md](references/details.md) for full code examples.

### 4.2 Logging & Tracing

> See [references/details.md](references/details.md) for full code examples.

### 4.3 Evaluation Framework

> See [references/details.md](references/details.md) for full code examples.

---

## 5. Production Patterns

### 5.1 Caching Strategy

> See [references/details.md](references/details.md) for full code examples.

### 5.2 Rate Limiting & Retry

> See [references/details.md](references/details.md) for full code examples.

### 5.3 Fallback Strategy

> See [references/details.md](references/details.md) for full code examples.

---

## Architecture Decision Matrix

| Pattern              | Use When         | Complexity | Cost      |
| :------------------- | :--------------- | :--------- | :-------- |
| **Simple RAG**       | FAQ, docs search | Low        | Low       |
| **Hybrid RAG**       | Mixed queries    | Medium     | Medium    |
| **ReAct Agent**      | Multi-step tasks | Medium     | Medium    |
| **Function Calling** | Structured tools | Low        | Low       |
| **Plan-Execute**     | Complex tasks    | High       | High      |
| **Multi-Agent**      | Research tasks   | Very High  | Very High |

---

## Resources

- [Dify Platform](https://github.com/langgenius/dify)
- [LangChain Docs](https://python.langchain.com/)
- [LlamaIndex](https://www.llamaindex.ai/)
- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
