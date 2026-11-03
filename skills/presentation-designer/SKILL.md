---
name: presentation-designer
description: Designs, audits, and produces professional presentation decks with decade-grade expertise covering narrative architecture, slide typology, consulting frameworks, flowcharts, data visualization, diagram systems, color theory, typography, animation, and output across PowerPoint, Google Slides, Keynote, and code-based formats. Applies when creating a pitch deck, investor deck, consulting report, executive briefing, product demo, keynote, training deck, or any request involving slides, diagrams, flowcharts, org charts, timelines, matrices, process maps, data charts, or visual storytelling. Not for printed brochures, video production, web dashboards, or interactive single-page applications.
---

# Presentation Designer

## 1. Scope

This skill operates as the **design brain** for all presentation work. It governs:

- **Narrative strategy** — what story to tell and in what order
- **Slide typology** — selecting the right slide archetype per message
- **Diagram engineering** — flowcharts, org charts, matrices, timelines, process maps
- **Data visualization** — choosing the correct chart type and formatting it for projection
- **Visual design system** — color, typography, layout grid, icon style
- **Animation & transitions** — when to use, what to use, what to never use
- **Deck archetypes** — pitch decks, consulting reports, executive briefs, product demos, keynotes, training decks
- **Output & tooling** — .pptx (python-pptx / OpenXML), Google Slides API, Marp, Reveal.js
- **Quality gate** — audit checklist before handoff

**Preconditions for activation:**
- User requests any presentation, deck, slide set, slide redesign, or visual story
- User asks to create a diagram, flowchart, org chart, matrix, or timeline that will live in slides
- User asks to audit or improve an existing deck
- User mentions: pitch deck, investor deck, consulting deck, keynote, boardroom slides, executive summary slides, product demo slides

---

## 2. Preflight

Before producing a single slide, collect the following. If any is missing, ask. Never guess the audience or output format.

| Input | Why it matters |
|---|---|
| **Purpose** | Pitch / inform / sell / train / report — changes the entire narrative model |
| **Primary audience** | Investors / C-suite / clients / engineers / public — changes density and vocabulary |
| **Delivery mode** | Live-presented / async-read / printed — changes animation use, text density, footnotes |
| **Output format** | .pptx / Google Slides / Keynote / Marp / Reveal.js |
| **Target slide count** | Anchors pacing (rule: 1 slide ≈ 2 min for live presentation) |
| **Brand or style guide** | If none, apply the neutral professional system defined in `resources/color-systems.md` |
| **Content source** | Raw notes, bullet points, document, data file, or generate from scratch |

---

## 3. Procedure

### PHASE A — Narrative Architecture

**A1. Choose the narrative model** using the decision table in §4.

**A2. Write the deck blueprint** — a slide-by-slide outline with:
```
Slide N: [Type] — [One-sentence message this slide must land]
```
This is the contract. Every slide must land exactly one message. If it can't be stated in one sentence, split the slide.

**A3. Gate A** — before building slides, confirm the blueprint with the user or verify it against the stated purpose. A wrong story structure cannot be fixed by better design.

---

### PHASE B — Visual Design System

**B1. Set the color system** → see `resources/color-systems.md`
- Choose primary, secondary, accent, neutral, and semantic colors
- Apply the 60-30-10 rule (60% neutral, 30% primary, 10% accent)
- Verify WCAG AA contrast on all text/background pairs

**B2. Set the typography stack** → see `resources/typography.md`
- Maximum 2 typefaces (one display, one body)
- Heading: ≥ 28pt; Body: ≥ 18pt; Caption/footnote: ≥ 11pt (for projected slides)
- Line-height: 1.3–1.5× for body; tight (1.0–1.1×) for display headings

**B3. Set the layout grid**
- Use a 12-column grid at standard 16:9 (33.87cm × 19.05cm)
- Fixed margins: 1.27 cm (0.5 in) top/bottom, 1.91 cm (0.75 in) left/right
- Content safe zone: 1.91cm inset from all edges
- Align every element to the grid. Nothing floats.

**B4. Set the icon style**
- One icon family only (e.g., Lucide, Heroicons, Phosphor, Material)
- Never mix filled and outlined variants on the same deck
- Icon size: 24px inline, 48px as feature icon, 96px+ as hero icon

---

### PHASE C — Slide Construction

For each slide in the blueprint:

