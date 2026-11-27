/**
 * Clusters the 1,497-skill embedding index by exact cosine similarity to identify
 * dense neighborhoods, near-duplicate pairs, and category strata for fixture design.
 */
const path = require('path');
const Database = require('better-sqlite3');
const { DEFAULT_EVAL_INDEX_DB } = require('./build-index');

function loadVectors(dbPath = DEFAULT_EVAL_INDEX_DB) {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare('SELECT name, category, description, embedding FROM skills ORDER BY name ASC').all();
  db.close();
  return rows.map((r) => {
    const buf = r.embedding;
    const raw = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    let normSq = 0;
    for (let i = 0; i < raw.length; i++) normSq += raw[i] * raw[i];
    const norm = Math.sqrt(normSq) || 1;
    const vec = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) vec[i] = raw[i] / norm;
    return { name: r.name, category: r.category, description: r.description, vec };
  });
}

function analyzeClusters(dbPath = DEFAULT_EVAL_INDEX_DB, simThreshold = 0.78) {
  const items = loadVectors(dbPath);
  const n = items.length;
  const dim = n > 0 ? items[0].vec.length : 0;

  const adj = Array.from({ length: n }, () => []);
  const topPairs = [];

  for (let i = 0; i < n; i++) {
    const vi = items[i].vec;
    for (let j = i + 1; j < n; j++) {
      const vj = items[j].vec;
      let dot = 0;
      for (let d = 0; d < dim; d++) {
        dot += vi[d] * vj[d];
      }
      if (dot >= simThreshold) {
        adj[i].push({ j, sim: dot });
        adj[j].push({ j: i, sim: dot });
        if (dot >= 0.80) {
          topPairs.push({ a: items[i].name, b: items[j].name, sim: Number(dot.toFixed(4)) });
        }
      }
    }
  }

  topPairs.sort((x, y) => y.sim - x.sim);

  // Connected components via BFS
  const visited = new Uint8Array(n);
  const clusters = [];
  for (let i = 0; i < n; i++) {
    if (visited[i] || adj[i].length === 0) continue;
    const queue = [i];
    visited[i] = 1;
    const members = [];
    let simSum = 0;
    let edgeCount = 0;

    while (queue.length > 0) {
      const u = queue.shift();
      members.push(items[u].name);
      for (const edge of adj[u]) {
        simSum += edge.sim;
        edgeCount++;
        if (!visited[edge.j]) {
          visited[edge.j] = 1;
          queue.push(edge.j);
        }
      }
    }

    if (members.length >= 2) {
      clusters.push({
        size: members.length,
        avgEdgeSim: Number((simSum / Math.max(1, edgeCount)).toFixed(4)),
        members: members.sort()
      });
    }
  }

  clusters.sort((a, b) => (b.size - a.size) || (b.avgEdgeSim - a.avgEdgeSim));

  const categoryCounts = {};
  for (const item of items) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  }

  return {
    totalSkills: n,
    simThreshold,
    clusterCount: clusters.length,
    clusteredSkills: clusters.reduce((s, c) => s + c.size, 0),
    topDenseClusters: clusters.slice(0, 20),
    topClosePairs: topPairs.slice(0, 35),
    categories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])
  };
}

if (require.main === module) {
  const threshold = parseFloat(process.argv[2] || '0.78');
  console.log(JSON.stringify(analyzeClusters(DEFAULT_EVAL_INDEX_DB, threshold), null, 2));
}

module.exports = { analyzeClusters, loadVectors };
