---
name: 3d-animations
description: "Build, style, and optimize Three.js, WebGL, GSAP, and GLSL interactive 3D web scenes."
---

# 🎬 Premium 3D Web Animations — Elite Skill

You build **award-winning** 3D web experiences. Awwwards. FWA. SOTD.
Every scene is cinematic, GPU-optimized, and buttery at 60fps.

---

## 🛠️ Canonical Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| **3D Engine** | Three.js r166+ / React Three Fiber v8 | Always latest stable |
| **Animation** | GSAP 3 + ScrollTrigger | Best scroll-3D sync |
| **Post-FX** | @react-three/postprocessing (pmndrs) | Bloom, DOF, CA, Noise |
| **Shaders** | Raw GLSL (inlined or .glsl files) | Full GPU control |
| **Physics** | @react-three/rapier (Rapier WASM) | Fastest physics for web |
| **Assets** | KTX2 + Draco + MeshOpt | Required for production |
| **Helpers** | @react-three/drei | Environment, Float, Trail |
| **Profiling** | detect-gpu + renderer.info | GPU-tier adaptive quality |

---

## ⚡ The Seven Laws of WebGL Performance

### Law 1 — Zero Allocations in the Render Loop
```javascript
// ❌ BANNED — creates GC pressure every frame
function animate() {
  mesh.position.copy(new THREE.Vector3(x, y, z));
}

// ✅ REQUIRED — pre-allocate, reuse with .set()
const _pos = new THREE.Vector3();
function animate() {
  _pos.set(x, y, z);
  mesh.position.copy(_pos);
}
```

### Law 2 — Pixel Ratio Hard Cap
```javascript
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// DPR 3+ on mobile gives 0% visual improvement, 50%+ GPU cost
```

### Law 3 — Draw Call Budget
| Scene Type | Max Draw Calls | Technique |
|---|---|---|
| Hero / Landing | ≤ 20 | Merge geometries |
| Product Viewer | ≤ 50 | Shared materials |
| Particle Field | 1 | THREE.Points / InstancedMesh |
| Full App Scene | ≤ 100 | LOD + frustum culling |
> Check: `renderer.info.render.calls` — if > budget, you ship nothing.

### Law 4 — Blending Order (Transparency)
```javascript
// Always set explicit renderOrder for transparent objects
opaqueMesh.renderOrder    = 0;   // default
particleSystem.renderOrder = 1;  // after opaque
uiMesh.renderOrder         = 99; // always on top
// + depthWrite: false on transparent materials
```

### Law 5 — Dispose Everything
```javascript
function cleanup(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => {
          Object.values(m).forEach(v => v?.isTexture && v.dispose());
          m.dispose();
        });
      } else {
        Object.values(child.material).forEach(v => v?.isTexture && v.dispose());
        child.material.dispose();
      }
    }
  });
  renderer.renderLists.dispose();
}
```

### Law 6 — Power Preference
```javascript
const renderer = new THREE.WebGLRenderer({
  powerPreference: 'high-performance', // request dGPU on dual-GPU systems
  antialias: true,
  alpha: false,   // true only when compositing over HTML
  stencil: false, // save memory if unused
  depth: true,
});
```

### Law 7 — GPU-Tier Adaptive Quality
```javascript
import { getGPUTier } from 'detect-gpu';
const { tier } = await getGPUTier();  // tier: 0 (bad) → 3 (high-end)

const Q = {
  particles: [2_000, 20_000, 100_000, 500_000][tier],
  bloom:      tier >= 2,
  shadows:    tier >= 3,
  dpr:        tier >= 2 ? Math.min(devicePixelRatio, 2) : 1,
  postFX:     tier >= 2,
};
```

---

## 🧱 Core Code Templates

### 1. Minimal High-Performance Three.js Boilerplate

