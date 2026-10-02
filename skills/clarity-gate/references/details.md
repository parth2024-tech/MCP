# Clarity Gate — Code Reference

## # Run normalization tests

```

**Algorithm (per §2.2-2.4):**
1. Extract content between opening `---/n` and `<!-- CLARITY_GATE_END -->`
2. Remove `document-sha256` line from YAML frontmatter ONLY (with multiline continuation support)
3. Canonicalize:
   - Strip trailing whitespace per line
   - Collapse 3+ consecutive newlines to 2
   - Normalize final newline (exactly 1 LF)
   - UTF-8 NFC normalization
4. Compute SHA-256

**Cross-platform normalization:**
- BOM removed if present
- CRLF to LF (Windows)
- CR to LF (old Mac)
- Boundary detection (prevents hash computation on content outside CGD structure)
- Whitespace variations produce identical hashes (deterministic across platforms)

---

## The Key Distinction

Existing tools like UnScientify and HedgeHunter (CoNLL-2010) **detect** uncertainty markers already present in text ("Is uncertainty expressed?").

Clarity Gate **enforces** their presence where epistemically required ("Should uncertainty be expressed but isn't?").

| Tool Type | Question | Example |
|-----------|----------|---------|
| **Detection** | "Does this text contain hedges?" | UnScientify/HedgeHunter find "may", "possibly" |
| **Enforcement** | "Should this claim be hedged but isn't?" | Clarity Gate flags "Revenue will be $50M" |

---

## Critical Limitation

> **Clarity Gate verifies FORM, not TRUTH.**
>
> This skill checks whether claims are properly marked as uncertain—it cannot verify if claims are actually true. 
>
> **Risk:** An LLM can hallucinate facts INTO a document, then "pass" Clarity Gate by adding source markers to false claims.
>
> **Solution:** HITL (Human-In-The-Loop) verification is **MANDATORY** before declaring PASS.

---

## When to Use
- Before ingesting documents into RAG systems
- Before sharing documents with other AI systems
- After writing specifications, state docs, or methodology descriptions
- When a document contains projections, estimates, or hypotheses
- Before publishing claims that haven't been validated
- When handing off documentation between LLM sessions

---

## The 9 Verification Points

### Relationship to Spec Suite

The 9 Verification Points guide **semantic review** — content quality checks that require judgment (human or AI). They answer questions like "Should this claim be hedged?" and "Are these numbers consistent?"

When review completes, output a CGD file conforming to CLARITY_GATE_FORMAT_SPEC.md. The C/S rules in CLARITY_GATE_FORMAT_SPEC.md validate **file structure**, not semantic content.

**The connection:**
1. Semantic findings (9 points) determine what issues exist
2. Issues are recorded in CGD state fields (`clarity-status`, `hitl-status`, `hitl-pending-count`)
3. State consistency is enforced by structural rules (C7-C10)

*Example: If Point 5 (Data Consistency) finds conflicting numbers, you'd mark `clarity-status: UNCLEAR` until resolved. Rule C7 then ensures you can't claim `REVIEWED` while still `UNCLEAR`.*

---

### Epistemic Checks (Core Focus: Points 1-4)

**1. HYPOTHESIS vs FACT LABELING**
Every claim must be clearly marked as validated or hypothetical.

| Fails | Passes |
|-------|--------|
| "Our architecture outperforms competitors" | "Our architecture outperforms competitors [benchmark data in Table 3]" |
| "The model achieves 40% improvement" | "The model achieves 40% improvement [measured on dataset X]" |

**Fix:** Add markers: "PROJECTED:", "HYPOTHESIS:", "UNTESTED:", "(estimated)", "~", "?"

---

**2. UNCERTAINTY MARKER ENFORCEMENT**
Forward-looking statements require qualifiers.

| Fails | Passes |
|-------|--------|
| "Revenue will be $50M by Q4" | "Revenue is **projected** to be $50M by Q4" |
| "The feature will reduce churn" | "The feature is **expected** to reduce churn" |

**Fix:** Add "projected", "estimated", "expected", "designed to", "intended to"

---

**3. ASSUMPTION VISIBILITY**
Implicit assumptions that affect interpretation must be explicit.

| Fails | Passes |
|-------|--------|
| "The system scales linearly" | "The system scales linearly [assuming <1000 concurrent users]" |
| "Response time is 50ms" | "Response time is 50ms [under standard load conditions]" |

**Fix:** Add bracketed conditions: "[assuming X]", "[under conditions Y]", "[when Z]"

---

**4. AUTHORITATIVE-LOOKING UNVALIDATED DATA**
Tables with specific percentages and checkmarks look like measured data.

**Red flag:** Tables with specific numbers (89%, 95%, 100%) without sources

**Fix:** Add "(guess)", "(est.)", "?" to numbers. Add explicit warning: "PROJECTED VALUES - NOT MEASURED"

---

### Data Quality Checks (Complementary: Points 5-7)

**5. DATA CONSISTENCY**
Scan for conflicting numbers, dates, or facts within the document.

**Red flag:** "500 users" in one section, "750 users" in another

**Fix:** Reconcile conflicts or explicitly note the discrepancy with explanation.

---

**6. IMPLICIT CAUSATION**
Claims that imply causation without evidence.

**Red flag:** "Shorter prompts improve response quality" (plausible but unproven)

**Fix:** Reframe as hypothesis: "Shorter prompts MAY improve response quality (hypothesis, not validated)"

---

**7. FUTURE STATE AS PRESENT**
Describing planned/hoped outcomes as if already achieved.

**Red flag:** "The system processes 10,000 requests per second" (when it hasn't been built)

**Fix:** Use future/conditional: "The system is DESIGNED TO process..." or "TARGET: 10,000 rps"

---

### Verification Routing (Points 8-9)

**8. TEMPORAL COHERENCE**
Document dates and timestamps must be internally consistent and plausible.

| Fails | Passes |
|-------|--------|
| "Last Updated: December 2024" (when current is 2026) | "Last Updated: January 2026" |
| v1.0.0 dated 2024-12-23, v1.1.0 dated 2024-12-20 | Versions in chronological order |

**Sub-checks:**
1. Document date vs current date
2. Internal chronology (versions, events in order)
3. Reference freshness ("current", "now", "today" claims)

**Fix:** Update dates, add "as of [date]" qualifiers, flag stale claims

---

**9. EXTERNALLY VERIFIABLE CLAIMS**
Specific numbers that could be fact-checked should be flagged for verification.

| Type | Example | Risk |
|------|---------|------|
| Pricing | "Costs ~$0.005 per call" | API pricing changes |
| Statistics | "Papers average 15-30 equations" | May be wildly off |
| Rates/ratios | "40% of researchers use X" | Needs citation |
| Competitor claims | "No competitor offers Y" | May be outdated |

**Fix options:**
1. Add source with date
2. Add uncertainty marker
3. Route to HITL or external search
4. Generalize ("low cost" instead of "$0.005")

---

## The Verification Hierarchy

```


