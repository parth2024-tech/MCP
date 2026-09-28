const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logAccess, logger } = require('../utils/logger');
const { toolError } = require('../utils/errors');
const { parseFrontmatter } = require('../utils/context-optimizer');

const SKILLS_DIR = process.env.ASE_ROOT || path.resolve(__dirname, __dirname.includes('tools/server') ? '../../../../' : '../../');
const AUTH_FILE = '/home/thor/.agents/auth.json';

// Load authentication registry
let authRegistry = { tokens: {} };
if (fs.existsSync(AUTH_FILE)) {
  try {
    authRegistry = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch (err) {
    logger.error('load_skill', `Failed to parse auth.json: ${err.message}`);
  }
}

// Map skill risk to required security tier
function getRequiredTier(skillName, skillContent) {
  let risk = 'unknown';
  if (skillContent.startsWith('---')) {
    const fmEnd = skillContent.indexOf('---', 3);
    if (fmEnd !== -1) {
      const fm = skillContent.substring(3, fmEnd);
      const riskMatch = fm.match(/^risk:\s*(.*)/m);
      if (riskMatch) {
        risk = riskMatch[1].trim();
      }
    }
  }

  // Tier rules
  if (risk === 'none' || risk === 'safe') {
    return 'Level 1'; // Open to all standard users
  } else if (risk === 'unknown') {
    return 'Level 2'; // Requires Developer tier
  } else if (risk === 'critical' || risk === 'offensive') {
    return 'Level 3'; // Requires Security Auditor tier
  }
  return 'Level 3'; // Default to max protection
}

function resolveUserTier(token) {
  if (!token) return 'Level 1';

  // Check env override first
  if (process.env.ASE_AUTH_TOKEN && token.length === process.env.ASE_AUTH_TOKEN.length) {
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(process.env.ASE_AUTH_TOKEN))) {
      return 'Level 3'; // Environment override grants Level 3
    }
  }
  
  // Timing-safe token comparison for registry
  for (const [registeredToken, client] of Object.entries(authRegistry.tokens)) {
    if (token.length === registeredToken.length) {
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(registeredToken))) {
        return client.tier;
      }
    }
  }
  
  return 'Level 1'; // No token / invalid token resolves to Level 1
}

function hasAccess(userTier, requiredTier) {
  const tierWeights = { 'Level 1': 1, 'Level 2': 2, 'Level 3': 3 };
  const userWeight = tierWeights[userTier] || 1;
  const requiredWeight = tierWeights[requiredTier] || 1;
  return userWeight >= requiredWeight;
}

