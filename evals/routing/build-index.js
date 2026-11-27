/**
 * Rebuilds/updates the Tier R evaluation embedding index in .cache/eval-skills.db
 * directly from skills/<name>/SKILL.md using config/model-pins.json.
 * Never trusts prebuilt runtime skills.db.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parseFrontmatter } = require('../../src/utils/context-optimizer');
const { findMainMdSync } = require('../../src/utils/fs-utils');
const { loadModelPin, embedText, REPO_ROOT } = require('./pinned-embedder');

const DEFAULT_EVAL_INDEX_DB = path.join(REPO_ROOT, '.cache', 'eval-skills.db');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseTags(content) {
  if (!content || !content.startsWith('---')) return [];
  const endIdx = content.indexOf('---', 3);
  if (endIdx === -1) return [];
  const fm = content.substring(3, endIdx);
  const inline = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return [];
}

function collectSkillFiles(skillsDir) {
  const found = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (dir === skillsDir && (entry.name === 'tools' || entry.name === 'docs')) continue;
        walk(full);
      } else if (entry.name === 'SKILL.md') {
        const relDir = path.relative(skillsDir, dir).split(path.sep).join('/');
        if (relDir && relDir !== '.') {
          found.push({ name: relDir, mdFile: full });
        }
      }
    }
  }
  walk(skillsDir);
  found.sort((a, b) => a.name.localeCompare(b.name));
  return found;
}

function scanCorpus(skillsDir = path.join(REPO_ROOT, 'skills'), embedTextMode = 'desc') {
  const skillFiles = collectSkillFiles(skillsDir);

  const records = [];
  let descriptionOnlyCount = 0;
  let fallbackBodyCount = 0;
  let maxTextChars = 0;
  let truncatedFallbacks = 0;

  for (const { name, mdFile } of skillFiles) {
    const content = fs.readFileSync(mdFile, 'utf8');
    const fm = parseFrontmatter(content);
    const desc = fm && fm.description ? fm.description.trim() : '';
    const category = (fm && fm.category) || '';
    const tags = parseTags(content);
    const usedFallback = desc.length === 0;
    const baseText = usedFallback ? content.substring(0, 800) : desc;

    let textToEmbed = baseText;
    if (embedTextMode === 'name_desc_tags') {
      const readableName = name.replace(/[/-]/g, ' ');
      const meta = [category, ...tags].filter(Boolean).join(', ');
      textToEmbed = meta ? `${readableName} (${meta}): ${baseText}` : `${readableName}: ${baseText}`;
    }

    if (usedFallback) {
      fallbackBodyCount++;
      if (content.length > 800) truncatedFallbacks++;
    } else {
      descriptionOnlyCount++;
    }
    if (textToEmbed.length > maxTextChars) {
      maxTextChars = textToEmbed.length;
    }

    records.push({
      name,
      category: category || 'uncategorized',
      tags,
      description: desc,
      textToEmbed,
      usedFallback,
      tokenEstimate: Math.ceil(content.length / 4),
      hash: sha256(`${embedTextMode}|${content}`)
    });
  }

  const corpusHash = sha256(JSON.stringify(records.map((r) => [r.name, r.hash])));
  return {
    records,
    corpusHash,
    embeddedTextStats: {
      totalSkills: records.length,
      embedTextMode,
      descriptionOnlyCount,
      fallbackBodyCount,
      truncatedFallbacks,
      maxTextChars
    }
  };
}

async function buildEvalIndex(options = {}) {
  const embedTextMode = options.embedTextMode || 'desc';
  const defaultDb = embedTextMode === 'desc'
    ? DEFAULT_EVAL_INDEX_DB
    : path.join(REPO_ROOT, '.cache', `eval-skills-${embedTextMode}.db`);
  const dbPath = options.dbPath || process.env.ASE_EVAL_INDEX_DB || defaultDb;
  const skillsDir = options.skillsDir || path.join(REPO_ROOT, 'skills');
  const pin = loadModelPin();

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS skills (
      name TEXT PRIMARY KEY,
      category TEXT,
      description TEXT,
      embedding BLOB NOT NULL,
      tokenEstimate INTEGER NOT NULL,
      hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS model_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      model_name TEXT NOT NULL,
      revision TEXT NOT NULL,
      onnx_sha256 TEXT NOT NULL,
      quantized INTEGER NOT NULL,
      dimensions INTEGER NOT NULL,
      corpus_hash TEXT NOT NULL,
      indexed_at TEXT NOT NULL
    );
  `);

  const meta = db.prepare('SELECT * FROM model_metadata WHERE id = 1').get();
  const pinMismatch = !meta
    || meta.model_name !== pin.model_id
    || meta.revision !== pin.revision
    || meta.onnx_sha256 !== pin.onnx_sha256
    || Boolean(meta.quantized) !== Boolean(pin.quantized)
    || meta.dimensions !== pin.dimensions;

  if (pinMismatch) {
    db.exec('DELETE FROM skills; DELETE FROM model_metadata;');
  }

  const { records, corpusHash, embeddedTextStats } = scanCorpus(skillsDir, embedTextMode);
  const existingRows = new Map(
    db.prepare('SELECT name, hash FROM skills').all().map((r) => [r.name, r.hash])
  );

  const toEmbed = records.filter((r) => existingRows.get(r.name) !== r.hash);
  const activeNames = new Set(records.map((r) => r.name));
  const toDelete = [...existingRows.keys()].filter((name) => !activeNames.has(name));

  const startMs = Date.now();
  if (toDelete.length > 0) {
    const delStmt = db.prepare('DELETE FROM skills WHERE name = ?');
    const delTx = db.transaction((names) => {
      for (const n of names) delStmt.run(n);
    });
    delTx(toDelete);
  }

  if (toEmbed.length > 0) {
    const upsert = db.prepare(`
      INSERT INTO skills (name, category, description, embedding, tokenEstimate, hash)
      VALUES (@name, @category, @description, @embedding, @tokenEstimate, @hash)
      ON CONFLICT(name) DO UPDATE SET
        category = excluded.category,
        description = excluded.description,
        embedding = excluded.embedding,
        tokenEstimate = excluded.tokenEstimate,
        hash = excluded.hash
    `);

    const batch = [];
    for (const r of toEmbed) {
      const vec = await embedText(r.textToEmbed);
      batch.push({
        name: r.name,
        category: r.category,
        description: r.description,
        embedding: Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength),
        tokenEstimate: r.tokenEstimate,
        hash: r.hash
      });
    }

    const tx = db.transaction((items) => {
      for (const item of items) upsert.run(item);
    });
    tx(batch);
  }

  db.prepare(`
    INSERT INTO model_metadata (id, model_name, revision, onnx_sha256, quantized, dimensions, corpus_hash, indexed_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      model_name = excluded.model_name,
      revision = excluded.revision,
      onnx_sha256 = excluded.onnx_sha256,
      quantized = excluded.quantized,
      dimensions = excluded.dimensions,
      corpus_hash = excluded.corpus_hash,
      indexed_at = excluded.indexed_at
  `).run(
    pin.model_id,
    pin.revision,
    pin.onnx_sha256,
    pin.quantized ? 1 : 0,
    pin.dimensions,
    corpusHash,
    new Date().toISOString()
  );

  db.pragma('wal_checkpoint(TRUNCATE)');
  const buildMs = Date.now() - startMs;
  db.close();

  return {
    dbPath,
    corpusHash,
    pin,
    embeddedCount: toEmbed.length,
    deletedCount: toDelete.length,
    buildMs,
    embeddedTextStats
  };
}

if (require.main === module) {
  buildEvalIndex()
    .then((res) => {
      console.log(JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error('buildEvalIndex failed:', err);
      process.exitCode = 1;
    });
}

module.exports = { buildEvalIndex, scanCorpus, collectSkillFiles, DEFAULT_EVAL_INDEX_DB };
