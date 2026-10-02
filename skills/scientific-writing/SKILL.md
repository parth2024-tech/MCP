---
name: scientific-writing
description: This is the core skill for the deep research and writing tool—combining AI-driven deep research with well-formatted written outputs. Every document produced is backed by comprehensive literature search and verified citations through the research-lookup skill. Use when the task involves scientific writing.
license: MIT license
metadata:
    skill-author: K-Dense Inc.
risk: unknown
source: community
---

# Scientific Writing

## Overview

**This is the core skill for the deep research and writing tool**—combining AI-driven deep research with well-formatted written outputs. Every document produced is backed by comprehensive literature search and verified citations through the research-lookup skill.

Scientific writing is a process for communicating research with precision and clarity. Write manuscripts using IMRAD structure, citations (APA/AMA/Vancouver), figures/tables, and reporting guidelines (CONSORT/STROBE/PRISMA). Apply this skill for research papers and journal submissions.

**Critical Principle: Always write in full paragraphs with flowing prose. Never submit bullet points in the final manuscript.** Use a two-stage process: first create section outlines with key points using research-lookup, then convert those outlines into complete paragraphs.

## When to Use This Skill

This skill should be used when:
- Writing or revising any section of a scientific manuscript (abstract, introduction, methods, results, discussion)
- Structuring a research paper using IMRAD or other standard formats
- Formatting citations and references in specific styles (APA, AMA, Vancouver, Chicago, IEEE)
- Creating, formatting, or improving figures, tables, and data visualizations
- Applying study-specific reporting guidelines (CONSORT for trials, STROBE for observational studies, PRISMA for reviews)
- Drafting abstracts that meet journal requirements (structured or unstructured)
- Preparing manuscripts for submission to specific journals
- Improving writing clarity, conciseness, and precision
- Ensuring proper use of field-specific terminology and nomenclature
- Addressing reviewer comments and revising manuscripts

## Visual Enhancement with Scientific Schematics

**⚠️ MANDATORY: Every scientific paper MUST include a graphical abstract plus 1-2 additional AI-generated figures using the scientific-schematics skill.**

This is not optional. Scientific papers without visual elements are incomplete. Before finalizing any document:
1. **ALWAYS generate a graphical abstract** as the first visual element
2. Generate at minimum ONE additional schematic or diagram using scientific-schematics
3. Prefer 3-4 total figures for comprehensive papers (graphical abstract + methods flowchart + results visualization + conceptual diagram)

### Graphical Abstract (REQUIRED)

**Every scientific writeup MUST include a graphical abstract.** This is a visual summary of your paper that:
- Appears before or immediately after the text abstract
- Captures the entire paper's key message in one image
- Is suitable for journal table of contents display
- Uses landscape orientation (typically 1200x600px)

**Generate the graphical abstract FIRST:**
```bash
python scripts/generate_schematic.py "Graphical abstract for [paper title]: [brief description showing workflow from input → methods → key findings → conclusions]" -o figures/graphical_abstract.png
> See [references/details.md](references/details.md) for full code examples.
python scripts/generate_schematic.py "your diagram description" -o figures/output.png
```

- Study design and methodology flowcharts (CONSORT, PRISMA, STROBE)
- Conceptual framework diagrams
- Experimental workflow illustrations
- Data analysis pipeline diagrams
- Biological pathway or mechanism diagrams
- System architecture visualizations
- Neural network architectures
- Decision trees, algorithm flowcharts
- Comparison matrices, timeline diagrams
- Any technical concept that benefits from schematic visualization

**Use generate-image EXTENSIVELY for visual content:**
```bash
python scripts/generate_image.py "your image description" -o figures/output.png
- Background: AI in drug discovery gaining traction
  * Cite recent reviews (Smith 2023, Jones 2024)
  * Traditional methods are slow and expensive
- Gap: Limited application to rare diseases
  * Only 2 prior studies (Lee 2022, Chen 2023)
  * Small datasets remain a challenge
- Our approach: Transfer learning from common diseases
  * Novel architecture combining X and Y
- Study objectives: Validate on 3 rare disease datasets
```

