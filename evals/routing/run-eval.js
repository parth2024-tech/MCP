#!/usr/bin/env node
/**
 * Tier R Routing Evaluation Runner (Exact Brute-Force vs HNSW Parity + Regression Gate).
 *
 * Usage:
 *   node evals/routing/run-eval.js [--record-baseline] [--threshold 0.35] [--cases evals/routing/cases.jsonl]
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
  require('tsx/cjs');
} catch (_) {}

const { EvalStore } = require('../eval-store');
const { buildEvalIndex, DEFAULT_EVAL_INDEX_DB } = require('./build-index');
const { analyzeClusters } = require('./cluster-skills');
const { embedText, loadModelPin, REPO_ROOT } = require('./pinned-embedder');
const EmbeddingService = require('../../src/services/embedding-service');

const DEFAULT_CASES = path.join(REPO_ROOT, 'evals', 'routing', 'cases.jsonl');
const DEFAULT_BASELINE = path.join(REPO_ROOT, 'evals', 'routing', 'baseline.json');
const DEFAULT_WAIVERS = path.join(REPO_ROOT, 'evals', 'routing', 'waivers.json');

function getGitSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function median(arr) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
  return s[idx];
}

function summarizeSplit(results) {
  const positives = results.filter((r) => r.expected !== null);
  const negatives = results.filter((r) => r.expected === null);

  const hit1 = positives.length
    ? positives.filter((r) => r.hit1).length / positives.length
    : 0;
  const hit3 = positives.length
    ? positives.filter((r) => r.hit3).length / positives.length
    : 0;
  const mrr = positives.length
    ? positives.reduce((s, r) => s + r.rr, 0) / positives.length
    : 0;
  const falseTriggerRate = negatives.length
    ? negatives.filter((r) => !r.pass).length / negatives.length
    : 0;

  const posMargins = positives.map((r) => r.margin);
  const posScores = positives.map((r) => r.score1);
  const negScores = negatives.map((r) => r.score1);

  const covered = new Set();
  for (const r of positives) {
    for (const e of r.expected) covered.add(e);
  }

  const confusions = {};
  for (const r of positives) {
    if (!r.hit1) {
      const key = `${r.expected.join('|')} -> ${r.got}`;
      confusions[key] = (confusions[key] || 0) + 1;
    }
  }
  const topConfusions = Object.entries(confusions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([pair, count]) => ({ pair, count }));

  return {
    total: results.length,
    positives: positives.length,
    negatives: negatives.length,
    hit_at_1: Number(hit1.toFixed(4)),
    hit_at_3: Number(hit3.toFixed(4)),
    mrr: Number(mrr.toFixed(4)),
    false_trigger_rate: Number(falseTriggerRate.toFixed(4)),
    median_margin: Number(median(posMargins).toFixed(4)),
    near_ties_lt_0_02: positives.filter((r) => r.margin < 0.02).length,
    pos_score_median: Number(median(posScores).toFixed(4)),
    neg_score_max: negScores.length ? Number(Math.max(...negScores).toFixed(4)) : 0,
    neg_score_median: Number(median(negScores).toFixed(4)),
    covered_skills: covered.size,
    top_confusions: topConfusions
  };
}

function parseArgs(argv) {
  const opts = {
    recordBaseline: false,
    threshold: 0.35,
    casesPath: DEFAULT_CASES,
    baselinePath: DEFAULT_BASELINE
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--record-baseline') opts.recordBaseline = true;
    else if (a === '--threshold' && argv[i + 1]) opts.threshold = parseFloat(argv[++i]);
    else if (a === '--cases' && argv[i + 1]) opts.casesPath = path.resolve(argv[++i]);
    else if (a === '--baseline' && argv[i + 1]) opts.baselinePath = path.resolve(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pin = loadModelPin();
  const gitSha = getGitSha();
  const runId = `routing-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  // 1. Rebuild/verify eval embedding index cleanly from skills/
  const indexRes = await buildEvalIndex({ dbPath: DEFAULT_EVAL_INDEX_DB });

  // 2. Load cases & validate all referenced skill names exist in corpus
  const lines = fs.readFileSync(opts.casesPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const cases = lines.map((l) => JSON.parse(l));

  // Mock minimal workerPool for EmbeddingService (eval embeds via pinned-embedder directly)
  const stubWorkerPool = {
    generateEmbeddingForeground: async (text) => Array.from(await embedText(text)),
    generateEmbeddingBackground: async (text) => Array.from(await embedText(text))
  };

  const svc = new EmbeddingService(stubWorkerPool, {
    dbPath: DEFAULT_EVAL_INDEX_DB,
    skillsDir: path.join(REPO_ROOT, 'skills'),
    disableWatcher: true
  });

  const missingRefs = [];
  for (const c of cases) {
    if (c.expect !== null) {
      for (const s of c.expect) {
        if (!svc._skillData.has(s)) missingRefs.push(`${c.id}:expect:${s}`);
      }
    }
    for (const s of (c.confusable_with || [])) {
      if (!svc._skillData.has(s)) missingRefs.push(`${c.id}:confusable:${s}`);
    }
  }
  if (missingRefs.length > 0) {
    await svc.close();
    throw new Error(`Invalid skill IDs in cases.jsonl: ${missingRefs.join(', ')}`);
  }

  // 3. Evaluate all cases through BOTH exact (noCache) and HNSW (noCache)
  const exactLatencies = [];
  const hnswLatencies = [];
  const evalRows = [];
  const results = [];
  const parityMismatches = [];
  let hnswTop1Matches = 0;
  let hnswRecall3Sum = 0;
  let hnswRecall10Sum = 0;

  for (const c of cases) {
    const qStart = process.hrtime.bigint();
    const queryVec = await embedText(c.prompt);
    const embedMs = Number(process.hrtime.bigint() - qStart) / 1e6;

    const eStart = process.hrtime.bigint();
    const exactTop = svc.searchWithEmbedding(queryVec, 10, { mode: 'exact', skipOptimizer: true });
    const exactMs = Number(process.hrtime.bigint() - eStart) / 1e6;
    exactLatencies.push(exactMs);

    const hStart = process.hrtime.bigint();
    const hnswTop = svc.searchWithEmbedding(queryVec, 10, { mode: 'hnsw', skipOptimizer: true });
    const hnswMs = Number(process.hrtime.bigint() - hStart) / 1e6;
    hnswLatencies.push(hnswMs);

    const top1 = exactTop[0] || { name: 'NONE', score: 0 };
    const top2 = exactTop[1] || { name: 'NONE', score: 0 };
    const margin = Number((top1.score - top2.score).toFixed(4));

    const expectedSet = c.expect === null ? null : new Set(c.expect);
    let pass = false;
    let hit1 = false;
    let hit3 = false;
    let rr = 0;

    if (expectedSet === null) {
      pass = top1.score < opts.threshold;
    } else {
      hit1 = expectedSet.has(top1.name) && top1.score >= opts.threshold;
      hit3 = exactTop.slice(0, 3).some((item) => expectedSet.has(item.name) && item.score >= opts.threshold);
      const rankIdx = exactTop.findIndex((item) => expectedSet.has(item.name) && item.score >= opts.threshold);
      rr = rankIdx !== -1 ? 1 / (rankIdx + 1) : 0;
      pass = hit1;
    }

    // HNSW vs Exact parity
    const hTop1 = hnswTop[0] ? hnswTop[0].name : null;
    if (hTop1 === top1.name) {
      hnswTop1Matches++;
    } else {
      parityMismatches.push({
        id: c.id,
        exactTop1: { name: top1.name, score: Number(top1.score.toFixed(4)) },
        hnswTop1: { name: hTop1, score: hnswTop[0] ? Number(hnswTop[0].score.toFixed(4)) : 0 }
      });
    }
    const exact3Set = new Set(exactTop.slice(0, 3).map((x) => x.name));
    const hnsw3Set = new Set(hnswTop.slice(0, 3).map((x) => x.name));
    let inter3 = 0;
    for (const x of exact3Set) if (hnsw3Set.has(x)) inter3++;
    hnswRecall3Sum += inter3 / Math.max(1, exact3Set.size);

    const exact10Set = new Set(exactTop.map((x) => x.name));
    const hnsw10Set = new Set(hnswTop.map((x) => x.name));
    let inter10 = 0;
    for (const x of exact10Set) if (hnsw10Set.has(x)) inter10++;
    hnswRecall10Sum += inter10 / Math.max(1, exact10Set.size);

    const rowResult = {
      id: c.id,
      split: c.split,
      expected: c.expect,
      got: top1.name,
      score1: Number(top1.score.toFixed(4)),
      margin,
      top3: exactTop.slice(0, 3).map((x) => ({ name: x.name, score: Number(x.score.toFixed(4)) })),
      hit1,
      hit3,
      rr: Number(rr.toFixed(4)),
      pass
    };
    results.push(rowResult);

    evalRows.push({
      run_id: runId,
      suite: 'routing',
      split: c.split,
      case_id: c.id,
      git_sha: gitSha,
      embed_model: pin.model_id,
      embed_rev: pin.revision,
      llm_model_id: null,
      prompt_hash: sha256(c.prompt),
      mode: 'live',
      expected: JSON.stringify(c.expect),
      got: top1.name,
      margin,
      pass: pass ? 1 : 0,
      tokens: null,
      cost_usd: 0,
      latency_ms: Math.round(embedMs + exactMs),
      iterations: 1
    });
  }

  await svc.close();

  // 4. Persist to SQLite eval_runs
  const evalStore = new EvalStore();
  evalStore.insertRows(evalRows);
  evalStore.close();

  const summary = {
    overall: summarizeSplit(results),
    dev: summarizeSplit(results.filter((r) => r.split === 'dev')),
    test: summarizeSplit(results.filter((r) => r.split === 'test'))
  };

  const parity = {
    cases: cases.length,
    hnsw_top1_exact_match: Number((hnswTop1Matches / cases.length).toFixed(4)),
    hnsw_recall_at_3_vs_exact: Number((hnswRecall3Sum / cases.length).toFixed(4)),
    hnsw_recall_at_10_vs_exact: Number((hnswRecall10Sum / cases.length).toFixed(4)),
    exact_latency_ms_median: Number(median(exactLatencies).toFixed(3)),
    exact_latency_ms_p95: Number(percentile(exactLatencies, 95).toFixed(3)),
    hnsw_latency_ms_median: Number(median(hnswLatencies).toFixed(3)),
    hnsw_latency_ms_p95: Number(percentile(hnswLatencies, 95).toFixed(3)),
    top1_mismatches: parityMismatches
  };

  if (opts.recordBaseline) {
    const clusters = analyzeClusters(DEFAULT_EVAL_INDEX_DB, 0.78);
    const baseline = {
      schema_version: 1,
      recorded_at: new Date().toISOString(),
      git_sha: gitSha,
      threshold: opts.threshold,
      corpus_hash: indexRes.corpusHash,
      embedded_text: indexRes.embeddedTextStats,
      pin,
      parity,
      summary,
      clusters_summary: {
        clusterCount: clusters.clusterCount,
        clusteredSkills: clusters.clusteredSkills,
        topDenseClusters: clusters.topDenseClusters.slice(0, 12),
        topClosePairs: clusters.topClosePairs.slice(0, 15)
      },
      cases: Object.fromEntries(results.map((r) => [r.id, r]))
    };
    fs.writeFileSync(opts.baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    console.log(`Baseline recorded to ${opts.baselinePath}`);
    console.log('Summary:', JSON.stringify({ summary, parity }, null, 2));
    return;
  }

  // 5. Compare against committed baseline
  if (!fs.existsSync(opts.baselinePath)) {
    throw new Error(`Missing baseline file at ${opts.baselinePath}. Run with --record-baseline first.`);
  }
  const baseline = JSON.parse(fs.readFileSync(opts.baselinePath, 'utf8'));
  const waivers = fs.existsSync(DEFAULT_WAIVERS)
    ? JSON.parse(fs.readFileSync(DEFAULT_WAIVERS, 'utf8'))
    : {};

  const passToFail = [];
  const failToPass = [];
  const negativeTriggers = [];

  for (const r of results) {
    const prev = baseline.cases[r.id];
    if (!prev) continue;
    if (prev.pass && !r.pass) {
      if (r.expected === null) {
        negativeTriggers.push({ id: r.id, score1: r.score1, got: r.got });
      }
      if (!waivers[r.id]) {
        passToFail.push({
          id: r.id,
          split: r.split,
          expected: r.expected,
          prevGot: prev.got,
          got: r.got,
          prevScore: prev.score1,
          score: r.score1
        });
      }
    } else if (!prev.pass && r.pass) {
      failToPass.push({ id: r.id, split: r.split, got: r.got, score: r.score1 });
    }
  }

  const testHit1Delta = Number((summary.test.hit_at_1 - baseline.summary.test.hit_at_1).toFixed(4));
  const testHit3Delta = Number((summary.test.hit_at_3 - baseline.summary.test.hit_at_3).toFixed(4));

  console.log('=== Tier R Routing Evaluation Report ===');
  console.log(JSON.stringify({
    run_id: runId,
    git_sha: gitSha,
    corpus_hash: indexRes.corpusHash,
    dev: summary.dev,
    test: summary.test,
    parity: {
      top1_match: parity.hnsw_top1_exact_match,
      recall_at_3: parity.hnsw_recall_at_3_vs_exact,
      exact_p50_ms: parity.exact_latency_ms_median,
      hnsw_p50_ms: parity.hnsw_latency_ms_median
    },
    deltas_vs_baseline: {
      test_hit1_delta: testHit1Delta,
      test_hit3_delta: testHit3Delta,
      pass_to_fail_count: passToFail.length,
      fail_to_pass_count: failToPass.length,
      new_negative_triggers: negativeTriggers.length
    },
    pass_to_fail: passToFail,
    fail_to_pass: failToPass
  }, null, 2));

  const failures = [];
  if (passToFail.length > 0) {
    failures.push(`${passToFail.length} unjustified pass->fail regression(s)`);
  }
  if (negativeTriggers.length > 0) {
    failures.push(`${negativeTriggers.length} previously passing negative case(s) triggered`);
  }
  if (testHit1Delta < -0.03) {
    failures.push(`test hit@1 dropped by ${testHit1Delta} (>0.03 threshold)`);
  }
  if (testHit3Delta < -0.03) {
    failures.push(`test hit@3 dropped by ${testHit3Delta} (>0.03 threshold)`);
  }

  if (failures.length > 0) {
    console.error('ROUTING GATE FAILED:', failures.join('; '));
    process.exitCode = 1;
  } else {
    console.log('ROUTING GATE PASSED.');
  }
}

main().catch((err) => {
  console.error('Routing eval error:', err);
  process.exitCode = 1;
});
