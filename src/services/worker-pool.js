const path = require('path');
const os = require('os');
const Piscina = require('piscina');

class WorkerPool {
  constructor() {
    const cores = os.cpus().length;
    const foregroundCount = Math.max(2, cores - 4);
    const workerFile = path.resolve(__dirname, 'worker.js');

    this.foregroundPool = new Piscina({
      filename: workerFile,
      maxThreads: foregroundCount,
      minThreads: 0
    });

    this.backgroundPool = new Piscina({
      filename: workerFile,
      maxThreads: 1,
      minThreads: 1
    });
  }

  async generateEmbeddingForeground(text) {
    const buffer = new SharedArrayBuffer(384 * 4);
    await this.foregroundPool.run({ type: 'generateEmbedding', payload: { text, buffer } });
    return Array.from(new Float32Array(buffer));
  }

  async generateEmbeddingBackground(text) {
    const buffer = new SharedArrayBuffer(384 * 4);
    await this.backgroundPool.run({ type: 'generateEmbedding', payload: { text, buffer } });
    return Array.from(new Float32Array(buffer));
  }
  
  get stats() {
    return {
      foreground: {
        utilization: this.foregroundPool.utilization,
        completed: this.foregroundPool.completed
      },
      background: {
        utilization: this.backgroundPool.utilization,
        completed: this.backgroundPool.completed
      }
    };
  }
}

module.exports = WorkerPool;
