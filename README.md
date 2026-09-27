# 3D Web Animation Skill Library

A curated collection of **AI agent skill definitions** for building high-quality 3D and animation-heavy websites. This is a prompt library — structured Markdown guidelines that help AI agents (like Antigravity) produce better Three.js, GSAP, and CSS3D code.

No runtime. No framework. No engine. Just well-organized, honest documentation.

---

## What's Actually In This Repo

```text
3d-web-experience/
├── SKILL.md                        # Agent guidelines: which libraries to use, how to structure scenes
├── references/
│   ├── advanced-glsl-patterns.md   # GLSL snippets: fBm noise, Fresnel, Voronoi — annotated and Three.js-ready
│   └── r3f-advanced-recipes.md     # React Three Fiber patterns: useFrame, portals, glass material, Rapier physics
├── scripts/
│   └── optimize-3d-assets.sh       # Calls gltf-transform + draco + cwebp to compress .glb files
└── examples/
    └── apex-landing/index.html     # A self-contained CSS3D + GSAP demo (no WebGL — runs without a GPU)

.ase-project.json                   # Project-level rules the ASE server injects into agent context
```

---

## What This Actually Does

When an AI agent in this workspace gets a task like *"build a 3D landing page"*, the ASE server loads the relevant `SKILL.md` into the agent's context. The agent then uses those guidelines to write code — similar to how a senior developer would write a team style guide.

The value is in the **quality of the guidelines**, not a runtime system.

---

## The Real Performance Guidelines

These aren't laws — they're patterns worth following, with the actual reasoning:

| Pattern | Why It Matters |
|---|---|
| Pre-allocate `THREE.*` objects outside the render loop | Avoids GC pressure from thousands of short-lived objects per second |
| `Math.min(devicePixelRatio, 2)` | Halves fill-rate cost on high-DPI displays with almost no visible quality loss |
| Use `InstancedMesh` for repeated geometry | One draw call instead of N — critical for particle fields, crowds, foliage |
| Call `.dispose()` on scene teardown | Prevents VRAM leaks — the GPU won't free textures/geometries automatically |
| `powerPreference: 'high-performance'` | Hints to the OS to use the discrete GPU on dual-GPU laptops |
| `Math.min(devicePixelRatio, 2)` on `AdaptiveDpr` in R3F | Lets `@react-three/drei` drop DPR automatically when FPS falls |

Draw call count, shader complexity, overdraw, and texture memory all matter equally — there's no silver bullet.

---

## What the GLSL Reference Actually Contains

`references/advanced-glsl-patterns.md` includes annotated, self-contained snippets for:

- **fBm (Fractal Brownian Motion)**: Layered noise for organic fog, terrain, fire
- **Fresnel rim lighting**: Edge glow on objects based on view angle
- **Chromatic aberration**: Per-channel UV offset in a post-processing pass
- **Voronoi distance field**: Cell-pattern noise for cracked surfaces, holograms
- **Holographic scanlines**: UV-space horizontal band animation

All snippets are written for Three.js `ShaderMaterial` uniforms and `glsl-template-literal` (`/* glsl */`) syntax.

---

## What the R3F Reference Actually Contains

`references/r3f-advanced-recipes.md` covers practical R3F patterns:

- **`useFrame` without per-frame allocations**: Using `useRef` for shared delta/clock values
- **`MeshTransmissionMaterial`**: Proper frosted glass setup from `@react-three/drei`
- **`useFBO` + `createPortal`**: Render-to-texture for mirrors and screens
- **`@react-three/rapier`**: Physics body setup for rigid and soft bodies
- **`LOD`**: Swapping geometry detail by camera distance

---

## The Asset Script

`scripts/optimize-3d-assets.sh` runs three CLI tools in sequence:

```bash
# What the script actually does:
gltf-transform optimize input.glb --draco   # Draco mesh compression
gltf-transform optimize input.glb --meshopt # MeshOptimizer quantization
cwebp -q 85 texture.png -o texture.webp     # WebP texture compression
```

It's a convenience wrapper. You need `@gltf-transform/cli`, `draco3d`, and `libwebp` installed globally. It is not a pipeline platform — it's a shell script.

---

## The CSS3D Example

`examples/apex-landing/index.html` is a **single self-contained HTML file** demonstrating:

- `perspective` + `transform-style: preserve-3d` for faux-3D floating cards
- GSAP `ScrollTrigger` scroll-driven reveals
- Mouse parallax via `gsap.to(el, { rotateX, rotateY })`
- CSS `@keyframes` for ambient orb animations

It doesn't use WebGL. It was built specifically for environments where hardware acceleration is disabled. It's a CSS demo, not a "fallback strategy" — calling it that was dishonest.

---

## Included Skills

This repository includes several core agent skills:

- [commit](file:///home/thor/skiils/commit/SKILL.md): Enforces Sentry-style conventional commits, branch safety, and issue referencing.
- [git-pushing](file:///home/thor/skiils/git-pushing/SKILL.md): Automates staging, committing, and pushing code using a dedicated helper script.

---

## Autonomous Agent Engine & DSPy Subsystem

The ASE MCP server provides a native TypeScript implementation of Stanford DSPy optimization and DAG workflow execution:

- **Declarative Signatures & Modules** (`src/core/dspy/`): Declarative inputs/outputs with `Predict`, `ChainOfThought`, and `ReAct` modules.
- **Autonomous Teleprompter** (`src/services/teleprompter.ts`): Automatically harvests successful execution trajectories from `orchestration.db` and compiles few-shot prompts using Cobb-Douglas token budgeting and AST metric scoring.
- **Workflow DAG Engine** (`src/services/workflow-engine.ts`): Activepieces-style multi-step DAG runner with dependency resolution, parallel execution, retries, and cross-step variable interpolation (`{{stepId.output}}`).

### Included Subsystem Tools

| Tool | Description |
| :--- | :--- |
| `compile_optimized_prompt` | Compiles optimized few-shot prompts using historical success demonstrations and AST scoring |
| `execute_workflow_dag` | Executes resilient multi-step tool workflows with state persistence and deduplication |
| `evaluate_prompt_metric` | Scores code and completions against AST syntax safety and `never_do` constraint rules |

---

## How to Add Skills to ASE

The ASE MCP server (`tools/server/`) auto-indexes any `SKILL.md` file in the workspace via its embedding service. To add a new skill:

1. Create a folder: `your-skill-name/SKILL.md`
2. Add a YAML frontmatter block with `name` and `description`
3. Restart the ASE server — it will vectorize and index the new skill automatically
4. Verify the skill is indexed by querying the server health endpoint: `curl http://127.0.0.1:9090/health`

---

## Contributing

If you add a GLSL pattern, R3F recipe, or optimization technique:

- Include **working, tested code** — no pseudocode
- Annotate the *why*, not just the *what*
- Reference a live demo or Shadertoy link where applicable
