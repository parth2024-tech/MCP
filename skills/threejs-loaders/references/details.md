# Threejs Loaders — Code Reference

## ## LoadingManager

```javascript
const manager = new THREE.LoadingManager();

// Callbacks
manager.onStart = (url, loaded, total) => {
  console.log(`Started loading: ${url}`);
};

manager.onLoad = () => {
  console.log("All assets loaded!");
  startGame();
};

manager.onProgress = (url, loaded, total) => {
  const progress = (loaded / total) * 100;
  console.log(`Loading: ${progress.toFixed(1)}%`);
  updateProgressBar(progress);
};

manager.onError = (url) => {
  console.error(`Error loading: ${url}`);
};

// Use manager with loaders
const textureLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);

// Load assets
textureLoader.load("texture1.jpg");
textureLoader.load("texture2.jpg");
gltfLoader.load("model.glb");
// onLoad fires when ALL are complete
```


## ### TextureLoader

```javascript
const loader = new THREE.TextureLoader();

// Callback style
loader.load(
  "texture.jpg",
  (texture) => {
    // onLoad
    material.map = texture;
    material.needsUpdate = true;
  },
  undefined, // onProgress - not supported for image loading
  (error) => {
    // onError
    console.error("Error loading texture", error);
  },
);

// Synchronous (returns texture, loads async)
const texture = loader.load("texture.jpg");
material.map = texture;
```


## ### Texture Configuration

```javascript
const texture = loader.load("texture.jpg", (tex) => {
  // Color space (important for color accuracy)
  tex.colorSpace = THREE.SRGBColorSpace; // For color/albedo maps
  // tex.colorSpace = THREE.LinearSRGBColorSpace;  // For data maps (normal, roughness)

  // Wrapping
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // ClampToEdgeWrapping, RepeatWrapping, MirroredRepeatWrapping

  // Repeat/offset
  tex.repeat.set(2, 2);
  tex.offset.set(0.5, 0.5);
  tex.rotation = Math.PI / 4;
  tex.center.set(0.5, 0.5);

  // Filtering
  tex.minFilter = THREE.LinearMipmapLinearFilter; // Default
  tex.magFilter = THREE.LinearFilter; // Default
  // NearestFilter - pixelated
  // LinearFilter - smooth
  // LinearMipmapLinearFilter - smooth with mipmaps

  // Anisotropic filtering (sharper at angles)
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Flip Y (usually true for standard textures)
  tex.flipY = true;

  tex.needsUpdate = true;
});
```


## ### CubeTextureLoader

```javascript
const loader = new THREE.CubeTextureLoader();

// Load 6 faces
const cubeTexture = loader.load([
  "px.jpg",
  "nx.jpg", // positive/negative X
  "py.jpg",
  "ny.jpg", // positive/negative Y
  "pz.jpg",
  "nz.jpg", // positive/negative Z
]);

// Use as background
scene.background = cubeTexture;

// Use as environment map
scene.environment = cubeTexture;
material.envMap = cubeTexture;
```


## ## GLTF/GLB Loading

```javascript
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const loader = new GLTFLoader();

loader.load("model.glb", (gltf) => {
  // The loaded scene
  const model = gltf.scene;
  scene.add(model);

  // Animations
  const animations = gltf.animations;
  if (animations.length > 0) {
    const mixer = new THREE.AnimationMixer(model);
    animations.forEach((clip) => {
      mixer.clipAction(clip).play();
    });
  }

  // Cameras (if any)
  const cameras = gltf.cameras;

  // Asset info
  console.log(gltf.asset); // Version, generator, etc.

  // User data from Blender/etc
  console.log(gltf.userData);
});
```


## ### Process GLTF Content

```javascript
loader.load("model.glb", (gltf) => {
  const model = gltf.scene;

  // Enable shadows
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Find specific mesh
  const head = model.getObjectByName("Head");

  // Adjust materials
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.envMapIntensity = 0.5;
    }
  });

  // Center and scale
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.setScalar(1 / maxDim);

  scene.add(model);
});
```


## ### Load Multiple Assets

```javascript
async function loadAssets() {
  const [modelGltf, envTexture, colorTexture] = await Promise.all([
    loadGLTF("model.glb"),
    loadRGBE("environment.hdr"),
    loadTexture("color.jpg"),
  ]);

  scene.add(modelGltf.scene);
  scene.environment = envTexture;
  material.map = colorTexture;
}

// Helper functions
function loadGLTF(url) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(url, resolve, undefined, reject);
  });
}

function loadRGBE(url) {
  return new Promise((resolve, reject) => {
    new RGBELoader().load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, reject);
  });
}
```


## ### Custom Asset Manager

```javascript
class AssetManager {
  constructor() {
    this.textures = new Map();
    this.models = new Map();
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  async loadTexture(key, url) {
    if (this.textures.has(key)) {
      return this.textures.get(key);
    }

    const texture = await new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });

    this.textures.set(key, texture);
    return texture;
  }

  async loadModel(key, url) {
    if (this.models.has(key)) {
      return this.models.get(key).clone();
    }

    const gltf = await new Promise((resolve, reject) => {
      this.gltfLoader.load(url, resolve, undefined, reject);
    });

    this.models.set(key, gltf.scene);
    return gltf.scene.clone();
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    this.textures.clear();
    this.models.clear();
  }
}

// Usage
const assets = new AssetManager();
const texture = await assets.loadTexture("brick", "brick.jpg");
const model = await assets.loadModel("tree", "tree.glb");
```


## ## Error Handling

```javascript
// Graceful fallback
async function loadWithFallback(primaryUrl, fallbackUrl) {
  try {
    return await loadModel(primaryUrl);
  } catch (error) {
    console.warn(`Primary failed, trying fallback: ${error}`);
    return await loadModel(fallbackUrl);
  }
}

// Retry logic
async function loadWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await loadModel(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Timeout
async function loadWithTimeout(url, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Loading timed out");
    }
    throw error;
  }
}
```


