const { logAccess } = require('../utils/logger');
const { updateProjectRules } = require('../services/rule-updater');

module.exports = (deps) => ({
  name: 'update_project_rules',
  description: 'Dynamically update the project rules (.ase-project.json) in real-time based on user feedback or instruction. Call this immediately when a user provides new coding advice, corrections, or architectural constraints.',
  inputSchema: {
    type: 'object',
    properties: {
      rule_type: {
        type: 'string',
        enum: ['conventions', 'never_do', 'preferred_patterns', 'sprint_focus'],
        description: 'The category of the rule to update.'
      },
      action: {
        type: 'string',
        enum: ['add', 'remove'],
        description: 'Whether to add or remove the rule.'
      },
      content: {
        type: 'string',
        description: 'The precise rule text (e.g. "Never use inline styles").'
      },
      project_dir: {
        type: 'string',
        description: 'Optional. Absolute path to project root. Defaults to current working directory.'
      },
      draft_mode: {
        type: 'boolean',
        description: 'Optional. If true, writes the rule to a rule_proposals.jsonl file for human review instead of applying it immediately. Defaults to true to prevent AI from polluting config.',
        default: true
      },
      dry_run: {
        type: 'boolean',
        description: 'Optional. Run validation but do not commit any updates or proposals to disk.',
        default: false
      }
    },
    required: ['rule_type', 'action', 'content']
  },
  handler: async (args, extra) => {
    const { rule_type, action, content, project_dir, draft_mode, dry_run = false } = args;
    const isDraft = draft_mode !== undefined ? draft_mode : true;
    const result = await updateProjectRules(rule_type, action, content, project_dir || process.cwd(), isDraft, dry_run);
    (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'update_project_rules', 'authorized', 0, { success: !result.error, draft_mode: isDraft, dry_run });
    return result;
  }
});
