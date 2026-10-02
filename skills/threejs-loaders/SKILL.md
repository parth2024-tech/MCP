---
name: threejs-loaders
description: Three.js asset loading - GLTF, textures, images, models, async patterns. Use when loading 3D models, textures, HDR environments, or managing loading progress.
risk: unknown
source: community
---

# Three.js Loaders

## When to Use
- You need to load models, textures, HDR assets, or other external resources in Three.js.
- The task involves `GLTFLoader`, `TextureLoader`, loading progress, or async asset orchestration.
- You are managing scene assets rather than authoring geometry or shaders directly.

## Quick Start

```javascript
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Load GLTF model
const loader = new GLTFLoader();
loader.load("model.glb", (gltf) => {
  scene.add(gltf.scene);
});

// Load texture
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load("texture.jpg");
```

## LoadingManager

Coordinate multiple loaders and track progress.

> See [references/details.md](references/details.md) for full code examples.

## Texture Loading

### TextureLoader

> See [references/details.md](references/details.md) for full code examples.

### Texture Configuration

> See [references/details.md](references/details.md) for full code examples.

### CubeTextureLoader

For environment maps and skyboxes.

> See [references/details.md](references/details.md) for full code examples.

### HDR/EXR Loading

```javascript
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";

// HDR
const rgbeLoader = new RGBELoader();
rgbeLoader.load("environment.hdr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.background = texture;
});

// EXR
const exrLoader = new EXRLoader();
exrLoader.load("environment.exr", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
});
```

### PMREMGenerator

Generate prefiltered environment maps for PBR.

```javascript
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader().load("environment.hdr", (texture) => {
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;

  scene.environment = envMap;
  scene.background = envMap;

  texture.dispose();
  pmremGenerator.dispose();
});
```

## GLTF/GLB Loading

The most common 3D format for web.

> See [references/details.md](references/details.md) for full code examples.

### GLTF with Draco Compression

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
);
dracoLoader.preload();

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load("compressed-model.glb", (gltf) => {
  scene.add(gltf.scene);
});
```

### GLTF with KTX2 Textures

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath(
  "https://cdn.jsdelivr.net/npm/three@0.183.0/examples/jsm/libs/basis/",
);
ktx2Loader.detectSupport(renderer);

const gltfLoader = new GLTFLoader();
gltfLoader.setKTX2Loader(ktx2Loader);

gltfLoader.load("model-with-ktx2.glb", (gltf) => {
  scene.add(gltf.scene);
});
```

### GLTF with Meshopt Compression (r183)

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

gltfLoader.load("compressed-model.glb", (gltf) => {
  scene.add(gltf.scene);
});
```

**KHR_meshopt_compression** is an alternative to Draco that often provides better compression for animated meshes and preserves mesh topology.

### Process GLTF Content

> See [references/details.md](references/details.md) for full code examples.

## Other Model Formats

### OBJ + MTL

```javascript
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";

const mtlLoader = new MTLLoader();
mtlLoader.load("model.mtl", (materials) => {
  materials.preload();

  const objLoader = new OBJLoader();
  objLoader.setMaterials(materials);
  objLoader.load("model.obj", (object) => {
    scene.add(object);
  });
});
```

### FBX

```javascript
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";

const loader = new FBXLoader();
loader.load("model.fbx", (object) => {
  // FBX often has large scale
  object.scale.setScalar(0.01);

  // Animations
  const mixer = new THREE.AnimationMixer(object);
  object.animations.forEach((clip) => {
    mixer.clipAction(clip).play();
  });

  scene.add(object);
});
```

### STL

```javascript
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const loader = new STLLoader();
loader.load("model.stl", (geometry) => {
  const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

### PLY

```javascript
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";

const loader = new PLYLoader();
loader.load("model.ply", (geometry) => {
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
});
```

## Async/Promise Loading

### Promisified Loader

```javascript
function loadModel(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

// Usage
async function init() {
  try {
    const gltf = await loadModel("model.glb");
    scene.add(gltf.scene);
  } catch (error) {
    console.error("Failed to load model:", error);
  }
}
```

### Load Multiple Assets

> See [references/details.md](references/details.md) for full code examples.

## Caching

### Built-in Cache

```javascript
// Enable cache
THREE.Cache.enabled = true;

// Clear cache
THREE.Cache.clear();

// Manual cache management
THREE.Cache.add("key", data);
THREE.Cache.get("key");
THREE.Cache.remove("key");
```

### Custom Asset Manager

> See [references/details.md](references/details.md) for full code examples.

## Loading from Different Sources

### Data URL / Base64

```javascript
const loader = new THREE.TextureLoader();
const texture = loader.load("data:image/png;base64,iVBORw0KGgo...");
```

### Blob URL

```javascript
async function loadFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  const texture = await loadTexture(url);
  URL.revokeObjectURL(url);
  return texture;
}
```

### ArrayBuffer

```javascript
// From fetch
const response = await fetch("model.glb");
const buffer = await response.arrayBuffer();

// Parse with loader
const loader = new GLTFLoader();
loader.parse(buffer, "", (gltf) => {
  scene.add(gltf.scene);
});
```

### Custom Path/URL

```javascript
// Set base path
loader.setPath("assets/models/");
loader.load("model.glb"); // Loads from assets/models/model.glb

// Set resource path (for textures referenced in model)
loader.setResourcePath("assets/textures/");

// Custom URL modifier
manager.setURLModifier((url) => {
  return `https://cdn.example.com/${url}`;
});
```

## Error Handling

> See [references/details.md](references/details.md) for full code examples.

## Performance Tips

1. **Use compressed formats**: DRACO for geometry, KTX2/Basis for textures
2. **Load progressively**: Show placeholders while loading
3. **Lazy load**: Only load what's needed
4. **Use CDN**: Faster asset delivery
5. **Enable cache**: `THREE.Cache.enabled = true`

```javascript
// Progressive loading with placeholder
const placeholder = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ wireframe: true }),
);
scene.add(placeholder);

loadModel("model.glb").then((gltf) => {
  scene.remove(placeholder);
  scene.add(gltf.scene);
});
```

## VRMLLoader Camera Support (r183)

As of r183, `VRMLLoader` supports loading cameras defined in VRML files.

## See Also

- `threejs-textures` - Texture configuration
- `threejs-animation` - Playing loaded animations
- `threejs-materials` - Material from loaded models

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
