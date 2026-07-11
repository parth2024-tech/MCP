import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath, quiet: true } as any);

import crypto from 'crypto';
import http from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  PingRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { Container } from './src/core/Container';
import { RedisService } from './src/services/redis-service';

// Legacy services that haven't been TS-migrated yet
const ToolRegistry = require('./src/services/registry');
const SkillCache = require('./src/services/cache');
const WorkerPool = require('./src/services/worker-pool');
const EmbeddingService = require('./src/services/embedding-service');
const SessionState = require('./src/services/session-state');
const KnowledgeGraphService = require('./src/services/knowledge-graph-service');
const ASTIndexer = require('./src/services/ast-indexer');
const MCTSEngine = require('./src/services/mcts-engine');
const MemoryService = require('./src/services/memory-service');
const VirtualKeyManager = require('./src/services/virtual-key-manager');
const OrchestrationDB = require('./src/services/orchestration-db');
const SpokeManager = require('./src/services/spoke-manager');
const ToolSearch = require('./src/services/tool-search');

const { logger } = require('./src/utils/logger');
const metrics = require('./src/utils/metrics');

import { createToolCallHandler } from './src/server/handlers';
const { registerResourceHandlers } = require('./src/server/resources');
const { registerPromptHandlers } = require('./src/server/prompts');

const args = process.argv.slice(2);
const useHttp = args.includes('--http');
const portFlag = args.find((a, i) => args[i - 1] === '--port');
const httpPort = portFlag
  ? parseInt(portFlag, 10)
  : parseInt(process.env.ASE_HTTP_PORT || '3100', 10);
const metricsPort = parseInt(process.env.ASE_METRICS_PORT || '9090', 10);

const container = new Container();
const tokenSecret = crypto.randomBytes(32).toString('hex');
container.register('TokenSecret', tokenSecret);

const serverSessionId = crypto.randomUUID();
const workerPool = new WorkerPool();
const registry = new ToolRegistry();
const skillCache = new SkillCache();
const embeddingService = new EmbeddingService(workerPool);
const sessionState = new SessionState(serverSessionId);
const knowledgeGraphService = new KnowledgeGraphService();
const astIndexer = new ASTIndexer(knowledgeGraphService);
const mctsEngine = new MCTSEngine(knowledgeGraphService, embeddingService);
const memoryService = new MemoryService(workerPool);
const virtualKeyManager = new VirtualKeyManager();
const orchestrationDb = OrchestrationDB.getInstance();
const spokeManager = new SpokeManager();
const redisService = new RedisService();

spokeManager.initialize().catch((err: any) => {
  logger.error('Server', `Failed to initialize Spoke Manager: ${err.message}`);
});

container.register('WorkerPool', workerPool);
container.register('ToolRegistry', registry);
container.register('SkillCache', skillCache);
container.register('EmbeddingService', embeddingService);
container.register('SessionState', sessionState);
container.register('KnowledgeGraphService', knowledgeGraphService);
container.register('ASTIndexer', astIndexer);
container.register('MCTSEngine', mctsEngine);
container.register('MemoryService', memoryService);
container.register('VirtualKeyManager', virtualKeyManager);
container.register('OrchestrationDB', orchestrationDb);
container.register('SpokeManager', spokeManager);
container.register('Redis', redisService);
container.register('ToolSearch', ToolSearch);
container.register('Metrics', metrics);
container.register('SessionToolCache', new (require('./src/core/Cache').SessionToolCache)());

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
  orchestrationDb,
  spokeManager
};

const server = new Server(
  { name: 'ase-mcp-server', version: '4.2.0-max-level' },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      logging: {}
    }
  }
);

const serverRoot = __dirname.endsWith('dist') ? path.join(__dirname, '..') : __dirname;
const toolsDir = path.join(serverRoot, 'src', 'tools');
registry.loadToolsFromDirectory(toolsDir, deps);

