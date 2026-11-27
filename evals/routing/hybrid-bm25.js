/**
 * Lightweight BM25 + Reciprocal Rank Fusion (RRF) scorer for Step 1c retrieval experiments.
 */
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

class BM25Index {
  constructor(docs, { k1 = 1.5, b = 0.75 } = {}) {
    this.k1 = k1;
    this.b = b;
    this.docs = docs;
    this.N = docs.length;
    this.df = new Map();
    this.docTermFreqs = [];
    this.docLengths = [];

    let totalLen = 0;
    for (const doc of docs) {
      const text = `${doc.name.replace(/[/-]/g, ' ')} ${doc.category || ''} ${(doc.tags || []).join(' ')} ${doc.description || ''}`;
      const tokens = tokenize(text);
      this.docLengths.push(tokens.length);
      totalLen += tokens.length;

      const tf = new Map();
      for (const t of tokens) {
        tf.set(t, (tf.get(t) || 0) + 1);
      }
      this.docTermFreqs.push(tf);
      for (const t of tf.keys()) {
        this.df.set(t, (this.df.get(t) || 0) + 1);
      }
    }
    this.avgdl = this.N > 0 ? totalLen / this.N : 1;
  }

  search(query, limit = 50) {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];

    const scores = [];
    for (let i = 0; i < this.N; i++) {
      const tfMap = this.docTermFreqs[i];
      const dl = this.docLengths[i];
      let score = 0;

      for (const qt of qTokens) {
        const tf = tfMap.get(qt) || 0;
        if (tf === 0) continue;
        const df = this.df.get(qt) || 0;
        const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
        const num = tf * (this.k1 + 1);
        const denom = tf + this.k1 * (1 - this.b + this.b * (dl / this.avgdl));
        score += idf * (num / denom);
      }

      if (score > 0) {
        scores.push({ name: this.docs[i].name, bm25Score: score });
      }
    }

    scores.sort((a, b) => (b.bm25Score - a.bm25Score) || a.name.localeCompare(b.name));
    return scores.slice(0, limit);
  }
}

function fuseRRF(denseRanked, bm25Ranked, { k = 60, denseWeight = 1.0, bm25Weight = 1.0, topK = 10 } = {}) {
  const fused = new Map();
  const denseScoreMap = new Map(denseRanked.map((d) => [d.name, d.score]));

  denseRanked.forEach((item, idx) => {
    const rank = idx + 1;
    const prev = fused.get(item.name) || 0;
    fused.set(item.name, prev + denseWeight / (k + rank));
  });

  bm25Ranked.forEach((item, idx) => {
    const rank = idx + 1;
    const prev = fused.get(item.name) || 0;
    fused.set(item.name, prev + bm25Weight / (k + rank));
  });

  const merged = [...fused.entries()].map(([name, rrfScore]) => ({
    name,
    rrfScore,
    // Keep dense cosine score as threshold gating signal so negative prompts still reject cleanly
    score: denseScoreMap.get(name) ?? 0
  }));

  merged.sort((a, b) => (b.rrfScore - a.rrfScore) || (b.score - a.score) || a.name.localeCompare(b.name));
  return merged.slice(0, topK);
}

module.exports = { BM25Index, fuseRRF };
