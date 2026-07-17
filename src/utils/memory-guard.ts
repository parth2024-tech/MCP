/**
 * Memory Guard — Periodic heap monitoring and emergency cache purge.
 *
 * Prevents OOM crashes by monitoring V8 heap usage and taking
 * progressive action as memory pressure increases.
 *
 * Thresholds:
 *   80% — warning log + metric
 *   90% — purge all caches + warning
 *   95% — force GC (if --expose-gc) + critical alert
 */

import v8 from 'v8';
const { logger } = require('./logger');
const metrics = require('./metrics');

let monitorInterval: NodeJS.Timeout | null = null;

export interface HeapStatus {
  usedMB: number;
  limitMB: number;
  usagePercent: number;
  status: 'healthy' | 'warning' | 'critical';
}

/**
 * Get current V8 heap status.
 */
export function getHeapStatus(): HeapStatus {
  const stats = v8.getHeapStatistics();
  const usedBytes = stats.used_heap_size;
  const limitBytes = stats.heap_size_limit;

  const usedMB = Math.round(usedBytes / 1024 / 1024);
  const limitMB = Math.round(limitBytes / 1024 / 1024);
  const usagePercent = Math.round((usedBytes / limitBytes) * 100);

  let status: 'healthy' | 'warning' | 'critical' = 'healthy';
  if (usagePercent >= 90) {
    status = 'critical';
  } else if (usagePercent >= 80) {
    status = 'warning';
  }

  return { usedMB, limitMB, usagePercent, status };
}

/**
 * Start periodic memory pressure monitoring.
 */
export function startMemoryMonitoring(container: any, intervalMs = 60000): void {
  if (monitorInterval) return;

  logger.info('MemoryGuard', 'Memory monitoring started');

  monitorInterval = setInterval(() => {
    try {
      const { usedMB, limitMB, usagePercent, status } = getHeapStatus();

      metrics.gauge('heap.used_mb', usedMB);
      metrics.gauge('heap.limit_mb', limitMB);
      metrics.gauge('heap.usage_percent', usagePercent);

      if (status === 'critical') {
        logger.error('MemoryGuard', `CRITICAL: Heap usage at ${usagePercent}% (${usedMB}MB / ${limitMB}MB)`, {
          used_mb: usedMB,
          limit_mb: limitMB,
          usage_percent: usagePercent,
        });

        // Trigger Cache Purge at 90%+
        if (usagePercent >= 90) {
          try {
            const skillCache = container.resolve('SkillCache');
            if (skillCache && typeof skillCache.clear === 'function') {
              skillCache.clear();
              logger.warn('MemoryGuard', 'SkillCache cleared due to high memory pressure');
            }
          } catch (e: any) {
            logger.warn('MemoryGuard', `Failed to purge SkillCache: ${e.message}`);
          }

          try {
            const toolCache = container.resolve('SessionToolCache');
            if (toolCache && typeof toolCache.clear === 'function') {
              toolCache.clear();
              logger.warn('MemoryGuard', 'SessionToolCache cleared due to high memory pressure');
            }
          } catch (e: any) {
            logger.warn('MemoryGuard', `Failed to purge SessionToolCache: ${e.message}`);
          }

          metrics.increment('memory_guard.cache_purge');
        }

        // Force GC at 95%+ if exposed
        if (usagePercent >= 95 && typeof global.gc === 'function') {
          try {
            global.gc();
            logger.warn('MemoryGuard', 'Forced Garbage Collection completed successfully');
            metrics.increment('memory_guard.force_gc');
          } catch (e: any) {
            logger.error('MemoryGuard', `Failed to run global.gc(): ${e.message}`);
          }
        }
      } else if (status === 'warning') {
        logger.warn('MemoryGuard', `Warning: Heap usage at ${usagePercent}% (${usedMB}MB / ${limitMB}MB)`, {
          used_mb: usedMB,
          limit_mb: limitMB,
          usage_percent: usagePercent,
        });
      }
    } catch (err: any) {
      logger.error('MemoryGuard', `Error during memory monitoring check: ${err.message}`);
    }
  }, intervalMs);
}

/**
 * Stop periodic memory pressure monitoring.
 */
export function stopMemoryMonitoring(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('MemoryGuard', 'Memory monitoring stopped');
  }
}
