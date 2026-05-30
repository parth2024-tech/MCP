const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  PingRequestSchema
} = require("@modelcontextprotocol/sdk/types.js");
const ToolRegistry = require('./src/services/registry');
const SkillCache = require('./src/services/cache');
const WorkerPool = require('./src/services/worker-pool');
const EmbeddingService = require('./src/services/embedding-service');
const SessionState = require('./src/services/session-state');
const { generateProjectPrompt } = require('./src/services/project-prompt-generator');
const { logger, createLogger } = require('./src/utils/logger');
const metrics = require('./src/utils/metrics');

const SKILLS_DIR = path.resolve(__dirname, '../../');

// ─────────────────────────────────────────────────────────────
// Parse CLI flags
// ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portFlag = args.find((a, i) => args[i - 1] === '--port');
const httpPort = portFlag ? parseInt(portFlag, 10) : 3100;

// ─────────────────────────────────────────────────────────────
// Initialize Dependencies
// ─────────────────────────────────────────────────────────────
const serverSessionId = crypto.randomUUID();
const workerPool = new WorkerPool();
const registry = new ToolRegistry();
const skillCache = new SkillCache();
const embeddingService = new EmbeddingService(workerPool);
const sessionState = new SessionState(serverSessionId);

const deps = {
  workerPool,
  skillCache,
  embeddingService,
  sessionState
};

// ─────────────────────────────────────────────────────────────
// Initialize the MCP Server
// ─────────────────────────────────────────────────────────────
const server = new Server(
  {
    name: "ase-mcp-server",
    version: "4.0.0"
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      logging: {}  // enable logging capability for progress
    }
  }
);

// Load tools into the registry
const toolsDir = path.join(__dirname, 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, deps);

// ─────────────────────────────────────────────────────────────
// Register Tool Listing Handler
// ─────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: registry.getSchemas()
  };
});

// ─────────────────────────────────────────────────────────────
// Register Tool Call Handler — passes `extra` for streaming
// ─────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const { name, arguments: toolArgs } = request.params;

  // Generate a correlation ID for this request — all logs from this call chain carry it
  const reqId = crypto.randomUUID();
  const reqLogger = createLogger(reqId);

  const tool = registry.get(name);
  if (!tool) {
    metrics.inc('tool_errors_total', name);
    reqLogger.error('ToolDispatch', `Tool not found: ${name}`);
    return {
      content: [{ type: 'text', text: `Tool not found: ${name}` }],
      isError: true
    };
  }

  metrics.inc('tool_calls_total', name);
  const startMs = Date.now();

  try {
    // Inject req_id logger into extra so tool handlers can use it
    const enrichedExtra = { ...(extra || {}), reqId, reqLogger };
    const result = await tool.handler(toolArgs || {}, enrichedExtra);
    const durationMs = Date.now() - startMs;

    if (result && result.error) {
      metrics.inc('tool_errors_total', name);
      metrics.record('tool_call_duration_ms', durationMs, name);
      reqLogger.toolResult(name, durationMs, false, { tool: name, error: result.error });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: true
      };
    }

    metrics.record('tool_call_duration_ms', durationMs, name);
    reqLogger.toolResult(name, durationMs, true, { tool: name });

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (err) {
    const durationMs = Date.now() - startMs;
    metrics.inc('tool_errors_total', name);
    metrics.record('tool_call_duration_ms', durationMs, name);
    reqLogger.toolResult(name, durationMs, false, { tool: name, error: err.message });

    return {
      content: [{ type: 'text', text: JSON.stringify({ error: err.message, req_id: reqId }) }],
      isError: true
    };
  }
});

