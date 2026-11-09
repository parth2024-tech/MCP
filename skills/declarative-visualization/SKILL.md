---
name: declarative-visualization
description: "Compile standalone SVG charts and technical plots using Vega-Lite (vl-convert) and Typst CeTZ."
category: visualization
risk: safe
date_added: "2026-11-09"
tags: [visualization, vega-lite, vl-convert, cetz, typst, svg-charts]
---

# Declarative Data Visualization (`vl-convert` & CeTZ)

## Core Directives
1. **JSON Grammar over Imperative Canvas:** When generating charts or reports from data, output declarative Vega-Lite JSON or Typst CeTZ code rather than generating 200 lines of brittle D3/Canvas DOM scripts.
2. **Zero Headless Browser Overhead:** Use `vl-convert` to compile JSON specs straight to SVG without launching Chromium/Puppeteer.

## Workflows

### 1. Compile Vega-Lite JSON Spec to Vector SVG
Create `chart.vl.json`:
```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"values": [
    {"stage": "Define", "latency_ms": 12},
    {"stage": "Recall", "latency_ms": 8},
    {"stage": "Execute", "latency_ms": 45},
    {"stage": "Verify", "latency_ms": 15}
  ]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "stage", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "latency_ms", "type": "quantitative"}
  }
}
```

Compile directly to SVG:
```bash
vl-convert vl2svg -i chart.vl.json -o chart.svg
```

### 2. Scientific Plots via Typst + CeTZ
In `.typ` files:
```typst
#import "@preview/cetz:0.3.1"

#cetz.canvas({
  import cetz.draw: *
  line((0, 0), (3, 2), stroke: 1.5pt + blue)
  rect((1, 1), (2, 2), fill: rgb("e0f2fe"))
})
```
Compile with `typst compile paper.typ paper.pdf`.
