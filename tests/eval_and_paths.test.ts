import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EvalStore } = require('../evals/eval-store');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAseHome, getAseLogsDir, getRepoRoot } = require('../src/utils/ase-home');

describe('Phase 1: EvalStore & Portable ASE Paths', () => {
  const origAseHome = process.env.ASE_HOME;
  const origXdg = process.env.XDG_STATE_HOME;
  const tempDirs: string[] = [];

  afterEach(() => {
    if (origAseHome === undefined) delete process.env.ASE_HOME;
    else process.env.ASE_HOME = origAseHome;
    if (origXdg === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = origXdg;

    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  it('resolves ASE_HOME -> XDG_STATE_HOME/ase -> ~/.local/state/ase in strict order', () => {
    process.env.ASE_HOME = '/tmp/custom-ase-home';
    process.env.XDG_STATE_HOME = '/tmp/custom-xdg';
    expect(getAseHome()).toBe(path.resolve('/tmp/custom-ase-home'));
    expect(getAseLogsDir()).toBe(path.join(path.resolve('/tmp/custom-ase-home'), 'logs'));

    delete process.env.ASE_HOME;
    expect(getAseHome()).toBe(path.join(path.resolve('/tmp/custom-xdg'), 'ase'));

    delete process.env.XDG_STATE_HOME;
    expect(getAseHome()).toBe(path.join(os.homedir(), '.local', 'state', 'ase'));
  });

  it('resolves repo root cleanly from canonical src/utils', () => {
    const expectedRoot = path.resolve(__dirname, '..');
    expect(getRepoRoot(path.join(expectedRoot, 'src', 'utils'))).toBe(expectedRoot);
  });

  it('creates eval_runs SQLite table keyed by git_sha and persists rows', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ase-eval-store-'));
    tempDirs.push(tmp);
    const dbPath = path.join(tmp, 'eval_runs.db');
    const store = new EvalStore(dbPath);

    store.insertRows([
      {
        run_id: 'run-test-1',
        suite: 'routing',
        split: 'dev',
        case_id: 'r-0001',
        git_sha: 'abc1234',
        embed_model: 'Xenova/all-MiniLM-L6-v2',
        embed_rev: '751bff37182d3f1213fa05d7196b954e230abad9',
        llm_model_id: null,
        prompt_hash: 'deadbeef',
        mode: 'live',
        expected: '["cad-engineering"]',
        got: 'cad-engineering',
        margin: 0.1234,
        pass: 1,
        tokens: null,
        cost_usd: 0,
        latency_ms: 2,
        iterations: 1
      }
    ]);

    const rows = store.getRunRows('run-test-1');
    expect(rows.length).toBe(1);
    expect(rows[0].git_sha).toBe('abc1234');
    expect(rows[0].pass).toBe(1);
    expect(rows[0].margin).toBeCloseTo(0.1234, 4);
    store.close();
  });
});