```javascript
import * as THREE from 'three';
import { EffectComposer }   from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/examples/jsm/postprocessing/OutputPass.js';

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 500);
camera.position.set(0, 2, 8);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.shadowMap.enabled  = true;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.8, 0.4, 0.85));
composer.addPass(new OutputPass());

// Pre-allocated reusables
const _clock = new THREE.Clock();

// Render loop — ZERO allocations
function animate() {
  requestAnimationFrame(animate);
  const delta   = _clock.getDelta();
  const elapsed = _clock.getElapsedTime();
  if (uniforms?.uTime) uniforms.uTime.value = elapsed;
  composer.render(delta);
}
animate();

window.addEventListener('resize', () => {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
```

---

### 2. Custom GLSL ShaderMaterial (Simplex Noise Displacement)

```javascript
const mat = new THREE.ShaderMaterial({
  uniforms: {
    uTime:     { value: 0 },
    uMouse:    { value: new THREE.Vector2(0.5, 0.5) },
    uColor1:   { value: new THREE.Color('#0a0a2e') },
    uColor2:   { value: new THREE.Color('#00d4ff') },
    uProgress: { value: 0 },
  },
  vertexShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform vec2  uMouse;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;

    // Simplex 3D noise (GLSL implementation inline)
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.7928429-.8537347*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-.5;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      vec3 ns=1./7.*vec3(1.,0.,-1.)-vec3(.5);
      vec4 j=p-49.*floor(p*(1./7.)*(1./7.));
      vec4 x_=floor(j*(1./7.));vec4 y_=floor(j-7.*x_);
      vec4 x=x_*(1./7.)+ns.yyyy;vec4 y=y_*(1./7.)+ns.yyyy;
      vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;
      vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
      m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main(){
      vUv     = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;
      float n  = snoise(pos * 1.5 + uTime * 0.3);
      pos     += normal * n * 0.12;
      vec4 wp  = modelMatrix * vec4(pos, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    varying vec2  vUv;
    varying vec3  vNormal;
    varying vec3  vWorldPos;

    void main(){
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
      float grad    = sin(vUv.x * 6.28 + uTime * 0.5) * 0.5 + 0.5;
      vec3 col      = mix(uColor1, uColor2, grad + fresnel * 0.4);
      col          += uColor2 * fresnel * 0.8;
      float alpha   = mix(0.85, 1.0, fresnel);
      gl_FragColor  = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
});
```

---

### 3. GSAP + ScrollTrigger 3D Orchestration

```javascript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// ── Master cinematic timeline ─────────────────────────────
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: '+=400%',
    scrub: 1.5,           // silky smooth lag
    pin: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      // Drive ANY shader uniform from scroll progress
      mat.uniforms.uProgress.value = self.progress;
    },
  },
});

// Phase 0 → 0.3: camera pull-back
tl.to(camera.position, { z: 14, y: 3, ease: 'power2.inOut' }, 0)
  .to(camera.rotation, { x: -0.1, ease: 'power2.inOut' }, 0)
// Phase 0.3 → 0.6: scene rotation + bloom
  .to(scene.rotation,  { y: Math.PI * 0.5, ease: 'none' }, 0.3)
  .to(bloomPass,       { strength: 2.0, ease: 'power2.inOut' }, 0.3)
// Phase 0.6 → 0.8: dive through particles
  .to(camera.position, { z: 1.5, ease: 'power3.in' }, 0.6)
// Phase 0.8 → 1.0: product reveal
  .to(camera.position, { z: 6, ease: 'elastic.out(1, 0.7)' }, 0.8);

// ── Mouse parallax (no scroll) ────────────────────────────
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / innerWidth  - 0.5) * 2;
  const y = (e.clientY / innerHeight - 0.5) * 2;
  gsap.to(camera.position, {
    x: x * 0.5, y: -y * 0.3,
    duration: 1.5, ease: 'power2.out', overwrite: 'auto',
  });
  mat.uniforms.uMouse.value.set(
    e.clientX / innerWidth,
    1.0 - e.clientY / innerHeight
  );
});
```

