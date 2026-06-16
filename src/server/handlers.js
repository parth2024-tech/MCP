/**
 * src/server/handlers.js — Tool Call Handlers
 *
 * Extracted from ase-mcp-server.js for single-responsibility clarity.
 * Handles: search_tools, invoke_tool, and direct tool dispatch.
 */

'use strict';

const crypto = require('crypto');
const { createLogger } = require('../utils/logger');
const metrics = require('../utils/metrics');
const { findRelevantTools } = require('../services/tool-search');

/**
 * Session-scoped output cache for tool results.
 * TTLs are per-tool and configurable.
 */
class SessionToolCache {
  constructor() {
    this.cache = new Map();
    // TTL in ms per tool — tune based on volatility of each tool's output
    this.ttl = {
      get_health:               30_000,  // 30s — DB status changes slowly
      get_model_config:        120_000,  // 2min — model config is session-stable
      get_task_taxonomy:       600_000,  // 10min — taxonomy never changes mid-session
      load_skill:               60_000,  // 1min — skill files rarely change during work
      query_skills:             30_000,  // 30s — index is stable within a session
      get_skill_session_report:      0,  // never cache — always fresh telemetry
      log_skill_step:                0,  // never cache — write operation
      validate_output:               0,  // never cache — must always re-run
      update_project_rules:          0,  // never cache — write operation
      remember_action:               0,  // never cache — write operation
      recall_memory:                 0,  // never cache — live memory retrieval
      claim_task:                    0,  // write operation
      complete_task:                 0,  // write operation
      create_task:                   0,  // write operation
      write_memory:                  0,  // write operation
      read_memory:                   0,  // live state
      acquire_file_lock:             0,  // live state
      release_file_lock:             0,  // write operation
      subscribe_events:              0,  // write operation
      poll_events:                   0,  // live state
      heartbeat:                     0,  // write operation
      get_orchestration_state:       0,  // live state
    };
  }

  _key(toolName, toolInput) {
    return `${toolName}::${JSON.stringify(toolInput)}`;
  }

  get(toolName, toolInput) {
    const key = this._key(toolName, toolInput);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > (this.ttl[toolName] ?? 0)) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(toolName, toolInput, result) {
    const ttl = this.ttl[toolName] ?? 0;
    if (ttl === 0) return;
    if (result && result.error) return; // Don't cache errors
    const key = this._key(toolName, toolInput);
    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear() { this.cache.clear(); }
}

// ─────────────────────────────────────────────────────────────
// Output Capping Config
// ─────────────────────────────────────────────────────────────
const CAP_OPTIONS = {
  validate_output:          { maxChars: 12_000, headRatio: 0.1, tailRatio: 0.9 },
  run_command:              { maxChars: 8_000,  headRatio: 0.1, tailRatio: 0.9 },
  git_diff:                 { maxChars: 16_000, headRatio: 0.15, tailRatio: 0.85 },
  query_skills:             { maxChars: 8_000,  headRatio: 0.5,  tailRatio: 0.5 },
  get_skill_session_report: { maxChars: 4_000,  headRatio: 0.5,  tailRatio: 0.5 },
  load_skill:               { maxChars: 20_000, headRatio: 0.6,  tailRatio: 0.4 },
};

/**
 * Caps long outputs to a head+tail window with a clear truncation marker.
 * @param {string} content
 * @param {{ maxChars?: number, headRatio?: number, tailRatio?: number }} options
 * @returns {string}
 */
function capOutput(content, options = {}) {
  const { maxChars = 12_000, headRatio = 0.2, tailRatio = 0.8 } = options;
  if (content.length <= maxChars) return content;

  const headChars = Math.floor(maxChars * headRatio);
  const tailChars = Math.floor(maxChars * tailRatio);
  const omitted = content.length - headChars - tailChars;

  return (
    content.slice(0, headChars) +
    `\n\n━━━ [TRUNCATED: ${omitted.toLocaleString()} chars omitted — output exceeded ${maxChars.toLocaleString()} char limit] ━━━\n\n` +
    content.slice(-tailChars)
  );
}

/**
 * Creates the CallToolRequestSchema handler, bound to the given registry and services.
 *
 * @param {object} registry - ToolRegistry instance
 * @param {object} virtualKeyManager - VirtualKeyManager instance
 * @param {object} sessionState - SessionState instance
 * @returns {Function} Async handler compatible with server.setRequestHandler()
 */
function createToolCallHandler(registry, virtualKeyManager, sessionState) {
  const toolCache = new SessionToolCache();

  return async (request, extra) => {
    const { name, arguments: toolArgs } = request.params;
    const reqId = crypto.randomUUID();
    const reqLogger = createLogger(reqId);

    // ── 1. JIT: search_tools ──────────────────────────────────
    if (name === 'search_tools') {
      metrics.inc('tool_calls_total', name);
      metrics.increment('jit.search_tools.calls');
      const startMs = Date.now();

      try {
        const query = toolArgs?.query;
        const topK = toolArgs?.top_k || 4;

        if (!query) {
          if (sessionState && typeof sessionState.logToolCall === 'function') {
            sessionState.logToolCall('search_tools', Date.now() - startMs, true);
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: "Missing required argument 'query'" }, null, 2) }],
            isError: true
          };
        }

