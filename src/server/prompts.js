/**
 * src/server/prompts.js — MCP Prompts Handlers
 *
 * Extracted from ase-mcp-server.js for single-responsibility clarity.
 * Handles: ListPrompts, GetPrompt
 *
 * Available prompts:
 *   project_prompt   — Generates structured system prompt from .ase-project.json
 *   code_review      — Generates a code review checklist prompt for a given file/diff
 */

'use strict';

const { generateProjectPrompt } = require('../services/project-prompt-generator');

/**
 * Registers all prompt-related MCP handlers on the given server instance.
 *
 * @param {object} server - MCP Server instance
 */
function registerPromptHandlers(server) {
  const {
    ListPromptsRequestSchema,
    GetPromptRequestSchema
  } = require('@modelcontextprotocol/sdk/types.js');

  // ── List all available prompts ─────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: 'project_prompt',
          description: 'Generates the structured system prompt based on the active .ase-project.json configuration.',
          arguments: [
            {
              name: 'project_dir',
              description: 'Optional. Absolute path to the project root. Defaults to current working directory.',
              required: false
            }
          ]
        },
        {
          name: 'code_review',
          description: 'Generates a comprehensive code review checklist prompt for a given code snippet or file path.',
          arguments: [
            {
              name: 'file_path',
              description: 'Optional. Path to the file being reviewed. Used to provide context.',
              required: false
            },
            {
              name: 'focus',
              description: 'Optional. Focus area for the review: "security", "performance", "architecture", "style", or "all". Defaults to "all".',
              required: false
            }
          ]
        }
      ]
    };
  });

  // ── Get a specific prompt ──────────────────────────────────
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // ── project_prompt ──
    if (name === 'project_prompt') {
      const dir = args?.project_dir || process.cwd();
      const promptData = await generateProjectPrompt(dir);

      if (promptData.error) {
        throw new Error(`Failed to generate prompt: ${promptData.error}`);
      }

      return {
        description: 'ASE Project System Prompt',
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: promptData.prompt }
          }
        ]
      };
    }

    // ── code_review ──
    if (name === 'code_review') {
      const filePath = args?.file_path || '(not specified)';
      const focus = args?.focus || 'all';

      const focusInstructions = {
        security: 'Focus exclusively on security vulnerabilities: injection, auth bypass, secrets exposure, input validation, CSRF, XSS, and data sanitization.',
        performance: 'Focus exclusively on performance: algorithmic complexity, N+1 queries, caching opportunities, memory leaks, and async bottlenecks.',
        architecture: 'Focus exclusively on architectural concerns: SOLID principles, coupling, cohesion, testability, separation of concerns, and design patterns.',
        style: 'Focus exclusively on code style: naming conventions, readability, documentation, dead code, and consistency with project conventions.',
        all: 'Cover all dimensions: correctness, security, performance, architecture, style, and test coverage.'
      };

      const prompt = [
        `# Code Review Request`,
        ``,
        `**File**: \`${filePath}\``,
        `**Review Focus**: ${focus}`,
        ``,
        `## Instructions`,
        focusInstructions[focus] || focusInstructions.all,
        ``,
        `## Review Checklist`,
        `For each finding, provide:`,
        `- **Severity**: critical / high / medium / low / info`,
        `- **Location**: Line number or function name`,
        `- **Issue**: Clear description of the problem`,
        `- **Recommendation**: Specific, actionable fix`,
        ``,
        `## Additional Context`,
        `- Check for any deviations from patterns established in .ase-project.json`,
        `- Flag any hardcoded secrets, credentials, or absolute paths`,
        `- Note any missing error handling or unguarded async operations`,
      ].join('\n');

      return {
        description: `Code Review Prompt — ${focus} focus`,
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: prompt }
          }
        ]
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  });
}

module.exports = { registerPromptHandlers };
