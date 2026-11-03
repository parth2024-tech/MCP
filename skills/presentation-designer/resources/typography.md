# Typography Guide for Presentations

## Core Rules

1. **Maximum 2 typefaces** per deck — one display (headings), one text (body). Never more.
2. **Never use a decorative or script font for body text** — it must be legible from the back of the room.
3. **Size hierarchy is sacred** — every text role has a minimum size; shrinking to fit is never acceptable. Split the slide instead.
4. **Consistent weights** — use weight (bold/regular/light) to signal hierarchy, not arbitrary styling.
5. **Line-height** — body text always at 1.3–1.5×. Display headings at 1.0–1.1×.

---

## Size System (16:9, Standard Projected Slide)

| Role | Minimum size | Recommended | Weight | Notes |
|---|---|---|---|---|
| **Deck title** (Title slide) | 40pt | 44–52pt | Bold | Max 8 words |
| **Slide headline** | 28pt | 30–34pt | Bold or SemiBold | Max 12 words |
| **Section divider** | 32pt | 36–44pt | Bold | Max 6 words |
| **Sub-heading** (within slide) | 20pt | 22–24pt | SemiBold | |
| **Body / bullet text** | 18pt | 18–20pt | Regular | Max 2 lines per bullet |
| **Table header** | 14pt | 14–16pt | SemiBold | |
| **Table body** | 12pt | 12–14pt | Regular | |
| **Chart axis labels** | 10pt | 11–12pt | Regular | |
| **Chart data labels** | 10pt | 11–12pt | Bold | |
| **Caption / source citation** | 10pt | 10–11pt | Regular or Light | Bottom of slide |
| **Footnote / legal** | 8pt | 8–10pt | Regular | Only in print decks |

**Keynote / conference rule:** Body text minimum is 28pt; headlines 40pt+. Audience reads from 10–30m away.

---

## Font Pair Recommendations

### Pair A — Classic Corporate (safe, universally available)
| Role | Font | Fallback |
|---|---|---|
| Display (headings) | **Calibri Bold** | Arial Bold |
| Body | **Calibri Regular** | Arial Regular |

Reason: Pre-installed on all Windows/macOS, renders consistently across devices. Overused but never wrong.

---

### Pair B — Modern Sans (Google Fonts)
| Role | Font | Weight |
|---|---|---|
| Display | **Inter** | 700 (Bold), 600 (SemiBold) |
| Body | **Inter** | 400 (Regular) |

Reason: Inter is engineered for digital screens at all sizes. Single-family pairing with weight hierarchy.

---

### Pair C — Professional Contrast (Display + Text)
| Role | Font | Weight |
|---|---|---|
| Display | **Sora** | 700, 600 |
| Body | **Source Sans Pro** | 400, 600 |

Reason: Sora's geometric character adds distinctive personality; Source Sans Pro is supremely legible body copy.

---

### Pair D — Executive / Finance
| Role | Font | Weight |
|---|---|---|
| Display | **Playfair Display** | 700 |
| Body | **Source Sans Pro** | 400 |

Reason: Playfair adds authority and gravitas for board decks, legal, and finance. Body must be a clean sans.

---

### Pair E — Tech / Dark Theme
| Role | Font | Weight |
|---|---|---|
| Display | **Space Grotesk** | 700, 600 |
| Body | **JetBrains Mono** (code labels only) | 400 |
| Body | **Inter** | 400 |

Reason: Space Grotesk is technical but warm; use Mono only for code or data values, never prose.

---

### Pair F — Startup / Energetic
| Role | Font | Weight |
|---|---|---|
| Display | **Cabinet Grotesk** | 800 (ExtraBold) |
| Body | **Satoshi** | 400, 500 |

Reason: Modern variable fonts with strong personality. Excellent for pitch decks and consumer product presentations.

---

## Typographic Anti-Patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| More than 2 typefaces | Creates visual chaos; breaks hierarchy | Remove all but display + body |
| Script / handwriting font for body | Illegible beyond 5m distance | Replace with a clean sans |
| All-caps body text | Slows reading speed by 20% | Use for short headings only (≤ 4 words) |
| Justified body text in slides | Creates "rivers" of white space | Always left-align body copy |
| Text below 18pt on projected slides | Unreadable from audience | Split slide or cut text |
| Outline or shadow on text | Looks 2001; reduces contrast | Remove all text effects |
| Mixed font weights without purpose | Random variation signals amateurism | Use only: Bold (headline), SemiBold (sub), Regular (body) |
| Letter-spacing (tracking) on body text | Slows reading | Tracking only on ALL-CAPS short labels, never on sentences |
| Tight leading on multi-line headlines | Lines collide, hard to parse | Set line-height to 1.0–1.1× for display, 1.3× for body |
| Centered body text (paragraphs) | Hard to scan; not newspaper prose | Center only for very short statements (≤ 10 words) |

---

## Alignment System

| Context | Alignment | Reason |
|---|---|---|
| Slide headline | Left-align (unless explicitly centered for a statement slide) | F-pattern eye tracking |
| Body / bullet list | Left-align always | Reading direction |
| Chart title | Left-align above chart | Consistent with headline |
| Data labels on charts | Right-align for bar values; centered for labels below bars | Visual clarity |
| Table content — text | Left-align | Reading direction |
| Table content — numbers | Right-align | Decimal alignment |
| KPI tile values | Center | Single focal point |
| Caption / source | Left-align (bottom of slide) | Unobtrusive |
| Statement slides | Center (headline only) | Intentional emphasis |

---

## Hierarchy Demonstration

```
DECK TITLE — Calibri Bold 48pt
────────────────────────────────────────
Slide Headline — Bold 32pt               ← One per slide
  Sub-heading — SemiBold 22pt            ← Optional, once per slide
  • Bullet body text — Regular 18pt      ← Max 5 bullets
  • Bullet body text — Regular 18pt
    ○ Sub-bullet — Regular 16pt          ← Max 2 levels of indent

Caption / Source: Name, Year — Light 10pt
```

---

## Embedding Fonts for Portability

When sharing .pptx files, fonts not installed on the recipient's system will substitute — destroying your layout.

**PowerPoint:** File → Options → Save → Check "Embed fonts in the file"
**Keynote:** Exports embed fonts automatically in .pptx export
**Google Slides:** Serves fonts from Google Fonts at display time — no embedding needed

Always test the deck on a fresh machine or a machine without your fonts installed before delivery.
