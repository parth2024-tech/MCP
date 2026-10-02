# 3D Web Experience — Production Code Templates

## 🧱 Code Templates

### Template 1: High-Performance Three.js Boilerplate
The canonical starting point. Every project begins here.

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ─── Scene ────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
scene.fog = new THREE.FogExp2(0x050510, 0.035);

// ─── Camera ───────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  500
);
camera.position.set(0, 2, 8);

// ─── Renderer ─────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  precision: 'highp',
  stencil: false, // disable if unused — saves memory
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// ─── Post-Processing Stack ─────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength
  0.4,   // radius
  0.85   // threshold
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ─── Environment Lighting (IBL) ────────────────────────────
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// ─── Pre-allocated reusables ───────────────────────────────
const _clock = new THREE.Clock();
const _mouse = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

// ─── Render Loop ──────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = _clock.getDelta();
  const elapsed = _clock.getElapsedTime();

  // Update uniforms using elapsed (no new objects)
  if (shaderMaterial) shaderMaterial.uniforms.uTime.value = elapsed;

  controls.update(delta);
  composer.render(delta);
}
animate();

// ─── Resize Handler ───────────────────────────────────────
window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
```

---

### Template 2: Custom GLSL Shader Material
The most powerful pattern — total GPU control.

```javascript
// Custom ShaderMaterial with time, mouse, and resolution uniforms
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uColor1:     { value: new THREE.Color('#0a0a2e') },
    uColor2:     { value: new THREE.Color('#00d4ff') },
    uTexture:    { value: null },
    uProgress:   { value: 0 },
  },

  vertexShader: /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform vec2  uMouse;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    // Classic Simplex Noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v -   i + dot(i, C.xxx);
      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    void main() {
      vUv       = uv;
      vNormal   = normalize(normalMatrix * normal);

      // Organic vertex displacement
      vec3 pos      = position;
      float noise   = snoise(pos * 1.5 + uTime * 0.3);
      float mouseInfluence = 1.0 - smoothstep(0.0, 1.5,
        length(pos.xy - (uMouse * 2.0 - 1.0)));
      pos += normal * noise * 0.12 * (1.0 + mouseInfluence * 0.5);

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos     = worldPos.xyz;
      gl_Position   = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: /* glsl */`
    precision highp float;

    uniform float uTime;
    uniform vec2  uMouse;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    uniform float uProgress;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      // Fresnel rim light
      vec3 viewDir  = normalize(cameraPosition - vWorldPos);
      float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);

      // Animated gradient
      float grad    = sin(vUv.x * 6.28 + uTime * 0.5) * 0.5 + 0.5;
      vec3 color    = mix(uColor1, uColor2, grad + fresnel * 0.4);

      // Scanline effect
      float scanline = sin(vUv.y * 400.0) * 0.03;
      color += scanline;

      // Edge glow
      color += uColor2 * fresnel * 0.8;

      // Alpha: use fresnel for glass effect
      float alpha = mix(0.85, 1.0, fresnel);

      gl_FragColor = vec4(color, alpha);
    }
  `,

  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});
```

---

### Template 3: GPU-Instanced Particle System (100K+ Particles)
The correct way to render massive particle fields at 60fps.

```javascript
// 100,000 particles in a single draw call
const PARTICLE_COUNT = 100_000;

const geometry = new THREE.BufferGeometry();

// Pre-compute all data CPU-side, upload once to GPU
const positions  = new Float32Array(PARTICLE_COUNT * 3);
const colors     = new Float32Array(PARTICLE_COUNT * 3);
const randoms    = new Float32Array(PARTICLE_COUNT * 3); // rnd seeds per particle
const scales     = new Float32Array(PARTICLE_COUNT);

const palette = [
  new THREE.Color('#00d4ff'),
  new THREE.Color('#7c3aed'),
  new THREE.Color('#f472b6'),
  new THREE.Color('#34d399'),
];

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const i3 = i * 3;
  const r  = Math.random() * 12 + 2;
  const θ  = Math.random() * Math.PI * 2;
  const φ  = Math.acos(2 * Math.random() - 1);

  positions[i3 + 0] = r * Math.sin(φ) * Math.cos(θ);
  positions[i3 + 1] = r * Math.sin(φ) * Math.sin(θ);
  positions[i3 + 2] = r * Math.cos(φ);

  const c = palette[Math.floor(Math.random() * palette.length)];
  colors[i3 + 0] = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  randoms[i3 + 0] = Math.random();
  randoms[i3 + 1] = Math.random();
  randoms[i3 + 2] = Math.random();

  scales[i] = Math.random() * 0.8 + 0.2;
}

