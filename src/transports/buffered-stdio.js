/**
 * Direct Stdio Transport
 *
 * Previously this class used queueMicrotask() to coalesce writes.
 * That optimization caused a critical production bug:
 *
 * PROBLEM:
 *   The MCP server loads a large ONNX embedding model (Xenova/all-MiniLM-L6-v2)
 *   in a Piscina worker thread 2 seconds after startup. This model load saturates
 *   the CPU for 5-15 seconds on first call. During that window, the Node.js event
 *   loop is starved: microtasks queued via queueMicrotask() are never drained,
 *   so the JSON-RPC response for any tool call that arrived during startup sits
 *   in _writeBuffer forever. The IDE sees the tool as hanging at "Working..."
 *   until its RPC timeout fires.
 *
 * FIX:
 *   Remove all buffering. Call super.send() directly and immediately.
 *   MCP is a request/response protocol — one tool call produces one response.
 *   There is no high-throughput scenario that would benefit from write coalescing
 *   on the response path. Correctness > micro-optimisation.
 */

const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

class BufferedStdioTransport extends StdioServerTransport {
  async send(message, options) {
    // Direct passthrough — no buffering, no microtask deferral.
    return super.send(message, options);
  }
}

module.exports = { BufferedStdioTransport };

