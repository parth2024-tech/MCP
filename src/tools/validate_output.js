const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const OrchestrationDB = require('../services/orchestration-db');
const { validateWithAST } = require('../services/ast-validator');
const { toolError } = require('../utils/errors');
const { logAccess } = require('../utils/logger');

function runRegexChecks(code, filename, neverDoStrings) {
  const violations = [];
  for (const ruleStr of neverDoStrings) {
    if (ruleStr.toLowerCase().includes('useeffect') && /\buseEffect\b/.test(code)) {
      violations.push(`useEffect usage matches: "${ruleStr}"`);
    }
    if (ruleStr.toLowerCase().includes('secret') && /\b(process\.env\.[A-Z0-9_]*SECRET[A-Z0-9_]*|process\.env\.[A-Z0-9_]*KEY[A-Z0-9_]*)\b/i.test(code)) {
      violations.push(`Hardcoded secret access matches: "${ruleStr}"`);
    }
  }
  return violations;
}

module.exports = (deps) => ({
  name: 'validate_output',
  description: 'Runs pre-flight AST/regex validation on the provided code, or executes the project build/test suite if no code is passed.',
  inputSchema: {
    type: 'object',
    properties: {
      code: {
        type: 'string',
        description: 'Optional. Raw file code content to run pre-flight rules validation against.'
      },
      file_path: {
        type: 'string',
        description: 'Optional. Path of the file being validated (used for extension-based AST rules).'
      },
      project_dir: {
        type: 'string',
        description: 'Optional. Absolute path to project root. Defaults to current working directory.'
      },
      timeout_ms: {
        type: 'number',
        description: 'Optional. Timeout in milliseconds per validation step. Defaults to 30000.'
      }
    }
  },

  handler: async (args, extra) => {
    const projectDir = args.project_dir || process.cwd();
    const timeoutMs = args.timeout_ms || 30000;
    const startMs = Date.now();
    const runId = crypto.randomUUID();
    const db = OrchestrationDB.getInstance().getDB();

    // Insert placeholder validation run record
    db.prepare(`
      INSERT INTO validation_runs (id, project_dir, passed, details)
      VALUES (?, ?, 0, ?)
    `).run(runId, projectDir, JSON.stringify({ status: 'running' }));

    // Run validation in the background
    (async () => {
      try {
        if (args.code !== undefined) {
          const filename = args.file_path || 'file.tsx';
          let neverDo = [];
          try {
            const configPath = path.join(projectDir, '.ase-project.json');
            const raw = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(raw);
            neverDo = config.never_do || [];
          } catch (err) {
            // Ignore if file doesn't exist
          }

          const regexViolations = runRegexChecks(args.code, filename, neverDo);
          const astViolations = validateWithAST(args.code, filename);
          const hasErrors = regexViolations.length > 0 || astViolations.length > 0;
          const durationMs = Date.now() - startMs;

          if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
            deps.sessionState.logToolCall('validate_output', durationMs, hasErrors);
          }

          db.prepare(`
            UPDATE validation_runs SET passed = ?, details = ? WHERE id = ?
          `).run(hasErrors ? 0 : 1, JSON.stringify({
            status: 'completed',
            passed: !hasErrors,
            filename,
            regex_violations: regexViolations,
            ast_violations: astViolations,
            duration_ms: durationMs
          }), runId);
        } else {
          const { validateStream } = require('../services/streaming-validator');
          const chunks = [];
          let finalSummary = null;
          let stepIndex = 0;

          for await (const chunk of validateStream(projectDir, timeoutMs)) {
            chunks.push(chunk);
            if (chunk.type === 'summary') {
              finalSummary = chunk;
            } else {
              stepIndex++;
              if (extra && typeof extra.sendNotification === 'function') {
                try {
                  const progressToken = extra._meta && extra._meta.progressToken;
                  if (progressToken !== undefined) {
                    await extra.sendNotification({
                      method: 'notifications/progress',
                      params: {
                        progressToken,
                        progress: stepIndex,
                        total: chunk.totalSteps,
                        message: `[${chunk.status || 'skipped'}] ${chunk.step}`
                      }
                    });
                  }
                } catch (notifErr) {
                  // Ignore notification errors in background
                }
              }
            }
          }

          const passed = finalSummary ? finalSummary.passed : false;
          const result = {
            status: 'completed',
            passed: passed,
            project_type: finalSummary ? finalSummary.project_type : 'unknown',
            project_dir: projectDir,
            critical_failure: finalSummary ? finalSummary.critical_failure : false,
            results: chunks.filter(c => c.type === 'step_result'),
            skipped: finalSummary ? finalSummary.skipped : [],
            summary: finalSummary ? finalSummary.summary : 'Validation did not complete.'
          };

          const durationMs = Date.now() - startMs;
          if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
            deps.sessionState.logToolCall('validate_output', durationMs, !passed);
          }

          db.prepare(`
            UPDATE validation_runs SET passed = ?, details = ? WHERE id = ?
          `).run(passed ? 1 : 0, JSON.stringify(result), runId);
        }
      } catch (err) {
        const durationMs = Date.now() - startMs;
        if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
          deps.sessionState.logToolCall('validate_output', durationMs, true);
        }
        db.prepare(`
          UPDATE validation_runs SET passed = 0, details = ? WHERE id = ?
        `).run(JSON.stringify({ status: 'failed', error: err.message }), runId);
      }
    })();

    return {
      status: 'running',
      validation_job_id: runId,
      validation_run_id: runId
    };
  }
});
