const path = require('path');
const os = require('os');
const Piscina = require('piscina');

// Pre-load native addons in main thread to ensure clean symbol registration across worker threads
try { require('sharp'); } catch (_) {}
try { require('onnxruntime-node'); } catch (_) {}


class WorkerPool {
  constructor() {
    const cores = os.cpus().length;
    const threadCount = Math.max(2, Math.min(cores - 2, 4));
    const workerFile = path.resolve(__dirname, 'worker.js');

    // Single unified pool to ensure native onnxruntime-node addon is loaded cleanly once
    this.pool = new Piscina({
      filename: workerFile,
      maxThreads: threadCount,
      minThreads: 0
    });
  }

  async generateEmbeddingForeground(text) {
    const buffer = new SharedArrayBuffer(384 * 4);
    await this.pool.run({ type: 'generateEmbedding', payload: { text, buffer } });
    return Array.from(new Float32Array(buffer));
  }

  async generateEmbeddingBackground(text) {
    const buffer = new SharedArrayBuffer(384 * 4);
    await this.pool.run({ type: 'generateEmbedding', payload: { text, buffer } });
    return Array.from(new Float32Array(buffer));
  }
  
  get stats() {
    return {
      foreground: {
        utilization: this.pool.utilization,
        completed: this.pool.completed
      },
      background: {
        utilization: this.pool.utilization,
        completed: this.pool.completed
      }
    };
  }
}

module.exports = WorkerPool;
