---
name: seaborn
description: Seaborn is a Python visualization library for creating publication-quality statistical graphics. Use this skill for dataset-oriented plotting, multivariate analysis, automatic statistical estimation, and complex multi-panel figures with minimal code. Use when the task involves seaborn.
license: BSD-3-Clause license
metadata:
    skill-author: K-Dense Inc.
risk: unknown
source: community
---

# Seaborn Statistical Visualization

## When to Use
- You need publication-quality statistical graphics directly from tabular datasets.
- You are exploring multivariate relationships, distributions, or grouped comparisons with minimal plotting code.
- You want seaborn's dataset-oriented API and statistical defaults on top of matplotlib.

## Overview

Seaborn is a Python visualization library for creating publication-quality statistical graphics. Use this skill for dataset-oriented plotting, multivariate analysis, automatic statistical estimation, and complex multi-panel figures with minimal code.

## Design Philosophy

Seaborn follows these core principles:

1. **Dataset-oriented**: Work directly with DataFrames and named variables rather than abstract coordinates
2. **Semantic mapping**: Automatically translate data values into visual properties (colors, sizes, styles)
3. **Statistical awareness**: Built-in aggregation, error estimation, and confidence intervals
4. **Aesthetic defaults**: Publication-ready themes and color palettes out of the box
5. **Matplotlib integration**: Full compatibility with matplotlib customization when needed

## Quick Start

```python
import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd

# Load example dataset
df = sns.load_dataset('tips')

# Create a simple visualization
sns.scatterplot(data=df, x='total_bill', y='tip', hue='day')
plt.show()
> See [references/details.md](references/details.md) for full code examples.
from seaborn import objects as so

# Declarative syntax
(
    so.Plot(data=df, x='total_bill', y='tip')
    .add(so.Dot(), color='day')
    .add(so.Line(), so.PolyFit())
)
> See [references/details.md](references/details.md) for full code examples.
# Scatter with multiple semantic mappings
sns.scatterplot(data=df, x='total_bill', y='tip',
                hue='time', size='size', style='sex')

# Line plot with confidence intervals
sns.lineplot(data=timeseries, x='date', y='value', hue='category')

# Faceted relational plot
sns.relplot(data=df, x='total_bill', y='tip',
            col='time', row='sex', hue='smoker', kind='scatter')
> See [references/details.md](references/details.md) for full code examples.
# Histogram with density normalization
sns.histplot(data=df, x='total_bill', hue='time',
             stat='density', multiple='stack')

# Bivariate KDE with contours
sns.kdeplot(data=df, x='total_bill', y='tip',
            fill=True, levels=5, thresh=0.1)

# Joint plot with marginals
sns.jointplot(data=df, x='total_bill', y='tip',
              kind='scatter', hue='time')

# Pairwise relationships
sns.pairplot(data=df, hue='species', corner=True)
> See [references/details.md](references/details.md) for full code examples.
# Swarm plot showing all points
sns.swarmplot(data=df, x='day', y='total_bill', hue='sex')

# Violin plot with split for comparison
sns.violinplot(data=df, x='day', y='total_bill',
               hue='sex', split=True)

# Bar plot with error bars
sns.barplot(data=df, x='day', y='total_bill',
            hue='sex', estimator='mean', errorbar='ci')

# Faceted categorical plot
sns.catplot(data=df, x='day', y='total_bill',
            col='time', kind='box')
```

### Regression Plots (Linear Relationships)

**Use for:** Visualizing linear regressions and residuals

- `regplot()` - Axes-level regression plot with scatter + fit line
- `lmplot()` - Figure-level with faceting support
- `residplot()` - Residual plot for assessing model fit

**Key parameters:**
- `x`, `y` - Variables to regress
- `order` - Polynomial regression order
- `logistic` - Fit logistic regression
- `robust` - Use robust regression (less sensitive to outliers)
- `ci` - Confidence interval width (default 95)
- `scatter_kws`, `line_kws` - Customize scatter and line properties

```python
# Simple linear regression
sns.regplot(data=df, x='total_bill', y='tip')

# Polynomial regression with faceting
sns.lmplot(data=df, x='total_bill', y='tip',
           col='time', order=2, ci=95)

# Check residuals
sns.residplot(data=df, x='total_bill', y='tip')
> See [references/details.md](references/details.md) for full code examples.
# Correlation heatmap
corr = df.corr()
sns.heatmap(corr, annot=True, fmt='.2f',
            cmap='coolwarm', center=0, square=True)

# Clustered heatmap
sns.clustermap(data, cmap='viridis',
               standard_scale=1, figsize=(10, 10))
```

## Multi-Plot Grids

Seaborn provides grid objects for creating complex multi-panel figures:

### FacetGrid

Create subplots based on categorical variables. Most useful when called through figure-level functions (`relplot`, `displot`, `catplot`), but can be used directly for custom plots.

```python
g = sns.FacetGrid(df, col='time', row='sex', hue='smoker')
g.map(sns.scatterplot, 'total_bill', 'tip')
g.add_legend()
```