const searchToolsSchema = {
  name: 'search_tools',
  description: 'Search for available tools by describing what you want to do. Returns the most relevant tool schemas. Call this first before calling any other tool. Example: search_tools("run lint and tests to validate code")',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Description of the task or action you want to perform.' },
      top_k: { type: 'number', description: 'Optional. Maximum number of tools to return. Defaults to 4.' }
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
      tool_name: { type: 'string', description: 'The exact name of the tool to invoke.' },
      tool_input: { type: 'object', description: 'The arguments/parameters to pass to the tool.' }
    },
    required: ['tool_name', 'tool_input']
  }
};

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const spokeTools = await spokeManager.listAggregatedTools();
  return {
    tools: [searchToolsSchema, invokeToolSchema, ...spokeTools]
  };
});

server.setRequestHandler(
  CallToolRequestSchema,
  createToolCallHandler(container)
);

registerResourceHandlers(server, embeddingService, skillCache);
registerPromptHandlers(server);

server.setRequestHandler(PingRequestSchema, async () => ({}));

async function warmEmbeddingModel() {
  const startTime = Date.now();
  try {
    await embeddingService.embed('warmup');
    logger.info({ warmup_ms: Date.now() - startTime }, 'embedding_model_warmed');
  } catch (err) {
    logger.warn({ err }, 'embedding_warmup_failed_circuit_breaker_will_handle');
  }
}
// Defer CPU-bound model warmup and skill sync by 15s.
// The IDE connects and makes its first tool calls within 0-5s of startup.
// The ONNX model load (Xenova/all-MiniLM-L6-v2) saturates the CPU for
// 5-15s on first call. Firing at 2s collides directly with those IDE
// requests and starves the event loop, causing "Working..." hangs.
// 15s gives the IDE time to fully initialize before heavy work begins.
setTimeout(() => {
  warmEmbeddingModel();

  embeddingService.syncSkillsBackground().then(() => {
    server.notification({ method: 'notifications/tools/list_changed' }).catch((err: any) => {
      logger.debug('Server', `Could not send list_changed notification: ${err.message}`);
    });
  }).catch((err: any) => {
    logger.error('Server', `Background embedding sync failed: ${err.message}`);
  });
}, 15000);

knowledgeGraphService.initializeSchema().catch((err: any) => {
  logger.error('Server', `Failed to initialize Knowledge Graph schema: ${err.message}`);
});

const metricsServer = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics.snapshot(), null, 2));
  } else {
    res.writeHead(404);
    res.end();
  }
});

metricsServer.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.warn('Server', `Port ${metricsPort} is in use. Metrics server will not be available in this instance.`);
  } else {
    logger.error('Server', `Metrics server error: ${err.message}`);
  }
});

metricsServer.listen(metricsPort, '127.0.0.1', () => {
  logger.info('Server', `Metrics server listening on 127.0.0.1:${metricsPort}`);
});

if (useHttp) {
  const { startHttpTransport } = require('./src/transports/http-keepalive');
  startHttpTransport(server, httpPort).catch((err: any) => {
    logger.error('Transport', `Fatal: Failed to start HTTP transport: ${err.message}`);
    process.exit(1);
  });
} else {
  const { BufferedStdioTransport } = require('./src/transports/buffered-stdio');
  const transport = new BufferedStdioTransport();
  server.connect(transport).catch((err: any) => {
    logger.error('Transport', `Fatal: Failed to connect StdioServerTransport: ${err.message}`);
    process.exit(1);
  });
}

if (process.env.NODE_ENV === 'development') {
  const chokidar = require('chokidar');
  const watcher = chokidar.watch(path.join(serverRoot, 'src', 'tools'), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });

  watcher.on('change', (filePath: string) => {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.ts')) return;
    logger.info('Server', { filePath }, 'tool_file_changed_reloading');

    try {
      delete require.cache[require.resolve(filePath)];
      registry.loadToolsFromDirectory(path.join(serverRoot, 'src', 'tools'), deps);
      server.notification({ method: 'notifications/tools/list_changed', params: {} });
      logger.info('Server', 'notified_client_tools_list_changed');
    } catch (err: any) {
      logger.error('Server', `Failed to reload tools: ${err.message}`);
    }
  });

  watcher.on('error', (err: any) => {
    logger.error('Server', `chokidar watch error: ${err.message}`);
  });

  logger.info('Server', `Hot-reload active (chokidar) — watching: src/tools/`);
}

process.stdin.on('close', () => {
  logger.info('Server', 'stdin closed by client, shutting down');
  process.exit(0);
});
