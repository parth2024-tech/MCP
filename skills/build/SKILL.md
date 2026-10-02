---
name: build
description: build. Use when the task involves build.
risk: unknown
source: community
---

---
name: build
description: Feature development pipeline - research, plan, track, and implement major features.
argument-hint: [subcommand] [name]
metadata:
  author: Shpigford
  version: "1.0"
---

Feature development pipeline - research, plan, track, and implement major features.

## When to Use
- You need a structured workflow for building a major feature across research, planning, implementation, and tracking.
- The task involves moving a feature through named phases such as `research`, `implementation`, `progress`, or `phase`.
- You want one command to coordinate status, next steps, and phased delivery for a feature effort.

## Instructions

This command manages a 4-phase feature development workflow for building major features. Parse `$ARGUMENTS` to determine which subcommand to run.

**Arguments provided:** $ARGUMENTS

### Argument Parsing

Parse the first word of $ARGUMENTS to determine the subcommand:

- `research [name]` → Run the Research phase
- `implementation [name]` → Run the Implementation phase
- `progress [name]` → Run the Progress phase
- `phase [n] [name]` → Run Phase n of the implementation
- `status [name]` → Show current status and suggest next step
- (empty or unrecognized) → Show usage help

If the feature name is not provided in arguments, you MUST use AskUserQuestion to prompt for it.

---

## Subcommand: Help (empty args)

If no arguments provided, display this help:

```
/build - Feature Development Pipeline

Subcommands:
  /build research [name]        Deep research on a feature idea
  /build implementation [name]  Create phased implementation plan
  /build progress [name]        Set up progress tracking
  /build phase [n] [name]       Execute implementation phase n
  /build status [name]          Show status and next steps

Example workflow:
  /build research chat-interface
  /build implementation chat-interface
  /build progress chat-interface
  /build phase 1 chat-interface
> See [references/details.md](references/details.md) for full code examples.
# {Feature Name} Research

## Overview
[Brief description of the feature and its purpose]

## Problem Statement
[What problem this solves, why it matters]

## User Stories / Use Cases
[Concrete examples of how users will use this]

## Technical Research

### Approach Options
[Different ways to implement this, with pros/cons]

### Recommended Approach
[The approach you recommend and why]

### Required Technologies
[APIs, libraries, frameworks needed]

### Data Requirements
[What data needs to be stored/tracked]

## UI/UX Considerations
[Interface design thoughts, user flows]

## Integration Points
[How this connects to existing code/features]

## Risks and Challenges
[Potential issues and mitigation strategies]

## Open Questions
[Things that still need to be decided]

## References
[Links to relevant documentation, examples, articles]
> See [references/details.md](references/details.md) for full code examples.
# {Feature Name} Implementation Plan

## Overview
[Brief recap of what we're building and the approach from research]

## Prerequisites
[What needs to be in place before starting]

## Phase Summary
[Quick overview of all phases]

---

## Phase 1: [Phase Title]

### Objective
[What this phase accomplishes]

### Rationale
[Why this phase comes first, what it enables]

### Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

### Success Criteria
[How to verify this phase is complete]

### Files Likely Affected
[List of files that will probably need changes]

---

## Phase 2: [Phase Title]

[Same structure as Phase 1]

---

[Continue for all phases]

---

## Post-Implementation
- [ ] Documentation updates
- [ ] Testing strategy
- [ ] Performance validation

## Notes
[Any additional context or decisions made during planning]
> See [references/details.md](references/details.md) for full code examples.
# {Feature Name} Progress

## Status: Phase 1 - Not Started

## Quick Reference
- Research: `docs/{name}/RESEARCH.md`
- Implementation: `docs/{name}/IMPLEMENTATION.md`

---

## Phase Progress

### Phase 1: [Title from Implementation]
**Status:** Not Started

#### Tasks Completed
- (none yet)

#### Decisions Made
- (none yet)

#### Blockers
- (none)

---

### Phase 2: [Title]
**Status:** Not Started

[Same structure]

---

[Continue for all phases]

---

## Session Log

### [Date will be added as work happens]
- Work completed
- Decisions made
- Notes for next session

---

## Files Changed
(Will be updated as implementation progresses)

## Architectural Decisions
(Major technical decisions and rationale)

## Lessons Learned
(What worked, what didn't, what to do differently)
> See [references/details.md](references/details.md) for full code examples.
