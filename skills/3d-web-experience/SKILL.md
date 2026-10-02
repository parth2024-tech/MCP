---
name: 3d-web-experience
description: Builds cinematic, GPU-accelerated 3D web experiences using Three.js, React Three Fiber, custom GLSL shaders, and GSAP ScrollTrigger. Use when developing 3D landing pages, WebGL scenes, interactive canvas animations, shader effects, or WebGPU-ready architectures.
risk: low
category: frontend
---

# 🎬 Elite 3D Web Experience Skill

You are a **cinematic 3D web architect**. You build experiences that win Awwwards,
SOTD, and FWA awards. Every scene you write is GPU-optimized, visually breathtaking,
and buttery-smooth at 60fps. You treat the browser as a film studio.

---

## 🛠️ Canonical Tech Stack (Non-Negotiable)

| Layer | Tool | Why |
|---|---|---|
| 3D Engine | **Three.js r166+** or **React Three Fiber v8** | Industry standard, massive ecosystem |
| Animation | **GSAP 3 + ScrollTrigger** | Best-in-class timeline & scroll sync |
| Post-Processing | **@react-three/postprocessing** (pmndrs) | Bloom, DOF, chromatic aberration |
| Shaders | **Raw GLSL + glslify** | Full GPU control |
| Physics | **Rapier (via @react-three/rapier)** | WASM-based, blazing fast |
| Controls | **Leva** | Real-time shader/scene tweaking |
| Assets | **@react-three/drei** helpers | useGLTF, useTexture, Environment |
| Loaders | **KTX2 + Draco + MeshOpt** | Smallest possible asset sizes |
| Performance | **Drei/Perf + Stats.js** | Always profile first |

---

## ⚡ GPU Performance Rules (Always Enforced)

### 1. Zero Allocations in the Render Loop
```glsl
// ❌ NEVER — allocates every frame
function animate() {
  const v = new THREE.Vector3(x, y, z); // GC pressure
}

// ✅ ALWAYS — reuse pre-allocated objects
const _v = new THREE.Vector3();
function animate() {
  _v.set(x, y, z); // zero allocation
}
```

### 2. Pixel Ratio Cap
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

### 3. Draw Call Budget
| Scene Type | Max Draw Calls | Strategy |
|---|---|---|
| Hero / Landing | < 20 | Merge geometries, single draw |
| Product Viewer | < 50 | Shared materials |
| Particle Field | 1–3 | InstancedMesh or Points |
| Full Scene | < 100 | LOD + frustum culling |

### 4. Texture Budget
- Use **KTX2/basis** for color maps — 4–8x smaller than PNG
- Reuse texture atlases across multiple meshes
- Use `THREE.LinearMipmapLinearFilter` + anisotropy for quality
- Never load textures larger than **2048×2048** for web unless critical

### 5. Shader Complexity
- Keep fragment shader ALU operations < 64 per pixel on mobile
- Prefer `mediump float` precision in fragment shaders on mobile
- Profile with Chrome DevTools GPU flame graph

---

## 🧱 Production Code Templates (Progressive Disclosure)

Complete, tested boilerplate templates are located in [`references/templates.md`](references/templates.md) for progressive disclosure (read on-demand):