**C1. Select the slide archetype** from `resources/slide-types.md`

**C2. Select the diagram type** (if the slide requires one) using the Diagram Decision Table in §4.

**C3. Apply slide construction rules:**
- **One headline per slide** — state the insight, not the topic (bad: "Revenue"; good: "Revenue grew 40% YoY driven by enterprise tier")
- **Headline-first layout** — reader reads top-to-bottom; the headline must be the first thing they see
- **Supporting element** — one chart, one diagram, one table, or ≤5 bullet points (never all together)
- **Breathing room** — minimum 15% white space on every slide
- **Visual anchor** — every slide needs one dominant visual element; text-only slides are valid only for quotes or section dividers

**C4. For data slides** → see `resources/data-visualization.md`
- Select chart type from the data type decision table
- Annotate the key insight directly on the chart (callout, not caption)
- Remove chartjunk: no 3D effects, no gratuitous gridlines, no double legends
- Use color with purpose: highlight the one bar/line that matters, grey out the rest

**C5. For diagram slides** → see `resources/diagram-guide.md`
- All diagrams use the same color and icon system as the deck
- Flowchart nodes: rounded rectangles (process), diamonds (decision), parallelograms (I/O), ovals (start/end)
- All connector arrows: consistent style (solid line, open arrowhead)
- Maximum 7±2 nodes before breaking into sub-diagrams
- Label every connector that carries conditional logic

---

### PHASE D — Animation & Transitions

**D1. Transition rules (slide-to-slide):**
- Use **one consistent transition** for the whole deck
- Acceptable: Fade (0.3s), Push (from right, 0.3s)
- Never use: Zoom, Spin, Bounce, Random, Cube, Ripple, or any 3D flip
- For section dividers only: a slightly more dramatic cut (Fade through black) is acceptable

**D2. Object animation rules:**
- Use **Appear** or **Fade** only — no flying, bouncing, or spinning objects
- Progressive reveal for bullet lists: animate each bullet to appear on click
- Data reveals: animate chart bars/lines to appear (Draw or Wipe from left) — one pass only
- Diagrams: reveal nodes sequentially left-to-right or top-to-bottom using Appear
- Never animate decorative elements (icons, lines, backgrounds)

**D3. Speaker notes** — every animated slide must have speaker notes that align with each animation trigger.

---

### PHASE E — Deck-Type–Specific Rules

Read the relevant section in `resources/deck-types.md` and apply all deck-specific constraints **in addition** to the universal rules above.

| Deck type | Key constraint |
|---|---|
| Investor / pitch deck | 10–15 slides, Guy Kawasaki 10/20/30 rule — 30pt minimum body font |
| Consulting / client report | Pyramid principle, MECE slide groupings, source citations on every data slide |
| Executive briefing | ≤ 8 slides, lead with recommendation (not analysis), BLUF |
| Product demo | Screenshot-first, no text walls; every slide shows the product |
| Keynote / conference | Full-bleed visuals, max 6 words per slide for live keynotes |
| Internal training | Learning objective on agenda slide, knowledge check slide every 5–7 slides |
| Sales deck | Problem → Solution → Proof → Pricing → CTA arc, social proof slide required |

---

### PHASE F — Technical Output

**For .pptx output:**
- Use the `python-pptx-generator` skill for code generation
- Use the `pptx-official` skill for XML-level editing of existing files
- Reference `scripts/pptx-layout-calculator.py` for EMU conversions and safe zone math

**For Marp (Markdown-to-slides):**
- Reference `resources/marp-template.md`
- Use `---` slide separators, CSS theme block in frontmatter

**For Reveal.js:**
- Reference `resources/revealjs-template.md`
- Use semantic `<section>` tags, data-background for full-bleed images

**For Google Slides:**
- Use `google-slides-automation` skill for API operations
- Apply the same visual system — don't revert to Google's default themes

---

### PHASE G — Quality Gate (Mandatory)

Run the audit checklist before any handoff:

```
☐ Every slide lands exactly one message (can be stated in ≤ 12 words)
☐ Slide count ÷ presentation minutes ≈ 0.5 (for live presentations)
☐ No slide has more than 5 bullets
☐ No bullet is longer than 2 lines
☐ No font below 18pt on any body text (28pt for keynotes)
☐ Color contrast ≥ 4.5:1 on all text/background pairs
☐ Only 2 typefaces used across the entire deck
☐ All icons are from one family, same variant (filled OR outlined, not both)
☐ All charts have: title, labeled axes (no ambiguity), annotated key insight
☐ No 3D chart effects, no pie chart with more than 5 slices
☐ All diagrams use consistent node shapes and connector styles
☐ Transitions: one style, ≤ 0.3s, across all slides
☐ Object animations: Appear or Fade only
☐ Appendix slides clearly separated from main deck
☐ File naming: [ClientOrProject]-[DeckType]-[YYYY-MM-DD].pptx
```

**Gate G** — if any checkbox fails, fix before handoff. Do not ask the user to waive quality checks.

---

## 4. Decisions

### Narrative Model Decision Table

| Purpose | Narrative model | Arc |
|---|---|---|
| Raise funding | Pitch (problem-solution-traction) | Problem → Why now → Solution → Market → Traction → Team → Ask |
| Consulting deliverable | Pyramid principle | Recommendation → Supporting arguments → Evidence |
| Executive briefing | BLUF (Bottom Line Up Front) | Decision needed → Recommendation → Context → Options → Risk |
| Product demo | Show, don't tell | Pain → Demo → Feature highlight → Social proof → CTA |
| Training | Learning objective model | Objective → Concept → Example → Practice → Recall |
| Keynote / conference | Hero's journey | Status quo → Disruption → New world → Call to action |
| Internal report | SCQA | Situation → Complication → Question → Answer |
| Sales | SNAP | Simple → iNvaluable → Align → Priority |

---

### Diagram Type Decision Table

| Situation | Diagram type | Key constraint |
|---|---|---|
| Step-by-step process, linear | Horizontal flowchart | ≤ 7 steps; use swimlanes if 2+ actors |
| Process with decisions / branches | Decision flowchart | Diamond nodes for decisions; label Yes/No on every branch |
| Concurrent or parallel processes | Swimlane diagram | One lane per actor/team; horizontal flow |
| Reporting hierarchy | Org chart | Top-down; max 4 levels before collapsing to "see appendix" |
| Cyclical or recurring process | Circular / cycle diagram | Arrows must form a closed loop; label each phase |
| Two overlapping sets | Venn diagram | Max 3 circles; label intersection clearly |
| Evaluate options on 2 axes | 2×2 matrix | Label all 4 quadrants; plot no more than 8 items |
| Strategic positioning (BCG) | Growth-share matrix | Use named quadrants (Stars, Cash Cows, Question Marks, Dogs) |
| Project timeline / schedule | Gantt / timeline | Show milestones as diamonds; critical path in accent color |
| System components and flows | Architecture diagram | Use box-and-arrow; group by bounded context |
| Customer experience | Journey map | Horizontal phases; rows for action, thought, emotion, touchpoint |
| Data flow / transformations | Sankey diagram | Width proportional to volume; color-code by category |
| Hierarchical proportion | Pyramid diagram | Base = most foundational; apex = most specialized/rare |
| Geographic data | Map with heat or bubble overlay | Use choropleth for area data, bubbles for point data |

---

### Chart Type Decision Table

| Data type / question | Chart type | Never use |
|---|---|---|
| Compare values across categories | Horizontal bar (>5 items) or vertical column (≤5) | 3D bar |
| Show trend over time | Line chart | Pie, donut |
| Show composition (parts of whole) | Stacked bar or treemap | Pie with >5 slices |
| Show distribution | Histogram or box plot | Line chart |
| Show correlation | Scatter plot | Bar chart |
| Show progress toward goal | Bullet chart or progress bar | Gauge/speedometer |
| Show ranking | Sorted horizontal bar | Random-order bar |
| Show part-to-whole (≤5 parts) | Donut chart (not pie) | 3D pie |
| Show waterfall (cumulative changes) | Waterfall chart | Line chart |
| Show KPI single number | Large-type KPI tile + sparkline | Full bar chart |
| Show multiple KPIs | Dashboard tile grid | Radar / spider chart |
| Funnel / conversion | Funnel chart | Bar |

---

## 5. Output Contract

The skill produces one or more of:

| Output | Format | When |
|---|---|---|
| Deck blueprint | Markdown table (Slide N, Type, Message) | Always, as Gate A |
| Visual design spec | Markdown (color HEX, font names, grid spec) | Before any code is written |
| Slide content | Markdown per slide or JSON spec for python-pptx | For code-based output |
| Generated .pptx | Binary file via python-pptx script | When format = .pptx |
| Marp source | .md file with Marp frontmatter | When format = Marp |
| Audit report | Checklist with PASS/FAIL per item | Gate G |