        const virtualKey = process.env.MCP_VIRTUAL_KEY;
        const results = findRelevantTools(query, topK, registry, virtualKeyManager, virtualKey);
        const durationMs = Date.now() - startMs;

        metrics.record('tool_call_duration_ms', durationMs, name);
        reqLogger.toolResult(name, durationMs, true, { tool: name });

        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall('search_tools', durationMs, false);
        }

        return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        const durationMs = Date.now() - startMs;
        metrics.inc('tool_errors_total', name);
        metrics.record('tool_call_duration_ms', durationMs, name);
        reqLogger.toolResult(name, durationMs, false, { tool: name, error: err.message });
        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall('search_tools', durationMs, true);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
          isError: true
        };
      }
    }

    // ── 2. JIT: invoke_tool ───────────────────────────────────
    if (name === 'invoke_tool') {
      const { tool_name, tool_input } = toolArgs;
      const virtualKey = process.env.MCP_VIRTUAL_KEY;

      if (!virtualKeyManager.isAuthorized(virtualKey, tool_name)) {
        metrics.increment('security.unauthorized_access_attempt');
        reqLogger.warn('Gateway', `Unauthorized tool execution blocked: ${tool_name}`);
        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall('invoke_tool', 0, true);
        }
        return {
          content: [{ type: 'text', text: `Gateway Security Error: Virtual Key is not authorized to invoke tool '${tool_name}'.` }],
          isError: true
        };
      }

      metrics.inc('tool_calls_total', tool_name);
      metrics.increment('jit.invoke_tool.calls');
      const startMs = Date.now();

      try {
        if (!tool_name || tool_input === undefined) {
          if (sessionState && typeof sessionState.logToolCall === 'function') {
            sessionState.logToolCall('invoke_tool', Date.now() - startMs, true);
          }
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: "Missing required arguments 'tool_name' or 'tool_input'" }, null, 2) }],
            isError: true
          };
        }

        const tool = registry.get(tool_name);
        if (!tool) {
          metrics.inc('tool_errors_total', tool_name);
          reqLogger.error('ToolDispatch', `Tool not found: ${tool_name}`);
          if (sessionState && typeof sessionState.logToolCall === 'function') {
            sessionState.logToolCall(tool_name, Date.now() - startMs, true);
          }
          return {
            content: [{ type: 'text', text: `ERROR: Unknown tool '${tool_name}'. Call search_tools first.` }],
            isError: true
          };
        }

        const cached = toolCache.get(tool_name, tool_input || {});
        if (cached) {
          metrics.increment(`tool_cache.hit.${tool_name}`);
          reqLogger.info('Cache', `Serving ${tool_name} from session cache`);
          let textResult = typeof cached === 'string' ? cached : JSON.stringify(cached, null, 2);
          metrics.histogram('tool_output.estimated_tokens', Math.ceil(textResult.length / 4), { tool: tool_name });
          textResult = capOutput(textResult, CAP_OPTIONS[tool_name] || {});
          
          if (sessionState && typeof sessionState.logToolCall === 'function') {
            sessionState.logToolCall(tool_name, Date.now() - startMs, false);
          }

          return { content: [{ type: 'text', text: `[CACHED]\n${textResult}` }] };
        }
        metrics.increment(`tool_cache.miss.${tool_name}`);

        const enrichedExtra = { ...(extra || {}), reqId, reqLogger };
        const result = await tool.handler(tool_input || {}, enrichedExtra);
        const durationMs = Date.now() - startMs;

        const hasError = result && (result.isError || result.error !== undefined);

        if (result && result.error) {
          metrics.inc('tool_errors_total', tool_name);
          metrics.record('tool_call_duration_ms', durationMs, tool_name);
          reqLogger.toolResult(tool_name, durationMs, false, { tool: tool_name, error: result.error });
          if (sessionState && typeof sessionState.logToolCall === 'function') {
            sessionState.logToolCall(tool_name, durationMs, true);
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            isError: true
          };
        }

        toolCache.set(tool_name, tool_input || {}, result);
        metrics.record('tool_call_duration_ms', durationMs, tool_name);
        reqLogger.toolResult(tool_name, durationMs, true, { tool: tool_name });

        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall(tool_name, durationMs, hasError);
        }

        let textResult = JSON.stringify(result, null, 2);
        metrics.histogram('tool_output.estimated_tokens', Math.ceil(textResult.length / 4), { tool: tool_name });
        textResult = capOutput(textResult, CAP_OPTIONS[tool_name] || {});
        return { content: [{ type: 'text', text: textResult }] };

      } catch (err) {
        const durationMs = Date.now() - startMs;
        metrics.inc('tool_errors_total', tool_name || name);
        metrics.record('tool_call_duration_ms', durationMs, name);
        reqLogger.toolResult(name, durationMs, false, { tool: name, error: err.message });
        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall(tool_name || name, durationMs, true);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
          isError: true
        };
      }
    }

    // ── 3. Direct dispatch (client bypasses search_tools/invoke_tool) ──
    const virtualKey = process.env.MCP_VIRTUAL_KEY;
    if (!virtualKeyManager.isAuthorized(virtualKey, name)) {
      metrics.increment('security.unauthorized_access_attempt');
      reqLogger.warn('Gateway', `Unauthorized direct execution blocked: ${name}`);
      if (sessionState && typeof sessionState.logToolCall === 'function') {
        sessionState.logToolCall(name, 0, true);
      }
      return {
        content: [{ type: 'text', text: `Gateway Security Error: Virtual Key is not authorized to execute tool '${name}'.` }],
        isError: true
      };
    }

    const tool = registry.get(name);
    if (!tool) {
      metrics.inc('tool_errors_total', name);
      reqLogger.error('ToolDispatch', `Tool not found: ${name}`);
      if (sessionState && typeof sessionState.logToolCall === 'function') {
        sessionState.logToolCall(name, 0, true);
      }
      return {
        content: [{ type: 'text', text: `Tool not found: ${name}` }],
        isError: true
      };
    }

    metrics.inc('tool_calls_total', name);
    metrics.inc('direct_tool_calls');
    const startMs = Date.now();

    try {
      const cached = toolCache.get(name, toolArgs || {});
      if (cached) {
        metrics.increment(`tool_cache.hit.${name}`);
        reqLogger.info('Cache', `Serving ${name} from session cache`);
        let textResult = typeof cached === 'string' ? cached : JSON.stringify(cached, null, 2);
        metrics.histogram('tool_output.estimated_tokens', Math.ceil(textResult.length / 4), { tool: name });
        textResult = capOutput(textResult, CAP_OPTIONS[name] || {});
        
        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall(name, Date.now() - startMs, false);
        }

        return { content: [{ type: 'text', text: `[CACHED]\n${textResult}` }] };
      }
      metrics.increment(`tool_cache.miss.${name}`);

      const enrichedExtra = { ...(extra || {}), reqId, reqLogger };
      const result = await tool.handler(toolArgs || {}, enrichedExtra);
      const durationMs = Date.now() - startMs;

      const hasError = result && (result.isError || result.error !== undefined);

      if (result && result.error) {
        metrics.inc('tool_errors_total', name);
        metrics.record('tool_call_duration_ms', durationMs, name);
        reqLogger.toolResult(name, durationMs, false, { tool: name, error: result.error });
        if (sessionState && typeof sessionState.logToolCall === 'function') {
          sessionState.logToolCall(name, durationMs, true);
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: true
        };
      }

      toolCache.set(name, toolArgs || {}, result);
      metrics.record('tool_call_duration_ms', durationMs, name);
      reqLogger.toolResult(name, durationMs, true, { tool: name });

      if (sessionState && typeof sessionState.logToolCall === 'function') {
        sessionState.logToolCall(name, durationMs, hasError);
      }

      let textResult = JSON.stringify(result, null, 2);
      metrics.histogram('tool_output.estimated_tokens', Math.ceil(textResult.length / 4), { tool: name });
      textResult = capOutput(textResult, CAP_OPTIONS[name] || {});
      return { content: [{ type: 'text', text: textResult }] };

    } catch (err) {
      const durationMs = Date.now() - startMs;
      metrics.inc('tool_errors_total', name);
      metrics.record('tool_call_duration_ms', durationMs, name);
      reqLogger.toolResult(name, durationMs, false, { tool: name, error: err.message });
      if (sessionState && typeof sessionState.logToolCall === 'function') {
        sessionState.logToolCall(name, durationMs, true);
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
        isError: true
      };
    }
  };
}

module.exports = { createToolCallHandler, capOutput, CAP_OPTIONS };
