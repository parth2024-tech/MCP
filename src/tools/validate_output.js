const fs = require('fs').promises;
const path = require('path');
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

    // ── Pre-flight Checks (Code-level validation) ──
    if (args.code !== undefined) {
      const filename = args.file_path || 'file.tsx';
      
      // Load .ase-project.json never_do rules
      let neverDo = [];
      try {
        const configPath = path.join(projectDir, '.ase-project.json');
        const raw = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(raw);
        neverDo = config.never_do || [];
      } catch (err) {
        // Fallback or ignore if file doesn't exist
      }

      // 1. Fast regex checks
      const regexViolations = runRegexChecks(args.code, filename, neverDo);

      // 2. AST structural analysis
      const astViolations = validateWithAST(args.code, filename);

      const durationMs = Date.now() - startMs;
      const hasErrors = regexViolations.length > 0 || astViolations.length > 0;

      // Log tool call metrics
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('validate_output', durationMs, hasErrors);
      }

      if (hasErrors) {
        return toolError({
          error_code: 'VALIDATION_FAILED',
          message: `Pre-flight validation failed in ${durationMs}ms. Code violates project rules.`,
          retryable: true,
          fix_hint: 'Review the rule violations, fix the code structure/types/styles, and try again.',
          details: {
            regex_violations: regexViolations,
            ast_violations: astViolations
          }
        });
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Pre-flight validation passed in ${durationMs}ms. ${filename} is clean.`
        }]
      };
    }

    // ── Full project validation check (Standard mode) ──
    const { validateStream } = require('../services/streaming-validator');
    const chunks = [];
    let finalSummary = null;
    let stepIndex = 0;

    try {
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
              (extra?.reqLogger || require('../utils/logger').logger).warn('ValidateOutput', `Failed to send progress notification: ${notifErr.message}`);
            }
          }
        }
      }

      const result = {
        project_type: finalSummary ? finalSummary.project_type : 'unknown',
        project_dir: projectDir,
        passed: finalSummary ? finalSummary.passed : false,
        critical_failure: finalSummary ? finalSummary.critical_failure : false,
        results: chunks.filter(c => c.type === 'step_result'),
        skipped: finalSummary ? finalSummary.skipped : [],
        summary: finalSummary ? finalSummary.summary : 'Validation did not complete.'
      };

      const durationMs = Date.now() - startMs;
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('validate_output', durationMs, !result.passed);
      }

      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'validate_output', 'authorized', 0, { passed: result.passed, project_type: result.project_type });
      return result;

    } catch (err) {
      const durationMs = Date.now() - startMs;
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('validate_output', durationMs, true);
      }
      return { error: `Streaming validation failed: ${err.message}` };
    }
  }
});
