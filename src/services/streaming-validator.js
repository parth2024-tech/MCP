/**
 * Streaming Validation — Async Generator
 *
 * Runs each validation step sequentially and yields results as they complete.
 * This allows the MCP server to emit progress notifications per-step so the
 * AI host can begin parsing immediately rather than waiting for the full suite.
 *
 * Each yielded chunk is a self-contained status object for one validation step.
 */

const { detectProjectType, getSteps, runCmd } = require('./validation-core');

// ─────────────────────────────────────────────────────────────
// The streaming generator
// ─────────────────────────────────────────────────────────────

/**
 * Async generator that yields one chunk per validation step.
 *
 * Chunk shape:
 *   { type: 'step_result', stepIndex, totalSteps, step, status, exit_code, output, elapsed_ms, critical }
 * Final chunk:
 *   { type: 'summary', project_type, passed, critical_failure, skipped, summary }
 *
 * @param {string} projectDir
 */
async function* validateStream(projectDir, timeoutMs = 30000) {
  const resolvedDir = projectDir || process.cwd();
  const projectType = await detectProjectType(resolvedDir);
  const steps = await getSteps(projectType, resolvedDir);

  const skipped = [];
  let allPassed = true;
  let criticalFailure = false;
  const totalSteps = steps.length;

  // Launch all commands in parallel
  const promises = steps.map(async (step, i) => {
    if (!step.available) {
      return {
        type: 'step_skipped',
        stepIndex: i + 1,
        totalSteps,
        step: step.name,
        reason: 'Tool not installed',
        isSkipped: true,
        stepObj: step
      };
    }

    const { success, output, exitCode, elapsed_ms, timed_out } = await runCmd(step.cmd, step.args, resolvedDir, timeoutMs, null);
    const status = timed_out ? 'timeout' : success ? 'passed' : 'failed';

    return {
      type: 'step_result',
      stepIndex: i + 1,
      totalSteps,
      step: step.name,
      status,
      exit_code: exitCode,
      output: output.slice(0, 500),
      elapsed_ms,
      critical: step.critical,
      isSkipped: false,
      success,
      stepObj: step
    };
  });

  // Yield results in deterministic order as we await them
  for (const p of promises) {
    const chunk = await p;
    
    if (chunk.isSkipped) {
      skipped.push(chunk.stepObj.name);
      yield {
        type: chunk.type,
        stepIndex: chunk.stepIndex,
        totalSteps: chunk.totalSteps,
        step: chunk.step,
        reason: chunk.reason
      };
    } else {
      if (!chunk.success) {
        allPassed = false;
        if (chunk.critical) criticalFailure = true;
      }
      
      yield {
        type: chunk.type,
        stepIndex: chunk.stepIndex,
        totalSteps: chunk.totalSteps,
        step: chunk.step,
        status: chunk.status,
        exit_code: chunk.exit_code,
        output: chunk.output,
        elapsed_ms: chunk.elapsed_ms,
        critical: chunk.critical
      };
    }
  }

  // Final summary
  const passedCount = totalSteps - skipped.length;
  let summary;
  if (passedCount === 0 && skipped.length > 0) {
    summary = `⚠️  All ${skipped.length} validators were skipped (tools not installed).`;
  } else if (allPassed) {
    summary = `✅ ALL validation steps passed. Code is clean.`;
  } else if (criticalFailure) {
    summary = `🚨 CRITICAL failure detected. Code MUST NOT ship.`;
  } else {
    summary = `❌ Some steps failed. Fix the issues before shipping.`;
  }

  yield {
    type: 'summary',
    project_type: projectType,
    project_dir: resolvedDir,
    passed: allPassed,
    critical_failure: criticalFailure,
    skipped,
    summary
  };
}

module.exports = { validateStream };
