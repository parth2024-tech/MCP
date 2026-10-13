const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// ─────────────────────────────────────────────────────────────
// S-2: CWD Whitelist Validation
// ─────────────────────────────────────────────────────────────
function isAllowedCwd(targetCwd, aseConfig = null) {
  const envAllowed = process.env.ASE_ALLOWED_DIRS ? process.env.ASE_ALLOWED_DIRS.split(',') : [];
  const configAllowed = (aseConfig && aseConfig.allowed_dirs) || [];
  const allowedRoots = [...envAllowed, ...configAllowed].map(d => path.resolve(d.trim()));
  
  if (allowedRoots.length === 0) return true; // Fail-open if no whitelist is configured
  
  const target = path.resolve(targetCwd);
  for (const root of allowedRoots) {
    if (target === root || target.startsWith(root + path.sep)) {
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
// Project type detection — multi-signal for accuracy
// ─────────────────────────────────────────────────────────────

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      require('../utils/logger').logger.warn('ValidationCore', `fileExists check failed for ${p}: ${err.message}`);
    }
    return false;
  }
}

async function detectProjectType(projectDir) {
  const exists = async (f) => await fileExists(path.join(projectDir, f));

  const markers = {
    typescript: await exists('tsconfig.json'),
    javascript: await exists('package.json'),
    python:     await exists('pyproject.toml') || await exists('setup.py') || await exists('requirements.txt'),
    golang:     await exists('go.mod'),
    rust:       await exists('Cargo.toml'),
    elixir:     await exists('mix.exs')
  };

  if (markers.typescript) return { type: 'typescript', markers };
  if (markers.rust) return { type: 'rust', markers };
  if (markers.golang) return { type: 'golang', markers };
  if (markers.elixir) return { type: 'elixir', markers };
  if (markers.python) return { type: 'python', markers };
  if (markers.javascript) return { type: 'javascript', markers };

  return { type: 'unknown', markers };
}

// ─────────────────────────────────────────────────────────────
// Tool discovery — check if a command exists before running it
// ─────────────────────────────────────────────────────────────

async function commandExists(cmd, cwd, aseConfig = null) {
  const { success } = await runCmd('which', [cmd], cwd, 5000, aseConfig);
  return success;
}

async function npxAvailable(pkg, cwd, aseConfig = null) {
  const localBin = path.join(cwd, 'node_modules', '.bin', pkg);
  if (await fileExists(localBin)) return true;
  return await commandExists(pkg, cwd, aseConfig);
}

// ─────────────────────────────────────────────────────────────
// Command execution with streaming spawn (non-blocking)
// ─────────────────────────────────────────────────────────────

