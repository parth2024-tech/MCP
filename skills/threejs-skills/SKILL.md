---
name: threejs-skills
description: "Create 3D scenes, interactive experiences, and visual effects using Three.js. Use when user requests 3D graphics, WebGL experiences, 3D visualizations, animations, or interactive 3D elements."
risk: safe
source: "https://github.com/CloudAI-X/threejs-skills"
date_added: "2026-02-27"
---

# Three.js Skills

Systematically create high-quality 3D scenes and interactive experiences using Three.js best practices.

## When to Use
- Requests 3D visualizations or graphics ("create a 3D model", "show in 3D")
- Wants interactive 3D experiences ("rotating cube", "explorable scene")
- Needs WebGL or canvas-based rendering
- Asks for animations, particles, or visual effects
- Mentions Three.js, WebGL, or 3D rendering
- Wants to visualize data in 3D space

## Core Setup Pattern

### 1. Essential Three.js Imports

Use ES module import maps for modern Three.js (r183+):

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.183.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.183.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
</script>
```

For production with npm/vite/webpack:

```javascript
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
```

### 2. Scene Initialization

Every Three.js artifact needs these core components:

```javascript
// Scene - contains all 3D objects
const scene = new THREE.Scene();

// Camera - defines viewing perspective
const camera = new THREE.PerspectiveCamera(
  75, // Field of view
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1, // Near clipping plane
  1000, // Far clipping plane
);
camera.position.z = 5;

// Renderer - draws the scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
```

### 3. Animation Loop

Use `renderer.setAnimationLoop()` (preferred) or `requestAnimationFrame`:

```javascript
// Preferred: setAnimationLoop (handles WebXR compatibility)
renderer.setAnimationLoop(() => {
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
});

// Alternative: manual requestAnimationFrame
function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
> See [references/details.md](references/details.md) for full code examples.
new THREE.CapsuleGeometry(0.5, 1, 4, 8); // radius, length, capSegments, radialSegments
```

### 3. Apply Materials

Choose materials based on visual needs:

**Common Materials:**

- `MeshBasicMaterial` - unlit, flat colors (no lighting needed)
- `MeshStandardMaterial` - physically-based, realistic (needs lighting)
- `MeshPhongMaterial` - shiny surfaces with specular highlights
- `MeshLambertMaterial` - matte surfaces, diffuse reflection

```javascript
const material = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  metalness: 0.5,
  roughness: 0.5,
});
```

### 4. Add Lighting

**If using lit materials** (Standard, Phong, Lambert), add lights:

```javascript
// Ambient light - general illumination
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Directional light - like sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);
```

**Skip lighting** if using `MeshBasicMaterial` - it's unlit by design.

### 5. Handle Responsiveness

Always add window resize handling:

```javascript
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## Common Patterns

### Rotating Object

```javascript
function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;
  renderer.render(scene, camera);
}
```

### OrbitControls

With import maps or build tools, OrbitControls works directly:

```javascript
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Update in animation loop
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

### Custom Camera Controls (Alternative)

For lightweight custom controls without importing OrbitControls:

> See [references/details.md](references/details.md) for full code examples.

### Raycasting for Object Selection

Detect mouse clicks and hovers on 3D objects:

> See [references/details.md](references/details.md) for full code examples.

### Particle System

> See [references/details.md](references/details.md) for full code examples.

### User Interaction (Mouse Movement)

```javascript
let mouseX = 0;
let mouseY = 0;

