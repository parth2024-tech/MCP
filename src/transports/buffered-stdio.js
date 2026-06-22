/**
 * Buffered Stdio Transport
 *
 * Wraps the default StdioServerTransport to add write coalescing.
 * Instead of flushing every JSON-RPC message individually (one write
 * syscall per message), this transport buffers outgoing writes and
 * flushes them on the next microtask tick.
 *
 * For high-throughput scenarios (e.g. progress notifications from
 * streaming validation), this reduces syscall overhead significantly.
 */

const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

class BufferedStdioTransport extends StdioServerTransport {
  constructor() {
    super();
    this._writeBuffer = [];
    this._flushScheduled = false;
  }

  /**
   * Override send to buffer messages and flush on next microtask.
   */
  async send(message, options) {
    this._writeBuffer.push({ message, options });
    if (!this._flushScheduled) {
      this._flushScheduled = true;
      queueMicrotask(() => this._flush());
    }
  }

  async _flush() {
    this._flushScheduled = false;
    const batch = this._writeBuffer;
    this._writeBuffer = [];
    
    // Process the entire batch
    for (const item of batch) {
      await super.send(item.message, item.options);
    }
  }
}

module.exports = { BufferedStdioTransport };