---

## 6. Verification

After Gate G, run:

```bash
# For .pptx — validate file is not corrupted, check slide count
python scripts/pptx-layout-calculator.py --verify output.pptx

# For Marp — render to PDF and inspect
npx @marp-team/marp-cli deck.md --pdf --allow-local-files -o output.pdf

# For Reveal.js — local serve and inspect
npx serve . -p 8080
```

Visual spot-check: convert first and last slide to image and verify:
- Headline is the largest text element
- No element overflows the safe zone
- Color usage matches the design spec

---

## 7. Stop & Escalate

Stop and ask before proceeding if:

- **Audience or delivery mode is unknown** — design decisions depend entirely on this
- **Content contains unverified claims** — mark as `[TBC]` and flag; never fabricate data or statistics
- **Brand guide conflicts** — user's brand colors fail WCAG contrast; present the conflict and options
- **Slide count vs. time ratio is wildly off** — e.g., 40 slides for a 10-minute talk; flag and propose cuts
- **User requests 3D charts, random transitions, or clip art** — explain the professional standard and offer a better alternative; do not silently comply

---

## 8. Anti-Patterns

These are common mistakes that this skill must never produce:

| Anti-pattern | Professional standard |
|---|---|
| Bullet walls (>5 bullets, or bullets >2 lines) | Split across slides or convert to visual |
| Title that names a topic ("Sales Data") | Title states the insight ("Sales Up 40% in Q3") |
| Using color randomly to "decorate" | Color carries meaning; use consistently and purposefully |
| 3D charts, shadows, bevels on data visuals | Flat charts only; data-ink ratio maximized |
| Pie chart with >5 slices | Use horizontal bar chart sorted by value |
| Mixing two icon families | One family, one variant, always |
| Fonts below 18pt in body (below 28pt in keynotes) | Enforce minimum sizes; never shrink to fit — split slide instead |
| Animation on decorative elements | Animate only content elements; decorations are static |
| Inconsistent slide margins | Lock to grid; use the safe zone |
| Slides without a clear single message | Rewrite or split until each slide passes the one-sentence test |
| Fabricated testimonials, fake metrics, invented statistics | Mark as `[TBC]` or remove |
| Gratuitous gradients, glow effects, drop shadows on text | Clean, flat design; shadows only on cards/modals, never on text |
| Agenda slide that lists slide titles verbatim | Agenda names sections, not slides |
| "Any Questions?" as the last slide | Last slide = key message + contact/CTA |

---

## 9. References

| Resource | Path |
|---|---|
| Slide type library (all 20 archetypes) | `resources/slide-types.md` |
| Diagram guide (patterns, rules, Mermaid syntax) | `resources/diagram-guide.md` |
| Color systems (5 professional palettes + 60-30-10 rules) | `resources/color-systems.md` |
| Typography guide (font stacks, sizing, spacing) | `resources/typography.md` |
| Data visualization rules (chart decision, formatting) | `resources/data-visualization.md` |
| Deck type playbooks (pitch, consulting, exec, etc.) | `resources/deck-types.md` |
| Marp template | `resources/marp-template.md` |
| Reveal.js template | `resources/revealjs-template.md` |
| EMU calculator & safe zone script | `scripts/pptx-layout-calculator.py` |
| Example: Investor pitch deck blueprint | `examples/investor-pitch-deck.md` |
| Example: Consulting report blueprint | `examples/consulting-report.md` |
| Example: Executive briefing blueprint | `examples/executive-briefing.md` |

**External canonical sources:**
- Presentation design — Barbara Minto, *The Pyramid Principle*
- Data visualization — Edward Tufte, *The Visual Display of Quantitative Information*; Cole Nussbaumer Knaflic, *Storytelling with Data*
- Pitch deck — Guy Kawasaki 10/20/30 rule; YC pitch deck checklist
- WCAG contrast — [webaim.org/resources/contrastchecker](https://webaim.org/resources/contrastchecker)
- python-pptx — `python-pptx-generator` skill + [python-pptx.readthedocs.io](https://python-pptx.readthedocs.io)
- Mermaid diagram syntax — [mermaid.js.org](https://mermaid.js.org)
