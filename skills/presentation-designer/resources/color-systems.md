# Color Systems for Presentations

## The 60-30-10 Rule

Every professional deck applies a three-zone color hierarchy:

| Zone | Proportion | Role | Example |
|---|---|---|---|
| **Neutral** | 60% | Background, large surfaces, slide body | Off-white, warm grey, near-black |
| **Primary** | 30% | Headers, dominant UI elements, section fills | Brand blue, deep navy, forest green |
| **Accent** | 10% | CTAs, highlights, chart callouts, the one thing that matters | High-energy: amber, coral, electric blue |

Violating this ratio is the single most common cause of presentations that feel "busy" or "amateur."

---

## Semantic Color Rules

Assign meaning to colors and use them consistently across every slide and every chart:

| Color role | Meaning | Never use for |
|---|---|---|
| **Accent (bright)** | The insight, the recommendation, the winner, the highlight | Background fills, decorative elements |
| **Green** | Positive outcome, on-track, growth, success | Decorative use; never use green for data that is neutral |
| **Amber / Yellow** | Warning, risk, at-risk, pending | Decorative use |
| **Red / Coral** | Negative outcome, problem, failure, danger | Decorative use |
| **Grey** | Context, secondary, de-emphasized, everything that is NOT the point | Never use grey as a chart's only color |

---

## Palette System A — Corporate / Enterprise (Dark Primary)

Best for: consulting reports, banking, legal, enterprise SaaS, investor decks (conservative)

```
Background:    #FFFFFF  (white) or #F8F8F8 (warm white)
Primary:       #1A2744  (deep navy)
Secondary:     #2B4C7E  (mid blue)
Accent:        #F5A623  (amber gold)
Neutral text:  #333333  (near-black)
Body text:     #555555  (soft dark)
Muted:         #999999  (grey for footnotes, labels)
Divider:       #E0E0E0  (light grey line)
Success:       #2E7D32  (forest green)
Warning:       #F57C00  (amber)
Danger:        #C62828  (deep red)
```

**Chart palette (categorical, up to 6 series):**
1. `#1A2744` (navy — series 1, highlighted)
2. `#2B4C7E` (blue — series 2)
3. `#4A90D9` (sky blue — series 3)
4. `#7FB3E8` (pale blue — series 4)
5. `#B8D4F0` (very pale blue — series 5)
6. `#E0E0E0` (grey — de-emphasized / benchmark)

---

## Palette System B — Modern / Tech (Neutral Dark Theme)

Best for: product demos, tech keynotes, developer presentations, startup pitches

```
Background:    #0F1117  (near-black)
Surface:       #1A1D26  (dark surface card)
Primary:       #4F8EF7  (electric blue)
Secondary:     #7C4DFF  (purple — use sparingly)
Accent:        #00E5C3  (teal/cyan — max 10%)
Neutral text:  #FFFFFF  (white body text)
Body text:     #C8CDD8  (light grey body)
Muted:         #6B7280  (dim grey)
Divider:       #2D3143  (subtle dark divider)
Success:       #22C55E  (bright green)
Warning:       #F59E0B  (amber)
Danger:        #EF4444  (red)
```

**Chart palette (categorical):**
1. `#4F8EF7` (electric blue — highlighted)
2. `#00E5C3` (cyan — series 2)
3. `#A78BFA` (lavender — series 3)
4. `#34D399` (emerald — series 4)
5. `#FCD34D` (yellow — series 5)
6. `#6B7280` (grey — benchmark / de-emphasized)

---

## Palette System C — Warm Professional (Startup / Creative)

Best for: pitch decks, brand presentations, creative agencies, product marketing

```
Background:    #FAFAF8  (warm cream)
Primary:       #1C1917  (warm near-black)
Secondary:     #44403C  (stone dark)
Accent:        #E86E3A  (burnt orange)
Neutral text:  #1C1917
Body text:     #57534E  (warm grey)
Muted:         #A8A29E  (stone grey)
Divider:       #E7E5E4  (warm light grey)
Success:       #16A34A  (green)
Warning:       #D97706  (amber)
Danger:        #DC2626  (red)
```

**Chart palette:**
1. `#E86E3A` (burnt orange — highlighted)
2. `#1C1917` (near-black — series 2)
3. `#78716C` (stone — series 3)
4. `#A8A29E` (pale stone — series 4)
5. `#D6D3D1` (light grey — series 5)
6. `#E7E5E4` (de-emphasized / background reference)

---

## Palette System D — High Contrast / Accessibility-First

Best for: decks that must be accessible, public sector, healthcare, education, conference keynotes with unknown venue projectors

```
Background:    #FFFFFF
Primary:       #000000
Accent:        #0057B7  (accessible blue — 7:1 on white)
Secondary:     #FFD700  (accessible gold — use with #000000 text)
Success:       #006E29  (accessible green)
Warning:       #9D5500  (accessible amber — not yellow!)
Danger:        #D32F2F  (accessible red)
Body text:     #121212
Muted:         #595959  (≥4.5:1 on white)
```

**WCAG AA rule:** All body text on background must achieve ≥ 4.5:1 contrast ratio.
**WCAG AA rule for large text (≥ 18pt bold or ≥ 24pt regular):** ≥ 3:1 is sufficient.

---

## Palette System E — Neutral Presentation (Safe Default)

Use when: no brand guide exists, the audience or context is unknown, you need a professional baseline in minutes.

```
Background:    #FFFFFF
Primary:       #1F2937  (cool near-black)
Secondary:     #374151  (dark grey)
Accent:        #2563EB  (professional blue)
Neutral text:  #111827
Body text:     #374151
Muted:         #9CA3AF
Divider:       #E5E7EB
Success:       #16A34A
Warning:       #D97706
Danger:        #DC2626
```

---

## Applying Color to Charts

**Single-metric chart (bar, line, KPI):**
- Highlight the bar/line that matters in **Accent**
- All other bars/lines in **Muted** (grey)
- This forces the eye to the insight immediately

**Multi-series chart (up to 6 categories):**
- Use the chart palette in order (Series 1 = Accent, rest descending in saturation)
- Grey is always the last series or benchmark

**Before/after or comparison charts:**
- Before: Muted grey
- After: Accent color

**Trend charts:**
- Positive trend line: Success green
- Negative trend line: Danger red
- Neutral/benchmark: Muted grey

---

## Color Contrast Quick Reference

| Text size | Min contrast ratio | Palette E verification |
|---|---|---|
| Body (≤ 18pt regular) | 4.5:1 | `#374151` on `#FFFFFF` = 9.4:1 ✅ |
| Large (≥ 24pt regular OR ≥ 18pt bold) | 3:1 | `#9CA3AF` on `#FFFFFF` = 2.5:1 ❌ (use `#6B7280` = 4.6:1 ✅) |
| Accent on white | Must verify | `#2563EB` on `#FFFFFF` = 5.9:1 ✅ |
| White on Primary | Must verify | `#FFFFFF` on `#1F2937` = 14.5:1 ✅ |

Check all combinations at: https://webaim.org/resources/contrastchecker