### PairGrid

Show pairwise relationships between all variables in a dataset.

```python
g = sns.PairGrid(df, hue='species')
g.map_upper(sns.scatterplot)
g.map_lower(sns.kdeplot)
g.map_diag(sns.histplot)
g.add_legend()
```

### JointGrid

Combine bivariate plot with marginal distributions.

```python
g = sns.JointGrid(data=df, x='total_bill', y='tip')
g.plot_joint(sns.scatterplot)
g.plot_marginals(sns.histplot)
> See [references/details.md](references/details.md) for full code examples.
fig, axes = plt.subplots(2, 2, figsize=(10, 10))
sns.scatterplot(data=df, x='x', y='y', ax=axes[0, 0])
sns.histplot(data=df, x='x', ax=axes[0, 1])
sns.boxplot(data=df, x='cat', y='y', ax=axes[1, 0])
sns.kdeplot(data=df, x='x', y='y', ax=axes[1, 1])
```

### Figure-Level Functions
- Manage entire figure including all subplots
- Built-in faceting via `col` and `row` parameters
- Return `FacetGrid`, `JointGrid`, or `PairGrid` objects
- Use `height` and `aspect` for sizing (per subplot)
- Cannot be placed in existing figure
- Examples: `relplot`, `displot`, `catplot`, `lmplot`, `jointplot`, `pairplot`

**When to use:**
- Faceted visualizations (small multiples)
- Quick exploratory analysis
- Consistent multi-panel layouts
- Don't need to combine with other plot types

```python
# Automatic faceting
sns.relplot(data=df, x='x', y='y', col='category', row='group',
            hue='type', height=3, aspect=1.2)
```

## Data Structure Requirements

### Long-Form Data (Preferred)

Each variable is a column, each observation is a row. This "tidy" format provides maximum flexibility:

```python
# Long-form structure
   subject  condition  measurement
0        1    control         10.5
1        1  treatment         12.3
2        2    control          9.8
3        2  treatment         13.1
```

**Advantages:**
- Works with all seaborn functions
- Easy to remap variables to visual properties
- Supports arbitrary complexity
- Natural for DataFrame operations

### Wide-Form Data

Variables are spread across columns. Useful for simple rectangular data:

```python
# Wide-form structure
   control  treatment
0     10.5       12.3
1      9.8       13.1
```

**Use cases:**
- Simple time series
- Correlation matrices
- Heatmaps
- Quick plots of array data

**Converting wide to long:**
```python
df_long = df.melt(var_name='condition', value_name='measurement')
```

## Color Palettes

Seaborn provides carefully designed color palettes for different data types:

### Qualitative Palettes (Categorical Data)

Distinguish categories through hue variation:
- `"deep"` - Default, vivid colors
- `"muted"` - Softer, less saturated
- `"pastel"` - Light, desaturated
- `"bright"` - Highly saturated
- `"dark"` - Dark values
- `"colorblind"` - Safe for color vision deficiency

```python
sns.set_palette("colorblind")
sns.color_palette("Set2")
```

### Sequential Palettes (Ordered Data)

Show progression from low to high values:
- `"rocket"`, `"mako"` - Wide luminance range (good for heatmaps)
- `"flare"`, `"crest"` - Restricted luminance (good for points/lines)
- `"viridis"`, `"magma"`, `"plasma"` - Matplotlib perceptually uniform

```python
sns.heatmap(data, cmap='rocket')
sns.kdeplot(data=df, x='x', y='y', cmap='mako', fill=True)
```

### Diverging Palettes (Centered Data)

Emphasize deviations from a midpoint:
- `"vlag"` - Blue to red
- `"icefire"` - Blue to orange
- `"coolwarm"` - Cool to warm
- `"Spectral"` - Rainbow diverging

```python
sns.heatmap(correlation_matrix, cmap='vlag', center=0)
```

### Custom Palettes

```python
# Create custom palette
custom = sns.color_palette("husl", 8)

# Light to dark gradient
palette = sns.light_palette("seagreen", as_cmap=True)

# Diverging palette from hues
palette = sns.diverging_palette(250, 10, as_cmap=True)
```

## Theming and Aesthetics

### Set Theme

`set_theme()` controls overall appearance:

```python
# Set complete theme
sns.set_theme(style='whitegrid', palette='pastel', font='sans-serif')

# Reset to defaults
sns.set_theme()
```

### Styles

Control background and grid appearance:
- `"darkgrid"` - Gray background with white grid (default)
- `"whitegrid"` - White background with gray grid
- `"dark"` - Gray background, no grid
- `"white"` - White background, no grid
- `"ticks"` - White background with axis ticks

```python
sns.set_style("whitegrid")

# Remove spines
sns.despine(left=False, bottom=False, offset=10, trim=True)

# Temporary style
with sns.axes_style("white"):
    sns.scatterplot(data=df, x='x', y='y')
```

### Contexts

