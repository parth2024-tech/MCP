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
const Redis = require('ioredis');
const OrchestrationDB = require('../services/orchestration-db');
const { AsyncLocalStorage } = require('async_hooks');

const httpContextStorage = new AsyncLocalStorage();

// Rate limiting map and parameters (OpenHands-inspired)
const rateLimitMap = new Map();
const RATE_LIMIT = parseInt(process.env.ASE_HTTP_RATE_LIMIT || '100', 10);
const RATE_WINDOW_MS = parseInt(process.env.ASE_HTTP_RATE_WINDOW || '60', 10) * 1000;

// Periodically clean up rate limit map
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const active = timestamps.filter(ts => now - ts < RATE_WINDOW_MS);
    if (active.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, active);
    }
  }
}, 60000).unref();

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
    httpContextStorage.run({ req, res }, async () => {
    // Generate request ID
    const reqId = crypto.randomUUID();
    res.setHeader('X-Request-Id', reqId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');

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

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // OPTIONS check bypasses rate limiting
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Rate Limiting (sliding window per-IP)
    const clientIp = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    if (parsedUrl.pathname !== '/events') {
      let clientRequests = rateLimitMap.get(clientIp) || [];
      clientRequests = clientRequests.filter(ts => now - ts < RATE_WINDOW_MS);
      if (clientRequests.length >= RATE_LIMIT) {
        const oldest = clientRequests[0];
        const retryAfterSec = Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000);
        res.writeHead(429, { 
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec)
        });
        res.end(JSON.stringify({ error: 'Too Many Requests', retry_after: retryAfterSec }));
        return;
      }
      clientRequests.push(now);
      rateLimitMap.set(clientIp, clientRequests);
    }

    // 2. Request body size limits
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > 1048576) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large', max_bytes: 1048576 }));
      return;
    }

    let bytesRead = 0;
    let limitExceeded = false;
    req.on('data', (chunk) => {
      bytesRead += chunk.length;
      if (bytesRead > 1048576 && !limitExceeded) {
        limitExceeded = true;
        req.destroy(); // Abort request
      }
    });

    if (parsedUrl.pathname === '/events' && req.method === 'GET') {
      const agentId = parsedUrl.searchParams.get('agent_id');
      if (!agentId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'agent_id query parameter is required' }));
        return;
      }

      // Fix 8: Replay-on-reconnect using the SSE Last-Event-ID header.
      const lastEventIdHeader = req.headers['last-event-id'];
      const resumeFromId = lastEventIdHeader ? parseInt(lastEventIdHeader, 10) : 0;

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(': ok\n\n');

      const orch = OrchestrationDB.getInstance();
      const db   = orch.getDB();

      // Helper: look up this agent's subscriptions and return matching events
      // since a given SQLite row ID.
      const getSubscriptions = () =>
        db.prepare(`SELECT event_type FROM event_subscriptions WHERE agent_id = ?`)
          .all(agentId)
          .map(r => r.event_type);

      const queryMissedEvents = (sinceId) => {
        const subs = getSubscriptions();
        if (subs.length === 0) return [];
        const placeholders = subs.map(() => '?').join(',');
        return db.prepare(
          `SELECT id, type, payload, source_agent, task_id, created_at
           FROM events
           WHERE id > ? AND type IN (${placeholders})
           ORDER BY id ASC
           LIMIT 500`
        ).all(sinceId, ...subs);
      };

      // Helper: write one SSE event frame with the id: field set.
      const writeEvent = (event) => {
        const data = JSON.stringify({
          id:           event.id,
          type:         event.type,
          payload:      typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload,
          source_agent: event.source_agent,
          task_id:      event.task_id,
          created_at:   event.created_at
        });
        res.write(`id: ${event.id}\ndata: ${data}\n\n`);
      };

      // Step 1: Drain the backlog from SQLite (events missed while disconnected).
      let highWaterMark = resumeFromId;
      if (resumeFromId > 0) {
        const missed = queryMissedEvents(resumeFromId);
        for (const event of missed) {
          writeEvent(event);
          highWaterMark = event.id;
        }
        if (missed.length > 0) {
          logger.info('HTTP-SSE',
            `Replayed ${missed.length} missed event(s) to agent ${agentId} (since id=${resumeFromId})`
          );
        }
      }

      // Step 2: Subscribe to Redis pub/sub for live events.
      const redisUrl = process.env.ASE_REDIS_URL || 'redis://127.0.0.1:6379';
      const subRedis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        connectTimeout: 3000,
        lazyConnect: true,
        retryStrategy: () => null
      });
      await subRedis.connect().catch(() => {});

      // Await subscribe() so the subscription is registered before the gap flush.
      await subRedis.subscribe('ase:events').catch((err) => {
        logger.error('HTTP-SSE', `Redis subscribe failed: ${err.message}`);
      });

      // Step 3: Gap flush — query SQLite for events emitted between the backlog
      // query (Step 1) and the moment the subscription became active (Step 2).
      const gap = queryMissedEvents(highWaterMark);
      for (const event of gap) {
        writeEvent(event);
        highWaterMark = event.id;
      }

      // Step 4: Handle live events from pub/sub.
      const onMessage = (channel, message) => {
        try {
          const event = JSON.parse(message);

          // Skip events already sent in the backlog or gap flush.
          if (event.id && event.id <= highWaterMark) return;

          const subs = getSubscriptions();
          if (subs.includes(event.type)) {
            writeEvent(event);
            if (event.id) highWaterMark = event.id;
          }
        } catch (err) {
          logger.error('HTTP-SSE', `SSE message error: ${err.message}`);
        }
      };

      subRedis.on('message', onMessage);

      // SSE Heartbeat (keeps connection alive, prevents timeout disconnects)
      const heartbeatInterval = setInterval(() => {
        if (!res.writableEnded) {
          res.write(': heartbeat\n\n');
        }
      }, 30000);

      req.on('close', () => {
        clearInterval(heartbeatInterval);
        subRedis.disconnect().catch(() => {});
      });
      return;
    }

    // 3. Route to MCP transport with a 60-second aggregate timeout
    try {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Gateway Timeout')), 60000);
      });

      await Promise.race([
        transport.handleRequest(req, res),
        timeoutPromise
      ]);

      if (timer) clearTimeout(timer);
    } catch (err) {
      if (err.message === 'Gateway Timeout') {
        logger.error('HTTP', `Request to ${req.url} timed out after 60s`);
        if (!res.headersSent) {
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Gateway Timeout' }));
        }
      } else {
        logger.error('HTTP', `Request handling error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    }
    });
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

module.exports = { startHttpTransport, httpContextStorage };
