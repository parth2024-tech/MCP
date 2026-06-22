const { pipeline } = require('@xenova/transformers');
const { validate } = require('./output-validator');
const fs = require('fs');
const { execSync } = require('child_process');

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
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
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