module.exports = (deps) => ({
  name: 'load_skill',
  description: 'Loads the full instruction set of a specific skill, enforcing strict role-based access security tiers.',
  inputSchema: {
    type: 'object',
    properties: {
      skill_name: {
        type: 'string',
        description: 'The exact folder/slug name of the skill to load (e.g. "aws-serverless").'
      },
      auth_token: {
        type: 'string',
        description: 'Optional. The auth token used to unlock elevated (Level 2) and protected (Level 3) security tiers.'
      }
    },
    required: ['skill_name']
  },
  handler: async (args, extra) => {
    const { skill_name, auth_token } = args;
    const startTime = Date.now();
    
    // Canonical path traversal prevention
    const resolvedPath = path.resolve(SKILLS_DIR, skill_name);
    const resolvedRoot = path.resolve(SKILLS_DIR);
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
      }
      return toolError({
        error_code: 'INVALID_INPUT',
        message: 'Security Policy Violation: Path traversal detected.',
        retryable: false,
        fix_hint: 'Ensure the skill name contains only valid alphanumeric characters and does not navigate out of the root folder.'
      });
    }

    // Check if skill is pruned
    if (deps.sessionState && typeof deps.sessionState.isPruned === 'function' && deps.sessionState.isPruned(skill_name)) {
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
      }
      return toolError({
        error_code: 'SKILL_PRUNED',
        message: `Skill "${skill_name}" has been marked as completed/pruned for this session.`,
        retryable: false,
        fix_hint: 'Reactivate the skill by clearing the session state or starting a new agent workflow.'
      });
    }
    
    let content, mdFile, version;
    let pinned = null;
    if (deps.sessionState) {
      pinned = deps.sessionState.getPinnedSkill(skill_name);
    }

    if (pinned && pinned.content) {
      content = pinned.content;
      version = pinned.version;
      const subpath = path.resolve(SKILLS_DIR, 'skills', skill_name, 'SKILL.md');
      mdFile = fs.existsSync(subpath) ? subpath : path.resolve(SKILLS_DIR, skill_name, 'SKILL.md');
    } else {
      const skillData = await deps.skillCache.getSkillContent(skill_name);

      if (!skillData) {
        (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', skill_name, 'not_found', Date.now() - startTime);
        if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
          deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
        }
        return toolError({
          error_code: 'SKILL_NOT_FOUND',
          message: `Skill "${skill_name}" does not exist in local registry or has no markdown file.`,
          retryable: false,
          fix_hint: 'Call query_skills first to discover available skills.'
        });
      }

      content = skillData.content;
      mdFile = skillData.path;

      const fm = parseFrontmatter(content);
      version = (fm && fm.version) ? fm.version : '1.0.0';

      // ── Activepieces Piece version compatibility gating ──────────────────
      // Inspired by Piece.minimumSupportedRelease / maximumSupportedRelease
      // from: activepieces/packages/pieces/framework/src/lib/piece.ts
      //
      // If the skill SKILL.md declares min_ase_version or max_ase_version,
      // we compare against the running ASE server version and reject the
      // load if the server is out of the compatible range.
      const ASE_VERSION = process.env.ASE_VERSION || '4.2.0';
      const semverCompare = (a, b) => {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((pa[i] || 0) > (pb[i] || 0)) return 1;
          if ((pa[i] || 0) < (pb[i] || 0)) return -1;
        }
        return 0;
      };

      if (fm && fm.min_ase_version && semverCompare(ASE_VERSION, fm.min_ase_version) < 0) {
        if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
          deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
        }
        return toolError({
          error_code: 'SKILL_VERSION_INCOMPATIBLE',
          message: `Skill "${skill_name}" requires ASE >= ${fm.min_ase_version} (running ${ASE_VERSION}).`,
          retryable: false,
          fix_hint: `Upgrade your ASE server to v${fm.min_ase_version} or higher to use this skill.`
        });
      }

      if (fm && fm.max_ase_version && semverCompare(ASE_VERSION, fm.max_ase_version) > 0) {
        if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
          deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
        }
        return toolError({
          error_code: 'SKILL_VERSION_INCOMPATIBLE',
          message: `Skill "${skill_name}" is only compatible with ASE <= ${fm.max_ase_version} (running ${ASE_VERSION}).`,
          retryable: false,
          fix_hint: 'Use an older version of this skill or check for an updated skill compatible with your ASE version.'
        });
      }

      if (deps.sessionState) {
        deps.sessionState.pinSkill(skill_name, version, content);
      }
    }

    // Enforce Access Control boundaries (RBAC)
    const requiredTier = getRequiredTier(skill_name, content);
    const userTier = resolveUserTier(auth_token);
    
    if (!hasAccess(userTier, requiredTier)) {
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', skill_name, 'denied', Date.now() - startTime, { required_tier: requiredTier, user_tier: userTier });
      if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
        deps.sessionState.logToolCall('load_skill', Date.now() - startTime, true);
      }
      return toolError({
        error_code: 'ACCESS_DENIED',
        message: `Access Denied! Skill "${skill_name}" requires "${requiredTier}" credentials. Your current access level is "${userTier}".`,
        retryable: false,
        fix_hint: 'Provide a valid auth_token parameter to unlock this skill.'
      });
    }

    (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', skill_name, 'authorized', Date.now() - startTime, { required_tier: requiredTier, user_tier: userTier });
    
    // Parse step IDs and initialize telemetry
    const stepIds = [];
    const stepRegex = /<!--\s*step_id:\s*([^\s>]+)\s*-->/g;
    let match;
    while ((match = stepRegex.exec(content)) !== null) {
      stepIds.push(match[1]);
    }
    
    if (deps.sessionState && stepIds.length > 0) {
      try {
        deps.sessionState.initSkill(skill_name, stepIds);
      } catch (err) {
        logger.error('load_skill', `Failed to init skill session state: ${err.message}`);
      }
    }

    if (deps.sessionState && typeof deps.sessionState.logToolCall === 'function') {
      deps.sessionState.logToolCall('load_skill', Date.now() - startTime, false);
    }

    // Check if the loaded skill is deprecated and warn the caller.
    // Activepieces pattern: Piece.deprecated = true signals that a piece
    // should no longer be used and will be removed in a future release.
    const loadedFm = parseFrontmatter(content);
    const isDeprecated = loadedFm && loadedFm.deprecated === true;

    return { 
      skill_name: skill_name, 
      path: mdFile,
      required_tier: requiredTier,
      version: version,
      ...(isDeprecated ? {
        deprecated: true,
        deprecation_warning: `Skill "${skill_name}" is deprecated and may be removed in a future ASE release. ` +
          'Prefer an alternative skill returned by query_skills.'
      } : {}),
      content: content 
    };
  }
});
