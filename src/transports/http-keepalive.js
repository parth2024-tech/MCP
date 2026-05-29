/**
 * HTTP Transport with Keep-Alive
 *
 * Launches a local HTTP server and attaches the MCP StreamableHTTPServerTransport.
 * This gives the AI host a persistent HTTP connection with Keep-Alive headers,
 * connection pooling, and SSE-based streaming — all handled by the official SDK.
 *
 * Usage:
 *   node ase-mcp-server.js --http --port 3100
 */

const http = require('http');
const crypto = require('crypto');
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { logger } = require('../utils/logger');

/**
 * Creates an HTTP server with Keep-Alive and wires it to a StreamableHTTPServerTransport.
 *
 * @param {import("@modelcontextprotocol/sdk/server/index.js").Server} mcpServer
 * @param {number} port
 * @returns {Promise<{ httpServer: http.Server, transport: StreamableHTTPServerTransport }>}
 */
async function startHttpTransport(mcpServer, port = 3100) {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  const httpServer = http.createServer(async (req, res) => {
    // S-1: HTTP Bearer Token Authentication
    const requiredToken = process.env.ASE_HTTP_TOKEN;
    if (requiredToken) {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${requiredToken}`) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing Bearer token' }));
        return;
      }
    }

    // Keep-Alive headers
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=120, max=1000');

    // CORS for local dev tools
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Route to MCP transport
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      logger.error('HTTP', `Request handling error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    }
  });

  // Enable Keep-Alive at the TCP level
  httpServer.keepAliveTimeout = 120000;   // 2 minutes
  httpServer.headersTimeout = 125000;     // slightly more than keepAliveTimeout
  httpServer.maxHeadersCount = 100;

  return new Promise((resolve, reject) => {
    httpServer.listen(port, '127.0.0.1', () => {
      logger.info('HTTP', `MCP server listening on http://127.0.0.1:${port}`);
      logger.info('HTTP', `Keep-Alive: timeout=120s, max=1000 requests`);
      
      if (!process.env.ASE_HTTP_TOKEN) {
        logger.warn('Security', 'HTTP transport is running UNAUTHENTICATED. Set ASE_HTTP_TOKEN to enable Bearer auth.');
      }

      // Connect the MCP server to the transport
      mcpServer.connect(transport).then(() => {
        resolve({ httpServer, transport });
      }).catch(reject);
    });

    httpServer.on('error', reject);
  });
}

module.exports = { startHttpTransport };
