---
name: typst-research-paper
description: "Author, format, and compile publication-grade academic research papers, preprints, and manuscripts using Typst."
---

# Typst Research Paper Authoring

## 1. Scope & Purpose
Enforces exclusive use of **Typst** (`typst/typst`) for all academic papers, preprints, and scientific manuscripts. Produces publication-ready PDF manuscripts with sub-millisecond compilation, mathematical typesetting, and citation integrity.

## 2. Preflight
- Ensure `typst` binary exists in `$PATH` (`typst --version`). If missing, locate at `~/.local/bin/typst`.
- Identify the target format/venue: Standard preprint (arXiv), IEEE two-column, ACM, NeurIPS, or Springer.
- Establish the paper directory with `main.typ` and `references.bib`.

## 3. Procedure
1. **Initialize Workspace**:
   Create a dedicated workspace folder containing `main.typ`, `references.bib`, and an `assets/` subfolder for figures.
2. **Configure Document Metadata & Layout**:
   Set paper dimensions (A4 or US Letter), font hierarchy (e.g. `Linux Libertine`, `Liberation Serif`), line spacing, margins, and column count:
   ```typst
   #set page(paper: "a4", margin: (x: 1.8cm, top: 2.5cm, bottom: 2.5cm))
   #set text(font: "Liberation Serif", size: 10pt)
   #set par(justify: true, leading: 0.65em)
   #set heading(numbering: "1.1")
   ```
3. **Structured Manuscript Sections (IMRAD Standard)**:
   - Header block: Title, authors, affiliations, email addresses.
   - Abstract & Keywords.
   - Section 1: Introduction (problem statement, motivation, contributions).
   - Section 2: Related Work (literature synthesis with `@citekey` citations).
   - Section 3: Methodology / System Architecture (equations, diagrams, formal definitions).
   - Section 4: Experimental Evaluation (tables, metrics, figures).
   - Section 5: Discussion & Limitations.
   - Section 6: Conclusion & Future Work.
   - Bibliography: `#bibliography("references.bib", style: "ieee")`.
4. **Gate: Compilation & Validation**:
   Immediately run `typst compile main.typ main.pdf`.
   - The exit code must be `0`.
   - The generated PDF must exist and have non-zero byte size.
   - Fix all compiler diagnostics before presenting to the user.

## 4. Decisions Matrix
| Requirement | Typst Implementation |
| :--- | :--- |
| **Standard Preprint / arXiv** | 1-column layout, 1.8cm margin, Liberation Serif 10.5pt |
| **IEEE Conference Paper** | 2-column layout (`#show: columns.with(2)`), IEEE bibliography style, `@preview/charged-ieee` |
| **ACM Conference Paper** | ACM conference template (`@preview/acm-sigchi` or `@preview/tiptoe-acm`) |
| **Math Equations** | Inline `$x^2 + y^2 = r^2$`; Display `$ E = m c^2 $` (with spaces around formula) |
| **Cross-references** | Label with `<fig-arch>`, reference with `@fig-arch`; label sections with `<sec-intro>`, reference with `@sec-intro` |
| **Figures & Tables** | `#figure(image("assets/figure1.svg", width: 80%), caption: [Architecture Overview]) <fig-arch>` |

## 5. Output Contract
- `main.typ`: Master Typst source manuscript.
- `references.bib`: BibTeX citations database.
- `main.pdf`: Verified compiled publication PDF.

## 6. Verification
```bash
typst compile main.typ main.pdf && ls -lh main.pdf
```
Ensure compilation completes with zero warnings or errors.

## 7. Stop & Escalate
- Halt and ask the user if a specific journal or conference template is required (e.g., IEEE vs. ACM vs. Nature vs. NeurIPS).
- Halt if primary empirical data or benchmark results are required but not provided.

## 8. Anti-Patterns
- ❌ Never use LaTeX (`.tex`) or compile with `pdflatex` / `xelatex`.
- ❌ Never export to Word (`.docx`) or raw markdown unless the user strictly commands it.
- ❌ Do not use multi-step manual compilation loops; Typst compiles in a single pass.
- ❌ Do not hallucinate BibTeX keys without valid entries in `references.bib`.

## 9. Reference Index
- Standard paper template: `resources/template-paper-standard.typ`
- Bibliography example: `resources/references-example.bib`
