/**
 * SQLite store for eval_runs (Tier R routing and Tier L golden task evals).
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { getAseHome } = require('../src/utils/ase-home');

function getDefaultEvalDbPath() {
  if (process.env.ASE_EVAL_DB && process.env.ASE_EVAL_DB.trim()) {
    return path.resolve(process.env.ASE_EVAL_DB.trim());
  }
  return path.join(getAseHome(), 'eval_runs.db');
}

class EvalStore {
  constructor(dbPath = getDefaultEvalDbPath()) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS eval_runs (
        id INTEGER PRIMARY KEY,
        run_id TEXT NOT NULL,
        suite TEXT NOT NULL,
        split TEXT NOT NULL,
        case_id TEXT NOT NULL,
        git_sha TEXT NOT NULL,
        embed_model TEXT,
        embed_rev TEXT,
        llm_model_id TEXT,
        prompt_hash TEXT,
        mode TEXT NOT NULL,
        expected TEXT,
        got TEXT,
        margin REAL,
        pass INTEGER NOT NULL,
        tokens INTEGER,
        cost_usd REAL,
        latency_ms INTEGER,
        iterations INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_eval_suite_sha ON eval_runs(suite, git_sha);
      CREATE INDEX IF NOT EXISTS idx_eval_run_id ON eval_runs(run_id);
    `);
  }

  insertRows(rows) {
    const stmt = this.db.prepare(`
      INSERT INTO eval_runs (
        run_id, suite, split, case_id, git_sha,
        embed_model, embed_rev, llm_model_id, prompt_hash, mode,
        expected, got, margin, pass, tokens, cost_usd, latency_ms, iterations
      ) VALUES (
        @run_id, @suite, @split, @case_id, @git_sha,
        @embed_model, @embed_rev, @llm_model_id, @prompt_hash, @mode,
        @expected, @got, @margin, @pass, @tokens, @cost_usd, @latency_ms, @iterations
      )
    `);
    const tx = this.db.transaction((items) => {
      for (const item of items) {
        stmt.run(item);
      }
    });
    tx(rows);
  }

  getRunRows(runId) {
    return this.db.prepare('SELECT * FROM eval_runs WHERE run_id = ? ORDER BY id ASC').all(runId);
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = { EvalStore, getDefaultEvalDbPath };
