# Threejs Skills — Code Reference

## ### 3. Animation Loop

```

## Systematic Development Process

### 1. Define the Scene

Start by identifying:

- **What objects** need to be rendered
- **Camera position** and field of view
- **Lighting setup** required
- **Interaction model** (static, rotating, user-controlled)

### 2. Build Geometry

Choose appropriate geometry types:

**Basic Shapes:**

- `BoxGeometry` - cubes, rectangular prisms
- `SphereGeometry` - spheres, planets
- `CylinderGeometry` - cylinders, tubes
- `PlaneGeometry` - flat surfaces, ground planes
- `TorusGeometry` - donuts, rings

**CapsuleGeometry** is available (stable since r142):

```javascript


## ### Custom Camera Controls (Alternative)

```javascript
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

renderer.domElement.addEventListener("mousedown", () => {
  isDragging = true;
});

renderer.domElement.addEventListener("mouseup", () => {
  isDragging = false;
});

renderer.domElement.addEventListener("mousemove", (event) => {
  if (isDragging) {
    const deltaX = event.clientX - previousMousePosition.x;
    const deltaY = event.clientY - previousMousePosition.y;

    // Rotate camera around scene
    const rotationSpeed = 0.005;
    camera.position.x += deltaX * rotationSpeed;
    camera.position.y -= deltaY * rotationSpeed;
    camera.lookAt(scene.position);
  }

  previousMousePosition = { x: event.clientX, y: event.clientY };
});

// Zoom with mouse wheel
renderer.domElement.addEventListener("wheel", (event) => {
  event.preventDefault();
  camera.position.z += event.deltaY * 0.01;
  camera.position.z = Math.max(2, Math.min(20, camera.position.z)); // Clamp
});
```


## ### Raycasting for Object Selection

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clickableObjects = []; // Array of meshes that can be clicked

// Update mouse position
window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Detect clicks
window.addEventListener("click", () => {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    // Handle click - change color, scale, etc.
    clickedObject.material.color.set(0xff0000);
  }
});

// Hover effect in animation loop
function animate() {
  requestAnimationFrame(animate);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableObjects);

  // Reset all objects
  clickableObjects.forEach((obj) => {
    obj.scale.set(1, 1, 1);
  });

  // Highlight hovered object
  if (intersects.length > 0) {
    intersects[0].object.scale.set(1.2, 1.2, 1.2);
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
  }

  renderer.render(scene, camera);
}
```


## ### Particle System

```javascript
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1000;
const posArray = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
  posArray[i] = (Math.random() - 0.5) * 10;
}

particlesGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(posArray, 3),
);

const particlesMaterial = new THREE.PointsMaterial({
  size: 0.02,
  color: 0xffffff,
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);
```


## ### Performance

  ```

### Visual Quality

- Always set `antialias: true` on renderer for smooth edges
- Use appropriate camera FOV (45-75 degrees typical)
- Position lights thoughtfully - avoid overlapping multiple bright lights
- Add ambient + directional lighting for realistic scenes

### Code Organization

- Initialize scene, camera, renderer at the top
- Group related objects (e.g., all particles in one group)
- Keep animation logic in the animate function
- Separate object creation into functions for complex scenes

### Common Pitfalls to Avoid

- ❌ Using `outputEncoding` instead of `outputColorSpace` (renamed in r152)
- ❌ Forgetting to add objects to scene with `scene.add()`
- ❌ Using lit materials without adding lights
- ❌ Not handling window resize
- ❌ Forgetting to call `renderer.render()` in animation loop
- ❌ Using `THREE.Clock` without considering `THREE.Timer` (recommended in r183)

## Example Workflow

User: "Create an interactive 3D sphere that responds to mouse movement"

1. **Setup**: Import Three.js, create scene/camera/renderer
2. **Geometry**: Create `SphereGeometry(1, 32, 32)` for smooth sphere
3. **Material**: Use `MeshStandardMaterial` for realistic look
4. **Lighting**: Add ambient + directional lights
5. **Interaction**: Track mouse position, update camera
6. **Animation**: Rotate sphere, render continuously
7. **Responsive**: Add window resize handler
8. **Result**: Smooth, interactive 3D sphere ✓

## Troubleshooting

**Black screen / Nothing renders:**

- Check if objects added to scene
- Verify camera position isn't inside objects
- Ensure renderer.render() is called
- Add lights if using lit materials

**Poor performance:**

- Reduce particle count
- Lower geometry detail (segments)
- Reuse materials/geometries
- Check browser console for errors

**Objects not visible:**

- Check object position vs camera position
- Verify material has visible color/properties
- Ensure camera far plane includes objects
- Add lighting if needed

## Advanced Techniques

### Visual Polish for Portfolio-Grade Rendering

**Shadows:**

```javascript


```javascript
// Create environment map from cubemap
const loader = new THREE.CubeTextureLoader();
const envMap = loader.load([
  "px.jpg",
  "nx.jpg", // positive x, negative x
  "py.jpg",
  "ny.jpg", // positive y, negative y
  "pz.jpg",
  "nz.jpg", // positive z, negative z
]);

scene.environment = envMap; // Affects all PBR materials
scene.background = envMap; // Optional: use as skybox

// Or apply to specific materials
const material = new THREE.MeshStandardMaterial({
  metalness: 1.0,
  roughness: 0.1,
  envMap: envMap,
});
```


## ### Group Objects

```

## Summary

Three.js artifacts require systematic setup:

1. Import Three.js via import maps or build tools
2. Initialize scene, camera, renderer
3. Create geometry + material = mesh
4. Add lighting if using lit materials
5. Implement animation loop (prefer `setAnimationLoop`)
6. Handle window resize
7. Set `renderer.outputColorSpace = THREE.SRGBColorSpace`

Follow these patterns for reliable, performant 3D experiences.

## Modern Three.js Practices (r183)

### Modular Imports

```javascript


## ### Scroll-Based Interactions

```javascript
// Sync 3D animations with page scroll
let scrollY = window.scrollY;

window.addEventListener("scroll", () => {
  scrollY = window.scrollY;
});

function animate() {
  requestAnimationFrame(animate);

  // Rotate based on scroll position
  mesh.rotation.y = scrollY * 0.001;

  // Move camera through scene
  camera.position.y = -(scrollY / window.innerHeight) * 10;

  renderer.render(scene, camera);
}
```


## ### Performance Optimization in Production

```javascript
// Level of Detail (LOD)
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0); // Close up
lod.addLevel(mediumDetailMesh, 10); // Medium distance
lod.addLevel(lowDetailMesh, 50); // Far away
scene.add(lod);

// Instanced meshes for many identical objects
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial();
const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);

// Set transforms for each instance
const matrix = new THREE.Matrix4();
for (let i = 0; i < 1000; i++) {
  matrix.setPosition(
    Math.random() * 100,
    Math.random() * 100,
    Math.random() * 100,
  );
  instancedMesh.setMatrixAt(i, matrix);
}
```


## ### Modern Loading Patterns

```

### When to Use What

**Import Map Approach:**

- Quick prototypes and demos
- Educational content
- Artifacts and embedded experiences
- No build step required

**Production Build Approach:**

- Client projects and portfolios
- Complex applications
- Performance-critical applications
- Team collaboration with version control

### Recommended Production Stack

```


