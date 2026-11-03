# Data Visualization for Presentations

## The Fundamental Rule

> **The chart title states the insight. The chart provides the proof.**
>
> Bad: "Q3 Revenue by Region"
> Good: "APAC Revenue Surpassed EU for the First Time in Q3"

If you cannot write an insight-driven title, the chart has not finished telling its story.

---

## Chart Selection Matrix

### By Question Type

| Question | Chart | Avoid |
|---|---|---|
| How much is X compared to Y? (few items) | Vertical column chart | Pie, 3D bar |
| How much is X compared to Y? (many items, ≥6) | Horizontal bar, sorted descending | Vertical column |
| How does X change over time? | Line chart | Bar, pie |
| How does composition change over time? | Stacked area chart | Pie |
| What is the part-to-whole breakdown? (≤5 parts) | Donut chart | Pie (prefer donut), 3D |
| What is the part-to-whole breakdown? (>5 parts) | Treemap or stacked bar | Any pie variant |
| How is the data distributed? | Histogram | Bar chart, line |
| How do two variables relate? | Scatter plot | Bar, line |
| How does a value change step-by-step? | Waterfall chart | Line, bar |
| How close is X to its target? | Bullet chart | Gauge, speedometer |
| What are the key numbers right now? | KPI tile + sparkline | Full chart |
| Multiple KPIs in overview | Dashboard tile grid | Single large chart |
| How does data flow between categories? | Sankey diagram | Flow arrows |
| How does a value change across regions? | Choropleth map | Bar chart |
| What is the hierarchy by size? | Treemap | Nested circles |
| How does a measure vary across two dimensions? | Heatmap | Bar |

---

## Chart Construction Standards

### 1. Titles and Labels

- **Chart title:** Insight-driven, ≤ 12 words, same hierarchy as slide sub-heading
- **Axis titles:** Always labeled unless the unit is in the title ("Revenue (\$M)" → axis can be unlabeled if title is "Revenue (\$M) by Quarter")
- **Axis labels:** Values must be readable at 11pt+ from projected distance
- **Data labels:** Show values directly on bars/points when chart has ≤ 8 data points; use axis for more
- **Legend:** Only if multi-series AND the colors can't be directly labeled. Direct labeling (label next to the line) is always better than a legend.
- **Source citation:** Bottom of slide, 10pt, format: "Source: [Organization], [Month Year]"

### 2. Gridlines

- Use horizontal gridlines only (for column/bar charts)
- Light grey (`#E5E7EB`), 0.5pt weight
- Never use vertical gridlines
- Never use a full border box around the chart area
- Remove all minor gridlines

### 3. Color in Charts

**Single-metric chart:**
```
Key bar / highlighted point: Accent color (#2563EB or palette accent)
All other bars:               Muted grey (#D1D5DB)
```

**Multi-series chart (≤ 6 series):**
- Use the chart color palette in order (defined in `color-systems.md`)
- Always de-emphasize benchmarks or "other" categories with grey

**Diverging data (positive/negative):**
- Positive values: Success green (`#16A34A`)
- Negative values: Danger red (`#DC2626`)
- Zero line: Bold, dark

**Sequential data (intensity scale):**
- Single hue, light-to-dark gradient (light = low, dark = high)

### 4. Annotations

Always annotate the key insight directly on the chart:
- A callout arrow pointing to the key bar/data point
- A text annotation: the specific number + the "so what" in 5–8 words
- Example: "↑ 40% YoY" with an arrow pointing to Q3

Never rely on the audience to find the insight themselves.

### 5. Chartjunk to Remove

| Element | Remove it because |
|---|---|
| 3D effects on any chart | Distorts area encoding; looks dated |
| Drop shadows on chart elements | Visual noise with no information value |
| Gradient fills on bars | Distorts the size perception |
| Exploded pie slices | Draws attention to arbitrary slice, not data |
| More than 6 series in a single chart | Unreadable; split into multiple or use a table |
| Redundant legend when direct labels are possible | Wastes space and forces eye movement |
| Chart border box | Remove; let the chart breathe |
| Background fill inside chart area (non-white/non-transparent) | Creates visual noise |
| Decorative background images behind charts | Data must be the visual focus |

---

## Specific Chart Type Guidelines

### Column Chart

- Maximum 8–10 columns before switching to a table or horizontal bar
- Sort by value unless time-series (chronological order)
- All bars same color unless you're highlighting a specific one
- Bar width: 50–70% of the space between bars

### Horizontal Bar Chart

- Sort descending by value (largest at top) unless rank is meaningful
- Left-align the category labels
- Values as data labels at bar end or on a clear axis
- Best when: many categories (≥6), long category names, comparing rankings

### Line Chart

- Lines are for time-series or continuous data ONLY
- Minimum 4 data points — with 2–3 points, use a column chart
- Use markers (dots) on data points if ≤ 12 points; skip markers for dense time series
- Line weight: 2.5pt minimum for projected slides
- Never connect data points that have missing values in between (use a gap)

### Donut Chart

- 2–5 segments only
- Highlight one segment (accent color, slightly larger offset)
- Total value or key percentage in the center hole
- Labels: directly beside each segment, never rely on legend color-matching
- Never 3D

### Scatter Plot

- Always label the axes with units
- Highlight the key cluster or outlier with the accent color + annotation
- Add a trend line if the correlation is the message
- For dense plots (>50 points), use opacity/transparency to show density

### Waterfall Chart

- Starting and ending bars: Primary color fill
- Positive change bars: Success green
- Negative change bars: Danger red
- Subtotal bars: Secondary color or grey
- Always label the change value (+X, -X) above each bar

### KPI Tile

```
┌─────────────────────┐
│  Revenue            │  ← Label (14pt, muted)
│  $4.2M              │  ← Value (48pt, bold, primary)
│  ↑ 23% vs. LY      │  ← Trend (16pt, green/red + arrow)
│  ▁▃▅▇█▅            │  ← Sparkline (small inline chart)
└─────────────────────┘
```

- KPI tile background: light grey or card surface color
- Semantic colors on trend indicator only (never on the value itself)
- Sparkline shows directional trend (last 6–12 periods), not precise values

---

## Data Integrity Rules

These are non-negotiable:

1. **Never truncate Y-axis** to exaggerate a trend unless the chart is explicitly about proportional difference, in which case label it clearly
2. **Never fabricate, round-up, or invent statistics** — mark uncertain data as `[est.]` or `[TBC]`
3. **Always cite the source** — organization + date, minimum
4. **Time-series axis must be proportional** — equal intervals between data points; never compress one period to make a trend look smoother
5. **Never use a dual-axis chart** — two Y-axes with different scales actively mislead. Use two separate charts or a normalized index.
6. **Correlation ≠ causation** — never label a scatter plot trend as "X causes Y" without explicit causal claim from source

---

## Formatting Quick Reference

| Chart type | Preferred tool | Notes |
|---|---|---|
| All standard charts | PowerPoint Chart Object (native) | Renders correctly in any .pptx viewer |
| Complex/interactive | Datawrapper, Flourish → export PNG | Export at 2× resolution; embed as image |
| Sankey | SankeyMATIC, D3.js → export SVG | SVG scales without blur |
| Maps/geographic | Datawrapper → export PNG | At 1920×1080 or higher |
| Mermaid-based | Mermaid.js CLI or VS Code preview | `mmdc -i input.mmd -o output.svg` |
| Code-generated | python-pptx + matplotlib/plotly | See `scripts/pptx-layout-calculator.py` |
