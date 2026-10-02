---
name: d3js-skill
description: This skill provides guidance for creating sophisticated, interactive data visualisations using d3.js. Use when the task involves claude d3js skill.
risk: unknown
source: community
date_added: "2026-02-27"
---

# D3.js Visualisation

## Overview

This skill provides guidance for creating sophisticated, interactive data visualisations using d3.js. D3.js (Data-Driven Documents) excels at binding data to DOM elements and applying data-driven transformations to create custom, publication-quality visualisations with precise control over every visual element. The techniques work across any JavaScript environment, including vanilla JavaScript, React, Vue, Svelte, and other frameworks.

## When to use d3.js

**Use d3.js for:**
- Custom visualisations requiring unique visual encodings or layouts
- Interactive explorations with complex pan, zoom, or brush behaviours
- Network/graph visualisations (force-directed layouts, tree diagrams, hierarchies, chord diagrams)
- Geographic visualisations with custom projections
- Visualisations requiring smooth, choreographed transitions
- Publication-quality graphics with fine-grained styling control
- Novel chart types not available in standard libraries

**Consider alternatives for:**
- 3D visualisations - use Three.js instead

## Core workflow

### 1. Set up d3.js

Import d3 at the top of your script:

```javascript
import * as d3 from 'd3';
```

Or use the CDN version (7.x):

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
```

All modules (scales, axes, shapes, transitions, etc.) are accessible through the `d3` namespace.

### 2. Choose the integration pattern

**Pattern A: Direct DOM manipulation (recommended for most cases)**
Use d3 to select DOM elements and manipulate them imperatively. This works in any JavaScript environment:

> See [references/details.md](references/details.md) for full code examples.

**Pattern B: Declarative rendering (for frameworks with templating)**
Use d3 for data calculations (scales, layouts) but render elements via your framework:

```javascript
function getChartElements(data) {
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .range([0, 400]);

  return data.map((d, i) => ({
    x: 50,
    y: i * 30,
    width: xScale(d.value),
    height: 25
  }));
}

// In React: {getChartElements(data).map((d, i) => <rect key={i} {...d} fill="steelblue" />)}
// In Vue: v-for directive over the returned array
// In vanilla JS: Create elements manually from the returned data
```

Use Pattern A for complex visualisations with transitions, interactions, or when leveraging d3's full capabilities. Use Pattern B for simpler visualisations or when your framework prefers declarative rendering.

### 3. Structure the visualisation code

Follow this standard structure in your drawing function:

> See [references/details.md](references/details.md) for full code examples.

### 4. Implement responsive sizing

Make visualisations responsive to container size:

> See [references/details.md](references/details.md) for full code examples.

Or use ResizeObserver for more direct container monitoring:

```javascript
function setupResponsiveChartWithObserver(svgElement, data) {
  const observer = new ResizeObserver(() => {
    const { width, height } = svgElement.getBoundingClientRect();
    d3.select(svgElement)
      .attr('width', width)
      .attr('height', height);

    // Redraw visualisation
    drawChart(data, d3.select(svgElement), width, height);
  });

  observer.observe(svgElement.parentElement);
  return () => observer.disconnect();
}
```

## Common visualisation patterns

### Bar chart

> See [references/details.md](references/details.md) for full code examples.

### Line chart

```javascript
const line = d3.line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.value))
  .curve(d3.curveMonotoneX); // Smooth curve

g.append("path")
  .datum(data)
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("stroke-width", 2)
  .attr("d", line);
```

### Scatter plot

```javascript
g.selectAll("circle")
  .data(data)
  .join("circle")
  .attr("cx", d => xScale(d.x))
  .attr("cy", d => yScale(d.y))
  .attr("r", d => sizeScale(d.size)) // Optional: size encoding
  .attr("fill", d => colourScale(d.category)) // Optional: colour encoding
  .attr("opacity", 0.7);
```

### Chord diagram

A chord diagram shows relationships between entities in a circular layout, with ribbons representing flows between them:

> See [references/details.md](references/details.md) for full code examples.

### Heatmap

A heatmap uses colour to encode values in a two-dimensional grid, useful for showing patterns across categories:

> See [references/details.md](references/details.md) for full code examples.

### Pie chart

> See [references/details.md](references/details.md) for full code examples.

### Force-directed network

> See [references/details.md](references/details.md) for full code examples.

## Adding interactivity

### Tooltips

> See [references/details.md](references/details.md) for full code examples.

### Zoom and pan

```javascript
const zoom = d3.zoom()
  .scaleExtent([0.5, 10])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);