Scale elements for different use cases:
- `"paper"` - Smallest (default)
- `"notebook"` - Slightly larger
- `"talk"` - Presentation slides
- `"poster"` - Large format

```python
sns.set_context("talk", font_scale=1.2)

# Temporary context
with sns.plotting_context("poster"):
    sns.barplot(data=df, x='category', y='value')
```

## Best Practices

### 1. Data Preparation

Always use well-structured DataFrames with meaningful column names:

```python
# Good: Named columns in DataFrame
df = pd.DataFrame({'bill': bills, 'tip': tips, 'day': days})
sns.scatterplot(data=df, x='bill', y='tip', hue='day')

# Avoid: Unnamed arrays
sns.scatterplot(x=x_array, y=y_array)  # Loses axis labels
```

### 2. Choose the Right Plot Type

**Continuous x, continuous y:** `scatterplot`, `lineplot`, `kdeplot`, `regplot`
**Continuous x, categorical y:** `violinplot`, `boxplot`, `stripplot`, `swarmplot`
**One continuous variable:** `histplot`, `kdeplot`, `ecdfplot`
**Correlations/matrices:** `heatmap`, `clustermap`
**Pairwise relationships:** `pairplot`, `jointplot`

### 3. Use Figure-Level Functions for Faceting

```python
# Instead of manual subplot creation
sns.relplot(data=df, x='x', y='y', col='category', col_wrap=3)

# Not: Creating subplots manually for simple faceting
```

### 4. Leverage Semantic Mappings

Use `hue`, `size`, and `style` to encode additional dimensions:

```python
sns.scatterplot(data=df, x='x', y='y',
                hue='category',      # Color by category
                size='importance',    # Size by continuous variable
                style='type')         # Marker style by type
```

### 5. Control Statistical Estimation

Many functions compute statistics automatically. Understand and customize:

```python
# Lineplot computes mean and 95% CI by default
sns.lineplot(data=df, x='time', y='value',
             errorbar='sd')  # Use standard deviation instead

# Barplot computes mean by default
sns.barplot(data=df, x='category', y='value',
            estimator='median',  # Use median instead
            errorbar=('ci', 95))  # Bootstrapped CI
```

### 6. Combine with Matplotlib

Seaborn integrates seamlessly with matplotlib for fine-tuning:

```python
ax = sns.scatterplot(data=df, x='x', y='y')
ax.set(xlabel='Custom X Label', ylabel='Custom Y Label',
       title='Custom Title')
ax.axhline(y=0, color='r', linestyle='--')
plt.tight_layout()
```

### 7. Save High-Quality Figures

```python
fig = sns.relplot(data=df, x='x', y='y', col='group')
fig.savefig('figure.png', dpi=300, bbox_inches='tight')
fig.savefig('figure.pdf')  # Vector format for publications
```

## Common Patterns

### Exploratory Data Analysis

```python
# Quick overview of all relationships
sns.pairplot(data=df, hue='target', corner=True)

# Distribution exploration
sns.displot(data=df, x='variable', hue='group',
            kind='kde', fill=True, col='category')

# Correlation analysis
corr = df.corr()
sns.heatmap(corr, annot=True, cmap='coolwarm', center=0)
```

### Publication-Quality Figures

```python
sns.set_theme(style='ticks', context='paper', font_scale=1.1)

g = sns.catplot(data=df, x='treatment', y='response',
                col='cell_line', kind='box', height=3, aspect=1.2)
g.set_axis_labels('Treatment Condition', 'Response (μM)')
g.set_titles('{col_name}')
sns.despine(trim=True)

g.savefig('figure.pdf', dpi=300, bbox_inches='tight')
```

### Complex Multi-Panel Figures

```python
# Using matplotlib subplots with seaborn
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

sns.scatterplot(data=df, x='x1', y='y', hue='group', ax=axes[0, 0])
sns.histplot(data=df, x='x1', hue='group', ax=axes[0, 1])
sns.violinplot(data=df, x='group', y='y', ax=axes[1, 0])
sns.heatmap(df.pivot_table(values='y', index='x1', columns='x2'),
            ax=axes[1, 1], cmap='viridis')

plt.tight_layout()
```

### Time Series with Confidence Bands

```python
# Lineplot automatically aggregates and shows CI
sns.lineplot(data=timeseries, x='date', y='measurement',
             hue='sensor', style='location', errorbar='sd')

# For more control
g = sns.relplot(data=timeseries, x='date', y='measurement',
                col='location', hue='sensor', kind='line',
                height=4, aspect=1.5, errorbar=('ci', 95))
g.set_axis_labels('Date', 'Measurement (units)')
```

## Troubleshooting

### Issue: Legend Outside Plot Area

Figure-level functions place legends outside by default. To move inside:

```python
g = sns.relplot(data=df, x='x', y='y', hue='category')
g._legend.set_bbox_to_anchor((0.9, 0.5))  # Adjust position
```

### Issue: Overlapping Labels

```python
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
