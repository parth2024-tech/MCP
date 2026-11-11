---
name: gpt-researcher
description: "Autonomous deep web research, multi-query aggregation, and publication-grade research report generation using GPT Researcher."
category: research
risk: safe
date_added: "2026-11-11"
tags: [research, gpt-researcher, reports, web-search, citations, synthesis]
---

# GPT Researcher — Autonomous Deep Research & Report Generation

## 1. Scope & Purpose
This skill governs all technical research, market analysis, competitive intelligence, and comprehensive investigative reporting across the system. Whenever asked to research a topic, evaluate technologies, or create a comprehensive research report, agents MUST exclusively execute the GPT Researcher methodology.

## 2. Preflight
- **CLI Availability**: Verify `gpt-researcher --help` executes cleanly from `$PATH`.
- **Query Precision**: Formulate a clear, scoped research hypothesis or objective.
- **Report Archetype**: Select the target archetype (`research_report`, `detailed_report`, `resource_report`, or `outline_report`).

## 3. Procedure & Execution Gates

### Step 1: Query Decomposition & Sub-Topic Planning
- Decompose the core research prompt into 3–5 targeted sub-queries.
- Cover historical context, state-of-the-art benchmarks, tradeoffs, and future outlook.

### Step 2: Multi-Source Evidence Gathering
- Run multi-source retrieval across primary web sources, official documentation, GitHub repositories, and preprints.
- Scrape and aggregate source text rather than relying on shallow single-page snippets.

### Step 3: Synthesis & Citation Mapping
- Group findings by thematic insight.
- Map every factual claim, metric, and benchmark to a verifiable URL citation.
- Filter out biased marketing hype and unverified claims.

### Step 4: Report Generation (Contract Gate)
- Generate a comprehensive structured markdown report containing:
  1. Executive Summary & Core Verdict
  2. Background & Problem Space
  3. Technical / Comparative Analysis (with tables)
  4. Architectural Implications & Tradeoffs
  5. Verified Citations & Source Index

> [!IMPORTANT]
> **Quality Gate**: A report is rejected if it contains fabricated metrics, vague generalizations, fewer than 5 distinct cited sources, or lacks comparative tables.

## 4. Decisions Matrix

| Task Goal | Report Type | Flag | Typical Output Size |
| :--- | :--- | :--- | :--- |
| **Comprehensive Technical Deep-Dive** | `detailed_report` | `-t detailed_report` | 2,500–5,000 words |
| **Standard Executive Research** | `research_report` | `-t research_report` | 1,000–2,500 words |
| **Tool / Library Evaluation** | `resource_report` | `-t resource_report` | Curated links + tables |
| **Project / Strategy Roadmap** | `outline_report` | `-t outline_report` | Bulleted architecture |

## 5. Output Contract
- Standard location: `docs/research/<topic-kebab-case>.md`
- Required sections:
  ```markdown
  # <Title>: Comprehensive Research Report
  **Date**: YYYY-MM-DD | **Methodology**: GPT Researcher Multi-Source Aggregation
  ## Executive Summary
  ## Key Findings & Comparative Analysis
  ## Architectural Tradeoffs
  ## References & Verified Sources
  ```

## 6. Verification
Run validation on the generated report:
```bash
test -s docs/research/<topic>.md && echo "Report generated successfully"
```

## 7. Stop & Escalate
- Halt and prompt the user if conflicting evidence exists across top sources without a scientific consensus.
- Halt if primary sources are locked behind enterprise authentication or paid paywalls.

## 8. Anti-Patterns to NEVER Use
- ❌ No single-query shallow summaries (e.g., reading just the first Google search result).
- ❌ No unreferenced statistics or fabricated customer/performance numbers.
- ❌ No vague prose ("revolutionary synergy") — write direct, technical analysis with code examples and benchmark data.

## 9. Usage Examples

### CLI Command
```bash
gpt-researcher "State-of-the-art vector embedding models for local edge inference" -t research_report -o docs/research/vector-embeddings.md
```

### Python API
```python
import asyncio
from gpt_researcher import GPTResearcher

async def generate():
    researcher = GPTResearcher("PostgreSQL vs SQLite for multi-tenant agent systems", "research_report")
    await researcher.conduct_research()
    report = await researcher.write_report()
    return report

asyncio.run(generate())
```
