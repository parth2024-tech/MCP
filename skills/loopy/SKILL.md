---
name: loopy
description: Executes autonomous iterative goal loops with Doer, Independent Checker, and Gate validation. Use when solving complex tasks, multi-iteration bug fixes, refactoring code, or enforcing quality gates without manual intervention.
risk: safe
category: automation
---

# Loop Engineering: The Autonomous Goal Execution Framework

> *"A prompt is one question, one answer. A loop is one goal the AI keeps working toward on its own: try, check, fix, try again. It runs until the work actually passes your check. You stop prompting all day. You set the goal once."*

---

## 01. The 4 Design Checks
Build a loop only when all four are true:
1. **It repeats**: The job is a recurring pattern or multi-step workflow.
2. **It can fail**: Something checks the work automatically (a test, AST validator, type check, or scoring metric).
3. **It finishes alone**: The AI completes the cycle without handing work back halfway through.
4. **Done is a fact**: You can point at the finished result (e.g. "zero errors", "all tests pass"), not argue about subjective taste.

---

## 02. The 5 Core Parts of Every Loop

```
1. Trigger ────────► 2. Saved Instructions ────────► 3. Doer + Checker ────────► 4. Tool Access ────────► 5. The Gate
(goal, cron, timer)   (SKILL.md / project rules)     (One writes, one grades)    (acts in MCP tools)      (accepts or rejects)
```

1. **A Trigger**: What starts the loop without you (`/goal until done`, timer, or event).
2. **Saved Instructions**: Write them once in `SKILL.md` or `.ase-project.json`. The loop reads them on every run.
3. **A Doer + A Checker**: **One AI does the work, a second checks it. Never let an AI grade its own work.**
4. **Tool Access**: It acts in real tools (file editing, compiling, testing), not just conversational suggestions.
5. **The Gate**: The check that rejects bad work automatically. The heart of the loop.

---

## 03. Running in `/goal` Mode

To run a task as an autonomous goal loop:
- **Be Specific**: Clearly articulate what "done" strictly looks like (e.g. `Every test passes, 0 linter warnings, zero never_do violations`).
- **Cap It**: Always set a hard ceiling (`Stop after 8 tries`) so it cannot cycle forever.

### Example:
```
/goal Fix the authentication token refresh bug. Every test in tests/auth.test.ts passes with zero TypeScript errors. Stop after 8 tries.
```

---

## 04. Universal Loop Prompt Formula

```markdown
Work in a loop until this meets the bar.
TASK: [what you want]
CRITERIA: [what "good" looks like, strictly]
EVERY TURN:
  1) Say the next step.
  2) Do it using available tools.
  3) Score the output honestly from 1 to 10 against the criteria.
  4) If all scores >= 8.0/10 and hard checks pass: print FINAL and stop.
  5) Else: identify the weakest part, fix it, and repeat.
RULES: Never stop early. Don't ask questions. Assume and keep going until criteria are satisfied or max iterations reached.
```

---

## 05. Available MCP Tool

In this workspace, you can execute autonomous loops programmatically via the `run_goal_loop` MCP tool:
```json
{
  "goal": "Refactor UserService to use Drizzle ORM. All TypeScript types must compile cleanly.",
  "action_type": "refactor",
  "input_content": "...code...",
  "max_tries": 8,
  "target_score": 8.5
}
```
