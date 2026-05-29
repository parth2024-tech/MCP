/**
 * ASE Project System Prompt Generator v2
 *
 * Reads .ase-project.json from the project root (with upward directory walk)
 * and generates a structured system prompt that the AI sees before any skill.
 *
 * v2 improvements:
 *   - Strict schema validation with typed fields and clear error messages
 *   - Extended schema: sprint_focus, file_structure, testing_strategy, deployment
 *   - Validation report alongside the prompt so the user knows if their config is broken
 *   - Token accounting so the caller knows the prompt cost
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_CONFIG_FILE = '.ase-project.json';

// ─────────────────────────────────────────────────────────────
// Schema definition — every field, its type, and whether it's required
// ─────────────────────────────────────────────────────────────
const SCHEMA = {
  name:                  { type: 'string',   required: true,  description: 'Project name (e.g. "my-saas-app")' },
  version:               { type: 'string',   required: false, description: 'Semantic version (e.g. "1.2.0")' },
  description:           { type: 'string',   required: true,  description: 'One-paragraph project description' },
  tech_stack:            { type: 'array',    required: true,  description: 'Array of strings — each technology and its version' },
  conventions:           { type: 'array',    required: true,  description: 'Array of coding convention strings' },
  architecture_patterns: { type: 'array',    required: false, description: 'Array of architecture pattern strings in use' },
  file_structure:        { type: 'object',   required: false, description: 'Map of directory → purpose (e.g. {"src/lib": "shared utilities"})' },
  testing_strategy:      { type: 'object',   required: false, description: 'Testing config: {framework, coverage_target, patterns}' },
  deployment:            { type: 'object',   required: false, description: 'Deployment config: {platform, branch_strategy, environments}' },
  sprint_focus:          { type: 'string',   required: false, description: 'Current sprint goal — guides the AI to prioritize relevant work' },
  sprint_skills:         { type: 'array',    required: false, description: 'Array of Agent Skills Pack skills relevant to the current sprint' },
  never_do:              { type: 'array',    required: true,  description: 'Array of hard constraint strings — the AI must NEVER violate these' },
  preferred_patterns:    { type: 'array',    required: false, description: 'Array of preferred pattern strings — the AI should PREFER these' },
  agent_skills:          { type: 'object',   required: false, description: 'Agent Skills Pack configuration and reporting preferences' }
};

// ─────────────────────────────────────────────────────────────
// Schema validation
// ─────────────────────────────────────────────────────────────

/**
 * Validates a parsed config object against the schema.
 * Returns { valid: boolean, errors: string[], warnings: string[] }
 */
