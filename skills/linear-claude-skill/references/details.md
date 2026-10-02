# Linear Claude Skill — Code Reference

## ### Complete Project Lifecycle Example

```bash
# 1. Create project linked to initiative
npx tsx scripts/linear-ops.ts create-project "Phase 11: New Feature" "Q1 Goals"

# 2. Set state to planned
npx tsx scripts/linear-ops.ts project-status "Phase 11" planned

# 3. Create issues in the project
npx tsx scripts/linear-ops.ts create-issue "Phase 11" "Parent task" "Description"
npx tsx scripts/linear-ops.ts create-sub-issue ENG-XXX "Sub-task 1" "Details"

# 4. Start work - update to in-progress
npx tsx scripts/linear-ops.ts project-status "Phase 11" in-progress

# 5. Mark issues done
npx tsx scripts/linear-ops.ts status Done ENG-XXX ENG-YYY

# 6. Complete project
npx tsx scripts/linear-ops.ts project-status "Phase 11" completed

# 7. (Optional) Link to additional initiative
npx tsx scripts/linear-ops.ts link-initiative "Phase 11" "Q2 Goals"
```


## ### Parallel Agent Execution

```

**When to use `Linear-specialist` (parallel):**
- Bulk status updates (3+ issues)
- Project status changes
- Creating multiple issues
- Sync operations after code changes

**When to use direct execution:**
- Single issue queries
- Viewing issue details
- Quick status checks
- Operations needing immediate results

See **sync.md** for parallel execution patterns.

## Critical Requirements

### Issues → Projects → Initiatives

**Every issue MUST be attached to a project. Every project MUST be linked to an initiative.**

| Entity | Must Link To | If Missing |
|--------|--------------|------------|
| Issue | Project | Not visible in project board |
| Project | Initiative | Not visible in roadmap |

See **projects.md** for complete project creation checklist.

---

## Conventions

### Issue Status

- **Assigned to me**: Set `state: "Todo"`
- **Unassigned**: Set `state: "Backlog"`

### Labels

Uses **domain-based label taxonomy**. See docs/labels.md.

**Key rules:**
- ONE Type label: `feature`, `bug`, `refactor`, `chore`, `spike`
- 1-2 Domain labels: `security`, `backend`, `frontend`, etc.
- Scope labels when applicable: `blocked`, `breaking-change`, `tech-debt`

```bash


## # Suggest labels for issue

```

## SDK Automation Scripts

**Use only when MCP tools are insufficient.** For complex operations involving loops, mapping, or bulk updates, write TypeScript scripts using `@linear/sdk`. See `sdk.md` for:

- Complete script patterns and templates
- Common automation examples (bulk updates, filtering, reporting)
- Tool selection criteria

Scripts provide full type hints and are easier to debug than raw GraphQL for multi-step operations.

## GraphQL API

**Fallback only.** Use when operations aren't supported by MCP or SDK.

See **api.md** for complete documentation including:
- Authentication and setup
- Example queries and mutations
- Timeout handling patterns
- MCP timeout workarounds
- Shell script compatibility

**Quick ad-hoc query:**

```bash


## # Link/unlink projects to initiatives

```

**Key topics in projects.md:**
- Project creation checklist (mandatory steps)
- Content vs Description fields
- Discovery before creation
- Codebase verification before work
- Sub-issue management
- Project status updates
- Project updates (status reports)

---

## Sync Patterns (Bulk Operations)

For bulk synchronization of code changes to Linear, see **sync.md**.

**Quick sync commands:**

```bash


## # Update project status

```

---

## Reference

| Document | Purpose |
|----------|---------|
| api.md | GraphQL API reference, timeout handling |
| sdk.md | SDK automation patterns |
| sync.md | Bulk sync patterns |
| projects.md | Project & initiative management |
| troubleshooting.md | Common issues, MCP debugging |
| docs/labels.md | Label taxonomy |

**External:** [Linear MCP Documentation](https://linear.app/docs/mcp.md)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


