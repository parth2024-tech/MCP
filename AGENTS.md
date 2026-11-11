# Global Antigravity Skills Engine (ASE) Instructions

These rules apply globally to all projects, whether upcoming or ongoing, across the entire system.

## Project Auto-Initialization
- Whenever starting a task in any workspace, check if `.ase-project.json` exists in the root.
- If `.ase-project.json` is missing, you MUST run the `ase-init` shell command immediately to initialize the project and generate the configuration.

## ASE Closed-Loop Second Brain Workflow (Required for every action/code modification)
1. **Load Conventions & Recall Memory**: 
   - Call `ase/get_project_prompt` to load project-specific rules, tech stack, and conventions from `.ase-project.json`.
   - Call `ase/query_skills` (or `query_skills_ranked`) with the task description to load up to 3 relevant skills. Never load more than 3 skills.
   - Query prior distilled heuristics and lessons from the Second Brain to avoid repeating past bugs.
2. **Model Selection**: Call `ase/get_model_config` to check the recommended model and temperature for the task type.
3. **Autonomous Execution (Loop Engineering)**:
   - For non-trivial tasks, refactors, and bug fixes, execute with the **Doer + Independent Checker + Gate** pattern (`ase/run_goal_loop`).
   - The Doer generates the solution, the independent Checker validates via AST and rule metrics, and the Gate rejects bad work automatically (hard capped at 8 tries).
4. **Output Validation**: You MUST call `ase/validate_output` (or run `ase-init --validate` in bash) to verify that all linting, types, and tests pass before presenting the code to the user or declaring a task complete.
5. **Continuous Learning & Auto-Write-Back (Mandatory)**:
   - When a bug is solved, an API quirk is resolved, or user guidance is provided, immediately call `ase/record_learned_lesson` and `ase/update_project_rules`.
   - Distill the verified solution so future sessions on this or other projects recall it automatically.
   - The Second Brain MUST get sharper after every session.
6. **Automated Git Push to GitHub (Mandatory after EVERY work)**:
   - Immediately upon completing and validating any task, you MUST stage all changes (`git add`), create a descriptive conventional commit (`feat(...)`, `fix(...)`, `docs(...)`), and push directly to GitHub (`git push origin <branch>`).
   - Never leave completed work uncommitted or unpushed. Every session must be synchronized with GitHub.
7. **Arch Linux On-Demand System Governance (Permanent Law)**:
   - Strictly obey `SYSTEM_RULEBOOK.md` and the Supreme Law: "Do not run a service just because it exists. Run it only when it is actually needed. If the user opens it, it opens. If the user closes it, all associated processes must terminate completely."
   - Never configure unsolicited background daemons, update pollers, or indexing services.
   - Respect single-responsibility subsystems (single firewall `firewalld`, single timekeeper `https-timesync`, single power manager `tlp`).
   - All interactive applications must terminate child/helper processes cleanly on exit.

## Strict Rules
- Always run output validation before ending your turn.
- Strictly adhere to `never_do` rules specified in `.ase-project.json`.
- Never let an AI grade its own work without independent gate verification.
- Always write lessons and rule updates back to the Second Brain upon successful task resolution.
- Always push completed work to GitHub before concluding any session.
- Always enforce the Arch Linux On-Demand System Rulebook on this machine.
- NEVER waste tokens on unsolicited recaps, exhaustive changelogs, or repetitive code explanations. Only mention the most critical points, status, or answers requested.

## Extreme Token Economy Law (Mandatory for ALL Projects)
- Never output unprompted recaps, step-by-step changelogs, or verbose file breakdowns that waste tokens.
- Only provide the direct answer, critical outcome, or status unless the user explicitly asks for detailed explanations.

## Mandatory Task Time Estimation Law (Permanent System Invariant)
- Whenever the user gives a task or prompt, the agent MUST ALWAYS start its response by explicitly stating the estimated time it will take to complete the task (e.g., `⏱️ **Estimated Time**: ~X minutes`).
- This estimate must appear at the very beginning of the response before any other output or action details.

## Mandatory Presentation & Slide Deck Law (Permanent System Invariant)
- Whenever generating, editing, redesigning, or planning presentations, PPT/PPTX files, slide decks, pitch decks, consulting reports, or presentation diagrams anywhere on this system, you MUST EXCLUSIVELY use the `presentation-designer` skill (`skills/presentation-designer/SKILL.md`).
- Adhere strictly to its 9-part standards: narrative blueprints, 20 slide archetypes, 13 diagram patterns, 60-30-10 color theory, typographic hierarchy (≥28pt headlines, ≥18pt body), and zero chartjunk. Never bypass this skill.


