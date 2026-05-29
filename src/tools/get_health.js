const { logAccess } = require('../utils/logger');
const metrics = require('../utils/metrics');

module.exports = (deps) => ({
  name: 'get_health',
  description: 'Returns the health status and internal telemetry of the ASE MCP server including memory, cache hit rates, circuit breaker states, and uptime.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  handler: async (args, extra) => {
    const uptimeSecs = Math.floor(process.uptime());
    
    // Skill Count & Embeddings
    let skillCount = 0;
    let lastSync = null;
    let circuitStatus = { state: 'CLOSED' };
    
    if (deps.embeddingService) {
      const snap = deps.embeddingService.healthSnapshot;
      if (snap) {
        skillCount = snap.skills_indexed || 0;
        lastSync = snap.last_sync || null;
        circuitStatus = snap.embedding_circuit || { state: 'CLOSED' };
      }
    }

    // Determine embedding service composite state
    let embState = 'warm';
    if (circuitStatus.state === 'OPEN') embState = 'circuit_open';
    else if (circuitStatus.state === 'HALF_OPEN') embState = 'degraded';
    else if (!lastSync) embState = 'building';

    // Cache hit rate
    const cacheHits = metrics.getCount('skill_cache_hits') || 0;
    const cacheMisses = metrics.getCount('skill_cache_misses') || 0;
    const totalCacheReqs = cacheHits + cacheMisses;
    const cacheHitRate = totalCacheReqs > 0 ? ((cacheHits / totalCacheReqs) * 100).toFixed(2) + '%' : '0.00%';

    const stats = deps.workerPool ? deps.workerPool.stats : { foreground: {}, background: {} };
    const worker_pool_utilization = {
      foreground: stats.foreground.utilization || 0,
      background: stats.background.utilization || 0
    };

    const report = {
      embedding_service: embState,
      worker_pool_utilization: worker_pool_utilization,
      skill_count: skillCount,
      last_sync_timestamp: lastSync,
      cache_hit_rate: cacheHitRate,
      uptime_seconds: uptimeSecs,
      circuit_breaker: circuitStatus
    };

    (extra?.reqLogger || { logAccess }).logAccess('mcp-client', 'get_health', 'authorized', 0, { uptime: uptimeSecs });
    return report;
  }
});
