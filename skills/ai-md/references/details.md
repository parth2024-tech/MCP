# Ai Md — Code Reference

## # ANCHORED: label "new-api:" directly matches user saying "加個 API"

```

**Real proof:** This specific technique fixed a test case that failed 5 consecutive times
across all models. The label `new-api:` raised Codex T5 from ❌→✅ on first try.

---

## The Conversion Process: What Happens When You Give Me a CLAUDE.md

Here's the exact mental model I use when converting natural language instructions to AI.MD format.

### Phase 1: UNDERSTAND — Read Like a Compiler, Not a Human

I read the CLAUDE.md **as if I'm building a state machine**, not reading a document.

For each sentence, I ask:
1. **Is this a TRIGGER?** (What input activates this behavior?)
2. **Is this an ACTION?** (What should the AI do?)
3. **Is this a CONSTRAINT?** (What should the AI NOT do?)
4. **Is this METADATA?** (Priority, timing, persistence, exceptions?)
5. **Is this a HUMAN EXPLANATION?** (Why the rule exists — delete this)

Example analysis:

```


## # Output: 4 atomic rules

```

### Phase 3: LABEL — Assign Function Labels

Every atomic rule gets a label that declares its function.
I use a standard vocabulary of ~12 label types:

| Label | What It Declares | When to Use |
|-------|-----------------|-------------|
| `trigger:` | What input activates this | Every gate/rule needs one |
| `action:` | What the AI must do | The core behavior |
| `exception:` | When NOT to do it | Override cases |
| `not-triggered:` | Explicit negative examples | Prevent over-triggering |
| `format:` | Output format constraint | Position, structure requirements |
| `priority:` | Override relationship | When rules conflict |
| `yields-to:` | Which gate takes precedence | Inter-gate priority |
| `persist:` | Durability across turns | Rules that survive conversation flow |
| `timing:` | When in the workflow | Before/after/during constraints |
| `violation:` | Consequence of breaking | Accountability mechanism |
| `banned:` | Forbidden words/actions | Hard no-go list |
| `policy:` | Decision heuristic | When judgment is needed |

**The label selection technique:** I pick the label that would help a DIFFERENT AI model
(not the one being instructed) understand this rule's function if it saw ONLY the label.
If `trigger:` clearly tells you "this is what activates the rule" without reading anything else,
it's the right label.

### Phase 4: STRUCTURE — Build the Architecture

I organize rules into a hierarchy:

```


```
# FLAT (bad): 7 unrelated rules, model treats equally
1. no guessing
2. backup before editing
3. use tables for output
4. check health after deploy
5. don't say "應該是"
6. test before reporting
7. all claims need proof

# GROUPED (good): 3 domains, model understands hierarchy
EVIDENCE:               ← domain: truthfulness
  core: no-guess
  banned: 應該是
  proof: all-claims-need-data

SCOPE:                  ← domain: safety
  pre-change: backup
  pre-run: check-health

OUTPUT:                 ← domain: format
  format: tables+numbers
```


## ### Phase 5: RESOLVE — Handle Conflicts and Edge Cases

```

This was discovered because Gemini 2.5 Pro kept triggering GATE-4 on simple number queries
like "成功率怎麼樣?". Adding `not-triggered: 純指標查詢` fixed it immediately.

### Phase 6: TEST — Multi-Model Validation (Non-Negotiable)

**This is not optional.** Every conversion MUST be validated by 2+ different LLM models.

Why? Because a format that works perfectly for Claude might confuse GPT, and vice versa.
The whole point of AI.MD is that it works ACROSS models.

**The exam protocol we developed:**

1. Write 8 test inputs that simulate REAL user behavior (not textbook examples)
2. Include "trap" questions where two rules conflict
3. Include "negative" tests where a rule should NOT trigger
4. DO NOT hint which rules are being tested (the AI shouldn't know)
5. Run each model independently
6. Score each answer: ✅ full compliance, ⚠️ partial, ❌ miss
7. If ANY model's score drops after conversion → revert that specific change

**The 8-question template we used:**

```


## ## AI-Native Template

```xml
# PROJECT-NAME | lang:xx | for-AI-parsing | optimize=results-over-format

<user>
identity, tone, signals, decision-style (key: value pairs)
</user>

<gates label="硬性閘門 | 優先序: gates>rules>rhythm | 缺一項=STOP">

GATE-1 name:
  trigger: ...
  action: ...
  exception: ...
  yields-to: ...

GATE-2 name:
  trigger: ...
  action: ...
  policy: ...

</gates>

<rules>

RULE-NAME:
  core: ...
  banned: ...
  hear-X: ... → action
  violation: ...

</rules>

<rhythm>
workflow patterns as key: value pairs
</rhythm>

<conn>
connection strings (keep exact — NEVER compress facts/credentials/URLs)
</conn>

<ref label="on-demand Read only">
file-path → purpose
</ref>

<learn>
how system evolves over time
</learn>
```


## ## Anti-Patterns

| Don't | Do Instead | Why |
|-------|------------|-----|
| Human prose in CLAUDE.md | Structured labels | Prose requires inference; labels are direct |
| Multiple rules on one line | One concept per line | Attention splits across dense lines |
| Parenthetical explanations | Remove them | AI needs "what" not "why" |
| Same rule in 3 places | Single source + cross-ref | Duplicates can diverge and confuse |
| 20+ flat rules | 5-7 domains with sub-items | Hierarchy helps model organize behavior |
| Compress without testing | Validate with 2+ models | What works for Claude might fail for GPT |
| Assume format doesn't matter | Test it — it does | Same content, different format = different compliance |
| Chinese-only labels | English labels + native output | English labels are more universal across models |
| Flat rule list | State machine with priorities | Clear execution order prevents missed rules |


