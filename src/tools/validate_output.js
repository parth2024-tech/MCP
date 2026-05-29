const { logAccess } = require('../utils/logger');

module.exports = (deps) => ({
  name: 'validate_output',
  description: 'Runs the automated linter, type checker, and fast test suite for the active project. Streams per-step progress notifications so the AI host can parse results incrementally.',
  inputSchema: {
    type: 'object',
    properties: {
      project_dir: {
        type: 'string',
        description: 'Optional. Absolute path to project root. Defaults to current working directory.'
      },
      timeout_ms: {
        type: 'number',
        description: 'Optional. Timeout in milliseconds per validation step. Defaults to 30000.'
      }
    }
  },

  /**
   * Streaming handler: iterates through the async generator and emits
   * MCP progress notifications for each validation step.
   *
   * The `extra` parameter is injected by the server's CallToolRequest handler
   * and carries `sendNotification` for progress streaming, plus `_meta` for
   * the progressToken that the client may have supplied.
   */
  handler: async (args, extra) => {
    const { validateStream } = require('../services/streaming-validator');
    const projectDir = args.project_dir || process.cwd();
    const timeoutMs = args.timeout_ms || 30000;
    
    const chunks = [];
    let finalSummary = null;
    let stepIndex = 0;

    try {
      for await (const chunk of validateStream(projectDir, timeoutMs)) {
        chunks.push(chunk);

        if (chunk.type === 'summary') {
          finalSummary = chunk;
        } else {
          stepIndex++;

          // Emit MCP progress notification if extra.sendNotification is available
          if (extra && typeof extra.sendNotification === 'function') {
            try {
              const progressToken = extra._meta && extra._meta.progressToken;
              if (progressToken !== undefined) {
                await extra.sendNotification({
                  method: 'notifications/progress',
                  params: {
                    progressToken,
                    progress: stepIndex,
                    total: chunk.totalSteps,
                    message: `[${chunk.status || 'skipped'}] ${chunk.step}`
                  }
                });
              }
            } catch (notifErr) {
              (extra?.reqLogger || require('../utils/logger').logger).warn('ValidateOutput', `Failed to send progress notification: ${notifErr.message}`);
            }
          }
        }
      }

      const result = {
        project_type: finalSummary ? finalSummary.project_type : 'unknown',
        project_dir: projectDir,
        passed: finalSummary ? finalSummary.passed : false,
        critical_failure: finalSummary ? finalSummary.critical_failure : false,
        results: chunks.filter(c => c.type === 'step_result'),
        skipped: finalSummary ? finalSummary.skipped : [],
        summary: finalSummary ? finalSummary.summary : 'Validation did not complete.'
      };

      (extra?.reqLogger || require('../utils/logger')).logAccess('mcp-client', 'validate_output', 'authorized', 0, { passed: result.passed, project_type: result.project_type });
      return result;

    } catch (err) {
      return { error: `Streaming validation failed: ${err.message}` };
    }
  }
});