function runCmd(cmd, args = [], cwd, timeoutMs = 30000, aseConfig = null) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // S-2: Verify CWD containment
    if (!isAllowedCwd(cwd, aseConfig)) {
      return resolve({
        success: false,
        output: `Security Policy Violation: Working directory ${cwd} is not within allowed roots.`,
        exitCode: 1,
        elapsed_ms: Date.now() - startTime,
        timed_out: false
      });
    }

    let stdoutData = '';
    let stderrData = '';

    // S-2: shell: false (prevents shell injection)
    const child = spawn(cmd, args, { cwd, shell: false });

    let isTimedOut = false;
    let timer = null;

    if (timeoutMs) {
      timer = setTimeout(() => {
        isTimedOut = true;
        child.kill('SIGTERM');
      }, timeoutMs);
    }

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      const elapsed = Date.now() - startTime;

      const timed_out = isTimedOut || signal === 'SIGTERM';
      const success = !timed_out && code === 0;

      resolve({
        success,
        output: (stdoutData + stderrData).trim(),
        exitCode: code || (timed_out ? 1 : 0),
        elapsed_ms: elapsed,
        timed_out
      });
    });

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      const elapsed = Date.now() - startTime;
      resolve({
        success: false,
        output: (stdoutData + stderrData + '\n' + err.message).trim(),
        exitCode: 1,
        elapsed_ms: elapsed,
        timed_out: false
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Validation step builders per ecosystem
// ─────────────────────────────────────────────────────────────

async function getSteps(projectType, cwd, pkg, aseConfig) {
  const scripts = (pkg && pkg.scripts) ? pkg.scripts : {};
  const hasScript = (name) => !!scripts[name];

  const steps = [];

  switch (projectType) {
    case 'typescript':
      steps.push({
        name: 'TypeScript type check',
        cmd: 'npx',
        args: ['tsc', '--noEmit'],
        available: await npxAvailable('tsc', cwd, aseConfig),
        critical: true
      });
      steps.push({
        name: 'ESLint',
        cmd: hasScript('lint') ? 'npm' : 'npx',
        args: hasScript('lint') ? ['run', 'lint'] : ['eslint', '.', '--ext', '.ts,.tsx', '--max-warnings=0'],
        available: await npxAvailable('eslint', cwd, aseConfig),
        critical: false
      });
      steps.push({
        name: 'Unit tests',
        cmd: hasScript('test') ? 'npm' : 'echo',
        args: hasScript('test')
          ? (scripts.test && scripts.test.includes('vitest') ? ['test', '--', '--run', '--passWithNoTests'] : ['test', '--', '--passWithNoTests', '--watchAll=false'])
          : ['No test script found.'],
        available: hasScript('test'),
        critical: false
      });
      break;

    case 'javascript':
      steps.push({
        name: 'ESLint',
        cmd: hasScript('lint') ? 'npm' : 'npx',
        args: hasScript('lint') ? ['run', 'lint'] : ['eslint', '.', '--max-warnings=0'],
        available: await npxAvailable('eslint', cwd, aseConfig),
        critical: false
      });
      steps.push({
        name: 'Unit tests',
        cmd: hasScript('test') ? 'npm' : 'echo',
        args: hasScript('test')
          ? (scripts.test && scripts.test.includes('vitest') ? ['test', '--', '--run', '--passWithNoTests'] : ['test', '--', '--passWithNoTests', '--watchAll=false'])
          : ['No test script.'],
        available: hasScript('test'),
        critical: false
      });
      break;

    case 'python': {
      const venvRuff = path.join(cwd, '.venv', 'bin', 'ruff');
      const venvMypy = path.join(cwd, '.venv', 'bin', 'mypy');
      const venvTy = path.join(cwd, '.venv', 'bin', 'ty');
      const venvPytest = path.join(cwd, '.venv', 'bin', 'pytest');

      const hasVenvRuff = await fileExists(venvRuff);
      const hasVenvMypy = await fileExists(venvMypy);
      const hasVenvTy = await fileExists(venvTy);
      const hasVenvPytest = await fileExists(venvPytest);

      steps.push({
        name: 'Ruff lint',
        cmd: hasVenvRuff ? venvRuff : 'ruff',
        args: ['check', '.'],
        available: hasVenvRuff || await commandExists('ruff', cwd, aseConfig),
        critical: false
      });
      if (hasVenvTy || (aseConfig && aseConfig.type_checker === 'ty')) {
        steps.push({
          name: 'Ty type check',
          cmd: hasVenvTy ? venvTy : 'ty',
          args: ['check'],
          available: hasVenvTy || await commandExists('ty', cwd, aseConfig),
          critical: true
        });
      } else {
        steps.push({
          name: 'mypy type check',
          cmd: hasVenvMypy ? venvMypy : 'mypy',
          args: ['.', '--ignore-missing-imports'],
          available: hasVenvMypy || await commandExists('mypy', cwd, aseConfig),
          critical: false
        });
      }
      const pytestArgs = (aseConfig && aseConfig.testing_strategy && aseConfig.testing_strategy.test_paths)
        ? ['-q', ...aseConfig.testing_strategy.test_paths]
        : ['-q'];
      steps.push({
        name: 'pytest',
        cmd: hasVenvPytest ? venvPytest : 'pytest',
        args: pytestArgs,
        available: hasVenvPytest || await commandExists('pytest', cwd, aseConfig),
        critical: false
      });
      break;
    }

    case 'golang':
      steps.push({
        name: 'go vet',
        cmd: 'go',
        args: ['vet', './...'],
        available: await commandExists('go', cwd, aseConfig),
        critical: true
      });
      steps.push({
        name: 'staticcheck',
        cmd: 'staticcheck',
        args: ['./...'],
        available: await commandExists('staticcheck', cwd, aseConfig),
        critical: false
      });
      steps.push({
        name: 'go test',
        cmd: 'go',
        args: ['test', './...', '-timeout', '30s'],
        available: await commandExists('go', cwd, aseConfig),
        critical: false
      });
      break;

    case 'rust':
      steps.push({
        name: 'cargo check',
        cmd: 'cargo',
        args: ['check'],
        available: await commandExists('cargo', cwd, aseConfig),
        critical: true
      });
      steps.push({
        name: 'cargo clippy',
        cmd: 'cargo',
        args: ['clippy', '--', '-D', 'warnings'],
        available: await commandExists('cargo', cwd, aseConfig),
        critical: false
      });
      steps.push({
        name: 'cargo test',
        cmd: 'cargo',
        args: ['test'],
        available: await commandExists('cargo', cwd, aseConfig),
        critical: false
      });
      break;

    case 'elixir':
      steps.push({
        name: 'mix compile',
        cmd: 'mix',
        args: ['compile', '--warnings-as-errors'],
        available: await commandExists('mix', cwd, aseConfig),
        critical: true
      });
      steps.push({
        name: 'mix test',
        cmd: 'mix',
        args: ['test'],
        available: await commandExists('mix', cwd, aseConfig),
        critical: false
      });
      break;

    default:
      steps.push({
        name: 'Skip',
        cmd: 'echo',
        args: ['Unknown project type. No validators available.'],
        available: true,
        critical: false
      });
  }

  return steps;
}

module.exports = {
  fileExists,
  detectProjectType,
  commandExists,
  npxAvailable,
  runCmd,
  getSteps
};