geometry.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aColor',    new THREE.BufferAttribute(colors, 3));
geometry.setAttribute('aRandom',   new THREE.BufferAttribute(randoms, 3));
geometry.setAttribute('aScale',    new THREE.BufferAttribute(scales, 1));

const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime:     { value: 0 },
    uMouse:    { value: new THREE.Vector2() },
    uTexture:  { value: new THREE.TextureLoader().load('/textures/particle.png') },
  },
  vertexShader: /* glsl */`
    precision highp float;

    uniform float uTime;
    attribute vec3  aColor;
    attribute vec3  aRandom;
    attribute float aScale;

    varying vec3  vColor;
    varying float vAlpha;

    void main() {
      vColor = aColor;

      // Individual particle animation offset
      float offset  = aRandom.x * 6.28318;
      float speed   = aRandom.y * 0.5 + 0.5;
      float breathe = sin(uTime * speed + offset) * 0.1 + 1.0;

      // Orbit drift
      vec3 pos   = position;
      float drift = aRandom.z * 0.4;
      pos.x += sin(uTime * 0.1 + aRandom.y * 20.0) * drift;
      pos.y += cos(uTime * 0.15 + aRandom.x * 20.0) * drift;

      vec4 mvPos  = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPos;

      // Size attenuated by distance
      gl_PointSize = aScale * breathe * (350.0 / -mvPos.z);
      vAlpha       = smoothstep(0.0, 2.0, -mvPos.z) * 0.8;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;

    uniform sampler2D uTexture;
    varying vec3  vColor;
    varying float vAlpha;

    void main() {
      // Soft circular particle
      vec2  uv   = gl_PointCoord - 0.5;
      float dist = length(uv);
      float mask = 1.0 - smoothstep(0.35, 0.5, dist);

      if (mask < 0.001) discard;

      gl_FragColor = vec4(vColor, mask * vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending, // Essential for glow effect
  vertexColors: false,
});

const particles = new THREE.Points(geometry, particleMaterial);
scene.add(particles);
```

---

### Template 4: GSAP + ScrollTrigger — Full Scene Orchestration
Production-grade scroll-driven 3D cinematics.

```javascript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

// ── Master timeline pinned to the hero section ─────────────
const masterTl = gsap.timeline({
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: '+=400%',          // 4x viewport height of scroll
    scrub: 1.5,             // Smooth lag for cinematic feel
    pin: true,
    anticipatePin: 1,
    onUpdate: (self) => {
      // Drive custom shader progress
      shaderMaterial.uniforms.uProgress.value = self.progress;
    },
  },
});

// ── Phase 0 → 0.2: Camera pull-back reveal ─────────────────
masterTl
  .to(camera.position, { z: 14, y: 3, ease: 'power2.inOut' }, 0)
  .to(camera.rotation, { x: -0.15, ease: 'power2.inOut' }, 0)

// ── Phase 0.2 → 0.5: Scene rotation + bloom surge ──────────
  .to(scene.rotation, { y: Math.PI * 0.5, ease: 'none' }, 0.2)
  .to(bloomPass,       { strength: 1.8, ease: 'power2.inOut' }, 0.2)
  .to(bloomPass,       { strength: 0.8, ease: 'power2.inOut' }, 0.4)

// ── Phase 0.5 → 0.8: Dive through particles ────────────────
  .to(camera.position, { z: 2, y: 0, x: 1, ease: 'power3.in' }, 0.5)
  .to(scene.rotation,  { y: Math.PI * 1.2, ease: 'power1.inOut' }, 0.5)

// ── Phase 0.8 → 1.0: Final product reveal ──────────────────
  .to(camera.position, { z: 6, x: 0, ease: 'elastic.out(1,0.7)' }, 0.8)
  .to(productMesh.rotation, { y: Math.PI * 2, ease: 'power2.out' }, 0.85);

// ── Horizontal scroll section (text + 3D side-by-side) ─────
const cards = gsap.utils.toArray('.card-3d');
gsap.to(cards, {
  xPercent: -100 * (cards.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.cards-wrapper',
    pin: true,
    scrub: 1,
    snap: 1 / (cards.length - 1),
    end: () => `+=${document.querySelector('.cards-wrapper').offsetWidth}`,
  },
});

// ── Mouse parallax on camera (non-scroll) ──────────────────
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth  - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;

  gsap.to(camera.position, {
    x: x * 0.5,
    y: -y * 0.3,
    duration: 1.5,
    ease: 'power2.out',
    overwrite: 'auto',
  });

  // Update mouse uniform for shader interaction
  shaderMaterial.uniforms.uMouse.value.set(
    e.clientX / window.innerWidth,
    1 - e.clientY / window.innerHeight
  );
});
```

---

