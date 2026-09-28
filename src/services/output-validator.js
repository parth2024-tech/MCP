/**
 * ASE Output Validation Layer v2
 *
 * Built LAST intentionally — depends on real project toolchain being wired.
 *
 * Detects project ecosystem, discovers available tooling, and runs only
 * the validators that are actually installed (doesn't fail if a tool is missing).
 */

const fs = require('fs').promises;
const path = require('path');
const { detectProjectType, getSteps, runCmd } = require('./validation-core');

// ─────────────────────────────────────────────────────────────
// Main validation entry point
// ─────────────────────────────────────────────────────────────

/**
 * validate — runs the full validation suite for the active project.
 *
 * @param {string} projectDir - Absolute path to project root
 * @returns {{
 *   project_type: string,
 *   project_dir: string,
 *   passed: boolean,
 *   critical_failure: boolean,
 *   results: Array<{ step, status, exit_code, output, elapsed_ms }>,
 *   skipped: string[],
 *   summary: string
 * }}
 */
async function validate(projectDir, timeoutMs = 30000) {
  const resolvedDir = projectDir || process.cwd();
  const detection = await detectProjectType(resolvedDir);

  // Read package.json if it exists
  let pkg = null;
  try {
    const raw = await fs.readFile(path.join(resolvedDir, 'package.json'), 'utf8');
    pkg = JSON.parse(raw);
  } catch (err) {
    require('../utils/logger').logger.warn('OutputValidator', `Failed to read package.json: ${err.message}`);
  }

  // Read .ase-project.json if it exists
  let aseConfig = null;
  try {
    const raw = await fs.readFile(path.join(resolvedDir, '.ase-project.json'), 'utf8');
    aseConfig = JSON.parse(raw);
  } catch (err) {
    require('../utils/logger').logger.warn('OutputValidator', `Failed to read .ase-project.json: ${err.message}`);
  }

  const steps = await getSteps(detection.type, resolvedDir, pkg, aseConfig);
  const skipped = [];
  let allPassed = true;
  let criticalFailure = false;

  // Execute all steps in parallel
  const promises = steps.map(async (step) => {
    if (!step.available) {
      return { isSkipped: true, step };
    }
    const { success, output, exitCode, elapsed_ms, timed_out } = await runCmd(step.cmd, step.args, resolvedDir, timeoutMs, aseConfig);
    const status = timed_out ? 'timeout' : success ? 'passed' : 'failed';
    return {
      isSkipped: false,
      step,
      success,
      status,
      exit_code: exitCode,
      output: output.slice(0, 500),
      elapsed_ms,
      critical: step.critical
    };
  });

  const resolved = await Promise.all(promises);
  const results = [];

  for (const chunk of resolved) {
    if (chunk.isSkipped) {
      skipped.push(chunk.step.name);
    } else {
      results.push({
        step: chunk.step.name,
        status: chunk.status,
        passed: chunk.status === 'passed',
        exit_code: chunk.exit_code,
        output: chunk.output,
        elapsed_ms: chunk.elapsed_ms,
        critical: chunk.critical
      });
      if (!chunk.success) {
        allPassed = false;
        if (chunk.critical) criticalFailure = true;
      }
    }
  }

  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status !== 'passed').length;
  const totalRan = results.length;

  let summary;
  if (totalRan === 0 && skipped.length > 0) {
    summary = `⚠️  All ${skipped.length} validators were skipped (tools not installed). Install your linter and test framework first.`;
  } else if (allPassed) {
    summary = `✅ ALL ${passedCount} validation steps passed. Code is clean.`;
  } else if (criticalFailure) {
    summary = `🚨 CRITICAL: ${failedCount} step(s) failed, including a critical check. Code MUST NOT ship.`;
  } else {
    summary = `❌ ${failedCount} of ${totalRan} steps failed. Fix the issues before shipping.`;
  }

  if (skipped.length > 0 && totalRan > 0) {
    summary += ` (${skipped.length} skipped: ${skipped.join(', ')})`;
  }

  return {
    project_type: detection.type,
    project_dir: resolvedDir,
    passed: allPassed,
    critical_failure: criticalFailure,
    results,
    skipped,
    summary
  };
}

module.exports = { validate, detectProjectType, getSteps, runCmd };