```

### Tier 1: Automated Verification

**A. Internal Consistency**
- Figure vs. Text contradictions
- Abstract vs. Body mismatches
- Table vs. Prose conflicts
- Numerical consistency

**B. External Verification (Extension Interface)**
- User-provided connectors to structured sources
- Financial systems, Git commits, CRM, etc.

### Tier 2: Two-Round HITL Verification — MANDATORY

**Round A: Derived Data Confirmation**
- Claims from sources found in session
- Human confirms interpretation, not truth

**Round B: True HITL Verification**
- Claims needing actual verification
- No source found, human's own data, extrapolations

---

## CGD Output Format

When producing a Clarity-Gated Document, use this format per CLARITY_GATE_FORMAT_SPEC.md v2.1:

```yaml


## ### Round B: True HITL Verification

  ```
- HITL verification record (if status is REVIEWED)

**Optional/Computed Fields:**
- `rag-ingestable` — **Computed by validators**, not manually set. Shows `true` only when `CLEAR | REVIEWED` with no exclusion blocks.
- `document-sha256` — Required. 64-char lowercase hex hash for integrity verification. See spec §2 for computation rules.
- `exclusions-coverage` — Optional. Fraction of body inside exclusion blocks (0.0–1.0).

**Escape Mechanism:** To write about markers like `*(estimated)*` without triggering parsing, wrap in backticks: `` `*(estimated)*` ``

### Claim Completion Status (v2.1)

Claim verification status is determined by field **presence**, not an explicit status field:

| State | `confirmed-by` | `confirmed-date` | Meaning |
|-------|----------------|------------------|----------|
| **PENDING** | absent | absent | Awaiting human verification |
| **VERIFIED** | present | present | Human has confirmed |
| *(invalid)* | present | absent | W-HC01: partial fields |
| *(invalid)* | absent | present | W-HC01: partial fields |

**Why no explicit status field?** Field presence is self-enforcing—you can't accidentally set status without providing who/when.

### Source Field Semantics (v2.1)

The `source` field meaning changes based on claim state:

| State | `source` Contains | Example |
|-------|-------------------|----------|
| **PENDING** | Where to verify (actionable) | `"Check Q3 planning doc"` |
| **VERIFIED** | What was found (evidence) | `"Q3 planning doc, page 12"` |

**Vague source detection (W-HC02):** Sources like `"industry reports"`, `"research"`, `"TBD"` trigger warnings.

### Claim ID Format (v2.1)

**General pattern:** `claim-[a-z0-9._-]{1,64}` (alphanumeric, dots, underscores, hyphens)

| Approach | Pattern | Example | Use Case |
|----------|---------|---------|----------|
| **Hash-based** (preferred) | `claim-[a-f0-9]{8,}` | `claim-75fb137a` | Deterministic, collision-resistant |
| **Sequential** | `claim-[0-9]+` | `claim-1`, `claim-2` | Simple documents |
| **Semantic** | `claim-[a-z0-9-]+` | `claim-revenue-q3` | Human-friendly |

**Collision probability:** At 1,000 claims with 8-char hex IDs: ~0.012%. For >1,000 claims, use 12+ hex characters.

**Recommendation:** Use hash-based IDs generated by `scripts/claim_id.py` for consistency and collision resistance.

---

## Exclusion Blocks

When content cannot be resolved (no SME available, legacy prose, etc.), mark it as excluded rather than leaving it ambiguous:

```markdown