```

### Click interactions

```javascript
circles
  .on("click", function(event, d) {
    // Handle click (dispatch event, update app state, etc.)
    console.log("Clicked:", d);

    // Visual feedback
    d3.selectAll("circle").attr("fill", "steelblue");
    d3.select(this).attr("fill", "orange");

    // Optional: dispatch custom event for your framework/app to listen to
    // window.dispatchEvent(new CustomEvent('chartClick', { detail: d }));
  });
```

## Transitions and animations

Add smooth transitions to visual changes:

> See [references/details.md](references/details.md) for full code examples.

## Scales reference

### Quantitative scales

> See [references/details.md](references/details.md) for full code examples.

### Ordinal scales

```javascript
// Band scale (for bar charts)
const bandScale = d3.scaleBand()
  .domain(['A', 'B', 'C', 'D'])
  .range([0, 400])
  .padding(0.1);

// Point scale (for line/scatter categories)
const pointScale = d3.scalePoint()
  .domain(['A', 'B', 'C', 'D'])
  .range([0, 400]);

// Ordinal scale (for colours)
const colourScale = d3.scaleOrdinal(d3.schemeCategory10);
```

### Sequential scales

```javascript
// Sequential colour scale
const colourScale = d3.scaleSequential(d3.interpolateBlues)
  .domain([0, 100]);

// Diverging colour scale
const divScale = d3.scaleDiverging(d3.interpolateRdBu)
  .domain([-10, 0, 10]);
```

## Best practices

### Data preparation

Always validate and prepare data before visualisation:

```javascript
// Filter invalid values
const cleanData = data.filter(d => d.value != null && !isNaN(d.value));

// Sort data if order matters
const sortedData = [...data].sort((a, b) => b.value - a.value);

// Parse dates
const parsedData = data.map(d => ({
  ...d,
  date: d3.timeParse("%Y-%m-%d")(d.date)
}));
```

### Performance optimisation

For large datasets (>1000 elements):

```javascript
// Use canvas instead of SVG for many elements
// Use quadtree for collision detection
// Simplify paths with d3.line().curve(d3.curveStep)
// Implement virtual scrolling for large lists
// Use requestAnimationFrame for custom animations
```

### Accessibility

Make visualisations accessible:

```javascript
// Add ARIA labels
svg.attr("role", "img")
   .attr("aria-label", "Bar chart showing quarterly revenue");

// Add title and description
svg.append("title").text("Quarterly Revenue 2024");
svg.append("desc").text("Bar chart showing revenue growth across four quarters");

// Ensure sufficient colour contrast
// Provide keyboard navigation for interactive elements
// Include data table alternative
```

### Styling

Use consistent, professional styling:

> See [references/details.md](references/details.md) for full code examples.

## Common issues and solutions

**Issue**: Axes not appearing
- Ensure scales have valid domains (check for NaN values)
- Verify axis is appended to correct group
- Check transform translations are correct

**Issue**: Transitions not working
- Call `.transition()` before attribute changes
- Ensure elements have unique keys for proper data binding
- Check that useEffect dependencies include all changing data

**Issue**: Responsive sizing not working
- Use ResizeObserver or window resize listener
- Update dimensions in state to trigger re-render
- Ensure SVG has width/height attributes or viewBox

**Issue**: Performance problems
- Limit number of DOM elements (consider canvas for >1000 items)
- Debounce resize handlers
- Use `.join()` instead of separate enter/update/exit selections
- Avoid unnecessary re-renders by checking dependencies

## Resources

### references/
Contains detailed reference materials:
- `d3-patterns.md` - Comprehensive collection of visualisation patterns and code examples
- `scale-reference.md` - Complete guide to d3 scales with examples
- `colour-schemes.md` - D3 colour schemes and palette recommendations

### assets/

Contains boilerplate templates:

- `chart-template.js` - Starter template for basic chart
- `interactive-template.js` - Template with tooltips, zoom, and interactions
- `sample-data.json` - Example datasets for testing

These templates work with vanilla JavaScript, React, Vue, Svelte, or any other JavaScript environment. Adapt them as needed for your specific framework.

To use these resources, read the relevant files when detailed guidance is needed for specific visualisation types or patterns.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