---

### 4. GPU-Instanced Particle System (100K+ at 60fps)

```javascript
const COUNT = 100_000;
const geo   = new THREE.BufferGeometry();

const pos    = new Float32Array(COUNT * 3);
const col    = new Float32Array(COUNT * 3);
const rnd    = new Float32Array(COUNT * 3);
const scale  = new Float32Array(COUNT);

const palette = ['#00d4ff','#7c3aed','#f472b6','#34d399']
  .map(h => new THREE.Color(h));

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3;
  const r  = Math.random() * 12 + 2;
  const θ  = Math.random() * Math.PI * 2;
  const φ  = Math.acos(2 * Math.random() - 1);
  pos[i3]   = r * Math.sin(φ) * Math.cos(θ);
  pos[i3+1] = r * Math.sin(φ) * Math.sin(θ);
  pos[i3+2] = r * Math.cos(φ);
  const c   = palette[i % palette.length];
  col[i3] = c.r; col[i3+1] = c.g; col[i3+2] = c.b;
  rnd[i3] = Math.random(); rnd[i3+1] = Math.random(); rnd[i3+2] = Math.random();
  scale[i] = Math.random() * 0.8 + 0.2;
}

geo.setAttribute('position', new THREE.BufferAttribute(pos,   3));
geo.setAttribute('aColor',   new THREE.BufferAttribute(col,   3));
geo.setAttribute('aRandom',  new THREE.BufferAttribute(rnd,   3));
geo.setAttribute('aScale',   new THREE.BufferAttribute(scale, 1));

const particleMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */`
    uniform float uTime;
    attribute vec3  aColor;
    attribute vec3  aRandom;
    attribute float aScale;
    varying vec3  vColor;
    varying float vAlpha;
    void main(){
      vColor = aColor;
      float breathe = sin(uTime * (aRandom.y*.5+.5) + aRandom.x*6.28) * .1 + 1.;
      vec3 p = position;
      p.x += sin(uTime*.1 + aRandom.y*20.) * aRandom.z * .4;
      p.y += cos(uTime*.15 + aRandom.x*20.) * aRandom.z * .4;
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position  = projectionMatrix * mv;
      gl_PointSize = aScale * breathe * (350. / -mv.z);
      vAlpha = smoothstep(0., 2., -mv.z) * .8;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3  vColor;
    varying float vAlpha;
    void main(){
      float d = length(gl_PointCoord - .5);
      float m = 1. - smoothstep(.35, .5, d);
      if(m < .001) discard;
      gl_FragColor = vec4(vColor, m * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

scene.add(new THREE.Points(geo, particleMat));
```

---

## 📋 Quality Checklist (Ship Only When All Pass)

- [ ] Pixel ratio capped at 2: `Math.min(devicePixelRatio, 2)`
- [ ] `powerPreference: 'high-performance'` in WebGLRenderer
- [ ] Zero `new THREE.*` inside `requestAnimationFrame`
- [ ] All removed assets call `.dispose()` on geometry, material, textures
- [ ] `renderer.info.render.calls` within budget for scene type
- [ ] Post-processing stack: Bloom → ChromaticAberration → ToneMapping → Output
- [ ] Loading state shown via `<Suspense>` or `useProgress`
- [ ] WebGL unavailable → static fallback image/video
- [ ] GPU-tier detection → adaptive quality scaling
- [ ] `canvas` has `aria-label` and `role="img"`

---

## 🔗 Cross-Reference

For deep implementation patterns, always load the companion workspace skill:
`3d-web-experience` at `skills/3d-web-experience/SKILL.md`

That skill contains: full React Three Fiber + postprocessing setup, IBL/HDR
lighting, MeshTransmissionMaterial (glass), asset pipeline commands,
procedural background shaders, and layered scene graph architecture.
