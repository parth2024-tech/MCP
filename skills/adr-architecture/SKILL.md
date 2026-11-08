---
name: adr-architecture
description: "Author, number, supersede, and document Architectural Decision Records (ADRs) and C4 software architecture diagrams using adr-tools and D2. Use whenever making architectural changes, choosing frameworks/databases, or generating system architecture diagrams."
category: architecture
risk: safe
date_added: "2026-11-09"
tags: [architecture, adr, c4-model, d2, system-design]
---

# Architectural Decision Records (ADR) & D2 Diagramming

## Core Directives
1. **Immutable Decision Trail:** Every major architectural decision (database choice, authentication protocol, caching layer, framework migration) MUST be recorded in `docs/adr/NNNN-*.md` using `adr-tools`.
2. **Zero-Chartjunk C4 Architecture:** When illustrating system components, use **D2** (`.d2` $\rightarrow$ `.svg`) rather than manual ASCII art or fragile raster screenshots.

## Commands & Workflows

### 1. Initialize ADR Repository
Run once per project root:
```bash
adr init docs/adr
```
This generates `docs/adr/0001-record-architecture-decisions.md`.

### 2. Create a New ADR
```bash
adr new "Use Redis for Lock TTL Heartbeat"
```
Generates the next sequential decision file (e.g. `docs/adr/0002-use-redis-for-lock-ttl-heartbeat.md`) with standard MADR sections:
- **Status:** Proposed / Accepted / Rejected
- **Context:** Why this choice is being evaluated
- **Decision:** What is chosen and why
- **Consequences:** Positive, negative, and trade-offs

### 3. Supersede an Old Decision
When a previous architecture is replaced:
```bash
adr new -s 2 "Migrate Lock Storage to SQLite Memory Due to Arch On-Demand Law"
```
Automatically marks ADR 0002 as superseded by the new record.

### 4. Compiling C4 Architecture with D2
Create declarative architecture in `docs/architecture.d2`:
```d2
direction: right

client: Web Client {
  shape: person
}

gateway: API Gateway {
  shape: hexagon
}

db: PostgreSQL 16 {
  shape: cylinder
}

client -> gateway: HTTPS / JSON-RPC
gateway -> db: Drizzle ORM
```

Compile cleanly to crisp vector SVG:
```bash
d2 --theme 200 docs/architecture.d2 docs/architecture.svg
```
Embed the resulting `architecture.svg` into project documentation.