// ─────────────────────────────────────────────────────────────
// Register Resource Handlers
// ─────────────────────────────────────────────────────────────
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [
    {
      uri: 'health://status',
      name: 'Server Health',
      description: 'Live health status: circuit breaker state, DB integrity, skill count, uptime.'
    }
  ];
  try {
    const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    for (const dirent of entries) {
      if (dirent.isDirectory() && !dirent.name.startsWith('.') && dirent.name !== 'tools' && dirent.name !== 'docs') {
        resources.push({
          uri: `skill://${dirent.name}`,
          name: dirent.name,
          description: `Instruction set for ${dirent.name}`
        });
      }
    }
  } catch (err) {
    console.error('Failed to read skills directory for resources:', err);
  }
  return { resources };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  // ── health://status ──
  if (uri === 'health://status') {
    const health = embeddingService.healthSnapshot;
    const metricsSnapshot = metrics.snapshot();
    const status = {
      server: 'ase-mcp-server',
      version: '4.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      embedding_circuit: health.embedding_circuit,
      skills_indexed: health.skills_indexed,
      last_sync: health.last_sync,
      db_ok: health.skills_indexed >= 0,
      metrics: metricsSnapshot
    };
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(status, null, 2)
      }]
    };
  }

  // ── skill://{name} ──
  if (uri.startsWith('skill://')) {
    const name = uri.substring(8);
    const skillData = await skillCache.getSkillContent(name);
    if (!skillData) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: skillData.content
      }]
    };
  }

  throw new Error(`Unknown resource URI scheme: ${uri}`);
});

// ─────────────────────────────────────────────────────────────
// Register Prompts Handlers
// ─────────────────────────────────────────────────────────────
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "project_prompt",
        description: "Generates the structured system prompt based on the active .ase-project.json configuration.",
        arguments: [
          {
            name: "project_dir",
            description: "Optional. Absolute path to the project root. Defaults to current working directory.",
            required: false
          }
        ]
      }
    ]
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === 'project_prompt') {
    const dir = request.params.arguments?.project_dir || process.cwd();
    const promptData = await generateProjectPrompt(dir);
    
    if (promptData.error) {
      throw new Error(`Failed to generate prompt: ${promptData.error}`);
    }
    
    return {
      description: "ASE Project System Prompt",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: promptData.prompt
          }
        }
      ]
    };
  }
  throw new Error(`Unknown prompt: ${request.params.name}`);
});

// ─────────────────────────────────────────────────────────────
// Register Ping Handler
// ─────────────────────────────────────────────────────────────
server.setRequestHandler(PingRequestSchema, async () => {
  return {};
});

// ─────────────────────────────────────────────────────────────
// Start background embedding sync
// ─────────────────────────────────────────────────────────────
embeddingService.syncSkillsBackground().catch(err => {
  logger.error('Server', `Background embedding sync failed: ${err.message}`);
});

// ─────────────────────────────────────────────────────────────
// Start Observability Metrics Server (Port 9090)
// ─────────────────────────────────────────────────────────────
const http = require('http');
const metricsServer = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics.snapshot(), null, 2));
  } else {
    res.writeHead(404);
    res.end();
  }
});

metricsServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn('Server', 'Port 9090 is in use. Metrics server will not be available in this instance.');
  } else {
    logger.error('Server', `Metrics server error: ${err.message}`);
  }
});

metricsServer.listen(9090, () => {
  logger.info('Server', 'Metrics server listening on port 9090');
});

// ─────────────────────────────────────────────────────────────
// Connect transport (stdio or HTTP)
// ─────────────────────────────────────────────────────────────
if (useHttp) {
  // HTTP mode with Keep-Alive and SSE streaming
  const { startHttpTransport } = require('./src/transports/http-keepalive');
  startHttpTransport(server, httpPort).catch(err => {
    logger.error('Transport', `Fatal: Failed to start HTTP transport: ${err.message}`);
    process.exit(1);
  });
} else {
  // Default: stdio mode with buffered writes
  const { BufferedStdioTransport } = require('./src/transports/buffered-stdio');
  const transport = new BufferedStdioTransport();
  server.connect(transport).catch(err => {
    logger.error('Transport', `Fatal: Failed to connect StdioServerTransport: ${err.message}`);
    process.exit(1);
  });
}
