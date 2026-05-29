/**
 * ASE In-Process Metrics Collector
 *
 * Zero-dependency, zero-config metrics store.
 * Exposes counters and histograms that are snapshotted by health://status.
 *
 * Design:
 *   - Counters: atomic increment, keyed by name + optional label
 *   - Histograms: record duration samples, compute p50/p95/p99 on snapshot
 *   - No external agent — all data lives in memory for the process lifetime
 */

// ── Counters ─────────────────────────────────────────────────────────────────
const counters = new Map();

/**
 * Increment a counter.
 * @param {string} name   - Metric name (e.g. 'tool_calls_total')
 * @param {string} [label] - Optional label (e.g. tool name)
 */
function inc(name, label = '') {
  const key = label ? `${name}{${label}}` : name;
  counters.set(key, (counters.get(key) || 0) + 1);
}

/**
 * Read a counter value.
 */
function getCount(name, label = '') {
  const key = label ? `${name}{${label}}` : name;
  return counters.get(key) || 0;
}

// ── Histograms ────────────────────────────────────────────────────────────────
const histograms = new Map();
const MAX_SAMPLES = 1000; // cap to avoid unbounded growth

/**
 * Record a duration sample.
 * @param {string} name      - Metric name (e.g. 'tool_call_duration_ms')
 * @param {number} valueMs   - Duration in milliseconds
 * @param {string} [label]   - Optional label
 */
function record(name, valueMs, label = '') {
  const key = label ? `${name}{${label}}` : name;
  if (!histograms.has(key)) histograms.set(key, []);
  const samples = histograms.get(key);
  samples.push(valueMs);
  // Evict oldest when over cap (sliding window)
  if (samples.length > MAX_SAMPLES) samples.shift();
}

/**
 * Compute percentiles for a histogram.
 * @param {string} name
 * @param {string} [label]
 * @returns {{ count, min, max, p50, p95, p99, avg } | null}
 */
function summarize(name, label = '') {
  const key = label ? `${name}{${label}}` : name;
  const samples = histograms.get(key);
  if (!samples || samples.length === 0) return null;

  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const p = (pct) => sorted[Math.min(Math.floor(n * pct / 100), n - 1)];
  const avg = sorted.reduce((s, v) => s + v, 0) / n;

  return {
    count: n,
    min: sorted[0],
    max: sorted[n - 1],
    p50: p(50),
    p95: p(95),
    p99: p(99),
    avg: Math.round(avg)
  };
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * Returns the full metrics snapshot suitable for health://status.
 */
function snapshot() {
  const counterSnapshot = {};
  for (const [key, val] of counters) counterSnapshot[key] = val;

  const histogramSnapshot = {};
  for (const [key] of histograms) {
    const name = key.includes('{') ? key.split('{')[0] : key;
    const label = key.includes('{') ? key.split('{')[1].replace('}', '') : '';
    histogramSnapshot[key] = summarize(name, label);
  }

  return { counters: counterSnapshot, histograms: histogramSnapshot };
}

module.exports = { inc, getCount, record, summarize, snapshot };
