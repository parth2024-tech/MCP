---
name: threejs-shaders
description: Three.js shaders - GLSL, ShaderMaterial, uniforms, custom effects. Use when creating custom visual effects, modifying vertices, writing fragment shaders, or extending built-in materials.
risk: unknown
source: community
---

# Three.js Shaders

## When to Use
- You need custom shader logic in Three.js.
- The task involves `ShaderMaterial`, uniforms, GLSL, vertex deformation, or fragment-based effects.
- You are extending material behavior beyond what built-in materials provide.

## Quick Start

> See [references/details.md](references/details.md) for full code examples.

## ShaderMaterial vs RawShaderMaterial

### ShaderMaterial

Three.js provides built-in uniforms and attributes.

> See [references/details.md](references/details.md) for full code examples.

### RawShaderMaterial

Full control - you define everything.

> See [references/details.md](references/details.md) for full code examples.

## Uniforms

### Uniform Types

> See [references/details.md](references/details.md) for full code examples.

### GLSL Declarations

```glsl
// In shader
uniform float floatValue;
uniform int intValue;
uniform vec2 vec2Value;
uniform vec3 vec3Value;
uniform vec3 colorValue;    // Color becomes vec3
uniform vec4 vec4Value;
uniform mat3 mat3Value;
uniform mat4 mat4Value;
uniform sampler2D textureValue;
uniform samplerCube cubeTextureValue;
uniform float floatArray[3];
uniform vec3 vec3Array[2];
```

### Updating Uniforms

```javascript
// Direct assignment
material.uniforms.time.value = clock.getElapsedTime();

// Vector/Color updates
material.uniforms.position.value.set(x, y, z);
material.uniforms.color.value.setHSL(hue, 1, 0.5);

// Matrix updates
material.uniforms.matrix.value.copy(mesh.matrixWorld);
```

## Varyings

Pass data from vertex to fragment shader.

> See [references/details.md](references/details.md) for full code examples.

## Common Shader Patterns

### Texture Sampling

> See [references/details.md](references/details.md) for full code examples.

### Vertex Displacement

> See [references/details.md](references/details.md) for full code examples.

### Fresnel Effect

> See [references/details.md](references/details.md) for full code examples.

### Noise-Based Effects

> See [references/details.md](references/details.md) for full code examples.

### Gradient

```glsl
// Linear gradient
vec3 color = mix(colorA, colorB, vUv.y);

// Radial gradient
float dist = distance(vUv, vec2(0.5));
vec3 color = mix(centerColor, edgeColor, dist * 2.0);

// Smooth gradient with custom curve
float t = smoothstep(0.0, 1.0, vUv.y);
vec3 color = mix(colorA, colorB, t);
```

### Rim Lighting

> See [references/details.md](references/details.md) for full code examples.

### Dissolve Effect

```glsl
uniform float progress;
uniform sampler2D noiseMap;

void main() {
  float noise = texture2D(noiseMap, vUv).r;

  if (noise < progress) {
    discard;
  }

  // Edge glow
  float edge = smoothstep(progress, progress + 0.1, noise);
  vec3 edgeColor = vec3(1.0, 0.5, 0.0);
  vec3 baseColor = vec3(0.5);

  gl_FragColor = vec4(mix(edgeColor, baseColor, edge), 1.0);
}
```

## Extending Built-in Materials

### onBeforeCompile

Modify existing material shaders.

> See [references/details.md](references/details.md) for full code examples.

### Common Injection Points

```javascript
// Vertex shader chunks
"#include <begin_vertex>"; // After position is calculated
"#include <project_vertex>"; // After gl_Position
"#include <beginnormal_vertex>"; // Normal calculation start

// Fragment shader chunks
"#include <color_fragment>"; // After diffuse color
"#include <output_fragment>"; // Final output
"#include <fog_fragment>"; // After fog applied
```

## GLSL Built-in Functions

### Math Functions

```glsl
// Basic
abs(x), sign(x), floor(x), ceil(x), fract(x)
mod(x, y), min(x, y), max(x, y), clamp(x, min, max)
mix(a, b, t), step(edge, x), smoothstep(edge0, edge1, x)

// Trigonometry
sin(x), cos(x), tan(x)
asin(x), acos(x), atan(y, x), atan(x)
radians(degrees), degrees(radians)

// Exponential
pow(x, y), exp(x), log(x), exp2(x), log2(x)
sqrt(x), inversesqrt(x)
```

### Vector Functions

```glsl
// Length and distance
length(v), distance(p0, p1), dot(x, y), cross(x, y)

// Normalization
normalize(v)

// Reflection and refraction
reflect(I, N), refract(I, N, eta)

// Component-wise
lessThan(x, y), lessThanEqual(x, y)
greaterThan(x, y), greaterThanEqual(x, y)
equal(x, y), notEqual(x, y)
any(bvec), all(bvec)
```

### Texture Functions

```glsl
// GLSL 1.0 (default) - use texture2D/textureCube
texture2D(sampler, coord)
texture2D(sampler, coord, bias)
textureCube(sampler, coord)

// GLSL 3.0 (glslVersion: THREE.GLSL3) - use texture()
// texture(sampler, coord) replaces texture2D/textureCube
// Also use: out vec4 fragColor instead of gl_FragColor

// Texture size (GLSL 1.30+)
textureSize(sampler, lod)
```

## Common Material Properties

> See [references/details.md](references/details.md) for full code examples.

## Shader Includes

### Using Three.js Shader Chunks

```javascript
import { ShaderChunk } from "three";

const fragmentShader = `
  ${ShaderChunk.common}
  ${ShaderChunk.packing}

  uniform sampler2D depthTexture;
  varying vec2 vUv;

  void main() {
    float depth = texture2D(depthTexture, vUv).r;
    float linearDepth = perspectiveDepthToViewZ(depth, 0.1, 1000.0);
    gl_FragColor = vec4(vec3(-linearDepth / 100.0), 1.0);
  }
`;
```

### External Shader Files

```javascript
// With vite/webpack
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
});
```

## Instanced Shaders

> See [references/details.md](references/details.md) for full code examples.

## Debugging Shaders

> See [references/details.md](references/details.md) for full code examples.

## Performance Tips

1. **Minimize uniforms**: Group related values into vectors
2. **Avoid conditionals**: Use mix/step instead of if/else
3. **Precalculate**: Move calculations to JS when possible
4. **Use textures**: For complex functions, use lookup tables
5. **Limit overdraw**: Avoid transparent objects when possible

```glsl
// Instead of:
if (value > 0.5) {
  color = colorA;
} else {
  color = colorB;
}

// Use:
color = mix(colorB, colorA, step(0.5, value));
```

## TSL (Three.js Shading Language) - Future Direction

TSL is the new shader authoring system for Three.js, designed to work with both WebGL and WebGPU renderers. GLSL patterns above are **WebGL-only** and will not work with the WebGPU renderer.

### TSL Quick Start

```javascript
import { MeshStandardNodeMaterial } from "three/addons/nodes/Nodes.js";
import {
  uv, sin, timerLocal, vec4, color, positionLocal, normalLocal,
  float, mul, add
} from "three/addons/nodes/Nodes.js";

const material = new MeshStandardNodeMaterial();

// Animated color based on UV and time
const time = timerLocal();
material.colorNode = color(sin(add(uv().x, time)), uv().y, 0.5);

// Vertex displacement
material.positionNode = add(
  positionLocal,
  mul(normalLocal, sin(add(positionLocal.x, time)).mul(0.1))
);
> See [references/details.md](references/details.md) for full code examples.