document.addEventListener("mousemove", (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
  requestAnimationFrame(animate);
  camera.position.x = mouseX * 2;
  camera.position.y = mouseY * 2;
  camera.lookAt(scene.position);
  renderer.render(scene, camera);
}
```

### Loading Textures

```javascript
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("texture-url.jpg");

const material = new THREE.MeshStandardMaterial({
  map: texture,
});
```

## Best Practices

### Performance

- **Reuse geometries and materials** when creating multiple similar objects
- **Use `BufferGeometry`** for custom shapes (more efficient)
- **Limit particle counts** to maintain 60fps (start with 1000-5000)
- **Dispose of resources** when removing objects:
  ```javascript
  geometry.dispose();
  material.dispose();
  texture.dispose();
> See [references/details.md](references/details.md) for full code examples.
// Enable shadows on renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

// Light that casts shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;

// Configure shadow quality
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;

scene.add(directionalLight);

// Objects cast and receive shadows
mesh.castShadow = true;
mesh.receiveShadow = true;

// Ground plane receives shadows
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
```

**Environment Maps & Reflections:**


**Tone Mapping & Output Encoding:**

```javascript
// Improve color accuracy and HDR rendering
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace; // Was outputEncoding in older versions

// Makes colors more vibrant and realistic
```

**Fog for Depth:**

```javascript
// Linear fog
scene.fog = new THREE.Fog(0xcccccc, 10, 50); // color, near, far

// Or exponential fog (more realistic)
scene.fog = new THREE.FogExp2(0xcccccc, 0.02); // color, density
```

### Custom Geometry from Vertices

```javascript
const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0]);
geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
```

### Post-Processing Effects

Post-processing effects are available via import maps or build tools. See `threejs-postprocessing` skill for EffectComposer, bloom, DOF, and more.

### Group Objects

```javascript
const group = new THREE.Group();
group.add(mesh1);
group.add(mesh2);
group.rotation.y = Math.PI / 4;
scene.add(group);
> See [references/details.md](references/details.md) for full code examples.
// With npm/vite/webpack:
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
```

### WebGPU Renderer (Alternative)

Three.js r183 includes a WebGPU renderer as an alternative to WebGL:

```javascript
import { WebGPURenderer } from "three/addons/renderers/webgpu/WebGPURenderer.js";

const renderer = new WebGPURenderer({ antialias: true });
await renderer.init();
renderer.setSize(window.innerWidth, window.innerHeight);
```

WebGPU uses TSL (Three.js Shading Language) instead of GLSL for custom shaders. See `threejs-shaders` for details.

### Timer (r183 Recommended)

`THREE.Timer` is recommended over `THREE.Clock` as of r183:

```javascript
const timer = new THREE.Timer();

renderer.setAnimationLoop(() => {
  timer.update();
  const delta = timer.getDelta();
  const elapsed = timer.getElapsed();

  mesh.rotation.y += delta;
  renderer.render(scene, camera);
});
```

**Benefits over Clock:**

- Not affected by page visibility (pauses when tab is hidden)
- Cleaner API design
- Better integration with `setAnimationLoop`

### Animation Libraries (GSAP Integration)

```javascript
// Smooth timeline-based animations
import gsap from "gsap";

// Instead of manual animation loops:
gsap.to(mesh.position, {
  x: 5,
  duration: 2,
  ease: "power2.inOut",
});

// Complex sequences:
const timeline = gsap.timeline();
timeline
  .to(mesh.rotation, { y: Math.PI * 2, duration: 2 })
  .to(mesh.scale, { x: 2, y: 2, z: 2, duration: 1 }, "-=1");
```

**Why GSAP:**

- Professional easing functions
- Timeline control (pause, reverse, scrub)
- Better than manual lerping for complex animations

### Scroll-Based Interactions

> See [references/details.md](references/details.md) for full code examples.

**Advanced scroll libraries:**

- ScrollTrigger (GSAP plugin)
- Locomotive Scroll
- Lenis smooth scroll

### Performance Optimization in Production

> See [references/details.md](references/details.md) for full code examples.

### Modern Loading Patterns

```javascript
// In production, load 3D models:
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const loader = new GLTFLoader();
loader.load("model.gltf", (gltf) => {
  scene.add(gltf.scene);

  // Traverse and setup materials
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
});
> See [references/details.md](references/details.md) for full code examples.
Three.js r183 + Vite
├── GSAP (animations)
├── React Three Fiber (optional - React integration)
├── Drei (helper components)
├── Leva (debug GUI)
└── Post-processing effects
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