function validateConfig(config) {
  const errors = [];
  const warnings = [];

  for (const [field, rule] of Object.entries(SCHEMA)) {
    const value = config[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field "${field}": ${rule.description}`);
      continue;
    }

    if (value === undefined || value === null) continue;

    // Type check
    if (rule.type === 'string' && typeof value !== 'string') {
      errors.push(`"${field}" must be a string, got ${typeof value}`);
    }
    if (rule.type === 'array' && !Array.isArray(value)) {
      errors.push(`"${field}" must be an array, got ${typeof value}`);
    } else if (rule.type === 'array' && Array.isArray(value) && value.length === 0) {
      warnings.push(`"${field}" is an empty array — consider populating it`);
    }
    if (rule.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(`"${field}" must be an object, got ${Array.isArray(value) ? 'array' : typeof value}`);
    }
  }

  // Warn about unrecognized fields (possible typos)
  for (const key of Object.keys(config)) {
    if (key.startsWith('_')) continue; // _meta fields are intentionally ignored
    if (!SCHEMA[key]) {
      warnings.push(`Unrecognized field "${key}" — check for typos (valid fields: ${Object.keys(SCHEMA).join(', ')})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ─────────────────────────────────────────────────────────────
// Directory walker — find .ase-project.json
// ─────────────────────────────────────────────────────────────

async function findProjectConfig(startDir) {
  let dir = startDir || process.cwd();
  const root = path.parse(dir).root;

  // S-3: Directory containment
  const envAllowed = process.env.ASE_ALLOWED_DIRS ? process.env.ASE_ALLOWED_DIRS.split(',') : [];
  const allowedRoots = envAllowed.map(d => path.resolve(d.trim()));

  while (dir !== root) {
    if (allowedRoots.length > 0) {
      const isAllowed = allowedRoots.some(r => dir === r || dir.startsWith(r + path.sep));
      if (!isAllowed) break; // Prevent walking above configured roots
    }

    const candidate = path.join(dir, PROJECT_CONFIG_FILE);
    try {
      await fs.access(candidate);
      return candidate;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        require('../utils/logger').logger.warn('PromptGenerator', `Access check failed for ${candidate}: ${err.message}`);
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Prompt generation — structured markdown output
// ─────────────────────────────────────────────────────────────

/**
 * Generates a structured system prompt from the project config.
 *
 * @param {string} projectDir - Project root directory
 * @returns {{
 *   config_path: string,
 *   project_name: string,
 *   prompt: string,
 *   prompt_token_estimate: number,
 *   validation: { valid, errors, warnings }
 * } | { error: string, template: object }}
 */
async function generateProjectPrompt(projectDir) {
  const configPath = await findProjectConfig(projectDir || process.cwd());

  if (!configPath) {
    return {
      error: `No ${PROJECT_CONFIG_FILE} found. Create one in your project root.`,
      hint: 'Run "ase-init" in your project directory to auto-generate one.',
      template: getConfigTemplate()
    };
  }

  let raw;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch (err) {
    return { error: `Cannot read ${configPath}: ${err.message}` };
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    return { error: `Invalid JSON in ${configPath}: ${err.message}` };
  }

  // Validate against schema
  const validation = validateConfig(config);

  // Generate the prompt even if there are warnings (but not if there are errors)
  if (!validation.valid) {
    return {
      error: `Schema validation failed for ${configPath}`,
      validation,
      hint: 'Fix the errors above, then retry.'
    };
  }

  // ── Build the system prompt ──
  const lines = [];

  lines.push(`# Project: ${config.name}`);
  if (config.version) lines.push(`Version: ${config.version}`);
  lines.push('');

  // Sprint focus (top of prompt — most contextually important)
  if (config.sprint_focus) {
    lines.push('## 🎯 Current Sprint Focus');
    lines.push(`> ${config.sprint_focus}`);
    if (config.sprint_skills && config.sprint_skills.length) {
      lines.push('');
      lines.push(`**Relevant Sprint Skills**: ${config.sprint_skills.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## Description');
  lines.push(config.description);
  lines.push('');

  // Tech Stack
  lines.push('## Tech Stack');
  for (const tech of config.tech_stack) {
    lines.push(`- ${tech}`);
  }
  lines.push('');

  // Conventions
  lines.push('## Coding Conventions');
  for (const conv of config.conventions) {
    lines.push(`- ${conv}`);
  }
  lines.push('');

  // Architecture
  if (config.architecture_patterns && config.architecture_patterns.length) {
    lines.push('## Architecture Patterns');
    for (const pattern of config.architecture_patterns) {
      lines.push(`- ${pattern}`);
    }
    lines.push('');
  }

  // File Structure
  if (config.file_structure && typeof config.file_structure === 'object') {
    lines.push('## File Structure');
    for (const [dir, purpose] of Object.entries(config.file_structure)) {
      lines.push(`- \`${dir}/\` — ${purpose}`);
    }
    lines.push('');
  }

  // Testing Strategy
  if (config.testing_strategy) {
    lines.push('## Testing Strategy');
    const ts = config.testing_strategy;
    if (ts.framework) lines.push(`- Framework: ${ts.framework}`);
    if (ts.coverage_target) lines.push(`- Coverage target: ${ts.coverage_target}`);
    if (ts.patterns && Array.isArray(ts.patterns)) {
      for (const p of ts.patterns) {
        lines.push(`- ${p}`);
      }
    }
    lines.push('');
  }

  // Deployment
  if (config.deployment) {
    lines.push('## Deployment');
    const dep = config.deployment;
    if (dep.platform) lines.push(`- Platform: ${dep.platform}`);
    if (dep.branch_strategy) lines.push(`- Branch strategy: ${dep.branch_strategy}`);
    if (dep.environments && Array.isArray(dep.environments)) {
      lines.push(`- Environments: ${dep.environments.join(', ')}`);
    }
    lines.push('');
  }

  // NEVER DO — critical constraints
  lines.push('## ⛔ NEVER Do the Following');
  lines.push('> Violating ANY of these will break the project. Treat as non-negotiable.');
  for (const rule of config.never_do) {
    lines.push(`- ❌ ${rule}`);
  }
  lines.push('');

  // Preferred patterns
  if (config.preferred_patterns && config.preferred_patterns.length) {
    lines.push('## ✅ Always Prefer These Patterns');
    for (const pref of config.preferred_patterns) {
      lines.push(`- ${pref}`);
    }
    lines.push('');
  }

  // Agent Workflow
  if (config.agent_skills) {
    lines.push('## 🤖 Agent Workflow');
    const skills = config.agent_skills;
    if (skills.directory) lines.push(`- **Skills Directory**: ${skills.directory}`);
    if (skills.default_skills && skills.default_skills.length) {
      lines.push(`- **Default Skills to Load**: ${skills.default_skills.join(', ')}`);
    }
    if (skills.mandatory_skills) {
      const triggers = Object.entries(skills.mandatory_skills).map(([k, v]) => `${k} files -> ${v}`).join(', ');
      lines.push(`- **Mandatory Skills**: ${triggers}`);
    }
    if (skills.session_reporting_preference !== undefined) {
      lines.push(`- **Session Reporting**: ${skills.session_reporting_preference ? 'Yes (Call get_skill_session_report at session end)' : 'No'}`);
    }
    lines.push('');
  }

  const prompt = lines.join('\n');

  return {
    config_path: configPath,
    project_name: config.name,
    prompt,
    prompt_token_estimate: Math.ceil(prompt.length / 4),
    validation
  };
}

// ─────────────────────────────────────────────────────────────
// Config template — opinionated starter
// ─────────────────────────────────────────────────────────────

function getConfigTemplate() {
  return {
    name: 'my-project',
    version: '1.0.0',
    description: 'One-paragraph description of what this project does and who it serves.',
    tech_stack: [
      'Next.js 15 (App Router)',
      'TypeScript 5.5',
      'PostgreSQL 16 via Drizzle ORM',
      'Tailwind CSS v4',
      'Vercel Deployment'
    ],
    conventions: [
      'All components use named exports, never default exports',
      'Database queries live exclusively in /lib/db/*.ts',
      'API routes use Route Handlers in /app/api/**/*.ts',
      'Zod schemas validate all external input'
    ],
    architecture_patterns: [
      'Server Components for data fetching, Client Components for interactivity only',
      'Repository pattern for database access',
      'Feature-based folder structure under /features'
    ],
    file_structure: {
      'src/app': 'Next.js App Router pages and layouts',
      'src/features': 'Feature modules with co-located components, hooks, and types',
      'src/lib': 'Shared utilities, database client, auth helpers',
      'src/components/ui': 'Reusable UI primitives (Button, Modal, Input)',
      'tests': 'Test files mirroring src/ structure'
    },
    testing_strategy: {
      framework: 'Vitest + React Testing Library',
      coverage_target: '80%',
      patterns: [
        'Unit tests for all utility functions',
        'Integration tests for API routes',
        'Component tests for interactive UI elements'
      ]
    },
    deployment: {
      platform: 'Vercel',
      branch_strategy: 'main → production, dev → preview',
      environments: ['development', 'staging', 'production']
    },
    sprint_focus: 'Building the user onboarding flow with email verification and profile setup.',
    sprint_skills: [
      'lifecycle/security-and-hardening',
      'lifecycle/api-and-interface-design',
      'lifecycle/test-driven-development'
    ],
    never_do: [
      'Never use useEffect for data fetching — use Server Components or SWR',
      'Never store secrets in .env files committed to git',
      'Never use inline styles — always use Tailwind classes',
      'Never use `any` TypeScript type — always type explicitly',
      'Never mix database queries into React components'
    ],
    preferred_patterns: [
      'Use Zod for all schema validation',
      'Use Drizzle ORM for all database access',
      'Use server actions for mutations',
      'Use Next.js Image component for all images'
    ],
    agent_skills: {
      directory: '/home/thor/skiils',
      default_skills: [
        'lifecycle/using-agent-skills',
        'lifecycle/context-engineering'
      ],
      mandatory_skills: {
        api: 'lifecycle/api-and-interface-design',
        auth: 'lifecycle/security-and-hardening'
      },
      session_reporting_preference: true
    }
  };
}

module.exports = { generateProjectPrompt, findProjectConfig, getConfigTemplate, validateConfig };