```

**Rules:**
- IDs must match: `[A-Za-z0-9][A-Za-z0-9._-]{0,63}`
- No nesting or overlapping blocks
- Each ID used only once
- Requires `hitl-status: REVIEWED_WITH_EXCEPTIONS`
- Must document `exceptions-reason` and `exceptions-ids` in frontmatter

**Important:** Documents with exclusion blocks are **not RAG-ingestable**. They're rejected entirely (no partial ingestion).

See CLARITY_GATE_FORMAT_SPEC.md §4 for complete rules.

---

## SOT Validation

When validating a Source of Truth file, the skill checks both **format compliance** (per CLARITY_GATE_FORMAT_SPEC.md) and **content quality** (the 9 points).

### Format Compliance (Structural Rules)

SOT documents are CGDs with a `tier:` block. They require a `## Verified Claims` section with a valid table.

| Code | Check | Severity |
|------|-------|----------|
| E-TB01 | No `## Verified Claims` section | ERROR |
| E-TB02 | Table has no data rows | ERROR |
| E-TB03 | Required columns missing (Claim, Value, Source, Verified) | ERROR |
| E-TB04 | Column order wrong (Claim not first or Verified not last) | ERROR |
| E-TB05 | Empty cell in required column | ERROR |
| E-TB06 | Invalid date format in Verified column | ERROR |
| E-TB07 | Verified date in future (beyond 24h grace) | ERROR |

### Content Quality (9 Points)

The 9 Verification Points apply to SOT content:

| Point | SOT Application |
|-------|-----------------|
| 1-4 | Check claims in `## Verified Claims` are actually verified |
| 5 | Check for conflicting values across tables |
| 6 | Check claims don't imply unsupported causation |
| 7 | Check table doesn't state futures as present |
| 8 | Check dates are chronologically consistent |
| 9 | Flag specific numbers for external check |

### SOT-Specific Requirements

- **Tier block required:** SOT is a CGD with `tier:` block containing `level`, `owner`, `version`, `promoted-date`, `promoted-by`
- **Structured claims table:** `## Verified Claims` section with columns: Claim, Value, Source, Verified
- **Table outside exclusions:** The verified claims table must NOT be inside an exclusion block
- **Staleness markers:** Use `[STABLE]`, `[CHECK]`, `[VOLATILE]`, `[SNAPSHOT]` in content
  - `[STABLE]` — Safe to cite without rechecking
  - `[CHECK]` — Verify before citing
  - `[VOLATILE]` — Changes frequently; always verify
  - `[SNAPSHOT]` — Point-in-time data; include date when citing

---

## Output Format

After running Clarity Gate, report:

```


## ## Round B: HITL Verification Required

```

---

## Severity Levels

| Level | Definition | Action |
|-------|------------|--------|
| **CRITICAL** | LLM will likely treat hypothesis as fact | Must fix before use |
| **WARNING** | LLM might misinterpret | Should fix |
| **TEMPORAL** | Date/time inconsistency detected | Verify and update |
| **VERIFIABLE** | Specific claim that could be fact-checked | Route to HITL or external search |
| **ROUND A** | Derived from witnessed source | Quick confirmation |
| **ROUND B** | Requires true verification | Cannot pass without confirmation |
| **PASS** | Clearly marked, no ambiguity, verified | No action needed |

