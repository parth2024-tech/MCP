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
async function updateProjectRules(ruleType, action, content, projectDir = null, draftMode = true, dryRun = false) {
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

  // Governance Lock: Agents cannot delete rules from 'never_do' or 'conventions'.
  // Any deletion or direct alteration to never_do must be routed to human review via rule_proposals.jsonl.
  const isProtectedRuleType = ['never_do', 'conventions'].includes(ruleType);
  if (isProtectedRuleType && action === 'remove' && process.env.ASE_ALLOW_DIRECT_RULE_MUTATION !== 'true') {
    draftMode = true;
  }
  if (ruleType === 'never_do' && !draftMode && !dryRun && process.env.ASE_ALLOW_DIRECT_RULE_MUTATION !== 'true') {
    draftMode = true;
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
    if (dryRun) {
      return {
        success: true,
        status: 'DRY_RUN_PREVIEW',
        message: `Proposed rule validation succeeded. Would write proposed rule to ${logPath} for human review.`,
        path: logPath,
        proposal
      };
    }
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

  const originalConfig = JSON.parse(JSON.stringify(config));

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

  if (dryRun) {
    let affectedSkillsPreview = [];
    try {
      const skillsDir = path.resolve(__dirname, '../../../../');
      affectedSkillsPreview = await getAffectedSkillsPreview(content, skillsDir);
    } catch (bumpErr) {}

    return {
      success: true,
      status: 'DRY_RUN_PREVIEW',
      message: `Project rules update validation succeeded. Would update .ase-project.json.`,
      path: configPath,
      original_config: originalConfig,
      updated_config: config,
      affected_skills: affectedSkillsPreview
    };
  }

  // Write the changes back
  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    
    // Bump version of affected skills
    try {
      const skillsDir = path.resolve(__dirname, '../../../../');
      await bumpAffectedSkills(content, skillsDir);
    } catch (bumpErr) {
      // Ignore version bump errors to keep project rule updates working
    }

    return { 
      success: true, 
      message: `Successfully updated ${ruleType} in .ase-project.json`, 
      path: configPath 
    };
  } catch (err) {
    return { error: `Failed to write to ${configPath}: ${err.message}` };
  }
}

async function bumpAffectedSkills(ruleContent, skillsDir) {
  const stopwords = new Set(["use", "always", "never", "do", "not", "for", "the", "and", "rules", "rule", "project"]);
  const words = ruleContent.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));

  if (words.length === 0) return;

  try {
    const files = await fs.readdir(skillsDir);
    for (const file of files) {
      const stat = await fs.stat(path.join(skillsDir, file));
      if (stat.isDirectory()) {
        const skillName = file.toLowerCase();
        // Check if any word matches the skill name
        const isAffected = words.some(word => skillName.includes(word));
        if (isAffected) {
          await bumpSkillVersion(path.join(skillsDir, file));
        }
      }
    }
  } catch (err) {
    // Ignore scan errors
  }
}

async function bumpSkillVersion(skillPath) {
  const { findMainMd } = require('../utils/fs-utils');
  const mdFile = await findMainMd(skillPath);
  if (!mdFile) return;

  try {
    const content = await fs.readFile(mdFile, 'utf8');
    if (content.startsWith('---')) {
      const fmEnd = content.indexOf('---', 3);
      if (fmEnd !== -1) {
        const fm = content.substring(3, fmEnd);
        const versionMatch = fm.match(/^version:\s*(.*)/m);
        if (versionMatch) {
          const oldVersion = versionMatch[1].trim();
          const parts = oldVersion.split('.');
          if (parts.length === 3) {
            const patch = parseInt(parts[2], 10) + 1;
            const newVersion = `${parts[0]}.${parts[1]}.${patch}`;
            const newFm = fm.replace(/^version:\s*(.*)/m, `version: ${newVersion}`);
            const newContent = '---' + newFm + content.substring(fmEnd);
            await fs.writeFile(mdFile, newContent, 'utf8');
          }
        } else {
          // Version field doesn't exist, insert it
          const newFm = fm + '\nversion: 1.0.1\n';
          const newContent = '---' + newFm + content.substring(fmEnd);
          await fs.writeFile(mdFile, newContent, 'utf8');
        }
      }
    } else {
      // No frontmatter, create one
      const newContent = '---\nversion: 1.0.1\n---\n' + content;
      await fs.writeFile(mdFile, newContent, 'utf8');
    }
  } catch (err) {
    // Ignore write errors
  }
}

async function getAffectedSkillsPreview(ruleContent, skillsDir) {
  const stopwords = new Set(["use", "always", "never", "do", "not", "for", "the", "and", "rules", "rule", "project"]);
  const words = ruleContent.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));

  if (words.length === 0) return [];

  const affected = [];
  try {
    const files = await fs.readdir(skillsDir);
    for (const file of files) {
      const stat = await fs.stat(path.join(skillsDir, file));
      if (stat.isDirectory()) {
        const skillName = file.toLowerCase();
        const isAffected = words.some(word => skillName.includes(word));
        if (isAffected) {
          const skillPath = path.join(skillsDir, file);
          const { findMainMd } = require('../utils/fs-utils');
          const mdFile = await findMainMd(skillPath);
          if (mdFile) {
            try {
              const content = await fs.readFile(mdFile, 'utf8');
              let oldVersion = '1.0.0';
              let newVersion = '1.0.1';
              if (content.startsWith('---')) {
                const fmEnd = content.indexOf('---', 3);
                if (fmEnd !== -1) {
                  const fm = content.substring(3, fmEnd);
                  const versionMatch = fm.match(/^version:\s*(.*)/m);
                  if (versionMatch) {
                    oldVersion = versionMatch[1].trim();
                    const parts = oldVersion.split('.');
                    if (parts.length === 3) {
                      newVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2], 10) + 1}`;
                    }
                  }
                }
              }
              affected.push({ skill: file, old_version: oldVersion, new_version: newVersion });
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {}
  return affected;
}

module.exports = { updateProjectRules };
