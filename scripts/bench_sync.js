const fs = require('fs');
const path = require('path');
const EmbeddingService = require('./tools/server/src/embedding-service.js');
const workerPool = require('./tools/server/src/worker-pool.js');

async function run() {
  const service = new EmbeddingService();
  
  // Wait for initial worker pool initialization if any
  await new Promise(r => setTimeout(r, 1000));

  console.log('--- Benchmarking Full Sync (Hash Hits) ---');
  let maxQueueDepth = 0;
  const monitor = setInterval(() => {
    // Piscina queue size
    if (workerPool.queueSize > maxQueueDepth) {
      maxQueueDepth = workerPool.queueSize;
    }
  }, 10);

  const start1 = Date.now();
  await service.syncSkillsBackground();
  const time1 = Date.now() - start1;
  console.log(`Full Sync (hash hits only) duration: ${time1}ms`);
  console.log(`Peak Queue Depth: ${maxQueueDepth}`);
  
  // Reset max queue depth
  maxQueueDepth = 0;

  // Touch one skill to invalidate its hash
  console.log('--- Benchmarking Single Regeneration Sync ---');
  const testSkillFile = path.join(__dirname, 'test-driven-development/SKILL.md');
  const original = fs.readFileSync(testSkillFile, 'utf8');
  fs.writeFileSync(testSkillFile, original + '\n\n<!-- bench -->\n');

  const start2 = Date.now();
  await service.syncSkillsBackground();
  const time2 = Date.now() - start2;
  console.log(`Single Regeneration Sync duration: ${time2}ms`);
  console.log(`Peak Queue Depth: ${maxQueueDepth}`);

  // Restore file
  fs.writeFileSync(testSkillFile, original);

  clearInterval(monitor);
  process.exit(0);
}

run().catch(console.error);
