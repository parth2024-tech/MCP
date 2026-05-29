const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logAccess } = require('../utils/logger');

const SKILLS_DIR = path.resolve(__dirname, '../../../../');
const AUTH_FILE = '/home/thor/.agents/auth.json';

// Load authentication registry
let authRegistry = { tokens: {} };
if (fs.existsSync(AUTH_FILE)) {
  try {
    authRegistry = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch (err) {
    console.error(`ASE MCP Server: Failed to parse auth.json: ${err.message}`);
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
  
  // S-5: Timing-safe token comparison for registry
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
    
    // S-4: Canonical path traversal prevention
    const resolvedPath = path.resolve(SKILLS_DIR, skill_name);
    const resolvedRoot = path.resolve(SKILLS_DIR);
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
      return { error: 'Security Policy Violation: Path traversal detected.' };
    }
    
    const skillData = await deps.skillCache.getSkillContent(skill_name);

    if (!skillData) {
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', skill_name, 'not_found', Date.now() - startTime);
      return { error: `Skill "${skill_name}" does not exist in local registry or has no markdown file.` };
    }

    const content = skillData.content;
    const mdFile = skillData.path;

    // Enforce Access Control boundaries (RBAC)
    const requiredTier = getRequiredTier(skill_name, content);
    const userTier = resolveUserTier(auth_token);
    
    if (!hasAccess(userTier, requiredTier)) {
      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', skill_name, 'denied', Date.now() - startTime, { required_tier: requiredTier, user_tier: userTier });
      return { 
        error: `Access Denied! Skill "${skill_name}" requires "${requiredTier}" credentials. Your current access level is "${userTier}". Please provide a valid auth_token in the request parameters to unlock.` 
      };
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
        console.error(`ASE MCP Server: Failed to init skill session state: ${err.message}`);
      }
    }

    return { 
      skill_name: skill_name, 
      path: mdFile,
      required_tier: requiredTier,
      content: content 
    };
  }
});
