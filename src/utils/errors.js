'use strict';

/**
 * Format a structured error payload for MCP tool responses.
 * @param {{
 *   error_code: string,
 *   message: string,
 *   retryable: boolean,
 *   fix_hint?: string,
 *   details?: unknown
 * }} err
 */
function toolError(err) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error_code: err.error_code,
        message: err.message,
        retryable: err.retryable,
        fix_hint: err.fix_hint || '',
        details: err.details || null
      }, null, 2)
    }],
    isError: true
  };
}

module.exports = { toolError };
