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
import { DeadLetterQueue } from './src/services/dead-letter-queue';
import { startMemoryMonitoring, stopMemoryMonitoring } from './src/utils/memory-guard';
import { startWatchdog, stopWatchdog } from './src/services/health-watchdog';
import { ServiceRegistry } from './src/services/service-registry';

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

// ─── Process-Level Crash Guards ─────────────────────────────────────────────────
//
// Without these handlers, any uncaught error or unhandled promise rejection
// terminates the process SILENTLY (or with a cryptic exit code) and the MCP
// client sees a "connection closed" with no explanation.
//
// With these handlers:
//   - The error is structurally logged to skills_audit.log (with full stack)
//   - Metrics are updated so operators can detect the crash post-mortem
//   - The process performs a clean exit (code 1) rather than an abrupt SIGKILL

process.on('uncaughtException', (err: Error, origin: string) => {
  try {
    logger.error('Process', `UNCAUGHT EXCEPTION [${origin}]: ${err.message}`, {
      stack: err.stack,
      origin,
      pid: process.pid,
    });
    metrics.increment('process.uncaught_exception');
  } catch (_) { /* logger itself failed — nothing we can do */ }
  // Give Pino 500ms to flush to disk, then exit cleanly.
  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  try {
    const msg = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;
    logger.error('Process', `UNHANDLED REJECTION: ${msg}`, {
      stack,
      pid: process.pid,
    });
    metrics.increment('process.unhandled_rejection');
  } catch (_) { /* logger itself failed */ }
  // Do NOT exit on unhandled rejections in MCP servers — the SDK may fire
  // fire-and-forget notifications that occasionally fail. Just log and continue.
});

let metricsServer: http.Server | undefined;

// ─────────────────────────────────────────────────────────────────────────

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
const dlq = new DeadLetterQueue();
const serviceRegistry = new ServiceRegistry(container);

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
container.register('DeadLetterQueue', dlq);
container.register('ServiceRegistry', serviceRegistry);

// Start Watchdogs & Monitoring (OpenHands-inspired resilience)
startMemoryMonitoring(container);
startWatchdog(container);

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

// ─── Startup Health Snapshot ─────────────────────────────────────────────────
setTimeout(() => {
  const redisUp = orchestrationDb?.isRedisAvailable?.() ?? false;
  const toolCount = registry.list ? registry.list().length : '?';
  logger.info('Server', 'ASE MCP Server started — health snapshot', {
    version: '4.2.0-max-level',
    redis: redisUp ? 'connected' : 'unavailable (SQLite-only mode)',
    tools_loaded: toolCount,
    node_version: process.version,
    pid: process.pid,
    env: process.env.NODE_ENV || 'production',
  });
}, 2000); // 2s delay gives Redis lazy-connect time to resolve

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

metricsServer = http.createServer((req, res) => {
  if (req.url === '/metrics' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics.snapshot(), null, 2));
  } else if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    try {
      const registry = container.resolve<any>('ServiceRegistry');
      res.end(JSON.stringify(registry.toJSON(), null, 2));
    } catch (e: any) {
      res.end(JSON.stringify({ status: 'degraded', error: e.message }, null, 2));
    }
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
  gracefulShutdown('stdin close').catch((err) => {
    logger.error('Shutdown', `Error during stdin close shutdown: ${err.message}`);
    process.exit(1);
  });
});

async function gracefulShutdown(signal: string) {
  logger.info('Shutdown', `Received ${signal} — starting graceful shutdown orchestrator`, { pid: process.pid });
  
  // 1. Stop watchdogs
  try {
    stopMemoryMonitoring();
    stopWatchdog();
  } catch (_) {}

  // 2. Drain active concurrency requests
  try {
    const concurrency = container.resolve<any>('ConcurrencyMiddleware');
    if (concurrency) {
      logger.info('Shutdown', `Draining in-flight requests... Active: ${concurrency.snapshot.active}`);
      let attempts = 0;
      while (concurrency.snapshot.active > 0 && attempts < 20) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      logger.info('Shutdown', `Requests drained. Final active: ${concurrency.snapshot.active}`);
    }
  } catch (_) {}

  // 3. Close Redis
  try {
    const redis = container.resolve<any>('Redis');
    if (redis) {
      logger.info('Shutdown', 'Closing Redis connection...');
      await redis.close();
    }
  } catch (_) {}

  // 4. Close SQLite databases
  try {
    const orch = container.resolve<any>('OrchestrationDB');
    if (orch && typeof orch.close === 'function') {
      logger.info('Shutdown', 'Closing Orchestration SQLite database...');
      orch.close();
    }
  } catch (_) {}

  try {
    const state = container.resolve<any>('SessionState');
    if (state && state.db && typeof state.db.close === 'function') {
      logger.info('Shutdown', 'Closing Session State SQLite database...');
      state.db.close();
    }
  } catch (_) {}

  try {
    const dlq = container.resolve<any>('DeadLetterQueue');
    if (dlq && typeof dlq.close === 'function') {
      logger.info('Shutdown', 'Closing Dead Letter Queue database...');
      dlq.close();
    }
  } catch (_) {}

  // 5. Destroy worker pools
  try {
    const pool = container.resolve<any>('WorkerPool');
    if (pool) {
      logger.info('Shutdown', 'Destroying worker pools...');
      await Promise.all([
        pool.foregroundPool?.destroy(),
        pool.backgroundPool?.destroy()
      ].filter(Boolean));
    }
  } catch (_) {}

  // 6. Close Spokes
  try {
    const spokeManager = container.resolve<any>('SpokeManager');
    if (spokeManager && typeof spokeManager.shutdown === 'function') {
      logger.info('Shutdown', 'Stopping all spoke child processes...');
      spokeManager.shutdown();
    }
  } catch (_) {}

  // 7. Close metrics HTTP server
  try {
    if (metricsServer) {
      logger.info('Shutdown', 'Closing metrics HTTP server...');
      await new Promise<void>((resolve) => {
        metricsServer!.close(() => resolve());
      });
    }
  } catch (_) {}

  logger.info('Shutdown', 'Graceful shutdown completed successfully. Exiting.');
  
  // Give Pino 500ms to flush to disk, then exit cleanly.
  setTimeout(() => process.exit(0), 500);
}

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch((err) => {
    logger.error('Shutdown', `Fatal error during SIGTERM: ${err.message}`);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch((err) => {
    logger.error('Shutdown', `Fatal error during SIGINT: ${err.message}`);
    process.exit(1);
  });
});
