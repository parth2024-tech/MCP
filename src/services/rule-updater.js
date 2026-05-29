const fs = require('fs').promises;
const path = require('path');
const { logAccess } = require('../utils/logger');
const { validateConfig, findProjectConfig } = require('./project-prompt-generator');

/**
 * Dynamically updates the .ase-project.json configuration based on user feedback.
 * 
 * @param {string} ruleType - 'conventions', 'never_do', 'preferred_patterns', or 'sprint_focus'
 * @param {string} action - 'add' or 'remove'
 * @param {string} content - The rule text to add/remove
 * @param {string} [projectDir] - Optional project directory path
 * @param {boolean} [draftMode] - If true, writes to rule_proposals.jsonl
 * @returns {object} - Success result or error
 */
async function updateProjectRules(ruleType, action, content, projectDir = null, draftMode = true) {
  // S-3: Security validations
  if (content && content.length > 2048) {
    return { error: 'Security Policy Violation: Content exceeds maximum allowed length of 2048 characters.' };
  }
  if (/[\x00-\x09\x0B-\x1F\x7F]/.test(content)) {
    return { error: 'Security Policy Violation: Content contains invalid control characters.' };
  }

  const configPath = await findProjectConfig(projectDir || process.cwd());

  if (!configPath) {
    return { error: 'No .ase-project.json found in the directory tree.' };
  }

  if (draftMode) {
    const logPath = path.join(path.dirname(configPath), 'rule_proposals.jsonl');
    const proposal = {
      timestamp: new Date().toISOString(),
      ruleType,
      action,
      content,
      status: 'pending'
    };
    try {
      await fs.appendFile(logPath, JSON.stringify(proposal) + '\n', 'utf8');
      return { 
        success: true, 
        message: `Successfully wrote proposed rule to ${logPath} for human review.`, 
        path: logPath 
      };
    } catch (err) {
      return { error: `Failed to write proposal to ${logPath}: ${err.message}` };
    }
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

  // Ensure arrays exist if not present
  if (['conventions', 'never_do', 'preferred_patterns'].includes(ruleType)) {
    if (!config[ruleType] || !Array.isArray(config[ruleType])) {
      config[ruleType] = [];
    }
  }

  // Perform the update
  if (action === 'add') {
    if (['conventions', 'never_do', 'preferred_patterns'].includes(ruleType)) {
      if (!config[ruleType].includes(content)) {
        config[ruleType].push(content);
      } else {
        return { message: `Rule already exists in ${ruleType}`, path: configPath };
      }
    } else if (ruleType === 'sprint_focus') {
      config[ruleType] = content;
    } else {
      return { error: `Unsupported ruleType for 'add': ${ruleType}` };
    }
  } else if (action === 'remove') {
    if (['conventions', 'never_do', 'preferred_patterns'].includes(ruleType)) {
      config[ruleType] = config[ruleType].filter(r => r !== content);
    } else if (ruleType === 'sprint_focus') {
      delete config[ruleType];
    } else {
      return { error: `Unsupported ruleType for 'remove': ${ruleType}` };
    }
  } else {
    return { error: `Unsupported action: ${action}` };
  }

  // Validate the new config before saving
  const validation = validateConfig(config);
  if (!validation.valid) {
    return { 
      error: 'Failed schema validation. Change aborted to prevent config corruption.', 
      details: validation.errors 
    };
  }

  // Write the changes back
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    return { 
      success: true, 
      message: `Successfully updated ${ruleType} in .ase-project.json`, 
      path: configPath 
    };
  } catch (err) {
    return { error: `Failed to write to ${configPath}: ${err.message}` };
  }
}

module.exports = { updateProjectRules };
