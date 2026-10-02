# Threejs Shaders — Code Reference

## ## Quick Start

```javascript
import * as THREE from "three";

const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    color: { value: new THREE.Color(0xff0000) },
  },
  vertexShader: `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;

    void main() {
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

// Update in animation loop
material.uniforms.time.value = clock.getElapsedTime();
```


## ### ShaderMaterial

```javascript
const material = new THREE.ShaderMaterial({
  vertexShader: `
    // Built-in uniforms available:
    // uniform mat4 modelMatrix;
    // uniform mat4 modelViewMatrix;
    // uniform mat4 projectionMatrix;
    // uniform mat4 viewMatrix;
    // uniform mat3 normalMatrix;
    // uniform vec3 cameraPosition;

    // Built-in attributes available:
    // attribute vec3 position;
    // attribute vec3 normal;
    // attribute vec2 uv;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
});
```


## ### RawShaderMaterial

```javascript
const material = new THREE.RawShaderMaterial({
  uniforms: {
    projectionMatrix: { value: camera.projectionMatrix },
    modelViewMatrix: { value: new THREE.Matrix4() },
  },
  vertexShader: `
    precision highp float;

    attribute vec3 position;
    uniform mat4 projectionMatrix;
    uniform mat4 modelViewMatrix;

    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
});
```


## ### Uniform Types

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    // Numbers
    floatValue: { value: 1.5 },
    intValue: { value: 1 },

    // Vectors
    vec2Value: { value: new THREE.Vector2(1, 2) },
    vec3Value: { value: new THREE.Vector3(1, 2, 3) },
    vec4Value: { value: new THREE.Vector4(1, 2, 3, 4) },

    // Colors (converted to vec3)
    colorValue: { value: new THREE.Color(0xff0000) },

    // Matrices
    mat3Value: { value: new THREE.Matrix3() },
    mat4Value: { value: new THREE.Matrix4() },

    // Textures
    textureValue: { value: texture },
    cubeTextureValue: { value: cubeTexture },

    // Arrays
    floatArray: { value: [1.0, 2.0, 3.0] },
    vec3Array: {
      value: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
    },
  },
});
```


## ## Varyings

```javascript
const material = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      // Use interpolated values
      gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
    }
  `,
});
```


## ### Texture Sampling

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: texture },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    varying vec2 vUv;

    void main() {
      vec4 texColor = texture2D(map, vUv);
      gl_FragColor = texColor;
    }
  `,
});
```


## ### Vertex Displacement

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    amplitude: { value: 0.5 },
  },
  vertexShader: `
    uniform float time;
    uniform float amplitude;

    void main() {
      vec3 pos = position;

      // Wave displacement
      pos.z += sin(pos.x * 5.0 + time) * amplitude;
      pos.z += sin(pos.y * 5.0 + time) * amplitude;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      gl_FragColor = vec4(0.5, 0.8, 1.0, 1.0);
    }
  `,
});
```


## ### Fresnel Effect

```javascript
const material = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    void main() {
      // cameraPosition is auto-provided by ShaderMaterial
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - dot(viewDirection, vNormal), 3.0);

      vec3 baseColor = vec3(0.0, 0.0, 0.5);
      vec3 fresnelColor = vec3(0.5, 0.8, 1.0);

      gl_FragColor = vec4(mix(baseColor, fresnelColor, fresnel), 1.0);
    }
  `,
});
```


## ### Noise-Based Effects

```glsl
// Simple noise function
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Value noise
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Usage
float n = noise(vUv * 10.0 + time);
```


## ### Rim Lighting

```javascript
const material = new THREE.ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    void main() {
      vec3 viewDir = normalize(-vViewPosition);
      float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
      rim = pow(rim, 4.0);

      vec3 baseColor = vec3(0.2, 0.2, 0.8);
      vec3 rimColor = vec3(1.0, 0.5, 0.0);

      gl_FragColor = vec4(baseColor + rimColor * rim, 1.0);
    }
  `,
});
```


## ### onBeforeCompile

```javascript
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

material.onBeforeCompile = (shader) => {
  // Add custom uniform
  shader.uniforms.time = { value: 0 };

  // Store reference for updates
  material.userData.shader = shader;

  // Modify vertex shader
  shader.vertexShader = shader.vertexShader.replace(
    "#include <begin_vertex>",
    `
    #include <begin_vertex>
    transformed.y += sin(position.x * 10.0 + time) * 0.1;
    `,
  );

  // Add uniform declaration
  shader.vertexShader = "uniform float time;/n" + shader.vertexShader;
};

// Update in animation loop
if (material.userData.shader) {
  material.userData.shader.uniforms.time.value = clock.getElapsedTime();
}
```


## ## Common Material Properties

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    /* ... */
  },
  vertexShader: "/* ... */",
  fragmentShader: "/* ... */",

  // Rendering
  transparent: true,
  opacity: 1.0,
  side: THREE.DoubleSide,
  depthTest: true,
  depthWrite: true,

  // Blending
  blending: THREE.NormalBlending,
  // AdditiveBlending, SubtractiveBlending, MultiplyBlending

  // Wireframe
  wireframe: false,
  wireframeLinewidth: 1, // Note: >1 has no effect on most platforms (WebGL limitation)

  // Extensions
  extensions: {
    derivatives: true, // For fwidth, dFdx, dFdy
    fragDepth: true, // gl_FragDepth
    drawBuffers: true, // Multiple render targets
    shaderTextureLOD: true, // texture2DLod
  },

  // GLSL version
  glslVersion: THREE.GLSL3, // For WebGL2 features
});
```


## ## Instanced Shaders

```javascript
// Instanced attribute
const offsets = new Float32Array(instanceCount * 3);
// Fill offsets...
geometry.setAttribute("offset", new THREE.InstancedBufferAttribute(offsets, 3));

const material = new THREE.ShaderMaterial({
  vertexShader: `
    attribute vec3 offset;

    void main() {
      vec3 pos = position + offset;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,
});
```


## ## Debugging Shaders

```javascript
// Check for compile errors
material.onBeforeCompile = (shader) => {
  console.log("Vertex Shader:", shader.vertexShader);
  console.log("Fragment Shader:", shader.fragmentShader);
};

// Visual debugging
fragmentShader: `
  void main() {
    // Debug UV
    gl_FragColor = vec4(vUv, 0.0, 1.0);

    // Debug normals
    gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);

    // Debug position
    gl_FragColor = vec4(vPosition * 0.1 + 0.5, 1.0);
  }
`;

// Check WebGL errors
renderer.debug.checkShaderErrors = true;
```


## ### TSL Quick Start

```

### Key Differences from GLSL

| GLSL (WebGL only)       | TSL (WebGL + WebGPU)         |
| ----------------------- | ---------------------------- |
| `ShaderMaterial`        | `MeshStandardNodeMaterial`   |
| String-based shaders    | JavaScript node graph        |
| `onBeforeCompile`       | Node composition             |
| Manual uniforms         | `uniform()` node             |
| `texture2D()`           | `texture()` node             |
| `gl_Position`           | `positionNode`               |
| `gl_FragColor`          | `colorNode` / `outputNode`   |

### When to Use What

- **GLSL ShaderMaterial**: Existing WebGL projects, maximum shader control, porting existing shaders
- **TSL NodeMaterial**: New projects, WebGPU support needed, cross-renderer compatibility

## See Also

- `threejs-materials` - Built-in material types
- `threejs-postprocessing` - Full-screen shader effects
- `threejs-textures` - Texture sampling in shaders

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


