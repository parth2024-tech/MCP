/**
 * Pinned HuggingFace / ONNX embedder loader for reproducible Tier R evals.
 * Reads config/model-pins.json, verifies ONNX SHA256, and disables remote fetches
 * once the revision-scoped cache is warm and verified.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline, env } = require('@xenova/transformers');

const REPO_ROOT = path.resolve(__dirname, '../..');
const PIN_PATH = path.join(REPO_ROOT, 'config', 'model-pins.json');

let cachedEmbedder = null;
let cachedPin = null;

function loadModelPin() {
  if (!cachedPin) {
    cachedPin = JSON.parse(fs.readFileSync(PIN_PATH, 'utf8')).embedding;
  }
  return cachedPin;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function getRevisionOnnxPath(cacheDir, pin) {
  const rel = pin.revision && pin.revision !== 'main'
    ? [...pin.model_id.split('/'), pin.revision, pin.onnx_file]
    : [...pin.model_id.split('/'), pin.onnx_file];
  return path.join(cacheDir, ...rel);
}

async function getPinnedEmbedder() {
  const pin = loadModelPin();
  if (cachedEmbedder) {
    return { embedder: cachedEmbedder, pin };
  }

  const cacheDir = process.env.ASE_MODEL_CACHE_DIR && process.env.ASE_MODEL_CACHE_DIR.trim()
    ? path.resolve(process.env.ASE_MODEL_CACHE_DIR.trim())
    : path.join(REPO_ROOT, '.cache', 'models');

  fs.mkdirSync(cacheDir, { recursive: true });
  env.cacheDir = cacheDir;

  const onnxPath = getRevisionOnnxPath(cacheDir, pin);
  if (fs.existsSync(onnxPath)) {
    const actualSha = sha256File(onnxPath);
    if (actualSha !== pin.onnx_sha256) {
      throw new Error(
        `ONNX SHA256 mismatch at ${onnxPath}: expected ${pin.onnx_sha256}, got ${actualSha}`
      );
    }
    env.allowRemoteModels = false;
  } else if (process.env.ASE_ALLOW_REMOTE_MODELS === 'false') {
    env.allowRemoteModels = false;
  }

  cachedEmbedder = await pipeline('feature-extraction', pin.model_id, {
    revision: pin.revision,
    quantized: pin.quantized !== false
  });

  if (!fs.existsSync(onnxPath)) {
    throw new Error(`Pinned ONNX file missing after pipeline load: ${onnxPath}`);
  }
  const postSha = sha256File(onnxPath);
  if (postSha !== pin.onnx_sha256) {
    throw new Error(
      `Downloaded ONNX SHA256 mismatch at ${onnxPath}: expected ${pin.onnx_sha256}, got ${postSha}`
    );
  }
  env.allowRemoteModels = false;

  return { embedder: cachedEmbedder, pin };
}

async function embedText(text) {
  const { embedder, pin } = await getPinnedEmbedder();
  const out = await embedder(text, {
    pooling: pin.pooling || 'mean',
    normalize: pin.normalize !== false
  });
  return new Float32Array(out.data);
}

module.exports = { loadModelPin, getPinnedEmbedder, embedText, REPO_ROOT };