## Anti-Vibe-Coding & Anti-AI-Slop Law (Mandatory for all Web/UI/Frontend work)
When generating or modifying frontend code, landing pages, or web apps, you MUST obey these rules:
- **12 Anti-Patterns to NEVER use:**
  1. ❌ No purple-to-indigo gradients, purple mesh overlays, or generic AI aesthetic palettes.
  2. ❌ No pill-shaped buttons (rounded-full) for primary CTAs — use structured rounded-md or rounded-lg.
  3. ❌ No fake reviews, fabricated testimonials, or AI avatar headshots.
  4. ❌ No fake metrics, unsubstantiated statistics, or fabricated customer counter tickers.
  5. ❌ No vague hero section copy ("Empower your workflow with AI synergy") — explain what the product does in sentence one.
  6. ❌ No emoji icons for feature lists or navigation — use crisp SVG vector icons (Lucide, Heroicons).
  7. ❌ No em dashes (—) overused in marketing or landing page copy.
  8. ❌ No crazy scroll-jacking animations, tumbling cards, or disorienting view-transition spam.
  9. ❌ No generic 3D glossy clay figures, floating laptops, or uncanny AI stock photos.
  10. ❌ No AI slop marketing filler ("In today's fast-paced digital landscape...") — write direct human technical prose.
  11. ❌ No custom cursor follower/sparkle/bubble animations — preserve the native OS cursor.
  12. ❌ No fake customer counters or fake purchase popup toasts.
- **5 Production Essentials to ALWAYS include:**
  1. ✅ Custom domain configuration & clean metadata.
  2. ✅ Full favicon suite (/favicon.ico, /icon.svg, /apple-touch-icon.png, OpenGraph tags).
  3. ✅ Remove all "Made with AI", "Built with v0", or builder badges.
  4. ✅ Dedicated, accessible Privacy Policy page (/privacy).
  5. ✅ Dedicated, accessible Terms & Conditions page (/terms).

## Mandatory Research Paper Authoring Law (Permanent System Invariant)
- Whenever generating, drafting, editing, formatting, or structuring any research paper, scientific manuscript, preprint, academic paper, thesis, conference submission, or technical report anywhere on this system, you MUST EXCLUSIVELY use **Typst** (`.typ`).
- **Strictly Banned:** Never use LaTeX (`.tex`), Word (`.docx`), raw Markdown, or plain text for research papers unless the user explicitly and strictly commands otherwise.
- **Publication Grade:** Always write clean, idiomatic Typst with proper metadata, abstracts, math formulas (`$ ... $`), structured sections, and verified bibliographies.
- **Mandatory PDF Compilation:** Always verify the generated Typst paper compiles cleanly to PDF using `typst compile <file>.typ`.

## Mandatory Research Report Generation Law (`gpt-researcher`)
- Whenever generating, compiling, or writing any research report, technical investigation, competitive intelligence, or comprehensive web research report anywhere on this system, you MUST EXCLUSIVELY use the `gpt-researcher` skill and methodology (`skills/gpt-researcher/SKILL.md` or CLI `gpt-researcher`).
- Never write shallow, single-query summaries. Always aggregate multi-source findings with verifiable citations, comparative tables, and structured sections.




## Mandatory Deterministic Guardrails & Tooling Laws (Permanent System Invariants)
1. **Zero Secret Leakage (`gitleaks`):** Run `gitleaks protect --staged` before pushing to GitHub. Never commit API keys or unencrypted credentials.
2. **Structural Code Invariants (`ast-grep` / `sg`):** Prefer AST-level syntax rules (`sg scan`) over fragile regex linters when auditing code structures.
3. **Deterministic Task Execution (`just`):** Whenever a `justfile` is present, always execute project verification and tasks via `just <recipe>`.
4. **Architectural Decisions & C4 Diagrams (`adr-tools` & `d2`):** Record all major system decisions in `docs/adr/` via `adr new` and compile architecture diagrams to SVG via `d2`.
5. **Contract-First APIs (`tsp` / TypeSpec):** Compile API contracts to OpenAPI 3.1 via `tsp compile .` before writing route handlers.
6. **Declarative Visualization (`vl-convert` & Typst CeTZ):** Compile Vega-Lite JSON charts to standalone SVG via `vl-convert` without headless browser overhead.
