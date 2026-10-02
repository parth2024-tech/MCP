---
name: threejs-geometry
description: Three.js geometry creation - built-in shapes, BufferGeometry, custom geometry, instancing. Use when creating 3D shapes, working with vertices, building custom meshes, or optimizing with instanced rendering.
risk: unknown
source: community
---

# Three.js Geometry

## When to Use
- You need to create or optimize geometry in Three.js.
- The task involves built-in shapes, custom `BufferGeometry`, vertices, or instanced rendering.
- You are working on mesh structure rather than scene setup or materials alone.

## Quick Start

```javascript
import * as THREE from "three";

// Built-in geometry
const box = new THREE.BoxGeometry(1, 1, 1);
const sphere = new THREE.SphereGeometry(0.5, 32, 32);
const plane = new THREE.PlaneGeometry(10, 10);

// Create mesh
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const mesh = new THREE.Mesh(box, material);
scene.add(mesh);
```

## Built-in Geometries

### Basic Shapes

> See [references/details.md](references/details.md) for full code examples.

### Advanced Shapes

> See [references/details.md](references/details.md) for full code examples.

### Path-Based Shapes

> See [references/details.md](references/details.md) for full code examples.

### Text Geometry

> See [references/details.md](references/details.md) for full code examples.

## BufferGeometry

The base class for all geometries. Stores data as typed arrays for GPU efficiency.

### Custom BufferGeometry

> See [references/details.md](references/details.md) for full code examples.

### BufferAttribute Types

```javascript
// Common attribute types
new THREE.BufferAttribute(array, itemSize);

// Typed array options
new Float32Array(count * itemSize); // Positions, normals, UVs
new Uint16Array(count); // Indices (up to 65535 vertices)
new Uint32Array(count); // Indices (larger meshes)
new Uint8Array(count * itemSize); // Colors (0-255 range)

// Item sizes
// Position: 3 (x, y, z)
// Normal: 3 (x, y, z)
// UV: 2 (u, v)
// Color: 3 (r, g, b) or 4 (r, g, b, a)
// Index: 1
```

### Modifying BufferGeometry

> See [references/details.md](references/details.md) for full code examples.

### Interleaved Buffers (Advanced)

```javascript
// More efficient memory layout for large meshes
const interleavedBuffer = new THREE.InterleavedBuffer(
  new Float32Array([
    // pos.x, pos.y, pos.z, uv.u, uv.v (repeated per vertex)
    -1, -1, 0, 0, 0, 1, -1, 0, 1, 0, 1, 1, 0, 1, 1, -1, 1, 0, 0, 1,
  ]),
  5, // stride (floats per vertex)
);

geometry.setAttribute(
  "position",
  new THREE.InterleavedBufferAttribute(interleavedBuffer, 3, 0),
); // size 3, offset 0
geometry.setAttribute(
  "uv",
  new THREE.InterleavedBufferAttribute(interleavedBuffer, 2, 3),
); // size 2, offset 3
```

## EdgesGeometry & WireframeGeometry

```javascript
// Edge lines (only hard edges)
const edges = new THREE.EdgesGeometry(boxGeometry, 15); // 15 = threshold angle
const edgeMesh = new THREE.LineSegments(
  edges,
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);

// Wireframe (all triangles)
const wireframe = new THREE.WireframeGeometry(boxGeometry);
const wireMesh = new THREE.LineSegments(
  wireframe,
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
```

## Points

> See [references/details.md](references/details.md) for full code examples.

## Lines

> See [references/details.md](references/details.md) for full code examples.

## InstancedMesh

Efficiently render many copies of the same geometry.

> See [references/details.md](references/details.md) for full code examples.

### Update Instance at Runtime

```javascript
// Update single instance
const matrix = new THREE.Matrix4();
instancedMesh.getMatrixAt(index, matrix);
// Modify matrix...
instancedMesh.setMatrixAt(index, matrix);
instancedMesh.instanceMatrix.needsUpdate = true;

// Raycasting with instanced mesh
const intersects = raycaster.intersectObject(instancedMesh);
if (intersects.length > 0) {
  const instanceId = intersects[0].instanceId;
}
```

## InstancedBufferGeometry (Advanced)

For custom per-instance attributes beyond transform/color.

```javascript
const geometry = new THREE.InstancedBufferGeometry();
geometry.copy(new THREE.BoxGeometry(1, 1, 1));

// Add per-instance attribute
const offsets = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  offsets[i * 3] = Math.random() * 10;
  offsets[i * 3 + 1] = Math.random() * 10;
  offsets[i * 3 + 2] = Math.random() * 10;
}
geometry.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));

// Use in shader
// attribute vec3 offset;
// vec3 transformed = position + offset;
```

## Geometry Utilities

```javascript
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Merge geometries (must have same attributes)
const merged = BufferGeometryUtils.mergeGeometries([geo1, geo2, geo3]);

// Merge with groups (for multi-material)
const merged = BufferGeometryUtils.mergeGeometries([geo1, geo2], true);

// Compute tangents (required for normal maps)
BufferGeometryUtils.computeTangents(geometry);

// Interleave attributes for better performance
const interleaved = BufferGeometryUtils.interleaveAttributes([
  geometry.attributes.position,
  geometry.attributes.normal,
  geometry.attributes.uv,
]);
```

## Common Patterns

### Center Geometry

```javascript
geometry.computeBoundingBox();
geometry.center(); // Move vertices so center is at origin
```

### Scale to Fit

```javascript
geometry.computeBoundingBox();
const size = new THREE.Vector3();
geometry.boundingBox.getSize(size);
const maxDim = Math.max(size.x, size.y, size.z);
geometry.scale(1 / maxDim, 1 / maxDim, 1 / maxDim);
```

### Clone and Transform

```javascript
const clone = geometry.clone();
clone.rotateX(Math.PI / 2);
clone.translate(0, 1, 0);
clone.scale(2, 2, 2);
```

### Morph Targets

```javascript
// Base geometry
const geometry = new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);

// Create morph target
const morphPositions = geometry.attributes.position.array.slice();
for (let i = 0; i < morphPositions.length; i += 3) {
  morphPositions[i] *= 2; // Scale X
  morphPositions[i + 1] *= 0.5; // Squash Y
}

geometry.morphAttributes.position = [
  new THREE.BufferAttribute(new Float32Array(morphPositions), 3),
];

const mesh = new THREE.Mesh(geometry, material);
mesh.morphTargetInfluences[0] = 0.5; // 50% blend
```

## Performance Tips

1. **Use indexed geometry**: Reuse vertices with indices
2. **Merge static meshes**: Reduce draw calls with `mergeGeometries`
3. **Use InstancedMesh**: For many identical objects
4. **Choose appropriate segment counts**: More segments = smoother but slower
5. **Dispose unused geometry**: `geometry.dispose()`

```javascript
// Good segment counts for common uses
new THREE.SphereGeometry(1, 32, 32); // Good quality
new THREE.SphereGeometry(1, 64, 64); // High quality
new THREE.SphereGeometry(1, 16, 16); // Performance mode

// Dispose when done
geometry.dispose();
```

## BatchedMesh (r183)

`BatchedMesh` is a higher-level alternative to `InstancedMesh` that supports multiple geometries in a single draw call. As of r183, it supports **per-instance opacity** and **per-instance wireframe**.

> See [references/details.md](references/details.md) for full code examples.

## See Also

- `threejs-fundamentals` - Scene setup and Object3D
- `threejs-materials` - Material types for meshes
- `threejs-shaders` - Custom vertex manipulation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