### Template 5: React Three Fiber — Advanced Scene Composition
Production R3F setup with post-processing, environment, and physics.

```jsx
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import {
  Environment, useGLTF, useTexture, Float, MeshTransmissionMaterial,
  Preload, AdaptiveDpr, BakeShadows, Sparkles, Trail,
  PerspectiveCamera, ScrollControls, useScroll, Html, useProgress,
} from '@react-three/drei';
import {
  EffectComposer, Bloom, ChromaticAberration, DepthOfField,
  Noise, Vignette, ToneMapping,
} from '@react-three/postprocessing';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useRef, useMemo, useCallback, Suspense } from 'react';
import * as THREE from 'three';

// ─── Asset Preload (outside component tree) ────────────────
useGLTF.preload('/models/hero-product.glb');

// ─── Loading Screen ────────────────────────────────────────
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loader">
        <div className="loader__bar" style={{ width: `${progress}%` }} />
        <span>{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

// ─── Premium Post-Processing Stack ────────────────────────
function PostFX() {
  return (
    <EffectComposer multisampling={4}>
      <DepthOfField
        focusDistance={0.01}
        focalLength={0.025}
        bokehScale={4}
        height={480}
      />
      <Bloom
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        intensity={1.2}
        blendFunction={BlendFunction.SCREEN}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.001, 0.001]}
      />
      <Noise opacity={0.025} />
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

// ─── Holographic Material (GLSL inside R3F) ───────────────
function HolographicMesh({ geometry }) {
  const matRef = useRef();
  const uniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uColor:  { value: new THREE.Color('#00d4ff') },
  }), []);

  useFrame(({ clock }) => {
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={/* glsl */`
          varying vec2 vUv;
          varying vec3 vNormal;
          void main() {
            vUv    = uv;
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */`
          uniform float uTime;
          uniform vec3  uColor;
          varying vec2  vUv;
          varying vec3  vNormal;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vNormal);
            float fresnel  = pow(1.0 - dot(vNormal, vec3(0,0,1)), 2.0);
            float scanline = sin((vUv.y - uTime * 0.3) * 80.0) * 0.1 + 0.9;
            float flicker  = sin(uTime * 10.0) * 0.02 + 0.98;
            float alpha    = (fresnel * 0.6 + 0.2) * scanline * flicker;
            gl_FragColor   = vec4(uColor * (1.0 + fresnel * 1.5), alpha);
          }
        `}
      />
    </mesh>
  );
}

