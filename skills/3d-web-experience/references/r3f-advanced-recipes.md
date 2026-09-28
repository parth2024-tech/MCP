# R3F + Drei — Advanced Recipes Reference

Production-grade React Three Fiber patterns used in award-winning web experiences.

---

## 1. Fully Loaded R3F Canvas — Production Setup

```jsx
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, BakeShadows, Preload } from '@react-three/drei';
import * as THREE from 'three';

<Canvas
  // Performance
  dpr={[1, 2]}                    // responsive DPR
  frameloop="demand"              // render only on change (or "always" for animation)
  performance={{ min: 0.5 }}      // allow quality drop before FPS drop

  // GL context options
  gl={{
    antialias: true,
    powerPreference: 'high-performance',
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.2,
    outputColorSpace: THREE.SRGBColorSpace,
    stencil: false,
  }}

  // Camera
  camera={{ fov: 60, near: 0.01, far: 500, position: [0, 2, 8] }}

  // Shadows
  shadows="soft"                  // PCFSoftShadowMap

  // Events
  events={(store) => ({          // limit event area to canvas only
    ...store,
    filter: (items) => items.filter((i) => i.object.userData.interactive),
  })}
>
  {/* Auto-drop DPR when FPS falls below threshold */}
  <AdaptiveDpr pixelated />

  {/* Reduce event overhead on low-end devices */}
  <AdaptiveEvents />

  {/* Bake static shadows for performance */}
  <BakeShadows />

  {/* Preload all assets declared in scene before render */}
  <Preload all />

  <Suspense fallback={<LoadingScreen />}>
    <Scene />
  </Suspense>
</Canvas>
```

---

## 2. useFrame — The Correct Way

```jsx
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function AnimatedMesh() {
  const meshRef = useRef();
  const { camera, size, viewport } = useThree();

  // ✅ Pre-allocate — NEVER inside useFrame
  const _quat   = useMemo(() => new THREE.Quaternion(), []);
  const _euler  = useMemo(() => new THREE.Euler(), []);
  const _target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, pointer }, delta) => {
    const t = clock.getElapsedTime();

    // Smooth follow mouse
    _target.set(pointer.x * 0.5, pointer.y * 0.3, 0);
    meshRef.current.position.lerp(_target, delta * 2);

    // Rotation via euler reuse
    _euler.set(t * 0.2, t * 0.5, 0);
    meshRef.current.rotation.copy(_euler);

    // Only re-render when something changed
    // (with frameloop="demand", call invalidate() to trigger a frame)
  });

  return <mesh ref={meshRef}><boxGeometry /><meshStandardMaterial /></mesh>;
}
```

---

## 3. Scroll-Driven 3D with useScroll

```jsx
import { ScrollControls, useScroll, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function ScrollScene() {
  const scroll = useScroll();
  const groupRef = useRef();
  const matRef   = useRef();

  useFrame(() => {
    // scroll.offset: 0→1 as user scrolls
    // scroll.range(from, distance): sub-range 0→1
    // scroll.curve(from, distance): eased sub-range

    const t = scroll.offset;

    // Camera-driven rotation
    groupRef.current.rotation.y = t * Math.PI * 2;

    // Opacity reveal between 0.3 and 0.6 of scroll
    matRef.current.opacity = scroll.range(0.3, 0.3);

    // Position lerp via scroll
    groupRef.current.position.y = (t - 0.5) * 4;
  });

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3} floatingRange={[-0.05, 0.05]}>
      <group ref={groupRef}>
        <mesh>
          <icosahedronGeometry args={[1, 4]} />
          <meshPhysicalMaterial ref={matRef} transparent metalness={1} roughness={0.1} />
        </mesh>
      </group>
    </Float>
  );
}

function App() {
  return (
    <Canvas>
      <ScrollControls pages={5} damping={0.15} distance={1}>
        <ScrollScene />
      </ScrollControls>
    </Canvas>
  );
}
```

---

## 4. Glass / Transmission Material

```jsx
import { MeshTransmissionMaterial, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function GlassObject() {
  const ref = useRef();

  useFrame(({ clock }) => {
    // Drive subtle ripple via time
    ref.current.distortionScale = Math.sin(clock.getElapsedTime() * 0.5) * 0.05 + 0.1;
  });

  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshTransmissionMaterial
        ref={ref}
        backside              // render inside surface
        backsideThickness={0.3}
        samples={16}          // quality: 4 mobile, 16 desktop
        resolution={512}      // render target size
        transmission={1}      // 1 = fully transparent
        roughness={0.05}
        thickness={0.4}
        ior={1.5}             // glass = 1.5, diamond = 2.4
        chromaticAberration={0.04}
        anisotropy={0.1}
        distortion={0.1}
        distortionScale={0.1}
        temporalDistortion={0.1}
        iridescence={1}
        iridescenceIOR={1.3}
        iridescenceThicknessRange={[100, 400]}
        color="#ffffff"
        attenuationColor="#d0f0ff"
        attenuationDistance={0.5}
      />
    </mesh>
  );
}
```

---

## 5. Custom Shader in R3F (extend pattern)

