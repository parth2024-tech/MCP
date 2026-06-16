/**
 * ase-mcp-server.js — ASE MCP Server v4.1.0
 *
 * Lean orchestrator. All handler logic is extracted into separate concern modules:
 *   src/server/handlers.js  — Tool call dispatch (search_tools, invoke_tool, direct)
 *   src/server/resources.js — Resource listing, templates, and reading
 *   src/server/prompts.js   — Prompt listing and generation
 *
 * Environment variables (see .env.example for full reference):
 *   NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD — Neo4j connection
 *   ASE_SKILLS_DIR   — Root directory of skill folders
 *   ASE_DB_DIR       — Directory for SQLite database files
 *   ASE_STATE_FILE   — Path to skills_session_state.json
 *   ASE_ALLOWED_DIRS — Colon-separated allowed directories (fail-closed guard)
 *   MCP_VIRTUAL_KEY  — Virtual key for tool authorization
 *   ASE_HTTP_PORT    — HTTP port (default: 3100)
 *   ASE_METRICS_PORT — Metrics server port (default: 9090, binds to 127.0.0.1)
 *   NODE_ENV         — 'development' enables hot-reload and relaxes Neo4j password guard
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const crypto = require('crypto');
const http = require('http');

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  PingRequestSchema
} = require('@modelcontextprotocol/sdk/types.js');

const ToolRegistry     = require('./src/services/registry');
const SkillCache       = require('./src/services/cache');
const WorkerPool       = require('./src/services/worker-pool');
const EmbeddingService = require('./src/services/embedding-service');
const SessionState     = require('./src/services/session-state');
const KnowledgeGraphService = require('./src/services/knowledge-graph-service');
const ASTIndexer       = require('./src/services/ast-indexer');
const MCTSEngine       = require('./src/services/mcts-engine');
const MemoryService    = require('./src/services/memory-service');
const VirtualKeyManager = require('./src/services/virtual-key-manager');
const OrchestrationDB = require('./src/services/orchestration-db');

const { logger }     = require('./src/utils/logger');
const metrics        = require('./src/utils/metrics');

const { createToolCallHandler }   = require('./src/server/handlers');
const { registerResourceHandlers } = require('./src/server/resources');
const { registerPromptHandlers }   = require('./src/server/prompts');

// ─────────────────────────────────────────────────────────────
// Parse CLI flags
// ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portFlag = args.find((a, i) => args[i - 1] === '--port');
const httpPort = portFlag
  ? parseInt(portFlag, 10)
  : parseInt(process.env.ASE_HTTP_PORT || '3100', 10);

const metricsPort = parseInt(process.env.ASE_METRICS_PORT || '9090', 10);

// ─────────────────────────────────────────────────────────────
// Initialize Dependencies
// ─────────────────────────────────────────────────────────────
const serverSessionId = crypto.randomUUID();
const workerPool = new WorkerPool();
const registry   = new ToolRegistry();
const skillCache = new SkillCache();
const embeddingService = new EmbeddingService(workerPool);
const sessionState     = new SessionState(serverSessionId);
const knowledgeGraphService = new KnowledgeGraphService();
const astIndexer    = new ASTIndexer(knowledgeGraphService);
const mctsEngine    = new MCTSEngine(knowledgeGraphService, embeddingService);
const memoryService = new MemoryService(workerPool);
const virtualKeyManager = new VirtualKeyManager();
const orchestrationDb = OrchestrationDB.getInstance();

const deps = {
  workerPool,
  skillCache,
  embeddingService,
  sessionState,
  knowledgeGraphService,
  astIndexer,
  mctsEngine,
  memoryService,
  virtualKeyManager,
  orchestrationDb
};

// ─────────────────────────────────────────────────────────────
// Initialize the MCP Server
// ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'ase-mcp-server', version: '4.1.0' },
  {
    capabilities: {
      tools:     {},
      resources: { templates: {} }, // signal support for ListResourceTemplates
      prompts:   {},
      logging:   {}
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Load tool implementations into the registry
// ─────────────────────────────────────────────────────────────
const toolsDir = path.join(__dirname, 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, deps);

// ─────────────────────────────────────────────────────────────
// JIT Gateway tool schemas (the only 2 tools exposed to the IDE)
// ─────────────────────────────────────────────────────────────
const searchToolsSchema = {
  name: 'search_tools',
  description: 'Search for available tools by describing what you want to do. Returns the most relevant tool schemas. Call this first before calling any other tool. Example: search_tools("run lint and tests to validate code")',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Description of the task or action you want to perform.'
      },
      top_k: {
        type: 'number',
        description: 'Optional. Maximum number of tools to return. Defaults to 4.'
      }
    },
    required: ['query']
  }
};

const invokeToolSchema = {
  name: 'invoke_tool',
  description: 'Invoke a specific tool by name with its parameters. First call search_tools to find the correct tool name and parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      tool_name: {
        type: 'string',
        description: 'The exact name of the tool to invoke.'
      },
      tool_input: {
        type: 'object',
        description: 'The arguments/parameters to pass to the tool.'
      }
    },
    required: ['tool_name', 'tool_input']
  }
};

// ─────────────────────────────────────────────────────────────
// Register Handlers (extracted into concern modules)
// ─────────────────────────────────────────────────────────────

// Tools: JIT listing (only search_tools + invoke_tool visible to IDE)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [searchToolsSchema, invokeToolSchema]
}));

// Tool calls: full dispatch logic in handlers.js
server.setRequestHandler(
  CallToolRequestSchema,
  createToolCallHandler(registry, virtualKeyManager, sessionState)
);

// Resources: health, metrics, skills
registerResourceHandlers(server, embeddingService, skillCache);

// Prompts: project_prompt, code_review
registerPromptHandlers(server);

// Ping
server.setRequestHandler(PingRequestSchema, async () => ({}));

// ─────────────────────────────────────────────────────────────
// Background startup tasks
// ─────────────────────────────────────────────────────────────

// Proactive embedding warmup (prevents cold-start latency on first query)
async function warmEmbeddingModel() {
  const startTime = Date.now();
  try {
    await embeddingService.embed('warmup');
    logger.info({ warmup_ms: Date.now() - startTime }, 'embedding_model_warmed');
  } catch (err) {
    logger.warn({ err }, 'embedding_warmup_failed_circuit_breaker_will_handle');
  }
}
warmEmbeddingModel();

// Sync skill embeddings and notify IDE of tool list readiness
embeddingService.syncSkillsBackground().then(() => {
  server.notification({ method: 'notifications/tools/list_changed' }).catch(err => {
    logger.debug('Server', `Could not send list_changed notification: ${err.message}`);
  });
}).catch(err => {
  logger.error('Server', `Background embedding sync failed: ${err.message}`);
});

// Initialize Neo4j schema (non-blocking — Neo4j may not be running)
knowledgeGraphService.initializeSchema().catch(err => {
  logger.error('Server', `Failed to initialize Knowledge Graph schema: ${err.message}`);
});

// ─────────────────────────────────────────────────────────────
// Observability Metrics Server (127.0.0.1 only — never public)
// ─────────────────────────────────────────────────────────────
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
    logger.warn('Server', `Port ${metricsPort} is in use. Metrics server will not be available in this instance.`);
  } else {
    logger.error('Server', `Metrics server error: ${err.message}`);
  }
});

// SECURITY: bind to 127.0.0.1 (loopback only) — never 0.0.0.0
metricsServer.listen(metricsPort, '127.0.0.1', () => {
  logger.info('Server', `Metrics server listening on 127.0.0.1:${metricsPort}`);
});

// ─────────────────────────────────────────────────────────────
// Connect transport (stdio or HTTP)
// ─────────────────────────────────────────────────────────────
if (useHttp) {
  const { startHttpTransport } = require('./src/transports/http-keepalive');
  startHttpTransport(server, httpPort).catch(err => {
    logger.error('Transport', `Fatal: Failed to start HTTP transport: ${err.message}`);
    process.exit(1);
  });
} else {
  const { BufferedStdioTransport } = require('./src/transports/buffered-stdio');
  const transport = new BufferedStdioTransport();
  server.connect(transport).catch(err => {
    logger.error('Transport', `Fatal: Failed to connect StdioServerTransport: ${err.message}`);
    process.exit(1);
  });
}

// ─────────────────────────────────────────────────────────────
// Hot-Reload Tool Configurations (Development only, using chokidar)
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  // chokidar is more reliable than native fs.watch across Linux/macOS/WSL
  const chokidar = require('chokidar');

  const watcher = chokidar.watch(path.join(__dirname, 'src', 'tools'), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });

  watcher.on('change', (filePath) => {
    if (!filePath.endsWith('.js')) return;
    logger.info('Server', { filePath }, 'tool_file_changed_reloading');

    try {
      // Bust the require cache for the changed module
      delete require.cache[require.resolve(filePath)];
      registry.loadToolsFromDirectory(path.join(__dirname, 'src', 'tools'), deps);
      server.notification({ method: 'notifications/tools/list_changed', params: {} });
      logger.info('Server', 'notified_client_tools_list_changed');
    } catch (err) {
      logger.error('Server', `Failed to reload tools: ${err.message}`);
    }
  });

  watcher.on('error', (err) => {
    logger.error('Server', `chokidar watch error: ${err.message}`);
  });

  logger.info('Server', `Hot-reload active (chokidar) — watching: src/tools/`);
}