// ─── Scroll-Driven Hero Model ─────────────────────────────
function ScrollScene() {
  const { nodes } = useGLTF('/models/hero-product.glb');
  const scroll     = useScroll();
  const ref        = useRef();

  useFrame(() => {
    const t = scroll.offset;
    ref.current.rotation.y    = t * Math.PI * 2;
    ref.current.position.y    = Math.sin(t * Math.PI) * 1.5;
    ref.current.scale.setScalar(0.8 + t * 0.4);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
      <group ref={ref}>
        <primitive object={nodes.Scene} />
        {/* Glass overlay */}
        <mesh>
          <sphereGeometry args={[1.2, 64, 64]} />
          <MeshTransmissionMaterial
            backside
            samples={16}
            resolution={512}
            transmission={1}
            roughness={0}
            thickness={0.3}
            ior={1.5}
            chromaticAberration={0.05}
            anisotropy={0.1}
            distortion={0.05}
            distortionScale={0.1}
            temporalDistortion={0.1}
            iridescence={1}
            iridescenceIOR={1.3}
            iridescenceThicknessRange={[100, 400]}
          />
        </mesh>
        <Sparkles
          count={80}
          scale={2.5}
          size={1.5}
          speed={0.4}
          color="#00d4ff"
        />
      </group>
    </Float>
  );
}

// ─── Root App Canvas ──────────────────────────────────────
export default function Scene3D() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: 60, near: 0.01, far: 200, position: [0, 2, 8] }}
      shadows="soft"
    >
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 15, 60]} />

      <Suspense fallback={<Loader />}>
        <Environment preset="city" environmentIntensity={0.5} />
        <ScrollControls pages={4} damping={0.1}>
          <ScrollScene />
        </ScrollControls>
        <PostFX />
        <Preload all />
      </Suspense>

      {/* Adaptive DPR: drop to 1 when FPS falls below 55 */}
      <AdaptiveDpr pixelated />
      <BakeShadows />
    </Canvas>
  );
}
```

---

### Template 6: Procedural Background Shader (No Geometry Needed)
Full-screen GPU shader background — zero geometry cost.

```javascript
// Fullscreen quad — just 2 triangles, entire background is GLSL
const bgGeometry = new THREE.PlaneGeometry(2, 2);
const bgMaterial = new THREE.ShaderMaterial({
  depthTest: false,
  depthWrite: false,
  uniforms: {
    uTime:       { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    uMouse:      { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: /* glsl */`
    void main() {
      gl_Position = vec4(position.xy, 1.0, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform vec2  uResolution;
    uniform vec2  uMouse;

    #define PI  3.14159265
    #define TAU 6.28318530

    // Hash & FBM noise
    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
      );
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p = p * 2.1 + vec2(1.7, 9.2);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      uv      = uv * 2.0 - 1.0;
      uv.x   *= uResolution.x / uResolution.y;

      // Mouse influence
      vec2 m    = uMouse * 2.0 - 1.0;
      float md  = length(uv - m);

      // Animated nebula
      float t   = uTime * 0.12;
      float n   = fbm(uv * 1.5 + t + fbm(uv * 2.0 - t + fbm(uv + t)));

      // Color palette
      vec3 col1 = vec3(0.02, 0.02, 0.12);  // deep navy
      vec3 col2 = vec3(0.0, 0.4, 0.8);     // electric blue
      vec3 col3 = vec3(0.5, 0.0, 1.0);     // violet
      vec3 col4 = vec3(0.0, 0.9, 0.6);     // teal

      vec3 col  = mix(col1, col2, n);
      col       = mix(col, col3, n * n);
      col       = mix(col, col4, max(0.0, n - 0.7) * 3.0);

      // Mouse glow
      col      += col4 * smoothstep(0.8, 0.0, md) * 0.4;

      // Vignette
      float vig = 1.0 - smoothstep(0.3, 1.2, length(uv * 0.6));
      col      *= vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
bgMesh.renderOrder = -1;
bgMesh.frustumCulled = false;
scene.add(bgMesh);
```

---

### Template 7: Advanced Environment & Lighting Setup
IBL (Image-Based Lighting) for photorealistic materials.

```javascript
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

// ── DRACO + KTX2 (must-have for production) ───────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('/basis/')
  .detectSupport(renderer);

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setKTX2Loader(ktx2Loader);

// ── HDR Environment Map (IBL) ─────────────────────────────
const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader().load('/hdr/studio_4k.hdr', (hdr) => {
  const envMap = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = envMap;       // PBR lighting for all materials
  scene.background  = envMap;       // or keep null for custom bg
  hdr.dispose();
  pmrem.dispose();
});

// ── Physically Correct Lights ─────────────────────────────
const keyLight = new THREE.DirectionalLight(0xffffff, 3);
keyLight.position.set(5, 8, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.setScalar(2048);
keyLight.shadow.camera.near = 0.1;
keyLight.shadow.camera.far  = 50;
keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -10;
keyLight.shadow.camera.right = keyLight.shadow.camera.top = 10;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Rim light for edge definition
const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.5);
rimLight.position.set(-5, 2, -5);
scene.add(rimLight);

// ── PBR Material Presets ──────────────────────────────────
const chrome = new THREE.MeshPhysicalMaterial({
  metalness: 1.0,
  roughness: 0.05,
  envMapIntensity: 2.0,
  color: 0xffffff,
});

const frostedGlass = new THREE.MeshPhysicalMaterial({
  metalness: 0,
  roughness: 0.1,
  transmission: 1.0,
  thickness: 0.5,
  ior: 1.5,
  transparent: true,
  envMapIntensity: 1.0,
});

const glowingPlastic = new THREE.MeshPhysicalMaterial({
  color: 0x00d4ff,
  emissive: 0x00d4ff,
  emissiveIntensity: 0.4,
  roughness: 0.3,
  metalness: 0.1,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
});
```

---

### Template 8: No-GPU / Software Rendering Fallback (CSS3D + GSAP)
When hardware acceleration is disabled, WebGL software rendering is often too slow. Instead, pivot to high-end DOM-based 3D animations using CSS `transform-style: preserve-3d` and SVG.

```javascript
// 1. Detect WebGL / Hardware Acceleration
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    // failIfMajorPerformanceCaveat: true ensures we don't get a slow software renderer
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) || 
       canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true })));
  } catch (e) {
    return false;
  }
}

// 2. Fallback to Premium GSAP CSS3D
if (!isWebGLAvailable()) {
  console.warn("Hardware acceleration disabled. Falling back to DOM 3D.");
  
  // Use GSAP with CSS 3D transforms for a premium faux-3D effect
  gsap.set('.card-container', { perspective: 1000 });
  gsap.to('.card-element', {
    rotationY: 360,
    rotationX: 15,
    z: 100,
    duration: 2,
    ease: "power3.inOut",
    scrollTrigger: {
      trigger: ".card-container",
      scrub: 1
    }
  });
}
```

---
