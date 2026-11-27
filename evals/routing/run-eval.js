#!/usr/bin/env node
/**
 * Tier R Routing Evaluation Runner (Exact Brute-Force vs HNSW Parity + Regression Gate + Step 1c Variants).
 *
 * Usage:
 *   node evals/routing/run-eval.js [--record-baseline] [--split dev|test|all]
 *     [--embed-text-mode desc|name_desc_tags] [--hybrid-bm25] [--variant name]
 *     [--show-test-flips] [--threshold 0.35]
 */
const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

try {
  require('tsx/cjs');
} catch (_) {}

const { EvalStore } = require('../eval-store');
const { buildEvalIndex, scanCorpus, DEFAULT_EVAL_INDEX_DB } = require('./build-index');
const { analyzeClusters } = require('./cluster-skills');
const { BM25Index, fuseRRF } = require('./hybrid-bm25');
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
    split: 'all',
    showTestFlips: false,
    embedTextMode: 'desc',
    hybridBm25: false,
    variant: null,
    noGate: false,
    threshold: 0.35,
    casesPath: DEFAULT_CASES,
    baselinePath: DEFAULT_BASELINE
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--record-baseline') opts.recordBaseline = true;
    else if (a === '--split' && argv[i + 1]) opts.split = argv[++i];
    else if (a === '--show-test-flips') opts.showTestFlips = true;
    else if (a === '--embed-text-mode' && argv[i + 1]) opts.embedTextMode = argv[++i];
    else if (a === '--hybrid-bm25') opts.hybridBm25 = true;
    else if (a === '--variant' && argv[i + 1]) opts.variant = argv[++i];
    else if (a === '--no-gate') opts.noGate = true;
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
  const suiteName = opts.variant ? `routing:${opts.variant}` : 'routing';
  const runId = `${suiteName}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  // 1. Rebuild/verify eval embedding index cleanly from skills/
  const indexRes = await buildEvalIndex({ embedTextMode: opts.embedTextMode });

  // Optional BM25 corpus build for hybrid RRF variant
  let bm25 = null;
  if (opts.hybridBm25) {
    const corpus = scanCorpus(path.join(REPO_ROOT, 'skills'), opts.embedTextMode);
    bm25 = new BM25Index(corpus.records);
  }

  // 2. Load cases & filter split if requested
  const lines = fs.readFileSync(opts.casesPath, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const allCases = lines.map((l) => JSON.parse(l));
  const cases = opts.split === 'all'
    ? allCases
    : allCases.filter((c) => c.split === opts.split);

  const stubWorkerPool = {
    generateEmbeddingForeground: async (text) => Array.from(await embedText(text)),
    generateEmbeddingBackground: async (text) => Array.from(await embedText(text))
  };

  const svc = new EmbeddingService(stubWorkerPool, {
    dbPath: indexRes.dbPath,
    skillsDir: path.join(REPO_ROOT, 'skills'),
    disableWatcher: true
  });

  const missingRefs = [];
  for (const c of allCases) {
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

  // 3. Evaluate cases
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
    const denseTop = svc.searchWithEmbedding(queryVec, opts.hybridBm25 ? 50 : 10, { mode: 'exact', skipOptimizer: true });
    let rankedTop = denseTop.slice(0, 10);
    if (opts.hybridBm25 && bm25) {
      const bm25Top = bm25.search(c.prompt, 50);
      rankedTop = fuseRRF(denseTop, bm25Top, { k: 60, topK: 10 });
    }
    const exactMs = Number(process.hrtime.bigint() - eStart) / 1e6;
    exactLatencies.push(exactMs);

    const hStart = process.hrtime.bigint();
    const hnswTop = svc.searchWithEmbedding(queryVec, 10, { mode: 'hnsw', skipOptimizer: true });
    const hnswMs = Number(process.hrtime.bigint() - hStart) / 1e6;
    hnswLatencies.push(hnswMs);

    const top1 = rankedTop[0] || { name: 'NONE', score: 0 };
    const top2 = rankedTop[1] || { name: 'NONE', score: 0 };
    const margin = opts.hybridBm25
      ? Number(((top1.rrfScore || 0) - (top2.rrfScore || 0)).toFixed(4))
      : Number((top1.score - top2.score).toFixed(4));

    const expectedSet = c.expect === null ? null : new Set(c.expect);
    let pass = false;
    let hit1 = false;
    let hit3 = false;
    let rr = 0;

    if (expectedSet === null) {
      pass = top1.score < opts.threshold;
    } else {
      hit1 = expectedSet.has(top1.name) && top1.score >= opts.threshold;
      hit3 = rankedTop.slice(0, 3).some((item) => expectedSet.has(item.name) && item.score >= opts.threshold);
      const rankIdx = rankedTop.findIndex((item) => expectedSet.has(item.name) && item.score >= opts.threshold);
      rr = rankIdx !== -1 ? 1 / (rankIdx + 1) : 0;
      pass = hit1;
    }

    // HNSW vs Exact parity
    const hTop1 = hnswTop[0] ? hnswTop[0].name : null;
    if (hTop1 === (denseTop[0] ? denseTop[0].name : null)) {
      hnswTop1Matches++;
    } else {
      parityMismatches.push({
        id: c.id,
        exactTop1: { name: denseTop[0].name, score: Number(denseTop[0].score.toFixed(4)) },
        hnswTop1: { name: hTop1, score: hnswTop[0] ? Number(hnswTop[0].score.toFixed(4)) : 0 }
      });
    }
    const exact3Set = new Set(denseTop.slice(0, 3).map((x) => x.name));
    const hnsw3Set = new Set(hnswTop.slice(0, 3).map((x) => x.name));
    let inter3 = 0;
    for (const x of exact3Set) if (hnsw3Set.has(x)) inter3++;
    hnswRecall3Sum += inter3 / Math.max(1, exact3Set.size);

    const exact10Set = new Set(denseTop.slice(0, 10).map((x) => x.name));
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
      top3: rankedTop.slice(0, 3).map((x) => ({ name: x.name, score: Number(x.score.toFixed(4)) })),
      hit1,
      hit3,
      rr: Number(rr.toFixed(4)),
      pass
    };
    results.push(rowResult);

    evalRows.push({
      run_id: runId,
      suite: suiteName,
      split: c.split,
      case_id: c.id,
      git_sha: gitSha,
      embed_model: `${pin.model_id}:${opts.embedTextMode}${opts.hybridBm25 ? '+bm25rrf' : ''}`,
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

  const summary = {};
  if (opts.split === 'all') {
    summary.overall = summarizeSplit(results);
    summary.dev = summarizeSplit(results.filter((r) => r.split === 'dev'));
    const testSum = summarizeSplit(results.filter((r) => r.split === 'test'));
    // Test-split hygiene: drop per-case confusion pairs unless explicitly requested
    if (!opts.showTestFlips) {
      delete testSum.top_confusions;
    }
    summary.test = testSum;
  } else {
    summary[opts.split] = summarizeSplit(results);
  }

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
    const clusters = analyzeClusters(indexRes.dbPath, 0.78);
    const baseline = {
      schema_version: 2,
      recorded_at: new Date().toISOString(),
      git_sha: gitSha,
      threshold: opts.threshold,
      embed_text_mode: opts.embedTextMode,
      hybrid_bm25: opts.hybridBm25,
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
    console.log('Summary:', JSON.stringify({ summary, parity: { ...parity, top1_mismatches: parityMismatches.length } }, null, 2));
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

  const devPassToFail = [];
  const devFailToPass = [];
  const testPassToFail = [];
  const testFailToPass = [];
  const negativeTriggers = [];

  for (const r of results) {
    const prev = baseline.cases[r.id];
    if (!prev) continue;
    if (prev.pass && !r.pass) {
      if (r.expected === null) negativeTriggers.push({ id: r.id, split: r.split, score1: r.score1 });
      if (!waivers[r.id]) {
        const entry = {
          id: r.id,
          split: r.split,
          expected: r.expected,
          prevGot: prev.got,
          got: r.got,
          prevScore: prev.score1,
          score: r.score1
        };
        if (r.split === 'dev') devPassToFail.push(entry);
        else testPassToFail.push(entry);
      }
    } else if (!prev.pass && r.pass) {
      const entry = { id: r.id, split: r.split, got: r.got, score: r.score1 };
      if (r.split === 'dev') devFailToPass.push(entry);
      else testFailToPass.push(entry);
    }
  }

  const devHit1Delta = summary.dev && baseline.summary.dev
    ? Number((summary.dev.hit_at_1 - baseline.summary.dev.hit_at_1).toFixed(4))
    : null;
  const devHit3Delta = summary.dev && baseline.summary.dev
    ? Number((summary.dev.hit_at_3 - baseline.summary.dev.hit_at_3).toFixed(4))
    : null;
  const testHit1Delta = summary.test && baseline.summary.test
    ? Number((summary.test.hit_at_1 - baseline.summary.test.hit_at_1).toFixed(4))
    : null;
  const testHit3Delta = summary.test && baseline.summary.test
    ? Number((summary.test.hit_at_3 - baseline.summary.test.hit_at_3).toFixed(4))
    : null;

  console.log('=== Tier R Routing Evaluation Report ===');
  console.log(JSON.stringify({
    run_id: runId,
    suite: suiteName,
    split: opts.split,
    git_sha: gitSha,
    corpus_hash: indexRes.corpusHash,
    embedded_text: indexRes.embeddedTextStats,
    ...summary,
    parity: {
      top1_match: parity.hnsw_top1_exact_match,
      recall_at_3: parity.hnsw_recall_at_3_vs_exact,
      exact_p50_ms: parity.exact_latency_ms_median,
      hnsw_p50_ms: parity.hnsw_latency_ms_median
    },
    deltas_vs_baseline: {
      dev_hit1_delta: devHit1Delta,
      dev_hit3_delta: devHit3Delta,
      test_hit1_delta: testHit1Delta,
      test_hit3_delta: testHit3Delta,
      dev_pass_to_fail_count: devPassToFail.length,
      dev_fail_to_pass_count: devFailToPass.length,
      test_pass_to_fail_count: testPassToFail.length,
      test_fail_to_pass_count: testFailToPass.length,
      new_negative_triggers: negativeTriggers.length
    },
    dev_pass_to_fail: devPassToFail,
    dev_fail_to_pass: devFailToPass,
    ...(opts.showTestFlips ? { test_pass_to_fail: testPassToFail, test_fail_to_pass: testFailToPass } : {})
  }, null, 2));

  if (opts.noGate) return;

  const totalPassToFail = devPassToFail.length + testPassToFail.length;
  const failures = [];
  if (totalPassToFail > 0) {
    failures.push(`${totalPassToFail} unjustified pass->fail regression(s)`);
  }
  if (negativeTriggers.length > 0) {
    failures.push(`${negativeTriggers.length} previously passing negative case(s) triggered`);
  }
  if (testHit1Delta !== null && testHit1Delta < -0.03) {
    failures.push(`test hit@1 dropped by ${testHit1Delta} (>0.03 threshold)`);
  }
  if (testHit3Delta !== null && testHit3Delta < -0.03) {
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
