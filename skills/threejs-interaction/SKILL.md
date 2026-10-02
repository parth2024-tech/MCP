---
name: threejs-interaction
description: Three.js interaction - raycasting, controls, mouse/touch input, object selection. Use when handling user input, implementing click detection, adding camera controls, or creating interactive 3D experiences.
risk: unknown
source: community
---

# Three.js Interaction

## When to Use
- You need user interaction inside a Three.js scene.
- The task involves raycasting, object picking, pointer handling, touch input, or camera controls.
- You are building an interactive 3D experience rather than a passive render.

## Quick Start

> See [references/details.md](references/details.md) for full code examples.

## Raycaster

### Basic Raycasting

> See [references/details.md](references/details.md) for full code examples.

### Mouse Position Conversion

```javascript
const mouse = new THREE.Vector2();

function updateMouse(event) {
  // For full window
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// For specific canvas element
function updateMouseCanvas(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}
```

### Touch Support

> See [references/details.md](references/details.md) for full code examples.

### Raycaster Options

```javascript
const raycaster = new THREE.Raycaster();

// Near/far clipping (default: 0, Infinity)
raycaster.near = 0;
raycaster.far = 100;

// Line/Points precision
raycaster.params.Line.threshold = 0.1;
raycaster.params.Points.threshold = 0.1;

// Layers (only intersect objects on specific layers)
raycaster.layers.set(1);
```

### Efficient Raycasting

```javascript
// Only check specific objects
const clickables = [mesh1, mesh2, mesh3];
const intersects = raycaster.intersectObjects(clickables, false);

// Use layers for filtering
mesh1.layers.set(1); // Clickable layer
raycaster.layers.set(1);

// Throttle raycast for hover effects
let lastRaycast = 0;
function onMouseMove(event) {
  const now = Date.now();
  if (now - lastRaycast < 50) return; // 20fps max
  lastRaycast = now;

  // Raycast here
}
```

## Camera Controls

### OrbitControls

> See [references/details.md](references/details.md) for full code examples.

#### OrbitControls Programmatic Methods (r183)

```javascript
// Programmatic camera movement
controls.dolly(1.5); // Dolly in/out (zoom for perspective cameras)
controls.pan(deltaX, deltaY); // Pan the camera
controls.rotate(deltaAzimuth, deltaPolar); // Rotate around target

// Cursor style (r183)
controls.cursorStyle = { orbit: "grab", pan: "move", dolly: "zoom-in" };
```

### FlyControls

```javascript
import { FlyControls } from "three/addons/controls/FlyControls.js";

const controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 10;
controls.rollSpeed = Math.PI / 24;
controls.dragToLook = true;

// Update with delta
function animate() {
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
}
```

### FirstPersonControls

```javascript
import { FirstPersonControls } from "three/addons/controls/FirstPersonControls.js";

const controls = new FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 10;
controls.lookSpeed = 0.1;
controls.lookVertical = true;
controls.constrainVertical = true;
controls.verticalMin = Math.PI / 4;
controls.verticalMax = (Math.PI * 3) / 4;

function animate() {
  controls.update(clock.getDelta());
}
```

### PointerLockControls

> See [references/details.md](references/details.md) for full code examples.

### TrackballControls

```javascript
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

const controls = new TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 2.0;
controls.zoomSpeed = 1.2;
controls.panSpeed = 0.8;
controls.staticMoving = true;

function animate() {
  controls.update();
}
```

### MapControls

```javascript
import { MapControls } from "three/addons/controls/MapControls.js";

const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
```

## TransformControls

Gizmo for moving/rotating/scaling objects.

> See [references/details.md](references/details.md) for full code examples.

## DragControls

Drag objects directly.

> See [references/details.md](references/details.md) for full code examples.

## Selection System

### Click to Select

> See [references/details.md](references/details.md) for full code examples.

### Box Selection

> See [references/details.md](references/details.md) for full code examples.

### Hover Effects

> See [references/details.md](references/details.md) for full code examples.

## Keyboard Input

> See [references/details.md](references/details.md) for full code examples.

## World-Screen Coordinate Conversion

### World to Screen

```javascript
function worldToScreen(position, camera) {
  const vector = position.clone();
  vector.project(camera);

  return {
    x: ((vector.x + 1) / 2) * window.innerWidth,
    y: (-(vector.y - 1) / 2) * window.innerHeight,
  };
}

// Position HTML element over 3D object
const screenPos = worldToScreen(mesh.position, camera);
element.style.left = screenPos.x + "px";
element.style.top = screenPos.y + "px";
```

### Screen to World

```javascript
function screenToWorld(screenX, screenY, camera, targetZ = 0) {
  const vector = new THREE.Vector3(
    (screenX / window.innerWidth) * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1,
    0.5,
  );

  vector.unproject(camera);

  const dir = vector.sub(camera.position).normalize();
  const distance = (targetZ - camera.position.z) / dir.z;

  return camera.position.clone().add(dir.multiplyScalar(distance));
}
```

### Ray-Plane Intersection

```javascript
function getRayPlaneIntersection(mouse, camera, plane) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(plane, intersection);

  return intersection;
}

// Ground plane
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const worldPos = getRayPlaneIntersection(mouse, camera, groundPlane);
```

## Event Handling Best Practices

> See [references/details.md](references/details.md) for full code examples.

## Performance Tips

1. **Limit raycasts**: Throttle mousemove handlers
2. **Use layers**: Filter raycast targets
3. **Simple collision meshes**: Use invisible simpler geometry for raycasting
4. **Disable controls when not needed**: `controls.enabled = false`
5. **Batch updates**: Group interaction checks

```javascript
// Use simpler geometry for raycasting
const complexMesh = loadedModel;
const collisionMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ visible: false }),
);
collisionMesh.userData.target = complexMesh;
clickables.push(collisionMesh);
```

## See Also

- `threejs-fundamentals` - Camera and scene setup
- `threejs-animation` - Animating interactions
- `threejs-shaders` - Visual feedback effects

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