**Stage 2: Convert Key Points to Full Paragraphs**

Once the outline is complete, expand each bullet point into proper prose:

1. **Transform bullet points into complete sentences** with subjects, verbs, and objects
2. **Add transitions** between sentences and ideas (however, moreover, in contrast, subsequently)
3. **Integrate citations naturally** within sentences, not as lists
4. **Expand with context and explanation** that bullet points omit
5. **Ensure logical flow** from one sentence to the next within each paragraph
6. **Vary sentence structure** to maintain reader engagement

**Example conversion to prose:**

```
Artificial intelligence approaches have gained significant traction in drug discovery 
pipelines over the past decade (Smith, 2023; Jones, 2024). While these computational 
methods show promise for accelerating the identification of therapeutic candidates, 
traditional experimental approaches remain slow and resource-intensive, often requiring 
years of laboratory work and substantial financial investment. However, the application 
of AI to rare diseases has been limited, with only two prior studies demonstrating 
proof-of-concept results (Lee, 2022; Chen, 2023). The primary obstacle has been the 
scarcity of training data for conditions affecting small patient populations. 

To address this challenge, we developed a transfer learning approach that leverages 
knowledge from well-characterized common diseases to predict therapeutic targets for 
rare conditions. Our novel neural architecture combines convolutional layers for 
molecular feature extraction with attention mechanisms for protein-ligand interaction 
modeling. The objective of this study was to validate our approach across three 
independent rare disease datasets, assessing both predictive accuracy and biological 
interpretability of the results.
% Key findings (blue) - for major discoveries
/begin{keyfindings}[Title]
Content with key findings and statistics.
/end{keyfindings}

% Methodology (green) - for methods highlights
/begin{methodology}[Study Design]
Description of methods and procedures.
/end{methodology}

% Recommendations (purple) - for action items
/begin{recommendations}[Clinical Implications]
/begin{enumerate}
    /item Specific recommendation 1
    /item Specific recommendation 2
/end{enumerate}
/end{recommendations}

% Limitations (orange) - for caveats and cautions
/begin{limitations}[Study Limitations]
Description of limitations and their implications.
/end{limitations}
```

**Professional Table Formatting:**

```latex
/begin{table}[htbp]
/centering
/caption{Results Summary}
/begin{tabular}{@{}lccc@{}}
/toprule
/textbf{Variable} & /textbf{Treatment} & /textbf{Control} & /textbf{p} \\
/midrule
Outcome 1 & /meansd{42.5}{8.3} & /meansd{35.2}{7.9} & <.001/sigthree \\
/rowcolor{tablealt} Outcome 2 & /meansd{3.8}{1.2} & /meansd{3.1}{1.1} & .012/sigone \\
Outcome 3 & /meansd{18.2}{4.5} & /meansd{17.8}{4.2} & .58/signs \\
/bottomrule
/end{tabular}

{/small /siglegend}
/end{table}
```

**Scientific Notation Commands:**

| Command | Output | Purpose |
|---------|--------|---------|
| `/pvalue{0.023}` | *p* = 0.023 | P-values |
| `/psig{< 0.001}` | ***p* = < 0.001** | Significant p-values (bold) |
| `/CI{0.45}{0.72}` | 95% CI [0.45, 0.72] | Confidence intervals |
| `/effectsize{d}{0.75}` | d = 0.75 | Effect sizes |
| `/samplesize{250}` | *n* = 250 | Sample sizes |
| `/meansd{42.5}{8.3}` | 42.5 ± 8.3 | Mean with SD |
| `/sigone`, `/sigtwo`, `/sigthree` | *, **, *** | Significance stars |

**Getting Started:**

```latex
/documentclass[11pt,letterpaper]{report}
/usepackage{scientific_report}

/begin{document}
/makereporttitle
    {Report Title}
    {Subtitle}
    {Author Name}
    {Institution}
    {Date}

% Your content with professional formatting
/end{document}
```

**Compilation**: Use XeLaTeX or LuaLaTeX for proper Helvetica font rendering:
```bash
xelatex report.tex