```jsx
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define the class
class NebulaShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime:   { value: 0 },
        uColor1: { value: new THREE.Color('#0a0a2e') },
        uColor2: { value: new THREE.Color('#00d4ff') },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        varying vec2 vUv;
        void main() {
          float t = sin(vUv.x * 6.28 + uTime) * 0.5 + 0.5;
          gl_FragColor = vec4(mix(uColor1, uColor2, t), 1.0);
        }
      `,
    });
  }

  // Expose uniforms as props
  get uTime()   { return this.uniforms.uTime.value; }
  set uTime(v)  { this.uniforms.uTime.value = v; }
}

// Register so JSX can use it
extend({ NebulaShaderMaterial });

// Use in JSX — fully typed with TypeScript declaration if needed
function NebulaMesh() {
  const matRef = useRef();
  useFrame(({ clock }) => { matRef.current.uTime = clock.getElapsedTime(); });

  return (
    <mesh>
      <planeGeometry args={[10, 10, 64, 64]} />
      <nebulaShaderMaterial ref={matRef} side={THREE.DoubleSide} />
    </mesh>
  );
}
```

---

## 6. LOD (Level of Detail) — Mobile Performance

```jsx
import { Detailed } from '@react-three/drei';

// Renders different geometries based on camera distance
function OptimizedModel() {
  return (
    <Detailed distances={[0, 10, 20, 50]}>
      {/* < 10 units: ultra-high detail */}
      <mesh><icosahedronGeometry args={[1, 8]} /></mesh>
      {/* 10-20 units: medium */}
      <mesh><icosahedronGeometry args={[1, 3]} /></mesh>
      {/* 20-50 units: low */}
      <mesh><icosahedronGeometry args={[1, 1]} /></mesh>
      {/* > 50 units: billboard/sprite */}
      <sprite scale={[2, 2, 1]}>
        <spriteMaterial map={billboardTexture} />
      </sprite>
    </Detailed>
  );
}
```

---

## 7. Portal / Teleport (Scene-in-Scene)

```jsx
import { createPortal, useFrame } from '@react-three/fiber';
import { useFBO, PerspectiveCamera } from '@react-three/drei';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function PortalScreen() {
  const portalCam  = useRef();
  const renderTarget = useFBO(512, 512, { samples: 4 });

  // Separate scene for portal content
  const portalScene = useMemo(() => new THREE.Scene(), []);

  useFrame(({ gl }) => {
    // Render portal scene to texture each frame
    gl.setRenderTarget(renderTarget);
    gl.render(portalScene, portalCam.current);
    gl.setRenderTarget(null);
  });

  return (
    <>
      {/* Portal content rendered to FBO */}
      {createPortal(
        <group>
          <PerspectiveCamera ref={portalCam} makeDefault={false} position={[0, 0, 5]} />
          <ambientLight />
          <mesh rotation-y={Date.now() * 0.001}>
            <torusGeometry args={[1, 0.3, 16, 100]} />
            <meshNormalMaterial />
          </mesh>
        </group>,
        portalScene
      )}

      {/* Display on screen */}
      <mesh>
        <planeGeometry args={[3, 2]} />
        <meshBasicMaterial map={renderTarget.texture} />
      </mesh>
    </>
  );
}
```

---

## 8. Environment Maps — IBL Lighting

```jsx
import { Environment, useEnvironment } from '@react-three/drei';

// Option A: Preset (fastest, CDN-hosted)
<Environment preset="city" environmentIntensity={0.6} background={false} />

// Option B: Custom HDR
<Environment files="/hdr/studio_4k.hdr" environmentIntensity={1.0} />

// Option C: Procedural (no file needed)
<Environment resolution={256}>
  <mesh scale={100}>
    <sphereGeometry args={[1, 64, 64]} />
    <meshBasicMaterial color="#050520" side={THREE.BackSide} />
  </mesh>
  <pointLight position={[10, 10, 10]} intensity={300} color="#00d4ff" />
  <pointLight position={[-10, -5, -10]} intensity={100} color="#7c3aed" />
</Environment>
```

---

## 9. Physics Integration (Rapier)

```jsx
import { Physics, RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier';

function PhysicsScene() {
  return (
    <Physics debug={process.env.NODE_ENV === 'development'} gravity={[0, -9.81, 0]}>
      {/* Static floor */}
      <RigidBody type="fixed">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <CuboidCollider args={[15, 0.1, 15]} />
      </RigidBody>

      {/* Dynamic sphere */}
      <RigidBody restitution={0.7} friction={0.5}>
        <mesh position={[0, 5, 0]}>
          <sphereGeometry args={[0.5]} />
          <meshPhysicalMaterial metalness={0.8} roughness={0.1} />
        </mesh>
        <BallCollider args={[0.5]} />
      </RigidBody>
    </Physics>
  );
}
```

---

## 10. Trail Effect — Weapon / Particle Trails

```jsx
import { Trail, Float } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function TrailingOrb() {
  const ref = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    ref.current.position.set(
      Math.sin(t) * 3,
      Math.cos(t * 0.7) * 2,
      Math.cos(t * 0.5) * 1
    );
  });

  return (
    <Trail
      width={1.5}
      length={8}
      color="#00d4ff"
      attenuation={(t) => t * t}  // quadratic fade
    >
      <mesh ref={ref}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#00d4ff" />
      </mesh>
    </Trail>
  );
}
```
