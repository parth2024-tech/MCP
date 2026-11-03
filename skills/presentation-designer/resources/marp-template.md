---
marp: true
theme: default
paginate: true
backgroundColor: '#FFFFFF'
color: '#1F2937'
style: |
  /* ─── Base System ─── */
  :root {
    --primary:    #1F2937;
    --secondary:  #374151;
    --accent:     #2563EB;
    --muted:      #9CA3AF;
    --divider:    #E5E7EB;
    --success:    #16A34A;
    --warning:    #D97706;
    --danger:     #DC2626;
    --surface:    #F9FAFB;
  }
  section {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 20px;
    line-height: 1.4;
    padding: 48px 64px;
  }
  /* ─── Headings ─── */
  h1 {
    font-size: 2.4em;
    font-weight: 700;
    color: var(--primary);
    margin: 0 0 24px 0;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  h2 {
    font-size: 1.7em;
    font-weight: 700;
    color: var(--primary);
    margin: 0 0 20px 0;
    line-height: 1.1;
  }
  h3 {
    font-size: 1.2em;
    font-weight: 600;
    color: var(--secondary);
    margin: 0 0 12px 0;
  }
  /* ─── Body ─── */
  p { font-size: 1em; color: var(--secondary); margin: 0 0 12px 0; }
  ul, ol { margin: 0 0 12px 0; padding-left: 1.5em; }
  li { margin-bottom: 8px; color: var(--secondary); }
  /* ─── Code ─── */
  code {
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.85em;
    background: var(--surface);
    border-radius: 4px;
    padding: 2px 6px;
  }
  pre {
    background: var(--primary);
    border-radius: 8px;
    padding: 24px;
    color: #E5E7EB;
  }
  pre code { background: none; padding: 0; color: inherit; }
  /* ─── Table ─── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
  }
  th {
    background: var(--primary);
    color: white;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
  }
  td { padding: 9px 14px; border-bottom: 1px solid var(--divider); }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: var(--surface); }
  /* ─── Strong / Em ─── */
  strong { color: var(--primary); font-weight: 700; }
  em { color: var(--accent); font-style: italic; }
  /* ─── Footer / Pagination ─── */
  footer { color: var(--muted); font-size: 0.7em; }
  section::after {
    font-size: 0.7em;
    color: var(--muted);
  }
  /* ─── Custom Classes ─── */
  section.title {
    background: var(--primary);
    color: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  section.title h1 { color: white; font-size: 3em; }
  section.title p  { color: var(--muted); font-size: 1.1em; }
  section.divider {
    background: var(--accent);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  section.divider h2 { color: white; font-size: 2.4em; text-align: center; }
  section.statement {
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  section.statement h1 { font-size: 2.8em; color: var(--primary); }
  .highlight { color: var(--accent); font-weight: 700; }
  .muted     { color: var(--muted); }
  .kpi-value { font-size: 3em; font-weight: 700; color: var(--accent); }
  .kpi-label { font-size: 0.9em; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .tag {
    display: inline-block;
    background: var(--surface);
    border: 1px solid var(--divider);
    border-radius: 4px;
    padding: 2px 10px;
    font-size: 0.75em;
    font-weight: 600;
    color: var(--secondary);
    margin-right: 6px;
  }
---

<!-- _class: title -->

# Deck Title Here
**Subtitle or Tagline**

Presenter Name · Role · Date

---

<!-- Slide 2: Agenda -->

## Agenda

1. **Section One** — Brief descriptor
2. **Section Two** — Brief descriptor
3. **Section Three** — Brief descriptor
4. **Section Four** — Brief descriptor

---

<!-- _class: divider -->

## Section One

---

<!-- Standard content slide -->

## Insight-Driven Headline (Max 12 Words)

Supporting evidence or analysis goes here. Keep body text at 18pt minimum.

- **Point one** — supporting detail, specific fact
- **Point two** — supporting detail, specific fact
- **Point three** — supporting detail, specific fact

> Use a blockquote for callout emphasis — customer quote, key stat, key insight.

---

<!-- Two-column slide -->

## Comparison Headline

<div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:16px">

**Option A**

- Point one
- Point two
- Point three

---

**Option B**

- Point one
- Point two
- Point three

</div>

---

<!-- Data / Chart slide -->

## Revenue Grew 40% YoY Driven by Enterprise Tier

![Chart description here — alt text for accessibility](chart-placeholder.png)

*Source: Internal Data, Q3 2024*

---

<!-- KPI Dashboard slide -->

## Key Metrics — Q3 2024

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-top:24px">

<div>
<div class="kpi-label">Monthly Revenue</div>
<div class="kpi-value">$4.2M</div>
<div style="color:#16A34A;font-weight:600">↑ 23% vs. LY</div>
</div>

<div>
<div class="kpi-label">Active Users</div>
<div class="kpi-value">128K</div>
<div style="color:#16A34A;font-weight:600">↑ 15% MoM</div>
</div>

<div>
<div class="kpi-label">Churn Rate</div>
<div class="kpi-value">1.8%</div>
<div style="color:#D97706;font-weight:600">→ Flat vs. LM</div>
</div>

</div>

---

<!-- Statement slide -->
<!-- _class: statement -->

# "The insight or quote you want burned into memory."

---

<!-- _class: divider -->

## Section Two

---

<!-- Closing / CTA slide -->

## Next Step: [Specific Action by Specific Date]

**Key takeaways:**
- The most important thing from this deck
- The second most important thing
- The specific action you want them to take

---

**Contact:**
Name · email@company.com · +1 555 000 0000

<!--
─── RENDERING ───────────────────────────────────────────────
PDF:
  npx @marp-team/marp-cli deck.md --pdf --allow-local-files -o output.pdf

HTML (presenter mode):
  npx @marp-team/marp-cli deck.md --html -o index.html

PPTX:
  npx @marp-team/marp-cli deck.md --pptx -o output.pptx

Watch mode (live preview):
  npx @marp-team/marp-cli -w deck.md

─────────────────────────────────────────────────────────────
-->