---

## Quick Scan Checklist

| Pattern | Action |
|---------|--------|
| Specific percentages (89%, 73%) | Add source or mark as estimate |
| Comparison tables | Add "PROJECTED" header |
| "Achieves", "delivers", "provides" | Use "designed to", "intended to" if not validated |
| Checkmarks | Verify these are confirmed |
| "100%" anything | Almost always needs qualification |
| "Last Updated: [date]" | Check against current date |
| Version numbers with dates | Verify chronological order |
| "$X.XX" or "~$X" (pricing) | Flag for external verification |
| "averages", "typically" | Flag for source/citation |
| Competitor capability claims | Flag for external verification |

---

## What This Skill Does NOT Do

- Does not classify document types (use Stream Coding for that)
- Does not restructure documents 
- Does not add deep links or references
- Does not evaluate writing quality
- **Does not check factual accuracy autonomously** (requires HITL)

---

## Related Projects

| Project | Purpose | URL |
|---------|---------|-----|
| Source of Truth Creator | Create epistemically calibrated docs | github.com/frmoretto/source-of-truth-creator |
| Stream Coding | Documentation-first methodology | github.com/frmoretto/stream-coding |
| ArXiParse | Scientific paper verification | arxiparse.org |

---

## Changelog

### v2.1.3 (2026-03-02)
- **FIXED:** `document_hash.py` now implements full FORMAT_SPEC §2.1-2.4 compliance
- **FIXED:** Fence-aware end marker detection (Quine Protection per §2.3/§8.5)
- **FIXED:** All 4 deployment copies converged to single canonical implementation
- **ADDED:** `canonicalize()` function: trailing whitespace stripping, newline collapsing, NFC normalization
- **ADDED:** YAML-aware `document-sha256` removal with multiline continuation support (§2.2)
- **ADDED:** Fence-tracking test vectors (7 new tests, 15 total)

### v2.1.0 (2026-01-27)
- **ADDED:** Claim Completion Status semantics (PENDING/VERIFIED by field presence)
- **ADDED:** Source Field Semantics (actionable vs. what-was-found)
- **ADDED:** Claim ID Format guidance with collision analysis
- **ADDED:** Body Structure Requirements (HITL Verification Record mandatory when claims exist)
- **ADDED:** New validation codes: E-ST10, W-ST11, W-HC01, W-HC02, E-SC06 (FORMAT_SPEC §1.2-1.3)
- **ADDED:** Bundled scripts: `claim_id.py`, `document_hash.py`
- **UPDATED:** References to FORMAT_SPEC v2.1
- **UPDATED:** CGD output example to version 2.1

### v2.0.0 (2026-01-13)
- **ADDED:** agentskills.io compliant YAML frontmatter
- **ADDED:** Clarity Gate Format Specification v2.0 compliance (unified CGD/SOT)
- **ADDED:** SOT validation support with E-TB* error codes
- **ADDED:** Validation rules mapping (9 points → rule codes)
- **ADDED:** CGD output format template with `<!-- CLARITY_GATE_END -->` markers
- **ADDED:** Quine Protection note (§2.3 fence-aware marker detection)
- **ADDED:** Redacted Export feature (§8.11)
- **UPDATED:** `hitl-claims` format to v2.0 schema (id, text, value, source, location, round)
- **UPDATED:** End marker format to HTML comment style
- **UPDATED:** Unified format spec v2.0 (single `.cgd.md` extension)
- **RESTRUCTURED:** For multi-platform skill discovery

### v1.6 (2025-12-31)
- Added Two-Round HITL verification system
- Round A: Derived Data Confirmation
- Round B: True HITL Verification

### v1.5 (2025-12-28)
- Added Point 8: Temporal Coherence
- Added Point 9: Externally Verifiable Claims

### v1.4 (2025-12-23)
- Added CGD annotation output mode

### v1.3 (2025-12-21)
- Restructured points into Epistemic (1-4) and Data Quality (5-7)

### v1.2 (2025-12-21)
- Added Source of Truth request step

### v1.1 (2025-12-21)
- Added HITL Fact Verification (mandatory)

### v1.0 (2025-11)
- Initial release with 6-point verification

---

**Version:** 2.1.3
**Spec Version:** 2.1
**Author:** Francesco Marinoni Moretto
**License:** CC-BY-4.0


