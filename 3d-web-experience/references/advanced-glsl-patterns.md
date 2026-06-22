# Advanced GLSL Shader Patterns Reference

Deep-dive patterns for production GLSL shaders in Three.js / WebGL.
Each pattern is GPU-optimized and mobile-tested.

---

## 1. Fractal Brownian Motion (fBm) — Organic Textures & Displacement

The foundation of all organic-looking procedural animation.

```glsl
// Classic hash-based fBm — use for noise-driven displacement
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  return mix(
    mix(hash(i),          hash(i + vec2(1,0)), f.x),
    mix(hash(i+vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

// 6 octaves = rich detail, 3 octaves = fast mobile version
float fbm(vec2 p) {
  float value = 0.0, amplitude = 0.5, freq = 1.0;
  for (int i = 0; i < 6; i++) {
    value     += amplitude * noise(p * freq);
    freq      *= 2.1;  // lacunarity
    amplitude *= 0.5;  // persistence
    p         += vec2(1.7, 9.2); // break self-similarity
  }
  return value;
}

// Usage in fragment shader:
// float n = fbm(vUv * 3.0 + uTime * 0.1);
// float nebula = fbm(vUv + fbm(vUv + fbm(vUv)));  // domain-warped
```

---

## 2. Fresnel Effect — The Secret to Premium-Looking Materials

Fresnel makes any object look physically plausible.
Every high-end 3D web experience uses it.

```glsl
// In vertex shader:
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal  = normalize(normalMatrix * normal);
  vec4 mv  = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}

// In fragment shader:
varying vec3 vNormal;
varying vec3 vViewDir;

float schlickFresnel(float cosTheta, float F0) {
  return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

void main() {
  float cosTheta = dot(normalize(vNormal), normalize(vViewDir));
  float fresnel  = schlickFresnel(cosTheta, 0.04); // 0.04 = dielectric IOR

  // Rim glow
  vec3 rimColor = vec3(0.0, 0.8, 1.0);
  vec3 baseColor = vec3(0.05, 0.05, 0.15);
  vec3 color = mix(baseColor, rimColor, fresnel);

  gl_FragColor = vec4(color, 0.7 + fresnel * 0.3);
}
```

---

## 3. Chromatic Aberration (Lens Dispersion)

Used in post-processing but also in-shader for holographic effects.

```glsl
// Full-screen post-processing version
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uStrength; // 0.001 to 0.005

varying vec2 vUv;

void main() {
  vec2 dir = (vUv - 0.5) * uStrength;
  float r  = texture2D(tDiffuse, vUv + dir * 1.0).r;
  float g  = texture2D(tDiffuse, vUv + dir * 0.5).g;
  float b  = texture2D(tDiffuse, vUv - dir * 0.5).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}
```

---

## 4. Holographic Scanline + Flicker

The quintessential hologram effect — scanlines, flicker, fresnel combined.

```glsl
uniform float uTime;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vWorldPos;

void main() {
  // Fresnel
  vec3 viewDir  = normalize(cameraPosition - vWorldPos);
  float fresnel = pow(1.0 - dot(normalize(vNormal), viewDir), 2.5);

  // Animated scanlines (80 lines/unit height)
  float scanline = sin((vUv.y + uTime * -0.4) * 80.0 * 3.14159);
  scanline = scanline * 0.08 + 0.92; // subtle, not distracting

  // Random flicker
  float flicker = sin(uTime * 7.3) * sin(uTime * 13.7) * 0.04 + 0.96;

  // Noise-based glitch (horizontal displacement)
  float glitch  = step(0.995, sin(uTime * 50.0 + vUv.y * 30.0));
  float glitchX = glitch * (sin(uTime * 200.0) * 0.05);

  vec3 baseColor = vec3(0.0, 0.8, 1.0);
  vec3 color = baseColor * (fresnel * 1.5 + 0.3) * scanline * flicker;

  float alpha = (fresnel * 0.6 + 0.2) * scanline;

  gl_FragColor = vec4(color, alpha);
}
```

---

## 5. Voronoi / Crystal Pattern

For shattered glass, gem, or cell-structure aesthetics.

```glsl
vec2 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist  = 10.0;
  vec2  minPoint = vec2(0.0);

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 neighbor  = vec2(float(x), float(y));
      vec2 cell      = i + neighbor;
      // Animated cell center
      vec2 point     = fract(sin(vec2(
        dot(cell, vec2(127.1, 311.7)),
        dot(cell, vec2(269.5, 183.3))
      )) * 43758.5453);
      point = 0.5 + 0.5 * sin(uTime + 6.2831 * point);
      float d = length(neighbor + point - f);
      if (d < minDist) { minDist = d; minPoint = point; }
    }
  }
  return vec2(minDist, dot(minPoint, vec2(1.0)));
}

// Usage:
// vec2 v = voronoi(vUv * 8.0 + uTime * 0.1);
// float edge = smoothstep(0.05, 0.1, v.x); // cell edges
// vec3 color = mix(edgeColor, cellColor, edge);
```

