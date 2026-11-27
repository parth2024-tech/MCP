const { pipeline, env } = require('@xenova/transformers');
const { validate } = require('./output-validator');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { getRepoRoot } = require('../utils/ase-home');

function loadEmbeddingPin() {
  const pinPath = path.join(getRepoRoot(__dirname), 'config', 'model-pins.json');
  if (fs.existsSync(pinPath)) {
    return JSON.parse(fs.readFileSync(pinPath, 'utf8')).embedding;
  }
  return {
    model_id: 'Xenova/all-MiniLM-L6-v2',
    revision: '751bff37182d3f1213fa05d7196b954e230abad9',
    quantized: true,
    onnx_file: 'onnx/model_quantized.onnx',
    onnx_sha256: 'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1'
  };
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

// Phase 1 Tuning: Thread-Level Affinity
// Pin this specific worker thread (ONNX inference) to cores 2 and 3
try {
  const stat = fs.readFileSync('/proc/thread-self/stat', 'utf8');
  const tid = stat.split(' ')[0];
  if (tid) {
    execSync(`taskset -cp 2,3 ${tid}`, { stdio: 'ignore' });
  }
} catch (err) {
  // Silent fallback
}

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    const pin = loadEmbeddingPin();
    const repoCache = path.join(getRepoRoot(__dirname), '.cache', 'models');
    const customCache = process.env.ASE_MODEL_CACHE_DIR || (fs.existsSync(repoCache) ? repoCache : null);
    if (customCache) {
      env.cacheDir = customCache;
    }

    const activeCacheDir = env.cacheDir;
    const rel = pin.revision && pin.revision !== 'main'
      ? [...pin.model_id.split('/'), pin.revision, pin.onnx_file]
      : [...pin.model_id.split('/'), pin.onnx_file];
    const onnxPath = path.join(activeCacheDir, ...rel);

    if (fs.existsSync(onnxPath) && pin.onnx_sha256) {
      const actualHash = sha256File(onnxPath);
      if (actualHash !== pin.onnx_sha256) {
        throw new Error(`Model pin mismatch for ${pin.onnx_file}: expected ${pin.onnx_sha256}, got ${actualHash}`);
      }
      // Cache is warm and verified — lock out silent remote fetches
      env.allowRemoteModels = false;
    } else if (process.env.ASE_ALLOW_REMOTE_MODELS === 'false') {
      env.allowRemoteModels = false;
    }

    embedder = await pipeline('feature-extraction', pin.model_id, {
      revision: pin.revision,
      quantized: pin.quantized !== false
    });
  }
  return embedder;
}

module.exports = async (task) => {
  const { type, payload } = task;

  if (type === 'generateEmbedding') {
    const { text, buffer } = payload;
    const model = await getEmbedder();
    const result = await model(text, { pooling: 'mean', normalize: true });
    
    if (buffer) {
      // Direct write to SharedArrayBuffer to eliminate IPC serialization overhead
      const floatView = new Float32Array(buffer);
      floatView.set(result.data);
      return true;
    }
    
    // Fallback for any legacy calls without a buffer
    return Array.from(result.data);
  }

  if (type === 'validateOutput') {
    // The validate function currently might do sync I/O.
    // If it is refactored to async, we'll await it. For now, just call it.
    // We will refactor output-validator.js next.
    return await validate(payload.projectDir);
  }

  throw new Error(`Unknown worker task type: ${type}`);
};