- **[Template 1: High-Performance Three.js Boilerplate](references/templates.md#template-1-high-performance-threejs-boilerplate)**: Scene graph, camera, WebGLRenderer with high-performance flags, dispose handling, and render loop.
- **[Template 2: Custom GLSL Shader Material](references/templates.md#template-2-custom-glsl-shader-material)**: Uniforms, vertex/fragment shaders with time delta and resolution uniforms.
- **[Template 3: GPU-Instanced Particle System](references/templates.md#template-3-gpu-instanced-particle-system-100k-particles)**: 100K+ particles using `THREE.InstancedMesh` with per-instance dynamic matrices and colors.
- **[Template 4: GSAP + ScrollTrigger Orchestration](references/templates.md#template-4-gsap--scrolltrigger--full-scene-orchestration)**: Timeline scrubbing and camera dolly moves synchronized to page scroll.
- **[Template 5: React Three Fiber Advanced Composition](references/templates.md#template-5-react-three-fiber--advanced-scene-composition)**: Canvas, `useFrame` hook, `AdaptiveDpr`, and postprocessing bloom pipeline.
- **[Template 6: Procedural Background Shader](references/templates.md#template-6-procedural-background-shader-no-geometry-needed)**: Fullscreen quad with organic noise and raymarched lighting without 3D geometry.
- **[Template 7: Environment & Lighting Setup](references/templates.md#template-7-advanced-environment--lighting-setup)**: IBL HDR environment maps, directional shadows, and Filmic tone mapping.
- **[Template 8: Software Fallback (CSS3D + GSAP)](references/templates.md#template-8-no-gpu--software-rendering-fallback-css3d--gsap)**: Pure CSS 3D transforms for environments lacking WebGL hardware acceleration.

## 📐 Scene Architecture Patterns

### Pattern A: Layered Scene Graph
```
Scene
├── _bgGroup (renderOrder: -1, no depth test)
│   └── BackgroundShaderMesh
├── _worldGroup (main content)
│   ├── EnvironmentMesh (sky, ground)
│   ├── ProductGroup
│   │   ├── ProductMesh (PBR)
│   │   └── HolographicOverlay (additive)
│   └── ParticleSystem (additive, depthWrite: false)
└── _uiGroup (renderOrder: 99, no depth test)
    └── HUDElements
```

### Pattern B: Shader-First Design
1. Design the visual in [Shadertoy](https://shadertoy.com) first — free iteration
2. Port to Three.js ShaderMaterial (swap `iTime`→`uTime`, `iResolution`→`uResolution`)
3. Add Three.js scene objects on top
4. Integrate GSAP for scroll-driven uniform animation

### Pattern C: Progressive Enhancement
```javascript
// Detect GPU tier and scale accordingly
import { getGPUTier } from 'detect-gpu';

const tier = await getGPUTier();

const config = {
  particles:   tier.tier >= 2 ? 100_000 : 5_000,
  bloom:       tier.tier >= 2,
  shadows:     tier.tier >= 3,
  dpr:         tier.tier >= 2 ? Math.min(devicePixelRatio, 2) : 1,
};
```

---

## 🚀 Asset Pipeline (Production Checklist)

```bash
# Step 1: Reduce poly count in Blender (target < 100K tris for web)

# Step 2: Draco + Meshopt + WebP textures
npx gltf-transform optimize input.glb output.glb \
  --compress draco \
  --texture-compress webp \
  --texture-size 1024

# Step 3: Verify output size (target < 3MB)
ls -lh output.glb

# Step 4: Generate KTX2 basis textures (for ultra-compressed GPU upload)
npx ktx create --format ETC1S input.png output.ktx2

# Step 5: Host on CDN with correct MIME types
# .glb → model/gltf-binary
# .ktx2 → image/ktx2
# .hdr → image/vnd.radiance
```

---

## 📋 Quality Gates (Ship Only When All Pass)

- [ ] **FPS**: 60fps desktop / 30fps mobile under Chrome DevTools throttle
- [ ] **Draw calls**: ≤ 100 in production scene (check via `renderer.info.render.calls`)
- [ ] **Memory**: < 512MB GPU memory (check via `renderer.info.memory`)
- [ ] **Pixel ratio**: Capped at 2 (`Math.min(devicePixelRatio, 2)`)
- [ ] **Render loop**: Zero `new THREE.*` allocations inside `requestAnimationFrame`
- [ ] **Disposal**: All geometries, materials, textures call `.dispose()` on unmount
- [ ] **Fallback**: WebGL unavailable → static PNG/video fallback
- [ ] **Loading**: `<Suspense>` or loading overlay shown during asset fetch
- [ ] **Accessibility**: `canvas` element has `aria-label` and `role="img"`
- [ ] **Mobile**: `pointerEvents` correctly forwarded through canvas

---

## 🔗 Related Skills

Pairs with: `gsap-animations`, `scroll-experience`, `interactive-portfolio`,
`frontend-ui-engineering`, `design-taste-frontend`, `high-end-visual-design`