---

## 6. UV Distortion / Liquid Warp

Makes any texture look liquid, organic, or otherworldly.

```glsl
// Fragment shader — distort UV coordinates before sampling texture
uniform sampler2D uTexture;
uniform float     uTime;
varying vec2      vUv;

void main() {
  // Two layers of wave distortion
  vec2 distort1 = vec2(
    sin(vUv.y * 12.0 + uTime * 1.5) * 0.01,
    cos(vUv.x *  8.0 + uTime * 1.2) * 0.01
  );
  vec2 distort2 = vec2(
    sin((vUv.y + vUv.x) * 16.0 - uTime * 2.0) * 0.005,
    cos((vUv.y - vUv.x) * 10.0 + uTime * 1.8) * 0.005
  );

  vec2 distortedUv = vUv + distort1 + distort2;
  vec4 tex = texture2D(uTexture, distortedUv);

  // Add a teal-tinted luminosity pass
  tex.rgb += vec3(0.0, 0.1, 0.15) * (1.0 - tex.a);

  gl_FragColor = tex;
}
```

---

## 7. Instanced Mesh with Per-Instance Color & Animation

When you need 1000+ identical objects — use InstancedMesh, never individual meshes.

```javascript
// CPU setup
const COUNT   = 5_000;
const mesh    = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.05, 1),
  new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.1 }),
  COUNT
);
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // if updating per frame

// Set instance colors
const color = new THREE.Color();
for (let i = 0; i < COUNT; i++) {
  color.setHSL(i / COUNT, 0.8, 0.6); // rainbow spread
  mesh.setColorAt(i, color);
}
mesh.instanceColor.needsUpdate = true;

// Dummy for matrix math (pre-allocated)
const _dummy = new THREE.Object3D();
const _positions = Array.from({ length: COUNT }, () => ({
  x: (Math.random() - 0.5) * 30,
  y: (Math.random() - 0.5) * 30,
  z: (Math.random() - 0.5) * 30,
  speed: Math.random() * 0.5 + 0.2,
  offset: Math.random() * Math.PI * 2,
}));

// Update in render loop (no allocations)
function updateInstances(elapsed) {
  for (let i = 0; i < COUNT; i++) {
    const p = _positions[i];
    _dummy.position.set(p.x, p.y + Math.sin(elapsed * p.speed + p.offset) * 0.3, p.z);
    _dummy.rotation.set(elapsed * p.speed, elapsed * p.speed * 0.7, 0);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
```

---

## 8. Shader Precision & Mobile Rules

```glsl
// Fragment shader precision — always declare
precision highp float;   // desktop: full precision
// precision mediump float; // mobile: use when ALU > 64 ops

// Prefer built-ins over manual implementations:
// ✓ mix(), smoothstep(), clamp(), length(), dot(), normalize()
// ✗ Manual lerp: a + (b - a) * t  →  use mix(a, b, t)

// Avoid branching in shaders (GPU hates divergence):
// ✗ if (x > 0.5) { color = red; } else { color = blue; }
// ✓ color = mix(blue, red, step(0.5, x));

// Avoid pow() with fractional exponents on mobile (slow):
// ✗ pow(x, 2.3)
// ✓ x * x * pow(x, 0.3)  — split integer from fractional
```

---

## 9. Post-Processing Stack — Recommended Order

Order matters in a post-processing chain:

```
Scene Render
    ↓
DepthOfField        ← blur background (before everything else)
    ↓
Bloom (mipmap)      ← bloom on bright pixels AFTER DOF
    ↓
ChromaticAberration ← lens distortion AFTER bloom so bloom glows spread too
    ↓
Noise               ← film grain AFTER color ops
    ↓
Vignette            ← darkens edges last
    ↓
ToneMapping (ACES)  ← always last — maps HDR to LDR display
    ↓
Output (SRGB)       ← gamma correction to display colorspace
```

```jsx
// R3F Implementation
<EffectComposer multisampling={4}>
  <DepthOfField focusDistance={0.01} focalLength={0.025} bokehScale={4} />
  <Bloom luminanceThreshold={0.4} intensity={1.2} mipmapBlur />
  <ChromaticAberration offset={[0.001, 0.001]} />
  <Noise opacity={0.025} />
  <Vignette darkness={1.1} offset={0.1} />
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
</EffectComposer>
```

---

## 10. WebGPU Readiness (Future-Proof)

Three.js r163+ has a WebGPU renderer in beta. Write code that can swap renderers:

```javascript
// Detect WebGPU, fall back to WebGL
let renderer;
if (navigator.gpu) {
  const { WebGPURenderer } = await import('three/webgpu');
  renderer = new WebGPURenderer({ antialias: true });
  await renderer.init();
  console.log('[3D] Using WebGPU renderer');
} else {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  console.log('[3D] Using WebGL renderer');
}
// All other Three.js code remains identical
```

WGSL shaders (WebGPU) are the future. TSL (Three.js Shading Language) lets you
write shaders once and compile to both GLSL and WGSL automatically in r165+.
