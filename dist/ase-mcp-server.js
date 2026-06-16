"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/logger.js
var require_logger = __commonJS({
  "src/utils/logger.js"(exports2, module2) {
    "use strict";
    var pino = require("pino");
    var path2 = require("path");
    var fs2 = require("fs");
    var LOG_DIR = "/home/thor/.agents/logs";
    var LOG_FILE = path2.join(LOG_DIR, "skills_audit.log");
    try {
      if (!fs2.existsSync(LOG_DIR)) {
        fs2.mkdirSync(LOG_DIR, { recursive: true });
      }
    } catch (err) {
      process.stderr.write(`ASE Logger: Failed to create log directory: ${err.message}
`);
    }
    var pinoLogger = pino({
      level: process.env.ASE_LOG_LEVEL || "info",
      timestamp: pino.stdTimeFunctions.isoTime
    }, pino.destination(LOG_FILE));
    function createLogger(reqId = null) {
      const child = reqId ? pinoLogger.child({ req_id: reqId }) : pinoLogger;
      return {
        debug: (tag, msg, details) => child.debug({ tag, ...details }, msg),
        info: (tag, msg, details) => child.info({ tag, ...details }, msg),
        warn: (tag, msg, details) => child.warn({ tag, ...details }, msg),
        error: (tag, msg, details) => child.error({ tag, ...details }, msg),
        toolResult: (toolName, durationMs, success, details) => {
          const level = success ? "info" : "error";
          child[level]({
            tag: "ToolDispatch",
            duration_ms: durationMs,
            ...details
          }, `${toolName} ${success ? "succeeded" : "failed"} in ${durationMs}ms`);
        },
        logAccess: (agent, skill, status, durationMs, details = {}) => {
          child.info({
            tag: "Access",
            agent,
            duration_ms: durationMs,
            ...details
          }, `${skill} [${status}]`);
        },
        child: (childReqId) => createLogger(childReqId),
        reqId
      };
    }
    var logger3 = createLogger(null);
    function logAccess(agent, skill, status, durationMs, details = {}) {
      logger3.info("Access", `${skill} [${status}]`, { agent, duration_ms: durationMs, ...details });
    }
    function warn(tag, message, details = {}) {
      logger3.warn(tag, message, details);
    }
    module2.exports = {
      logger: logger3,
      createLogger,
      logAccess,
      warn
    };
  }
});

// src/services/registry.js
var require_registry = __commonJS({
  "src/services/registry.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var path2 = require("path");
    var { logger: logger3 } = require_logger();
    var ToolRegistry2 = class {
      constructor() {
        this.tools = /* @__PURE__ */ new Map();
      }
      /**
       * Dynamically loads all tools from the specified directory.
       */
      loadToolsFromDirectory(dirPath, deps2 = {}) {
        if (!fs2.existsSync(dirPath)) {
          throw new Error(`Tool directory not found: ${dirPath}`);
        }
        const files = fs2.readdirSync(dirPath);
        for (const file of files) {
          if (file.endsWith(".js") || file.endsWith(".ts")) {
            let toolModule = require(path2.join(dirPath, file));
            if (toolModule && toolModule.default) {
              toolModule = toolModule.default;
            }
            let tool;
            if (typeof toolModule === "function") {
              try {
                tool = toolModule(deps2);
              } catch (e) {
                tool = new toolModule();
              }
            } else {
              tool = toolModule;
            }
            if (tool && tool.name && (tool.handler || tool.validateAndExecute)) {
              this.register(tool);
            } else {
              logger3.warn("Registry", `Skipping invalid tool file: ${file}`);
            }
          }
        }
      }
      register(tool) {
        const { z } = require("zod");
        if (tool.name !== "register_agent") {
          if (tool.schema && typeof tool.schema.extend === "function") {
            tool.schema = tool.schema.extend({
              agent_token: z.string().describe("Signed agent session token required for all tool calls")
            });
          }
          if (tool.inputSchema) {
            if (!tool.inputSchema.properties) {
              tool.inputSchema.properties = {};
            }
            tool.inputSchema.properties.agent_token = {
              type: "string",
              description: "Signed agent session token required for all tool calls"
            };
            if (!tool.inputSchema.required) {
              tool.inputSchema.required = [];
            }
            if (!tool.inputSchema.required.includes("agent_token")) {
              tool.inputSchema.required.push("agent_token");
            }
          }
        }
        this.tools.set(tool.name, tool);
      }
      get(name) {
        return this.tools.get(name);
      }
      getAll() {
        return Array.from(this.tools.values());
      }
      getSchemas() {
        return this.getAll().map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));
      }
    };
    module2.exports = ToolRegistry2;
  }
});

// src/utils/fs-utils.js
var require_fs_utils = __commonJS({
  "src/utils/fs-utils.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var { warn } = require_logger();
    function getAllowedDirs() {
      const raw = process.env.ASE_ALLOWED_DIRS;
      if (!raw || !raw.trim()) return null;
      return raw.split(":").map((p) => path2.resolve(p.trim())).filter((p) => p.length > 0);
    }
    function assertPathAllowed(filePath) {
      const allowedDirs = getAllowedDirs();
      if (!allowedDirs) return;
      const resolved = path2.resolve(filePath);
      for (const allowed of allowedDirs) {
        if (resolved === allowed || resolved.startsWith(allowed + path2.sep)) {
          return;
        }
      }
      const err = new Error(
        `Security: Path "${resolved}" is outside all ASE_ALLOWED_DIRS. Allowed: [${allowedDirs.join(", ")}]. Add the directory to ASE_ALLOWED_DIRS in your .env to permit access.`
      );
      require_logger().logger.error("FsUtils", err.message);
      throw err;
    }
    async function findMainMd(skillPath) {
      assertPathAllowed(skillPath);
      for (const name of ["SKILL.md", "README.md"]) {
        const p = path2.join(skillPath, name);
        try {
          await fs2.access(p);
          return p;
        } catch (err) {
          if (err.code !== "ENOENT") {
            require_logger().logger.warn("FsUtils", `Access check failed for ${p}: ${err.message}`);
          }
        }
      }
      try {
        const files = await fs2.readdir(skillPath);
        for (const f of files) {
          if (f.endsWith(".md")) return path2.join(skillPath, f);
        }
      } catch (err) {
        warn("fs-utils", `readdir failed for "${skillPath}": ${err.message}`);
      }
      return null;
    }
    function findMainMdSync(skillPath) {
      assertPathAllowed(skillPath);
      const fsSync = require("fs");
      for (const name of ["SKILL.md", "README.md"]) {
        const p = path2.join(skillPath, name);
        if (fsSync.existsSync(p)) return p;
      }
      try {
        const files = fsSync.readdirSync(skillPath);
        for (const f of files) {
          if (f.endsWith(".md")) return path2.join(skillPath, f);
        }
      } catch (err) {
        warn("fs-utils", `readdirSync failed for "${skillPath}": ${err.message}`);
      }
      return null;
    }
    module2.exports = {
      findMainMd,
      findMainMdSync,
      assertPathAllowed,
      getAllowedDirs
    };
  }
});

// src/utils/metrics.js
var require_metrics = __commonJS({
  "src/utils/metrics.js"(exports2, module2) {
    "use strict";
    var counters = /* @__PURE__ */ new Map();
    function inc(name, label = "") {
      const key = label ? `${name}{${label}}` : name;
      counters.set(key, (counters.get(key) || 0) + 1);
    }
    function getCount(name, label = "") {
      const key = label ? `${name}{${label}}` : name;
      return counters.get(key) || 0;
    }
    var histograms = /* @__PURE__ */ new Map();
    var MAX_SAMPLES = 1e3;
    function record(name, valueMs, label = "") {
      const key = label ? `${name}{${label}}` : name;
      if (!histograms.has(key)) histograms.set(key, []);
      const samples = histograms.get(key);
      samples.push(valueMs);
      if (samples.length > MAX_SAMPLES) samples.shift();
    }
    function summarize(name, label = "") {
      const key = label ? `${name}{${label}}` : name;
      const samples = histograms.get(key);
      if (!samples || samples.length === 0) return null;
      const sorted = [...samples].sort((a, b) => a - b);
      const n = sorted.length;
      const p = (pct) => sorted[Math.min(Math.floor(n * pct / 100), n - 1)];
      const avg = sorted.reduce((s, v) => s + v, 0) / n;
      return {
        count: n,
        min: sorted[0],
        max: sorted[n - 1],
        p50: p(50),
        p95: p(95),
        p99: p(99),
        avg: Math.round(avg)
      };
    }
    function snapshot() {
      const counterSnapshot = {};
      for (const [key, val] of counters) counterSnapshot[key] = val;
      const histogramSnapshot = {};
      for (const [key] of histograms) {
        const name = key.includes("{") ? key.split("{")[0] : key;
        const label = key.includes("{") ? key.split("{")[1].replace("}", "") : "";
        histogramSnapshot[key] = summarize(name, label);
      }
      return { counters: counterSnapshot, histograms: histogramSnapshot };
    }
    function increment(name, tags = {}) {
      let label = "";
      if (tags && Object.keys(tags).length > 0) {
        label = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(",");
      }
      inc(name, label);
    }
    function histogram(name, value, tags = {}) {
      let label = "";
      if (tags && Object.keys(tags).length > 0) {
        label = Object.entries(tags).map(([k, v]) => `${k}=${v}`).join(",");
      }
      record(name, value, label);
    }
    module2.exports = { inc, getCount, record, summarize, snapshot, increment, histogram };
  }
});

// src/services/cache.js
var require_cache = __commonJS({
  "src/services/cache.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var { LRUCache } = require("lru-cache");
    var { logAccess, warn } = require_logger();
    var { findMainMd } = require_fs_utils();
    var metrics2 = require_metrics();
    var SKILLS_DIR = path2.resolve(__dirname, "../../../../");
    var SkillCache2 = class {
      constructor() {
        this.cache = new LRUCache({
          max: 50,
          ttl: 1e3 * 60 * 60 * 24
          // 24 hours
        });
      }
      async getSkillContent(skillName) {
        if (this.cache.has(skillName)) {
          const cached = this.cache.get(skillName);
          if (Date.now() - cached.timestamp > 5e3) {
            try {
              const stat = await fs2.stat(cached.path);
              if (stat.mtimeMs === cached.mtimeMs) {
                cached.timestamp = Date.now();
                metrics2.inc("cache_hits");
                return cached;
              }
              metrics2.inc("cache_invalidations");
              this.cache.delete(skillName);
            } catch (err) {
              warn("SkillCache", `mtime check failed for "${skillName}", evicting: ${err.message}`);
              metrics2.inc("cache_invalidations");
              this.cache.delete(skillName);
            }
          } else {
            metrics2.inc("cache_hits");
            return cached;
          }
        } else {
          metrics2.inc("cache_misses");
        }
        const skillPath = path2.join(SKILLS_DIR, skillName);
        try {
          const stat = await fs2.stat(skillPath);
          if (!stat.isDirectory()) return null;
        } catch (err) {
          warn("SkillCache", `Skill directory not accessible for "${skillName}": ${err.message}`);
          return null;
        }
        const mdFile = await findMainMd(skillPath);
        if (!mdFile) return null;
        try {
          const stat = await fs2.stat(mdFile);
          const content = await fs2.readFile(mdFile, "utf8");
          const result = { path: mdFile, content, mtimeMs: stat.mtimeMs, timestamp: Date.now() };
          this.cache.set(skillName, result);
          return result;
        } catch (err) {
          return null;
        }
      }
    };
    module2.exports = SkillCache2;
  }
});

// src/services/worker-pool.js
var require_worker_pool = __commonJS({
  "src/services/worker-pool.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    var os = require("os");
    var Piscina = require("piscina");
    var WorkerPool2 = class {
      constructor() {
        const cores = os.cpus().length;
        const foregroundCount = Math.max(2, cores - 4);
        const workerFile = path2.resolve(__dirname, "worker.js");
        this.foregroundPool = new Piscina({
          filename: workerFile,
          maxThreads: foregroundCount,
          minThreads: 0
        });
        this.backgroundPool = new Piscina({
          filename: workerFile,
          maxThreads: 1,
          minThreads: 1
        });
      }
      async generateEmbeddingForeground(text) {
        const buffer = new SharedArrayBuffer(384 * 4);
        await this.foregroundPool.run({ type: "generateEmbedding", payload: { text, buffer } });
        return Array.from(new Float32Array(buffer));
      }
      async generateEmbeddingBackground(text) {
        const buffer = new SharedArrayBuffer(384 * 4);
        await this.backgroundPool.run({ type: "generateEmbedding", payload: { text, buffer } });
        return Array.from(new Float32Array(buffer));
      }
      get stats() {
        return {
          foreground: {
            utilization: this.foregroundPool.utilization,
            completed: this.foregroundPool.completed
          },
          background: {
            utilization: this.backgroundPool.utilization,
            completed: this.backgroundPool.completed
          }
        };
      }
    };
    module2.exports = WorkerPool2;
  }
});

// src/utils/context-optimizer.js
var require_context_optimizer = __commonJS({
  "src/utils/context-optimizer.js"(exports2, module2) {
    "use strict";
    function parseFrontmatter(content) {
      if (!content || !content.startsWith("---")) return null;
      const endIdx = content.indexOf("---", 3);
      if (endIdx === -1) return null;
      const fm = content.substring(3, endIdx);
      const result = {};
      const nameMatch = fm.match(/^name:\s*["']?(.+?)["']?\s*$/m);
      if (nameMatch) result.name = nameMatch[1].trim();
      const descMatch = fm.match(/^description:\s*["']?(.+?)["']?\s*$/m);
      if (descMatch) {
        result.description = descMatch[1].trim();
      } else {
        const multiMatch = fm.match(/^description:\s*["']?([\s\S]*?)["']?\s*(?=^[a-z]|\n---)/m);
        if (multiMatch) result.description = multiMatch[1].trim().replace(/\n\s*/g, " ");
      }
      const catMatch = fm.match(/^category:\s*["']?(.+?)["']?\s*$/m);
      if (catMatch) result.category = catMatch[1].trim();
      const riskMatch = fm.match(/^risk:\s*["']?(.+?)["']?\s*$/m);
      if (riskMatch) result.risk = riskMatch[1].trim();
      const versionMatch = fm.match(/^version:\s*["']?(.+?)["']?\s*$/m);
      if (versionMatch) result.version = versionMatch[1].trim();
      return result;
    }
    var ContextOptimizer = class {
      /**
       * @param {object} opts
       * @param {number} [opts.alpha=1.2]         — Relevance elasticity (>1 = superlinear reward for relevance)
       * @param {number} [opts.beta=0.8]          — Token elasticity (<1 = diminishing returns on token count)
       * @param {number} [opts.penaltyFactor=0.0001] — Quadratic context-rot penalty coefficient (C)
       * @param {number} [opts.scaling=100]       — Utility scale factor (A)
       */
      constructor({ alpha = 1.2, beta = 0.8, penaltyFactor = 1e-4, scaling = 100 } = {}) {
        this.A = scaling;
        this.alpha = alpha;
        this.beta = beta;
        this.C = penaltyFactor;
      }
      /**
       * Marginal utility of adding one more item at a given token accumulation point.
       *
       * Formula: A*(R^α)*(T^β) − [(C*(totalBefore+T)²) − (C*totalBefore²)]
       *
       * @param {number} relevance        — Item relevance score (0.0–1.0)
       * @param {number} tokens           — Token cost of this item
       * @param {number} totalTokensBefore — Tokens accumulated before this item
       * @returns {number} Marginal utility (negative = harmful to include)
       */
      calculateUtility(relevance, tokens, totalTokensBefore) {
        if (relevance <= 0 || tokens <= 0) return 0;
        const rawUtility = this.A * Math.pow(relevance, this.alpha) * Math.pow(tokens, this.beta);
        const penaltyBefore = this.C * Math.pow(totalTokensBefore, 2);
        const penaltyAfter = this.C * Math.pow(totalTokensBefore + tokens, 2);
        const marginalPenalty = penaltyAfter - penaltyBefore;
        return rawUtility - marginalPenalty;
      }
      /**
       * Selects the optimal subset of items by cutting off where marginal utility < 0.
       *
       * @param {Array<{score: number, tokenEstimate: number}>} items
       * @returns {{ optimized: Array, totalTokens: number, savedTokens: number }}
       */
      optimize(items) {
        const sorted = [...items].sort((a, b) => (b.score || 0) - (a.score || 0));
        const optimized = [];
        let totalTokens = 0;
        let savedTokens = 0;
        let cutoffReached = false;
        for (const item of sorted) {
          const relevance = item.score || 0.1;
          const tokens = item.tokenEstimate || 500;
          if (cutoffReached) {
            savedTokens += tokens;
            continue;
          }
          const marginalUtility = this.calculateUtility(relevance, tokens, totalTokens);
          if (marginalUtility < 0) {
            cutoffReached = true;
            savedTokens += tokens;
            continue;
          }
          optimized.push(item);
          totalTokens += tokens;
        }
        return { optimized, totalTokens, savedTokens };
      }
    };
    module2.exports = { parseFrontmatter, ContextOptimizer };
  }
});

// src/utils/retry.js
var require_retry = __commonJS({
  "src/utils/retry.js"(exports2, module2) {
    "use strict";
    var { logger: logger3 } = require_logger();
    async function withRetry(fn, { attempts = 3, baseMs = 200, maxMs = 5e3, tag = "retry" } = {}) {
      let lastErr;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          if (attempt === attempts) break;
          const delay = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
          logger3.warn("Retry", `[${tag}] Attempt ${attempt}/${attempts} failed: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      throw lastErr;
    }
    module2.exports = { withRetry };
  }
});

// src/services/circuit-breaker.js
var require_circuit_breaker = __commonJS({
  "src/services/circuit-breaker.js"(exports2, module2) {
    "use strict";
    var { warn } = require_logger();
    var metrics2 = require_metrics();
    var CircuitBreaker = class {
      /**
       * @param {object} opts
       * @param {number} [opts.failureThreshold=3]  — Consecutive failures before opening
       * @param {number} [opts.recoveryMs=60000]    — Milliseconds before attempting HALF_OPEN
       * @param {string} [opts.serviceName='unknown'] — Label used in logs and metrics
       */
      constructor({ failureThreshold = 3, recoveryMs = 6e4, serviceName = "unknown" } = {}) {
        this.failureThreshold = failureThreshold;
        this.recoveryMs = recoveryMs;
        this.serviceName = serviceName;
        this.failureCount = 0;
        this.state = "CLOSED";
        this.openedAt = null;
      }
      /** Current breaker status (safe for health snapshots) */
      get status() {
        return {
          state: this.state,
          failureCount: this.failureCount,
          openedAt: this.openedAt ? new Date(this.openedAt).toISOString() : null,
          serviceName: this.serviceName
        };
      }
      /**
       * Call an async function through the breaker.
       * @param {() => Promise<any>} fn — The function to protect
       * @returns {Promise<any>}
       * @throws {Error} If the breaker is OPEN and recovery period hasn't elapsed
       */
      async call(fn) {
        if (this.state === "OPEN") {
          if (Date.now() - this.openedAt >= this.recoveryMs) {
            this.state = "HALF_OPEN";
            metrics2.increment("circuit_breaker.to_half_open", { service: this.serviceName });
          } else {
            metrics2.increment("circuit_breaker.rejected", { service: this.serviceName });
            throw new Error(`CircuitBreaker OPEN \u2014 ${this.serviceName} unavailable (retry after ${Math.ceil((this.recoveryMs - (Date.now() - this.openedAt)) / 1e3)}s)`);
          }
        }
        try {
          const result = await fn();
          this._onSuccess();
          return result;
        } catch (err) {
          this._onFailure(err);
          throw err;
        }
      }
      _onSuccess() {
        const wasNonClosed = this.state !== "CLOSED";
        this.failureCount = 0;
        this.state = "CLOSED";
        this.openedAt = null;
        if (wasNonClosed) {
          metrics2.increment("circuit_breaker.to_closed", { service: this.serviceName });
        }
      }
      _onFailure(err) {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold && this.state !== "OPEN") {
          this.state = "OPEN";
          this.openedAt = Date.now();
          metrics2.increment("circuit_breaker.to_open", { service: this.serviceName });
          warn(
            "CircuitBreaker",
            `[${this.serviceName}] Circuit OPENED after ${this.failureCount} failures. Will retry in ${this.recoveryMs / 1e3}s. Error: ${err.message}`
          );
        }
      }
    };
    module2.exports = CircuitBreaker;
  }
});

// src/services/embedding-service.js
var require_embedding_service = __commonJS({
  "src/services/embedding-service.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var crypto4 = require("crypto");
    var Database = require("better-sqlite3");
    var hnswlib = require("hnswlib-node");
    var chokidar = require("chokidar");
    var { LRUCache } = require("lru-cache");
    var { parseFrontmatter, ContextOptimizer } = require_context_optimizer();
    var { findMainMd } = require_fs_utils();
    var { withRetry } = require_retry();
    var { warn, logger: logger3 } = require_logger();
    var metrics2 = require_metrics();
    var CircuitBreaker = require_circuit_breaker();
    var SKILLS_DIR = path2.resolve(__dirname, "../../../../");
    var DB_PATH = path2.join(__dirname, "skills.db");
    var EMBEDDING_DIMENSIONS = 384;
    var EmbeddingService2 = class {
      constructor(workerPool2) {
        this.workerPool = workerPool2;
        this.db = new Database(DB_PATH);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("mmap_size = 300000000");
        this.db.pragma("temp_store = MEMORY");
        this._lastSyncAt = null;
        this._breaker = new CircuitBreaker({ failureThreshold: 3, recoveryMs: 6e4, serviceName: "embedding" });
        this._queryCache = new LRUCache({ max: 200, ttl: 1e3 * 60 * 5 });
        this._hnsw = null;
        this._idToName = /* @__PURE__ */ new Map();
        this._nameToId = /* @__PURE__ */ new Map();
        this._skillData = /* @__PURE__ */ new Map();
        this._nextId = 0;
        this.optimizer = new ContextOptimizer();
        this._initDb();
        this._startWatcher();
      }
      _initDb() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        name TEXT PRIMARY KEY,
        description TEXT,
        embedding BLOB,
        tokenEstimate INTEGER,
        hash TEXT
      )
    `);
        this._rebuildHnswIndex();
      }
      _rebuildHnswIndex() {
        const rows = this.db.prepare("SELECT name, description, embedding, tokenEstimate FROM skills").all();
        this._idToName.clear();
        this._nameToId.clear();
        this._skillData.clear();
        this._nextId = 0;
        const maxElements = Math.max(rows.length + 1e3, 2e3);
        this._hnsw = new hnswlib.HierarchicalNSW("cosine", EMBEDDING_DIMENSIONS);
        this._hnsw.initIndex(maxElements);
        for (const row of rows) {
          const id = this._nextId++;
          this._idToName.set(id, row.name);
          this._nameToId.set(row.name, id);
          this._skillData.set(row.name, {
            description: row.description,
            tokenEstimate: row.tokenEstimate
          });
          const embBuffer = row.embedding;
          const embArray = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, embBuffer.byteLength / 4);
          this._hnsw.addPoint(Array.from(embArray), id);
        }
      }
      _addOrUpdateHnsw(name, embeddingArray, description, tokenEstimate) {
        let id = this._nameToId.get(name);
        if (id === void 0) {
          id = this._nextId++;
          this._idToName.set(id, name);
          this._nameToId.set(name, id);
        }
        const currentMax = this._hnsw.getMaxElements();
        if (this._nextId >= currentMax) {
          this._hnsw.resizeIndex(currentMax + 1e3);
        }
        this._hnsw.addPoint(Array.from(embeddingArray), id);
        this._skillData.set(name, { description, tokenEstimate });
        this._queryCache.clear();
      }
      _computeHash(content) {
        return crypto4.createHash("md5").update(content).digest("hex");
      }
      _startWatcher() {
        const watcher = chokidar.watch(SKILLS_DIR, {
          ignored: [
            /(^|[\/\\])\../,
            // ignore dotfiles
            "**/tools/**",
            // ignore server tools
            "**/docs/**",
            // ignore docs
            "**/node_modules/**"
            // ignore node_modules
          ],
          persistent: true,
          ignoreInitial: true,
          depth: 2
        });
        watcher.on("all", async (event, filePath) => {
          if (!filePath.endsWith(".md")) return;
          const relative = path2.relative(SKILLS_DIR, filePath);
          const parts = relative.split(path2.sep);
          if (parts.length >= 2) {
            const skillName = parts[0];
            if (event === "unlink") {
              try {
                this.db.prepare("DELETE FROM skills WHERE name = ?").run(skillName);
                this._rebuildHnswIndex();
                this._queryCache.clear();
                logger3.info("EmbeddingService", `Removed skill from database and index: ${skillName}`);
              } catch (err) {
                warn("EmbeddingService", `Failed to delete skill ${skillName} on unlink: ${err.message}`);
              }
            } else {
              logger3.info("EmbeddingService", `Skill file change detected: ${relative}. Hot-reloading...`);
              await this.hotReloadSkill(skillName);
            }
          }
        });
      }
      async hotReloadSkill(skillName) {
        const skillPath = path2.join(SKILLS_DIR, skillName);
        let mdFile;
        try {
          mdFile = await findMainMd(skillPath);
        } catch (err) {
          warn("EmbeddingService", `findMainMd failed for "${skillName}" during hot-reload: ${err.message}`);
          return;
        }
        if (!mdFile) return;
        try {
          const content = await fs2.readFile(mdFile, "utf8");
          const hash = this._computeHash(content);
          const existing = this.db.prepare("SELECT hash FROM skills WHERE name = ?").get(skillName);
          if (existing && existing.hash === hash) return;
          const fm = parseFrontmatter(content);
          const desc = fm && fm.description ? fm.description : "";
          const tokenEstimate = Math.ceil(content.length / 4);
          const textToEmbed = desc || content.substring(0, 800);
          const embeddingArray = await withRetry(
            () => this._breaker.call(() => this.workerPool.generateEmbeddingBackground(textToEmbed)),
            { attempts: 3, baseMs: 300, tag: `Embeddings/${skillName}` }
          );
          const embeddingBlob = Buffer.from(new Float32Array(embeddingArray).buffer);
          this._addOrUpdateHnsw(skillName, embeddingArray, desc, tokenEstimate);
          this.db.prepare(`
        INSERT INTO skills (name, description, embedding, tokenEstimate, hash)
        VALUES (@name, @desc, @emb, @tokens, @hash)
        ON CONFLICT(name) DO UPDATE SET
          description = excluded.description,
          embedding = excluded.embedding,
          tokenEstimate = excluded.tokenEstimate,
          hash = excluded.hash
      `).run({ name: skillName, desc, emb: embeddingBlob, tokens: tokenEstimate, hash });
          logger3.info("EmbeddingService", `Hot-reloaded skill: ${skillName}`);
        } catch (err) {
          warn("EmbeddingService", `Failed to hot-reload skill ${skillName}: ${err.message}`);
        }
      }
      get healthSnapshot() {
        const count = this.db.prepare("SELECT COUNT(*) as c FROM skills").get();
        return {
          embedding_circuit: this._breaker.status,
          skills_indexed: count ? count.c : 0,
          last_sync: this._lastSyncAt
        };
      }
      async syncSkillsBackground() {
        let files;
        try {
          files = await fs2.readdir(SKILLS_DIR);
        } catch (err) {
          warn("EmbeddingService", `Cannot read SKILLS_DIR: ${err.message}`, { path: SKILLS_DIR });
          return;
        }
        const tasks = [];
        for (const entry of files) {
          if (entry.startsWith(".") || entry === "tools" || entry === "docs") continue;
          let stat;
          try {
            stat = await fs2.stat(path2.join(SKILLS_DIR, entry));
          } catch (err) {
            warn("EmbeddingService", `stat failed for entry "${entry}": ${err.message}`);
            continue;
          }
          if (!stat.isDirectory()) continue;
          tasks.push({ entry, skillPath: path2.join(SKILLS_DIR, entry) });
        }
        const CONCURRENCY_LIMIT = 5;
        const stmt = this.db.prepare(`
      INSERT INTO skills (name, description, embedding, tokenEstimate, hash)
      VALUES (@name, @desc, @emb, @tokens, @hash)
      ON CONFLICT(name) DO UPDATE SET
        description = excluded.description,
        embedding = excluded.embedding,
        tokenEstimate = excluded.tokenEstimate,
        hash = excluded.hash
    `);
        const insertMany = this.db.transaction((updates) => {
          for (const u of updates) stmt.run(u);
        });
        for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
          const chunk = tasks.slice(i, i + CONCURRENCY_LIMIT);
          const updatesToExecute = [];
          await Promise.all(chunk.map(async ({ entry, skillPath }) => {
            let mdFile;
            try {
              mdFile = await findMainMd(skillPath);
            } catch (err) {
              warn("EmbeddingService", `findMainMd failed for "${entry}": ${err.message}`);
              return;
            }
            if (!mdFile) return;
            let content;
            try {
              content = await fs2.readFile(mdFile, "utf8");
            } catch (err) {
              warn("EmbeddingService", `readFile failed for "${mdFile}": ${err.message}`);
              return;
            }
            const hash = this._computeHash(content);
            const existing = this.db.prepare("SELECT hash FROM skills WHERE name = ?").get(entry);
            if (existing && existing.hash === hash) return;
            const fm = parseFrontmatter(content);
            const desc = fm && fm.description ? fm.description : "";
            const tokenEstimate = Math.ceil(content.length / 4);
            const textToEmbed = desc || content.substring(0, 800);
            let embeddingArray;
            try {
              embeddingArray = await withRetry(
                () => this._breaker.call(() => this.workerPool.generateEmbeddingBackground(textToEmbed)),
                { attempts: 3, baseMs: 300, tag: `Embeddings/${entry}` }
              );
            } catch (err) {
              warn("EmbeddingService", `Embedding generation failed for "${entry}" after retries: ${err.message}`);
              return;
            }
            const embeddingBlob = Buffer.from(new Float32Array(embeddingArray).buffer);
            this._addOrUpdateHnsw(entry, embeddingArray, desc, tokenEstimate);
            updatesToExecute.push({ name: entry, desc, emb: embeddingBlob, tokens: tokenEstimate, hash });
          }));
          if (updatesToExecute.length > 0) {
            insertMany(updatesToExecute);
            for (const u of updatesToExecute) {
              logger3.info("EmbeddingService", `Updated: ${u.name}`);
            }
          }
        }
        try {
          this.db.pragma("wal_checkpoint(TRUNCATE)");
        } catch (err) {
          warn("EmbeddingService", `WAL checkpoint failed: ${err.message}`);
        }
        this._lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
        logger3.info("EmbeddingService", "Sync complete.");
      }
      async search(query, limit = 15, reqLogger = null) {
        const log = reqLogger || logger3;
        const startMs = Date.now();
        metrics2.inc("embedding_searches");
        const cacheKey = query.trim().toLowerCase() + "|" + limit;
        const cachedResult = this._queryCache.get(cacheKey);
        if (cachedResult) {
          metrics2.inc("skill_cache_hits");
          log.info("EmbeddingService", `Search served from cache in ${Date.now() - startMs}ms`, { limit });
          return cachedResult;
        }
        metrics2.inc("skill_cache_misses");
        let queryEmbedding;
        try {
          queryEmbedding = await withRetry(
            () => this._breaker.call(() => this.workerPool.generateEmbeddingForeground(query)),
            { attempts: 2, baseMs: 200, tag: "Embeddings/search" }
          );
        } catch (err) {
          log.error("EmbeddingService", `Search unavailable: ${err.message}`);
          throw new Error(`Embedding search unavailable: ${err.message}`);
        }
        if (this._nextId === 0) {
          return [];
        }
        const searchLimit = Math.min(limit, this._nextId);
        const result = this._hnsw.searchKnn(Array.from(queryEmbedding), searchLimit);
        const scored = [];
        for (let i = 0; i < result.neighbors.length; i++) {
          const id = result.neighbors[i];
          const distance = result.distances[i];
          const name = this._idToName.get(id);
          const data = this._skillData.get(name);
          scored.push({
            name,
            score: 1 - distance,
            // Convert cosine distance to similarity
            tokenEstimate: data.tokenEstimate,
            description: data.description
          });
        }
        const { optimized, totalTokens, savedTokens } = this.optimizer.optimize(scored);
        metrics2.histogram("context.tokens_saved", savedTokens, { source: "skills" });
        metrics2.histogram("context.total_tokens", totalTokens, { source: "skills" });
        this._queryCache.set(cacheKey, optimized);
        metrics2.record("embedding_search_duration_ms", Date.now() - startMs);
        log.info("EmbeddingService", `Search completed in ${Date.now() - startMs}ms. Optimized from ${scored.length} to ${optimized.length} items (saved ${savedTokens} tokens).`, { limit });
        return optimized;
      }
    };
    module2.exports = EmbeddingService2;
  }
});

// src/services/session-state.js
var require_session_state = __commonJS({
  "src/services/session-state.js"(exports2, module2) {
    "use strict";
    var Database = require("better-sqlite3");
    var fs2 = require("fs");
    var path2 = require("path");
    var { logger: logger3 } = require_logger();
    var DB_PATH = process.env.ASE_STATE_DB || path2.join(__dirname, "session_state.db");
    var ARCHIVE_FILE = (process.env.ASE_STATE_FILE || path2.join(process.cwd(), "skills_session_state.json")).replace(/\.json$/, ".archive.json");
    var MAX_SESSIONS = 20;
    var SessionState2 = class {
      constructor(sessionId) {
        this.sessionId = sessionId;
        this.db = new Database(DB_PATH);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this._initDb();
        const sessionExists = this.db.prepare("SELECT 1 FROM sessions WHERE session_id = ?").get(this.sessionId);
        if (!sessionExists) {
          this.db.prepare("INSERT INTO sessions (session_id, started_at) VALUES (?, ?)").run(this.sessionId, (/* @__PURE__ */ new Date()).toISOString());
          this._rotateSessions();
        }
      }
      _initDb() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_skills (
        session_id TEXT,
        skill_name TEXT,
        loaded_at TEXT NOT NULL,
        PRIMARY KEY (session_id, skill_name),
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS session_steps (
        session_id TEXT,
        skill_name TEXT,
        step_id TEXT,
        status TEXT NOT NULL,
        PRIMARY KEY (session_id, skill_name, step_id),
        FOREIGN KEY (session_id, skill_name) REFERENCES session_skills (session_id, skill_name) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS session_step_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        skill_name TEXT,
        step_id TEXT,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        context TEXT,
        FOREIGN KEY (session_id, skill_name, step_id) REFERENCES session_steps (session_id, skill_name, step_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pruned_skills (
        session_id TEXT,
        skill_name TEXT,
        pruned_at TEXT NOT NULL,
        PRIMARY KEY (session_id, skill_name),
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tool_call_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tool_name TEXT NOT NULL,
        duration_ms INTEGER,
        is_error INTEGER DEFAULT 0,
        called_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS skill_versions (
        skill_name TEXT,
        version TEXT,
        content TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        PRIMARY KEY (skill_name, version)
      );
    `);
        try {
          this.db.exec("ALTER TABLE session_skills ADD COLUMN pinned_version TEXT");
        } catch (e) {
        }
      }
      getPinnedSkill(skillName) {
        try {
          const row = this.db.prepare("SELECT pinned_version FROM session_skills WHERE session_id = ? AND skill_name = ?").get(this.sessionId, skillName);
          if (!row || !row.pinned_version) {
            return null;
          }
          const version = row.pinned_version;
          const verRow = this.db.prepare("SELECT content FROM skill_versions WHERE skill_name = ? AND version = ?").get(skillName, version);
          if (verRow) {
            return { version, content: verRow.content };
          }
          return { version, content: null };
        } catch (err) {
          logger3.error("SessionState", `Failed to get pinned skill ${skillName}: ${err.message}`);
          return null;
        }
      }
      pinSkill(skillName, version, content) {
        try {
          const tx = this.db.transaction(() => {
            this.db.prepare(`
          INSERT INTO session_skills (session_id, skill_name, loaded_at, pinned_version)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(session_id, skill_name) DO UPDATE SET pinned_version = excluded.pinned_version
        `).run(this.sessionId, skillName, (/* @__PURE__ */ new Date()).toISOString(), version);
            this.db.prepare(`
          INSERT OR IGNORE INTO skill_versions (skill_name, version, content, saved_at)
          VALUES (?, ?, ?, ?)
        `).run(skillName, version, content, (/* @__PURE__ */ new Date()).toISOString());
          });
          tx();
          logger3.info("SessionState", `Pinned skill ${skillName} to version ${version}`);
        } catch (err) {
          logger3.error("SessionState", `Failed to pin skill ${skillName} to ${version}: ${err.message}`);
        }
      }
      _rotateSessions() {
        try {
          const allSessions = this.db.prepare("SELECT session_id, started_at FROM sessions ORDER BY started_at ASC").all();
          if (allSessions.length > MAX_SESSIONS) {
            const overflowCount = allSessions.length - MAX_SESSIONS;
            const toArchive = allSessions.slice(0, overflowCount);
            let archive = {};
            if (fs2.existsSync(ARCHIVE_FILE)) {
              try {
                archive = JSON.parse(fs2.readFileSync(ARCHIVE_FILE, "utf8"));
              } catch (archErr) {
                logger3.warn("SessionState", `Failed to read archive file: ${archErr.message}`);
              }
            }
            for (const session of toArchive) {
              const sessionObj = {
                startedAt: session.started_at,
                skills: {}
              };
              const skills = this.db.prepare("SELECT skill_name, loaded_at FROM session_skills WHERE session_id = ?").all(session.session_id);
              for (const skill of skills) {
                const stepsObj = {};
                const steps = this.db.prepare("SELECT step_id, status FROM session_steps WHERE session_id = ? AND skill_name = ?").all(session.session_id, skill.skill_name);
                for (const step of steps) {
                  const history = this.db.prepare("SELECT status, timestamp, context FROM session_step_history WHERE session_id = ? AND skill_name = ? AND step_id = ? ORDER BY timestamp ASC").all(session.session_id, skill.skill_name, step.step_id);
                  stepsObj[step.step_id] = {
                    status: step.status,
                    history: history.map((h) => ({
                      status: h.status,
                      timestamp: h.timestamp,
                      context: h.context || ""
                    }))
                  };
                }
                sessionObj.skills[skill.skill_name] = {
                  loadedAt: skill.loaded_at,
                  steps: stepsObj
                };
              }
              archive[session.session_id] = sessionObj;
            }
            fs2.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), "utf8");
            logger3.info("SessionState", `Archived ${toArchive.length} old session(s) to ${ARCHIVE_FILE}`);
            const deleteTx = this.db.transaction((sessionsToDelete) => {
              for (const s of sessionsToDelete) {
                this.db.prepare("DELETE FROM session_step_history WHERE session_id = ?").run(s.session_id);
                this.db.prepare("DELETE FROM session_steps WHERE session_id = ?").run(s.session_id);
                this.db.prepare("DELETE FROM session_skills WHERE session_id = ?").run(s.session_id);
                this.db.prepare("DELETE FROM pruned_skills WHERE session_id = ?").run(s.session_id);
                this.db.prepare("DELETE FROM sessions WHERE session_id = ?").run(s.session_id);
              }
            });
            deleteTx(toArchive);
          }
        } catch (err) {
          logger3.error("SessionState", `Failed during session rotation: ${err.message}`);
        }
      }
      /**
       * Initialize a skill in the current session.
       * @param {string} skillName 
       * @param {string[]} stepIds 
       */
      initSkill(skillName, stepIds = []) {
        try {
          const skillExists = this.db.prepare("SELECT 1 FROM session_skills WHERE session_id = ? AND skill_name = ?").get(this.sessionId, skillName);
          if (!skillExists) {
            const tx = this.db.transaction(() => {
              this.db.prepare("INSERT INTO session_skills (session_id, skill_name, loaded_at) VALUES (?, ?, ?)").run(this.sessionId, skillName, (/* @__PURE__ */ new Date()).toISOString());
              for (const stepId of stepIds) {
                this.db.prepare("INSERT INTO session_steps (session_id, skill_name, step_id, status) VALUES (?, ?, ?, ?)").run(this.sessionId, skillName, stepId, "pending");
              }
            });
            tx();
            logger3.info("SessionState", `Initialized telemetry for skill: ${skillName} (${stepIds.length} steps)`);
          }
        } catch (err) {
          logger3.error("SessionState", `Failed to initialize skill ${skillName}: ${err.message}`);
        }
      }
      /**
       * Log a step transition.
       * @param {string} skillName 
       * @param {string} stepId 
       * @param {string} status - started, completed, skipped, blocked, failed
       * @param {string} context - optional context/reason
       */
      logStep(skillName, stepId, status, context = "") {
        try {
          const skillExists = this.db.prepare("SELECT 1 FROM session_skills WHERE session_id = ? AND skill_name = ?").get(this.sessionId, skillName);
          if (!skillExists) {
            throw new Error(`Skill ${skillName} has not been loaded in this session.`);
          }
          const tx = this.db.transaction(() => {
            this.db.prepare(`
          INSERT INTO session_steps (session_id, skill_name, step_id, status)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(session_id, skill_name, step_id) DO UPDATE SET status = excluded.status
        `).run(this.sessionId, skillName, stepId, status);
            this.db.prepare(`
          INSERT INTO session_step_history (session_id, skill_name, step_id, status, timestamp, context)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(this.sessionId, skillName, stepId, status, (/* @__PURE__ */ new Date()).toISOString(), context);
          });
          tx();
          logger3.info("SessionState", `Logged step ${stepId} as ${status} [${skillName}]`);
        } catch (err) {
          logger3.error("SessionState", `Failed to log step ${stepId}: ${err.message}`);
          throw err;
        }
      }
      /**
       * Prune a skill in this session.
       * @param {string} skillName 
       */
      pruneSkill(skillName) {
        try {
          this.db.prepare(`
        INSERT OR IGNORE INTO pruned_skills (session_id, skill_name, pruned_at)
        VALUES (?, ?, ?)
      `).run(this.sessionId, skillName, (/* @__PURE__ */ new Date()).toISOString());
          logger3.info("SessionState", `Pruned skill: ${skillName}`);
        } catch (err) {
          logger3.error("SessionState", `Failed to prune skill ${skillName}: ${err.message}`);
        }
      }
      /**
       * Check if a skill is pruned in this session.
       * @param {string} skillName 
       */
      isPruned(skillName) {
        try {
          const row = this.db.prepare("SELECT 1 FROM pruned_skills WHERE session_id = ? AND skill_name = ?").get(this.sessionId, skillName);
          return !!row;
        } catch (err) {
          logger3.error("SessionState", `Failed to check pruned status for ${skillName}: ${err.message}`);
          return false;
        }
      }
      /**
       * Log a tool call.
       */
      logToolCall(toolName, durationMs, isError) {
        try {
          this.db.prepare("INSERT INTO tool_call_log (tool_name, duration_ms, is_error) VALUES (?, ?, ?)").run(toolName, durationMs, isError ? 1 : 0);
        } catch (err) {
          logger3.error("SessionState", `Failed to log tool call: ${err.message}`);
        }
      }
      /**
       * Get a report of the current session's skill progression.
       */
      getReport() {
        try {
          const session = this.db.prepare("SELECT started_at FROM sessions WHERE session_id = ?").get(this.sessionId);
          if (!session) return { sessionId: this.sessionId, skills: {} };
          const activeSkills = this.db.prepare("SELECT skill_name, loaded_at FROM session_skills WHERE session_id = ?").all(this.sessionId);
          const report = {
            sessionId: this.sessionId,
            uptime_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1e3),
            active_skills: activeSkills.map((s) => s.skill_name),
            skills: {}
          };
          for (const skill of activeSkills) {
            const steps = this.db.prepare("SELECT step_id, status FROM session_steps WHERE session_id = ? AND skill_name = ?").all(this.sessionId, skill.skill_name);
            let completed = 0;
            let skipped = 0;
            let failed = 0;
            let pending = 0;
            let blocked = 0;
            const stepDetails = {};
            for (const step of steps) {
              if (step.status === "completed") completed++;
              else if (step.status === "skipped") skipped++;
              else if (step.status === "failed") failed++;
              else if (step.status === "blocked") blocked++;
              else pending++;
              const history = this.db.prepare("SELECT status, timestamp FROM session_step_history WHERE session_id = ? AND skill_name = ? AND step_id = ? ORDER BY timestamp ASC").all(this.sessionId, skill.skill_name, step.step_id);
              let timeSpentMs = 0;
              let startedTime = null;
              for (const evt of history) {
                if (evt.status === "started") {
                  startedTime = new Date(evt.timestamp).getTime();
                } else if (startedTime && ["completed", "skipped", "failed", "blocked"].includes(evt.status)) {
                  timeSpentMs += new Date(evt.timestamp).getTime() - startedTime;
                  startedTime = null;
                }
              }
              stepDetails[step.step_id] = {
                current_status: step.status,
                time_spent_seconds: Math.round(timeSpentMs / 1e3),
                transitions: history.length
              };
            }
            report.skills[skill.skill_name] = {
              summary: {
                total_steps: steps.length,
                completed,
                skipped,
                failed,
                blocked,
                pending
              },
              steps: stepDetails
            };
          }
          return report;
        } catch (err) {
          logger3.error("SessionState", `Failed to generate session report: ${err.message}`);
          return { sessionId: this.sessionId, error: err.message };
        }
      }
    };
    module2.exports = SessionState2;
  }
});

// src/services/knowledge-graph-service.js
var require_knowledge_graph_service = __commonJS({
  "src/services/knowledge-graph-service.js"(exports2, module2) {
    "use strict";
    var neo4j = require("neo4j-driver");
    var { logger: logger3 } = require_logger();
    var CircuitBreaker = require_circuit_breaker();
    function assertSecureCredentials() {
      const password = process.env.NEO4J_PASSWORD;
      const env = process.env.NODE_ENV || "production";
      if (env !== "development" && (!password || password === "password" || password === "change_me_in_production")) {
        const msg = [
          "",
          "\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557",
          "\u2551  \u{1F6A8}  ASE SECURITY GUARD \u2014 STARTUP REFUSED                       \u2551",
          "\u2551                                                                  \u2551",
          "\u2551  NEO4J_PASSWORD is set to a default/insecure value in a         \u2551",
          "\u2551  non-development environment. This is a critical security risk.  \u2551",
          "\u2551                                                                  \u2551",
          "\u2551  ACTION REQUIRED:                                                \u2551",
          "\u2551    1. Set a strong password in your .env file:                  \u2551",
          "\u2551       NEO4J_PASSWORD=<your-secure-password>                     \u2551",
          "\u2551    2. Or set NODE_ENV=development to suppress this guard.       \u2551",
          "\u2551                                                                  \u2551",
          "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D",
          ""
        ].join("\n");
        process.stderr.write(msg + "\n");
        throw new Error("ASE Security Guard: Insecure Neo4j credentials detected in production.");
      }
      if (!password) {
        logger3.warn("KnowledgeGraphService", "NEO4J_PASSWORD is not set \u2014 Neo4j connection will likely fail.");
      }
    }
    assertSecureCredentials();
    var KnowledgeGraphService2 = class {
      constructor() {
        const uri = process.env.NEO4J_URI || "neo4j://127.0.0.1:7687";
        const user = process.env.NEO4J_USER || "neo4j";
        const password = process.env.NEO4J_PASSWORD || "";
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        this._breaker = new CircuitBreaker({
          failureThreshold: 3,
          recoveryMs: 6e4,
          serviceName: "neo4j"
        });
        logger3.info("KnowledgeGraphService", `Initialized Neo4j driver \u2014 URI: ${uri}, User: ${user}`);
      }
      async close() {
        await this.driver.close();
      }
      /**
       * Execute a read Cypher query through the circuit breaker.
       * @param {string} query
       * @param {object} [params={}]
       * @returns {Promise<object[]>}
       */
      async executeCypher(query, params = {}) {
        return this._breaker.call(async () => {
          const session = this.driver.session();
          try {
            const result = await session.run(query, params);
            return result.records.map((record) => {
              const obj = {};
              record.keys.forEach((key) => {
                const val = record.get(key);
                obj[key] = neo4j.isInt(val) ? val.toNumber() : val;
              });
              return obj;
            });
          } catch (err) {
            logger3.error("KnowledgeGraph", `Cypher Execution Failed: ${err.message}`, { query, params });
            throw err;
          } finally {
            await session.close();
          }
        });
      }
      /**
       * Execute a write Cypher transaction through the circuit breaker.
       * @param {string} query
       * @param {object} [params={}]
       * @returns {Promise<object>}
       */
      async writeTransaction(query, params = {}) {
        return this._breaker.call(async () => {
          const session = this.driver.session();
          try {
            const result = await session.executeWrite((tx) => tx.run(query, params));
            return result;
          } catch (err) {
            logger3.error("KnowledgeGraph", `Cypher Write Failed: ${err.message}`, { query, params });
            throw err;
          } finally {
            await session.close();
          }
        });
      }
      async initializeSchema() {
        try {
          await this.executeCypher(`CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE`);
          await this.executeCypher(`CREATE CONSTRAINT symbol_id IF NOT EXISTS FOR (s:Symbol) REQUIRE s.id IS UNIQUE`);
          logger3.info("KnowledgeGraph", "Neo4j schema initialized successfully.");
        } catch (err) {
          logger3.warn("KnowledgeGraph", `Schema initialization failed (Neo4j might not be running): ${err.message}`);
        }
      }
      /** Circuit breaker status snapshot for health reporting */
      get circuitStatus() {
        return this._breaker.status;
      }
    };
    module2.exports = KnowledgeGraphService2;
  }
});

// src/services/ast-indexer.js
var require_ast_indexer = __commonJS({
  "src/services/ast-indexer.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var parser = require("@babel/parser");
    var traverse = require("@babel/traverse").default;
    var { logger: logger3 } = require_logger();
    var ASTIndexer2 = class {
      constructor(kgService) {
        this.kg = kgService;
      }
      async indexFile(filePath, content) {
        let ast;
        try {
          ast = parser.parse(content, {
            sourceType: "module",
            plugins: ["typescript", "jsx"]
          });
        } catch (err) {
          logger3.warn("ASTIndexer", `Failed to parse ${filePath}: ${err.message}`);
          return;
        }
        await this.kg.writeTransaction(
          `MERGE (f:File {path: $path})`,
          { path: filePath }
        );
        const symbols = [];
        const calls = [];
        const imports = [];
        traverse(ast, {
          FunctionDeclaration(pathObj) {
            if (pathObj.node.id) {
              symbols.push({
                id: `${filePath}::${pathObj.node.id.name}`,
                name: pathObj.node.id.name,
                type: "Function",
                line: pathObj.node.loc?.start?.line || 0
              });
            }
          },
          VariableDeclarator(pathObj) {
            if (pathObj.node.id && pathObj.node.id.type === "Identifier") {
              let type = "Variable";
              if (pathObj.node.init && (pathObj.node.init.type === "ArrowFunctionExpression" || pathObj.node.init.type === "FunctionExpression")) {
                type = "Function";
              }
              symbols.push({
                id: `${filePath}::${pathObj.node.id.name}`,
                name: pathObj.node.id.name,
                type,
                line: pathObj.node.loc?.start?.line || 0
              });
            }
          },
          ClassDeclaration(pathObj) {
            if (pathObj.node.id) {
              symbols.push({
                id: `${filePath}::${pathObj.node.id.name}`,
                name: pathObj.node.id.name,
                type: "Class",
                line: pathObj.node.loc?.start?.line || 0
              });
            }
          },
          CallExpression(pathObj) {
            if (pathObj.node.callee.type === "Identifier") {
              let caller = "global";
              let p = pathObj.parentPath;
              while (p) {
                if (p.node.type === "FunctionDeclaration" && p.node.id) {
                  caller = p.node.id.name;
                  break;
                }
                if (p.node.type === "VariableDeclarator" && p.node.id) {
                  caller = p.node.id.name;
                  break;
                }
                p = p.parentPath;
              }
              calls.push({
                callerId: `${filePath}::${caller}`,
                calleeName: pathObj.node.callee.name
              });
            }
          },
          ImportDeclaration(pathObj) {
            const source = pathObj.node.source.value;
            pathObj.node.specifiers.forEach((spec) => {
              if (spec.local) {
                imports.push({
                  file: filePath,
                  source,
                  local: spec.local.name
                });
              }
            });
          }
        });
        for (const sym of symbols) {
          await this.kg.writeTransaction(
            `
        MERGE (s:Symbol {id: $id})
        SET s.name = $name, s.type = $type, s.line = $line, s.file = $file
        WITH s
        MATCH (f:File {path: $file})
        MERGE (f)-[:DEFINES]->(s)
        `,
            { ...sym, file: filePath }
          );
        }
        for (const call of calls) {
          await this.kg.writeTransaction(
            `
        MATCH (caller:Symbol {id: $callerId})
        MATCH (callee:Symbol {name: $calleeName, file: $file})
        MERGE (caller)-[:CALLS]->(callee)
        `,
            { callerId: call.callerId, calleeName: call.calleeName, file: filePath }
          );
        }
        for (const imp of imports) {
          await this.kg.writeTransaction(
            `
        MATCH (f:File {path: $file})
        MERGE (dep:File {path: $source})
        MERGE (f)-[:IMPORTS {local: $local}]->(dep)
        `,
            imp
          );
        }
        logger3.debug("ASTIndexer", `Indexed file ${filePath} with ${symbols.length} symbols.`);
      }
    };
    module2.exports = ASTIndexer2;
  }
});

// src/services/mcts-engine.js
var require_mcts_engine = __commonJS({
  "src/services/mcts-engine.js"(exports2, module2) {
    "use strict";
    var { logger: logger3 } = require_logger();
    var metrics2 = require_metrics();
    var { ContextOptimizer } = require_context_optimizer();
    var MCTSNode = class {
      constructor(graphNode, parent = null) {
        this.graphNode = graphNode;
        this.parent = parent;
        this.children = [];
        this.visits = 0;
        this.value = 0;
        this.isExpanded = false;
      }
      get ucb1() {
        if (this.visits === 0) return Infinity;
        const c = Math.SQRT2;
        return this.value / this.visits + c * Math.sqrt(Math.log(this.parent.visits) / this.visits);
      }
    };
    var MCTSEngine2 = class {
      constructor(kgService, embeddingService2) {
        this.kg = kgService;
        this.embeddingService = embeddingService2;
        this.optimizer = new ContextOptimizer();
      }
      /**
       * Run MCTS from a starting graph node toward the query.
       *
       * @param {string} query           — Natural language search query
       * @param {string} startNodeId     — Starting node identifier (file path or Symbol ID).
       *                                   To find a valid startNodeId, first run a Cypher query:
       *                                   MATCH (n:File) WHERE n.path CONTAINS 'filename' RETURN n.path LIMIT 5
       *                                   Then pass the returned path as startNodeId.
       *                                   Example: startNodeId = "src/services/embedding-service.js"
       * @param {number} [iterations=50] — Max MCTS iterations (may stop earlier if timeBudgetMs elapses)
       * @param {number} [timeBudgetMs=500] — Maximum wall-clock time in ms regardless of iteration count
       * @returns {Promise<object[]>}    — Optimized array of relevant graph node properties
       */
      async search(query, startNodeId, iterations = 50, timeBudgetMs = 500) {
        logger3.info("MCTSEngine", `Starting MCTS search for: "${query}" from node: ${startNodeId} (max ${iterations} iters, ${timeBudgetMs}ms budget)`);
        metrics2.increment("mcts_searches");
        const wallClockStart = Date.now();
        const startRecords = await this.kg.executeCypher(
          `MATCH (n) WHERE n.id = $id OR n.path = $id RETURN n`,
          { id: startNodeId }
        );
        if (startRecords.length === 0) {
          throw new Error(`Start node not found: ${startNodeId}. Use Cypher mode first to discover valid node IDs: MATCH (n:File) RETURN n.path LIMIT 10`);
        }
        const root = new MCTSNode(startRecords[0].n);
        const queryEmbedding = await this._getEmbedding(query);
        let actualIterations = 0;
        for (let i = 0; i < iterations; i++) {
          if (Date.now() - wallClockStart >= timeBudgetMs) {
            logger3.info("MCTSEngine", `Time budget (${timeBudgetMs}ms) reached after ${i} iterations \u2014 stopping early.`);
            metrics2.increment("mcts.time_budget_exceeded");
            break;
          }
          let node = this._select(root);
          if (!node.isExpanded) {
            node = await this._expand(node);
          }
          const reward = await this._simulate(node, queryEmbedding);
          this._backpropagate(node, reward);
          actualIterations++;
        }
        const visitedNodes = [];
        const queue = [root];
        while (queue.length > 0) {
          const n = queue.shift();
          if (n.visits > 0) visitedNodes.push(n);
          queue.push(...n.children);
        }
        const candidates = visitedNodes.map((n) => ({
          ...n.graphNode.properties,
          score: n.value / (n.visits || 1),
          // Average similarity reward
          tokenEstimate: 50
          // Roughly 50 tokens per graph node metadata
        }));
        const uniqueCandidates = Array.from(new Map(candidates.map((c) => [c.id || c.path, c])).values());
        const { optimized, totalTokens, savedTokens } = this.optimizer.optimize(uniqueCandidates);
        const elapsedMs = Date.now() - wallClockStart;
        metrics2.histogram("context.tokens_saved", savedTokens, { source: "mcts" });
        metrics2.histogram("context.total_tokens", totalTokens, { source: "mcts" });
        metrics2.histogram("mcts.elapsed_ms", elapsedMs);
        metrics2.histogram("mcts.actual_iterations", actualIterations);
        logger3.info(
          "MCTSEngine",
          `MCTS complete. ${actualIterations} iters in ${elapsedMs}ms. Optimized ${uniqueCandidates.length} \u2192 ${optimized.length} nodes (saved ${savedTokens} tokens).`
        );
        return optimized;
      }
      _select(node) {
        while (node.isExpanded && node.children.length > 0) {
          node = node.children.reduce((a, b) => a.ucb1 > b.ucb1 ? a : b);
        }
        return node;
      }
      async _expand(node) {
        const id = node.graphNode.properties.id || node.graphNode.properties.path;
        const records = await this.kg.executeCypher(
          `MATCH (n)-[r]-(m) WHERE n.id = $id OR n.path = $id RETURN m LIMIT 10`,
          { id }
        );
        for (const record of records) {
          const child = new MCTSNode(record.m, node);
          node.children.push(child);
        }
        node.isExpanded = true;
        if (node.children.length > 0) {
          return node.children[Math.floor(Math.random() * node.children.length)];
        }
        return node;
      }
      async _simulate(node, queryEmbedding) {
        const text = (node.graphNode.properties.name || "") + " " + (node.graphNode.properties.path || "");
        if (!text.trim()) return 0.1;
        const nodeEmbedding = await this._getEmbedding(text);
        return this._cosineSimilarity(queryEmbedding, nodeEmbedding);
      }
      _backpropagate(node, reward) {
        while (node) {
          node.visits++;
          node.value += reward;
          node = node.parent;
        }
      }
      async _getEmbedding(text) {
        const result = await this.embeddingService.workerPool.generateEmbeddingForeground(text);
        const floats = new Float32Array(result.buffer || result);
        return Array.from(floats);
      }
      _cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
          dot += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
      }
    };
    module2.exports = MCTSEngine2;
  }
});

// src/services/memory-service.js
var require_memory_service = __commonJS({
  "src/services/memory-service.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var Database = require("better-sqlite3");
    var hnswlib = require("hnswlib-node");
    var { withRetry } = require_retry();
    var { logger: logger3 } = require_logger();
    var metrics2 = require_metrics();
    var DB_PATH = path2.join(__dirname, "memory.db");
    var EMBEDDING_DIMENSIONS = 384;
    var MemoryService2 = class {
      constructor(workerPool2) {
        this.workerPool = workerPool2;
        this.db = new Database(DB_PATH);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this._hnsw = null;
        this._idToRow = /* @__PURE__ */ new Map();
        this._nextId = 0;
        this._initDb();
      }
      _initDb() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding BLOB NOT NULL
      )
    `);
        this._rebuildHnswIndex();
      }
      _rebuildHnswIndex() {
        const rows = this.db.prepare("SELECT id, timestamp, event_type, content, embedding FROM episodic_memory").all();
        this._idToRow.clear();
        this._nextId = 0;
        const maxElements = Math.max(rows.length + 1e3, 2e3);
        this._hnsw = new hnswlib.HierarchicalNSW("cosine", EMBEDDING_DIMENSIONS);
        this._hnsw.initIndex(maxElements);
        for (const row of rows) {
          const internalId = this._nextId++;
          this._idToRow.set(internalId, {
            dbId: row.id,
            timestamp: row.timestamp,
            event_type: row.event_type,
            content: row.content
          });
          const embBuffer = row.embedding;
          const embArray = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, embBuffer.byteLength / 4);
          this._hnsw.addPoint(Array.from(embArray), internalId);
        }
        logger3.info("MemoryService", `Loaded ${rows.length} episodic memories into HNSW index.`);
      }
      async remember(eventType, content) {
        const textToEmbed = `[${eventType}] ${content}`;
        let embeddingArray;
        try {
          embeddingArray = await withRetry(
            () => this.workerPool.generateEmbeddingForeground(textToEmbed),
            { attempts: 3, baseMs: 300, tag: "MemoryService/Embed" }
          );
        } catch (err) {
          logger3.error("MemoryService", `Failed to generate embedding: ${err.message}`);
          throw new Error("Embedding generation failed for memory.");
        }
        const floats = new Float32Array(embeddingArray.buffer || embeddingArray);
        const embeddingBlob = Buffer.from(floats.buffer);
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const result = this.db.prepare(`
      INSERT INTO episodic_memory (timestamp, event_type, content, embedding)
      VALUES (?, ?, ?, ?)
    `).run(timestamp, eventType, content, embeddingBlob);
        const internalId = this._nextId++;
        const currentMax = this._hnsw.getMaxElements();
        if (this._nextId >= currentMax) {
          this._hnsw.resizeIndex(currentMax + 1e3);
        }
        this._hnsw.addPoint(Array.from(floats), internalId);
        this._idToRow.set(internalId, {
          dbId: result.lastInsertRowid,
          timestamp,
          event_type: eventType,
          content
        });
        metrics2.increment("memory.stored", { type: eventType });
        logger3.info("MemoryService", `Remembered new episode: [${eventType}]`);
        return result.lastInsertRowid;
      }
      /**
       * Recall memories semantically similar to the query.
       * @param {string} query - Natural language search query
       * @param {number} [limit=5] - Maximum number of results
       * @param {number} [similarityThreshold=0.4] - Minimum similarity score (0.0–1.0); memories below this are excluded
       * @returns {Promise<object[]>}
       */
      async recall(query, limit = 5, similarityThreshold = 0.4) {
        if (this._nextId === 0) return [];
        metrics2.increment("memory.recalled");
        let queryEmbedding;
        try {
          queryEmbedding = await withRetry(
            () => this.workerPool.generateEmbeddingForeground(query),
            { attempts: 3, baseMs: 300, tag: "MemoryService/Recall" }
          );
        } catch (err) {
          logger3.error("MemoryService", `Failed to embed recall query: ${err.message}`);
          throw new Error("Embedding generation failed for recall query.");
        }
        const distanceThreshold = 1 - Math.max(0, Math.min(1, similarityThreshold));
        const floats = new Float32Array(queryEmbedding.buffer || queryEmbedding);
        const searchLimit = Math.min(limit, this._nextId);
        const result = this._hnsw.searchKnn(Array.from(floats), searchLimit);
        const memories = [];
        for (let i = 0; i < result.neighbors.length; i++) {
          const id = result.neighbors[i];
          const distance = result.distances[i];
          const row = this._idToRow.get(id);
          if (distance < distanceThreshold) {
            memories.push({
              id: row.dbId,
              timestamp: row.timestamp,
              event_type: row.event_type,
              content: row.content,
              relevance: (1 - distance).toFixed(4)
            });
          }
        }
        return memories;
      }
    };
    module2.exports = MemoryService2;
  }
});

// src/services/virtual-key-manager.js
var require_virtual_key_manager = __commonJS({
  "src/services/virtual-key-manager.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var path2 = require("path");
    var { logger: logger3 } = require_logger();
    var KEYS_FILE = path2.join(__dirname, "..", "..", "virtual-keys.json");
    var VirtualKeyManager2 = class {
      constructor() {
        this.keys = {};
        this._loadKeys();
      }
      _loadKeys() {
        try {
          if (fs2.existsSync(KEYS_FILE)) {
            this.keys = JSON.parse(fs2.readFileSync(KEYS_FILE, "utf8"));
            logger3.info("VirtualKeyManager", `Loaded ${Object.keys(this.keys).length} virtual keys.`);
          } else {
            logger3.warn("VirtualKeyManager", `No virtual-keys.json found at ${KEYS_FILE}. All requests will default to master access if no key is provided.`);
          }
        } catch (err) {
          logger3.error("VirtualKeyManager", `Failed to load virtual keys: ${err.message}`);
        }
      }
      isAuthorized(virtualKey, toolName) {
        if (!virtualKey) return true;
        const scope = this.keys[virtualKey];
        if (!scope) return false;
        if (scope.includes("*")) return true;
        return scope.includes(toolName);
      }
      filterAuthorizedTools(virtualKey, toolsArray) {
        if (!virtualKey) return toolsArray;
        const scope = this.keys[virtualKey];
        if (!scope) return [];
        if (scope.includes("*")) return toolsArray;
        return toolsArray.filter((tool) => scope.includes(tool.name || tool));
      }
    };
    module2.exports = VirtualKeyManager2;
  }
});

// src/services/orchestration-db.js
var require_orchestration_db = __commonJS({
  "src/services/orchestration-db.js"(exports2, module2) {
    "use strict";
    var Database = require("better-sqlite3");
    var Redis2 = require("ioredis");
    var path2 = require("path");
    var { logger: logger3 } = require_logger();
    var metrics2 = require_metrics();
    var _instance = null;
    var OrchestrationDB2 = class _OrchestrationDB {
      constructor() {
        const dbPath = process.env.ASE_ORCHESTRATION_DB || path2.join(__dirname, "orchestration.db");
        this.db = new Database(dbPath);
        const redisUrl = process.env.ASE_REDIS_URL || "redis://127.0.0.1:6379";
        this.redis = new Redis2(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true
        });
        this.redis.on("error", (err) => {
          logger3.error("OrchestrationDB-Redis", `Redis error: ${err.message}`);
        });
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("foreign_keys = ON");
        this._initSchema();
        this.listeners = [];
        logger3.info("OrchestrationDB", `Initialized at ${dbPath}`);
      }
      /**
       * Get the singleton instance. Creates DB lazily on first access.
       */
      static getInstance() {
        if (!_instance) {
          _instance = new _OrchestrationDB();
        }
        return _instance;
      }
      /**
       * Get the raw better-sqlite3 Database handle.
       */
      getDB() {
        return this.db;
      }
      /**
       * Get the Redis client instance.
       */
      getRedisClient() {
        return this.redis;
      }
      /**
       * Register a local event listener callback.
       * @param {function} callback
       * @returns {function} Unsubscribe function
       */
      registerListener(callback) {
        this.listeners.push(callback);
        return () => {
          this.listeners = this.listeners.filter((l) => l !== callback);
        };
      }
      _initSchema() {
        this.db.exec(`
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- Task Graph
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS tasks (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL,
        description   TEXT NOT NULL DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending','claimed','running','blocked','completed','failed','needs_revision')),
        assigned_to   TEXT,
        depends_on    TEXT,            -- JSON array of upstream task IDs (denormalized for reads)
        blocks        TEXT,            -- JSON array of downstream task IDs (denormalized for reads)
        skill_ids     TEXT,            -- JSON array of relevant skill IDs
        output        TEXT,            -- JSON structured output
        validation_status TEXT NOT NULL DEFAULT 'pending' CHECK(validation_status IN ('passed', 'failed', 'pending')),
        created_at    INTEGER DEFAULT (unixepoch()),
        claimed_at    INTEGER,
        completed_at  INTEGER,
        timeout_at    INTEGER,
        priority      INTEGER DEFAULT 0,
        deadlock_broken INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS task_dependencies (
        upstream_task_id   TEXT NOT NULL,
        downstream_task_id TEXT NOT NULL,
        PRIMARY KEY (upstream_task_id, downstream_task_id)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_deps_upstream ON task_dependencies(upstream_task_id);
      CREATE INDEX IF NOT EXISTS idx_deps_downstream ON task_dependencies(downstream_task_id);

      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- Shared Memory
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS shared_memory (
        key         TEXT NOT NULL,
        scope       TEXT NOT NULL DEFAULT 'global',
        value       TEXT NOT NULL,           -- JSON
        written_by  TEXT NOT NULL,           -- agent_id
        task_id     TEXT,                    -- which task produced this
        version     INTEGER DEFAULT 1,       -- increments on update
        expires_at  INTEGER,                 -- NULL = permanent
        created_at  INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (key, scope)
      );

      CREATE TABLE IF NOT EXISTS memory_changelog (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        key         TEXT NOT NULL,
        scope       TEXT NOT NULL,
        old_value   TEXT,
        new_value   TEXT NOT NULL,
        changed_by  TEXT NOT NULL,
        changed_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_memory_scope ON shared_memory(scope);
      CREATE INDEX IF NOT EXISTS idx_changelog_key ON memory_changelog(key, scope);

      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- File Locks
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS file_locks (
        file_path   TEXT PRIMARY KEY,
        locked_by   TEXT NOT NULL,           -- agent_id
        task_id     TEXT NOT NULL,
        lock_type   TEXT NOT NULL CHECK(lock_type IN ('exclusive', 'shared')),
        locked_at   INTEGER DEFAULT (unixepoch()),
        expires_at  INTEGER NOT NULL         -- auto-expire if agent crashes
      );

      CREATE TABLE IF NOT EXISTS file_intentions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path   TEXT NOT NULL,
        agent_id    TEXT NOT NULL,
        task_id     TEXT NOT NULL,
        intention   TEXT NOT NULL CHECK(intention IN ('create','modify','delete','read')),
        declared_at INTEGER DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_locks_agent ON file_locks(locked_by);
      CREATE INDEX IF NOT EXISTS idx_intentions_file ON file_intentions(file_path);

      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- Event Bus
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS events (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        type        TEXT NOT NULL,
        payload     TEXT NOT NULL,           -- JSON
        source_agent TEXT,
        task_id     TEXT,
        created_at  INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS event_subscriptions (
        agent_id    TEXT NOT NULL,
        event_type  TEXT NOT NULL,
        PRIMARY KEY (agent_id, event_type)
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- Agent Registry
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS agents (
        agent_id       TEXT PRIMARY KEY,
        last_heartbeat INTEGER NOT NULL,
        current_task   TEXT,
        status         TEXT DEFAULT 'active'
          CHECK(status IN ('active','idle','dead'))
      );
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      -- Loop Engineering
      -- \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      CREATE TABLE IF NOT EXISTS task_loops (
        task_id       TEXT NOT NULL,
        loop_number   INTEGER NOT NULL CHECK(loop_number BETWEEN 1 AND 5),
        loop_name     TEXT NOT NULL,
        loop_lens     TEXT NOT NULL,
        output        TEXT,
        started_at    INTEGER DEFAULT (unixepoch()),
        completed_at  INTEGER,
        PRIMARY KEY (task_id, loop_number)
      );

      CREATE TABLE IF NOT EXISTS code_loops (
        session_id    TEXT NOT NULL,
        task_id       TEXT NOT NULL,
        loop_number   INTEGER NOT NULL CHECK(loop_number BETWEEN 1 AND 5),
        loop_name     TEXT NOT NULL,
        input_code    TEXT NOT NULL,
        output_code   TEXT NOT NULL,
        changes_made  TEXT,
        completed_at  INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (session_id, loop_number)
      );

      CREATE TABLE IF NOT EXISTS loop_artifacts (
        task_id       TEXT PRIMARY KEY,
        final_code    TEXT NOT NULL,
        final_output  TEXT NOT NULL,
        total_loops   INTEGER DEFAULT 5,
        written_at    INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS validation_runs (
        id            TEXT PRIMARY KEY,
        project_dir   TEXT NOT NULL,
        passed        INTEGER NOT NULL CHECK(passed IN (0, 1)),
        details       TEXT NOT NULL, -- JSON
        created_at    INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS file_snapshots (
        id           TEXT PRIMARY KEY,
        file_path    TEXT NOT NULL,
        content      TEXT, -- Nullable to represent non-existence (new files)
        timestamp    INTEGER NOT NULL,
        created_at   INTEGER DEFAULT (unixepoch())
      );
    `);
        try {
          this.db.exec(`ALTER TABLE tasks ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending';`);
        } catch (e) {
        }
        try {
          this.db.exec(`ALTER TABLE tasks ADD COLUMN priority INTEGER DEFAULT 0;`);
        } catch (e) {
        }
        try {
          this.db.exec(`ALTER TABLE tasks ADD COLUMN deadlock_broken INTEGER DEFAULT 0;`);
        } catch (e) {
        }
        try {
          this.db.exec(`ALTER TABLE file_locks ADD COLUMN lock_token TEXT;`);
        } catch (e) {
        }
      }
      // ─────────────────────────────────────────────────────────────
      // Utility helpers used across multiple tools
      // ─────────────────────────────────────────────────────────────
      /**
       * Expire stale file locks. Call before any lock check.
       */
      expireStaleLocks() {
        this.db.prepare(
          `DELETE FROM file_locks WHERE expires_at < unixepoch()`
        ).run();
      }
      /**
       * Expire TTL'd shared memory entries. Call before any memory read.
       */
      expireMemory() {
        this.db.prepare(
          `DELETE FROM shared_memory WHERE expires_at IS NOT NULL AND expires_at < unixepoch()`
        ).run();
      }
      emitEvent(type, payload, sourceAgent = null, taskId = null) {
        const serializedPayload = JSON.stringify(payload);
        const info = this.db.prepare(`
      INSERT INTO events (type, payload, source_agent, task_id)
      VALUES (?, ?, ?, ?)
    `).run(type, serializedPayload, sourceAgent, taskId);
        const event = {
          id: info.lastInsertRowid,
          type,
          payload: serializedPayload,
          source_agent: sourceAgent,
          task_id: taskId,
          created_at: Math.floor(Date.now() / 1e3)
        };
        if (this.redis) {
          this.redis.publish("ase:events", JSON.stringify(event)).catch(() => {
          });
        }
        if (this.listeners) {
          for (const listener of this.listeners) {
            try {
              listener(event);
            } catch (err) {
              logger3.error("OrchestrationDB", `Event listener error: ${err.message}`);
            }
          }
        }
      }
      /**
       * Verify if an agent is authorized to use a specific Spoke server.
       */
      isSpokeAuthorized(agentId, spokeName) {
        if (!agentId) return true;
        const agent = this.db.prepare(`SELECT status FROM agents WHERE agent_id = ?`).get(agentId);
        if (!agent) return true;
        return agent.status !== "dead";
      }
      /**
       * Close the database connection. Used in tests.
       */
      close() {
        if (this.db) {
          this.db.close();
          this.db = null;
        }
        if (this.redis) {
          this.redis.disconnect();
          this.redis = null;
        }
        _instance = null;
      }
      // ═══════════════════════════════════════════════════════════
      // Dual-Layer Storage Architecture (T1-A, T1-C, T1-D)
      // ═══════════════════════════════════════════════════════════
      async acquireFileLock(filePath, agentId, taskId, lockType = "exclusive", ttlSeconds = 120) {
        const now = Math.floor(Date.now() / 1e3);
        const forcedTtl = 30;
        const expiresAt = now + forcedTtl;
        const lockKey = `ase:lock:${filePath}`;
        const lockToken = require("crypto").randomUUID();
        this.expireStaleLocks();
        const lockData = await this.redis.get(lockKey);
        if (lockData) {
          const lockObj = JSON.parse(lockData);
          if (lockObj.lock_type === "exclusive" || lockType === "exclusive") {
            return {
              granted: false,
              blocked_by: lockObj.locked_by || lockObj.locks && lockObj.locks[0] && lockObj.locks[0].locked_by || "unknown",
              blocked_by_task: lockObj.task_id || lockObj.locks && lockObj.locks[0] && lockObj.locks[0].task_id || "unknown",
              retry_after_seconds: Math.max(0, lockObj.expires_at - now)
            };
          } else {
            const locks = lockObj.locks || [];
            const activeLocks = locks.filter((l) => l.expires_at > now);
            activeLocks.push({ locked_by: agentId, task_id: taskId, expires_at: expiresAt, lock_token: lockToken });
            const maxExpiresAt = Math.max(...activeLocks.map((l) => l.expires_at));
            const newLockObj2 = {
              lock_type: "shared",
              expires_at: maxExpiresAt,
              locks: activeLocks
            };
            const remainingTtl = Math.max(1, maxExpiresAt - now);
            await this.redis.set(lockKey, JSON.stringify(newLockObj2), "EX", remainingTtl);
            await this.redis.set(`ase:lock_token:${lockToken}`, filePath, "EX", remainingTtl);
            this.db.prepare(`
          INSERT OR REPLACE INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at, lock_token)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(filePath, agentId, taskId, lockType, expiresAt, lockToken);
            return { granted: true, expires_at: expiresAt, lock_token: lockToken };
          }
        }
        const newLockObj = {
          lock_type: lockType,
          locked_by: agentId,
          task_id: taskId,
          expires_at: expiresAt,
          lock_token: lockToken,
          locks: lockType === "shared" ? [{ locked_by: agentId, task_id: taskId, expires_at: expiresAt, lock_token: lockToken }] : []
        };
        await this.redis.set(lockKey, JSON.stringify(newLockObj), "EX", forcedTtl);
        await this.redis.set(`ase:lock_token:${lockToken}`, filePath, "EX", forcedTtl);
        this.db.prepare(`
      INSERT OR REPLACE INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at, lock_token)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(filePath, agentId, taskId, lockType, expiresAt, lockToken);
        return { granted: true, expires_at: expiresAt, lock_token: lockToken };
      }
      async releaseFileLock(filePath, agentId) {
        const lockKey = `ase:lock:${filePath}`;
        const now = Math.floor(Date.now() / 1e3);
        const lockData = await this.redis.get(lockKey);
        if (!lockData) {
          const changes = this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
          return { released: changes.changes > 0, file_path: filePath };
        }
        const lockObj = JSON.parse(lockData);
        if (lockObj.lock_type === "exclusive") {
          if (lockObj.locked_by === agentId) {
            await this.redis.del(lockKey);
            this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
            return { released: true, file_path: filePath };
          }
        } else {
          const activeLocks = (lockObj.locks || []).filter((l) => l.locked_by !== agentId && l.expires_at > now);
          if (activeLocks.length === 0) {
            await this.redis.del(lockKey);
          } else {
            const maxExpiresAt = Math.max(...activeLocks.map((l) => l.expires_at));
            lockObj.locks = activeLocks;
            lockObj.expires_at = maxExpiresAt;
            const remainingTtl = Math.max(1, maxExpiresAt - now);
            await this.redis.set(lockKey, JSON.stringify(lockObj), "EX", remainingTtl);
          }
          this.db.prepare(`DELETE FROM file_locks WHERE file_path = ? AND locked_by = ?`).run(filePath, agentId);
          return { released: true, file_path: filePath };
        }
        return { released: false, file_path: filePath };
      }
      async writeMemory(key, scope, value, agentId, taskId, ttlSeconds = null) {
        const now = Math.floor(Date.now() / 1e3);
        const memKey = `ase:memory:${scope}:${key}`;
        const existingData = await this.redis.get(memKey);
        let version = 1;
        let oldValue = null;
        if (existingData) {
          const existing = JSON.parse(existingData);
          version = (existing.version || 1) + 1;
          oldValue = JSON.stringify(existing.value);
        }
        const expiresAt = ttlSeconds ? now + ttlSeconds : null;
        const memObj = {
          key,
          scope,
          value,
          written_by: agentId,
          task_id: taskId,
          version,
          expires_at: expiresAt,
          created_at: now
        };
        if (ttlSeconds) {
          await this.redis.set(memKey, JSON.stringify(memObj), "EX", ttlSeconds);
        } else {
          await this.redis.set(memKey, JSON.stringify(memObj));
        }
        this.db.transaction(() => {
          this.db.prepare(`
        INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id, version, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(key, scope, JSON.stringify(value), agentId, taskId, version, expiresAt, now);
          this.db.prepare(`
        INSERT INTO memory_changelog (key, scope, old_value, new_value, changed_by, changed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(key, scope, oldValue, JSON.stringify(value), agentId, now);
        })();
        return { key, scope, version, written_by: agentId };
      }
      async readMemory(key, scope) {
        const memKey = `ase:memory:${scope}:${key}`;
        const data = await this.redis.get(memKey);
        if (!data) {
          return { found: false };
        }
        const memObj = JSON.parse(data);
        return {
          found: true,
          key: memObj.key,
          scope: memObj.scope,
          value: memObj.value,
          version: memObj.version,
          written_by: memObj.written_by
        };
      }
      async createTask(id, title, description, dependsOn = [], blocks = [], skillIds = [], priority = 0) {
        const now = Math.floor(Date.now() / 1e3);
        const taskKey = `ase:task:${id}`;
        const taskObj = {
          id,
          title,
          description,
          status: "pending",
          assigned_to: null,
          depends_on: dependsOn,
          blocks,
          skill_ids: skillIds,
          output: null,
          validation_status: "pending",
          created_at: now,
          claimed_at: null,
          completed_at: null,
          timeout_at: null,
          priority,
          deadlock_broken: 0
        };
        this.db.transaction(() => {
          this.db.prepare(`
        INSERT INTO tasks (id, title, description, status, depends_on, blocks, skill_ids, validation_status, created_at, priority, deadlock_broken)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(id, title, description, "pending", JSON.stringify(dependsOn), JSON.stringify(blocks), JSON.stringify(skillIds), "pending", now, priority);
          const insertDep = this.db.prepare(
            `INSERT OR IGNORE INTO task_dependencies (upstream_task_id, downstream_task_id) VALUES (?, ?)`
          );
          for (const upstreamId of dependsOn) {
            insertDep.run(upstreamId, id);
          }
          for (const downstreamId of blocks) {
            insertDep.run(id, downstreamId);
          }
        })();
        await this.redis.set(taskKey, JSON.stringify(taskObj));
        await this.redis.sadd("ase:tasks:pending", id);
        if (dependsOn.length > 0) {
          await this.redis.sadd(`ase:task:depends_on:${id}`, ...dependsOn);
        }
        for (const upstreamId of dependsOn) {
          await this.redis.sadd(`ase:task:blocked_by:${upstreamId}`, id);
        }
        for (const downstreamId of blocks) {
          await this.redis.sadd(`ase:task:blocked_by:${id}`, downstreamId);
          await this.redis.sadd(`ase:task:depends_on:${downstreamId}`, id);
        }
        await this.checkForDeadlocks();
        return taskObj;
      }
      async claimTask(agentId, skillAffinity = []) {
        const now = Math.floor(Date.now() / 1e3);
        const timeoutAt = now + 300;
        const pendingIds = await this.redis.sunion("ase:tasks:pending", "ase:tasks:needs_revision");
        if (pendingIds.length === 0) return null;
        const tasks = [];
        for (const id of pendingIds) {
          const data = await this.redis.get(`ase:task:${id}`);
          if (data) tasks.push(JSON.parse(data));
        }
        const affinitySet = new Set(skillAffinity);
        tasks.sort((a, b) => {
          const aPriority = a.priority || 0;
          const bPriority = b.priority || 0;
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
          const aMatches = a.skill_ids && a.skill_ids.some((s) => affinitySet.has(s));
          const bMatches = b.skill_ids && b.skill_ids.some((s) => affinitySet.has(s));
          if (aMatches && !bMatches) return -1;
          if (!aMatches && bMatches) return 1;
          return a.created_at - b.created_at;
        });
        for (const task of tasks) {
          const upstreamIds = await this.redis.smembers(`ase:task:depends_on:${task.id}`);
          let allCompleted = true;
          if (task.deadlock_broken !== 1 && task.deadlock_broken !== "1") {
            for (const upId of upstreamIds) {
              const isCompleted = await this.redis.sismember("ase:tasks:completed", upId);
              if (!isCompleted) {
                allCompleted = false;
                break;
              }
            }
          }
          if (allCompleted) {
            const multi = this.redis.multi();
            multi.srem("ase:tasks:pending", task.id);
            multi.srem("ase:tasks:needs_revision", task.id);
            multi.sadd("ase:tasks:claimed", task.id);
            const updatedTask = {
              ...task,
              status: "claimed",
              assigned_to: agentId,
              claimed_at: now,
              timeout_at: timeoutAt
            };
            multi.set(`ase:task:${task.id}`, JSON.stringify(updatedTask));
            const results = await multi.exec();
            const remPending = results[0][1];
            const remRevision = results[1][1];
            if (remPending > 0 || remRevision > 0) {
              this.db.prepare(`
            UPDATE tasks SET
              status = 'claimed',
              assigned_to = ?,
              claimed_at = ?,
              timeout_at = ?
            WHERE id = ?
          `).run(agentId, now, timeoutAt, task.id);
              await this.checkForDeadlocks();
              return updatedTask;
            }
          }
        }
        return null;
      }
      async completeTask(taskId, agentId, status, output = {}, failureReason = null) {
        const now = Math.floor(Date.now() / 1e3);
        const taskKey = `ase:task:${taskId}`;
        const data = await this.redis.get(taskKey);
        if (!data) {
          throw new Error(`Task ${taskId} not found in Redis`);
        }
        const task = JSON.parse(data);
        if (task.assigned_to !== agentId) {
          throw new Error(`Agent ${agentId} does not own task ${taskId}`);
        }
        const multi = this.redis.multi();
        multi.srem("ase:tasks:claimed", taskId);
        const updatedTask = {
          ...task,
          status,
          output: { ...output, failure_reason: failureReason },
          completed_at: now
        };
        if (status === "completed") {
          updatedTask.validation_status = "passed";
          multi.sadd("ase:tasks:completed", taskId);
        } else if (status === "needs_revision") {
          updatedTask.validation_status = "failed";
          multi.sadd("ase:tasks:needs_revision", taskId);
          updatedTask.assigned_to = null;
          updatedTask.claimed_at = null;
          updatedTask.timeout_at = null;
        } else {
          multi.sadd("ase:tasks:failed", taskId);
        }
        multi.set(taskKey, JSON.stringify(updatedTask));
        await multi.exec();
        this.db.prepare(`
      UPDATE tasks SET
        status = ?,
        assigned_to = ?,
        output = ?,
        validation_status = ?,
        claimed_at = ?,
        completed_at = ?,
        timeout_at = ?
      WHERE id = ?
    `).run(
          updatedTask.status,
          updatedTask.assigned_to,
          JSON.stringify(updatedTask.output),
          updatedTask.validation_status,
          updatedTask.claimed_at,
          updatedTask.completed_at,
          updatedTask.timeout_at,
          taskId
        );
        if (status === "completed" || status === "failed") {
          const loopKeys = await this.redis.keys(`ase:task_loops:${taskId}:*`);
          for (const lKey of loopKeys) {
            const loopData = await this.redis.get(lKey);
            if (loopData) {
              const l = JSON.parse(loopData);
              this.db.prepare(`
            INSERT OR REPLACE INTO task_loops (task_id, loop_number, loop_name, loop_lens, output, started_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(taskId, l.loop_number, l.loop_name, l.loop_lens, l.output, l.started_at, l.completed_at);
            }
            await this.redis.del(lKey);
          }
          if (status === "completed") {
            this.db.prepare(`
          INSERT OR REPLACE INTO shared_memory (key, scope, value, written_by, task_id, created_at)
          VALUES (?, 'global', ?, ?, ?, ?)
        `).run(`task_output:${taskId}`, JSON.stringify(output), agentId, taskId, now);
          }
        }
        await this.checkForDeadlocks();
        return updatedTask;
      }
      async runTaskLoop(taskId, agentId, loopNumber, loopName, loopLens, output, startedAt, completedAt) {
        const loopKey = `ase:task_loops:${taskId}:${loopNumber}`;
        const loopObj = {
          task_id: taskId,
          loop_number: loopNumber,
          loop_name: loopName,
          loop_lens: loopLens,
          output: JSON.stringify(output),
          started_at: startedAt,
          completed_at: completedAt
        };
        await this.redis.set(loopKey, JSON.stringify(loopObj));
        return loopObj;
      }
      async getLoopState(taskId, sessionId) {
        const loopKeys = await this.redis.keys(`ase:task_loops:${taskId}:*`);
        const taskLoops = [];
        for (const key of loopKeys) {
          const data = await this.redis.get(key);
          if (data) taskLoops.push(JSON.parse(data));
        }
        taskLoops.sort((a, b) => a.loop_number - b.loop_number);
        if (taskLoops.length === 0) {
          const dbLoops = this.db.prepare(`
        SELECT loop_number, loop_name, loop_lens, output, started_at, completed_at
        FROM task_loops WHERE task_id = ? ORDER BY loop_number
      `).all(taskId);
          taskLoops.push(...dbLoops);
        }
        const codeLoops = [];
        if (sessionId) {
          const codeKeys = await this.redis.keys(`ase:code_loops:${sessionId}:*`);
          for (const key of codeKeys) {
            const data = await this.redis.get(key);
            if (data) codeLoops.push(JSON.parse(data));
          }
          codeLoops.sort((a, b) => a.loop_number - b.loop_number);
        }
        return { taskLoops, codeLoops };
      }
      async recordCodeLoop(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, changesMade, completedAt) {
        const key = `ase:code_loops:${sessionId}:${loopNumber}`;
        const loopObj = {
          session_id: sessionId,
          task_id: taskId,
          loop_number: loopNumber,
          loop_name: loopName,
          input_code: inputCode,
          output_code: outputCode,
          changes_made: JSON.stringify(changesMade),
          completed_at: completedAt
        };
        await this.redis.set(key, JSON.stringify(loopObj));
        this.db.prepare(`
      INSERT OR REPLACE INTO code_loops (session_id, task_id, loop_number, loop_name, input_code, output_code, changes_made, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, taskId, loopNumber, loopName, inputCode, outputCode, JSON.stringify(changesMade), completedAt);
        return loopObj;
      }
      async registerAgentHeartbeat(agentId, currentTask = null) {
        const agentKey = `ase:agent:${agentId}`;
        const now = Math.floor(Date.now() / 1e3);
        const agentObj = {
          agent_id: agentId,
          last_heartbeat: now,
          current_task: currentTask,
          status: "active"
        };
        await this.redis.set(agentKey, JSON.stringify(agentObj), "EX", 120);
        this.db.prepare(`
      INSERT OR REPLACE INTO agents (agent_id, last_heartbeat, current_task, status)
      VALUES (?, ?, ?, 'active')
    `).run(agentId, now, currentTask);
      }
      async recoverDeadAgents() {
        const now = Math.floor(Date.now() / 1e3);
        const recovered = [];
        const deadAgents = this.db.prepare(`
      SELECT agent_id FROM agents
      WHERE status = 'active' AND last_heartbeat < ?
    `).all(now - 30);
        for (const agent of deadAgents) {
          const claimedIds = await this.redis.smembers("ase:tasks:claimed");
          for (const tId of claimedIds) {
            const data = await this.redis.get(`ase:task:${tId}`);
            if (data) {
              const task = JSON.parse(data);
              if (task.assigned_to === agent.agent_id) {
                await this.redis.multi().srem("ase:tasks:claimed", tId).sadd("ase:tasks:pending", tId).set(`ase:task:${tId}`, JSON.stringify({
                  ...task,
                  status: "pending",
                  assigned_to: null,
                  claimed_at: null,
                  timeout_at: null
                })).exec();
                this.db.prepare(`
              UPDATE tasks SET status = 'pending', assigned_to = NULL, claimed_at = NULL, timeout_at = NULL
              WHERE id = ?
            `).run(tId);
              }
            }
          }
          this.db.prepare(`UPDATE agents SET status = 'dead' WHERE agent_id = ?`).run(agent.agent_id);
          recovered.push(agent.agent_id);
        }
        await this.checkForDeadlocks();
        return recovered;
      }
      getDeadlockState() {
        const activeTasks = this.db.prepare(`
      SELECT id, status, depends_on, created_at, priority, deadlock_broken
      FROM tasks
      WHERE status NOT IN ('completed', 'failed')
    `).all();
        const inDegree = {};
        const adj = {};
        const nodeMap = {};
        for (const task of activeTasks) {
          inDegree[task.id] = 0;
          adj[task.id] = [];
          nodeMap[task.id] = task;
        }
        for (const task of activeTasks) {
          if (task.deadlock_broken === 1) {
            continue;
          }
          let deps2 = [];
          try {
            deps2 = JSON.parse(task.depends_on || "[]");
          } catch (e) {
          }
          for (const depId of deps2) {
            if (nodeMap[depId]) {
              adj[depId].push(task.id);
              inDegree[task.id]++;
            }
          }
        }
        const queue = [];
        for (const task of activeTasks) {
          if (inDegree[task.id] === 0) {
            queue.push(task.id);
          }
        }
        const topoOrder = [];
        while (queue.length > 0) {
          const u = queue.shift();
          topoOrder.push(u);
          for (const v of adj[u]) {
            inDegree[v]--;
            if (inDegree[v] === 0) {
              queue.push(v);
            }
          }
        }
        const cycles = [];
        const hasDeadlock = topoOrder.length < activeTasks.length;
        if (hasDeadlock) {
          const cycleNodeIds = activeTasks.map((t) => t.id).filter((id) => !topoOrder.includes(id));
          const visited = /* @__PURE__ */ new Set();
          const path3 = [];
          const pathSet = /* @__PURE__ */ new Set();
          const dfs = (nodeId) => {
            if (pathSet.has(nodeId)) {
              const cycleStart = path3.indexOf(nodeId);
              cycles.push(path3.slice(cycleStart));
              return;
            }
            if (visited.has(nodeId)) return;
            visited.add(nodeId);
            path3.push(nodeId);
            pathSet.add(nodeId);
            const task = nodeMap[nodeId];
            let deps2 = [];
            try {
              deps2 = JSON.parse(task.depends_on || "[]");
            } catch (e) {
            }
            for (const depId of deps2) {
              if (cycleNodeIds.includes(depId)) {
                dfs(depId);
              }
            }
            path3.pop();
            pathSet.delete(nodeId);
          };
          for (const id of cycleNodeIds) {
            if (!visited.has(id)) {
              dfs(id);
            }
          }
        }
        const deadlockBrokenTasks = this.db.prepare(`
      SELECT id, title, priority, status FROM tasks WHERE deadlock_broken = 1
    `).all();
        return {
          has_deadlock: hasDeadlock,
          cycles,
          deadlock_broken_tasks: deadlockBrokenTasks
        };
      }
      async checkForDeadlocks() {
        const deadlockState = this.getDeadlockState();
        if (!deadlockState.has_deadlock || deadlockState.cycles.length === 0) {
          return null;
        }
        const policy = await this.redis.get("ase:deadlock_policy") || "priority-based";
        const cycle = deadlockState.cycles[0];
        const activeTasks = this.db.prepare(`
      SELECT id, title, created_at, priority, assigned_to
      FROM tasks
      WHERE status NOT IN ('completed', 'failed')
    `).all();
        const nodeMap = {};
        for (const t of activeTasks) {
          nodeMap[t.id] = t;
        }
        const cycleTasks = cycle.map((id) => nodeMap[id]).filter(Boolean);
        if (cycleTasks.length === 0) return null;
        let victim = null;
        if (policy === "priority-based") {
          cycleTasks.sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            return a.created_at - b.created_at;
          });
          victim = cycleTasks[0];
        } else if (policy === "age-based") {
          cycleTasks.sort((a, b) => a.created_at - b.created_at);
          victim = cycleTasks[0];
        } else {
          const idx = Math.floor(Math.random() * cycleTasks.length);
          victim = cycleTasks[idx];
        }
        const victimKey = `ase:task:${victim.id}`;
        const victimData = await this.redis.get(victimKey);
        if (victimData) {
          const t = JSON.parse(victimData);
          t.status = "pending";
          t.deadlock_broken = 1;
          t.assigned_to = null;
          t.claimed_at = null;
          t.timeout_at = null;
          await this.redis.multi().set(victimKey, JSON.stringify(t)).srem("ase:tasks:claimed", victim.id).srem("ase:tasks:needs_revision", victim.id).sadd("ase:tasks:pending", victim.id).exec();
        }
        this.db.prepare(`
      UPDATE tasks
      SET status = 'pending', deadlock_broken = 1, assigned_to = NULL, claimed_at = NULL, timeout_at = NULL
      WHERE id = ?
    `).run(victim.id);
        metrics2.increment("deadlock.resolved", { strategy: policy });
        this.emitEvent("deadlock_broken", {
          task_id: victim.id,
          title: victim.title,
          assigned_to: victim.assigned_to,
          policy
        }, null, victim.id);
        logger3.warn("OrchestrationDB", `Deadlock detected and broken! Victim: ${victim.title} (${victim.id}) returned to pending via policy ${policy}`);
        await this.checkForDeadlocks();
        return victim.id;
      }
    };
    module2.exports = OrchestrationDB2;
  }
});

// src/services/spoke-manager.js
var require_spoke_manager = __commonJS({
  "src/services/spoke-manager.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs");
    var path2 = require("path");
    var { spawn } = require("child_process");
    var { Client } = require("@modelcontextprotocol/sdk/client/index.js");
    var { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
    var { logger: logger3 } = require_logger();
    var SpokeManager2 = class {
      constructor(configPath, mockConfig = null) {
        this.spokes = /* @__PURE__ */ new Map();
        this.configPath = configPath || path2.join(process.cwd(), "spokes.json");
        this.config = mockConfig || this._loadConfig();
      }
      _loadConfig() {
        try {
          if (fs2.existsSync(this.configPath)) {
            const data = fs2.readFileSync(this.configPath, "utf8");
            return JSON.parse(data).spokes || {};
          }
        } catch (err) {
          logger3.error("SpokeManager", `Failed to load spokes config: ${err.message}`);
        }
        return {};
      }
      async initialize() {
        const promises = Object.entries(this.config).map(
          ([name, config]) => this._startSpoke(name, config)
        );
        await Promise.allSettled(promises);
        logger3.info("SpokeManager", `Initialized ${this.spokes.size} spokes`);
      }
      async _startSpoke(name, config) {
        try {
          const transport = this._createTransport(config);
          const client = this._createClient();
          await client.connect(transport);
          this.spokes.set(name, {
            client,
            transport,
            config,
            status: "connected"
          });
          logger3.info("SpokeManager", `Spoke '${name}' connected successfully.`);
          transport.onClose = () => {
            logger3.warn("SpokeManager", `Spoke '${name}' disconnected. Restarting...`);
            this.spokes.delete(name);
            setTimeout(() => this._startSpoke(name, config), 5e3);
          };
        } catch (err) {
          logger3.error("SpokeManager", `Failed to start spoke '${name}': ${err.message}`);
        }
      }
      async listAggregatedTools() {
        const allTools = [];
        for (const [name, spoke] of this.spokes.entries()) {
          if (spoke.status === "connected") {
            try {
              const response = await spoke.client.listTools();
              const tools = response.tools.map((tool) => ({
                ...tool,
                name: `${name}__${tool.name}`,
                // Prefix to avoid collision
                _originalName: tool.name,
                _spoke: name
              }));
              allTools.push(...tools);
            } catch (err) {
              logger3.error("SpokeManager", `Failed to list tools for spoke '${name}': ${err.message}`);
            }
          }
        }
        return allTools;
      }
      async callTool(prefixedName, args2) {
        const match = prefixedName.match(/^([a-zA-Z0-9_-]+)__(.+)$/);
        if (!match) {
          throw new Error(`Invalid proxy tool name format: ${prefixedName}`);
        }
        const [, spokeName, originalName] = match;
        const spoke = this.spokes.get(spokeName);
        if (!spoke || spoke.status !== "connected") {
          throw new Error(`Spoke '${spokeName}' is not connected or doesn't exist.`);
        }
        try {
          const result = await spoke.client.callTool({
            name: originalName,
            arguments: args2
          });
          return result;
        } catch (err) {
          throw new Error(`Spoke '${spokeName}' tool execution failed: ${err.message}`);
        }
      }
      getSpokeClient(name) {
        return this.spokes.get(name)?.client;
      }
      _createTransport(config) {
        return new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: { ...process.env, ...config.env || {} }
        });
      }
      _createClient() {
        return new Client(
          { name: "ase-hub-client", version: "1.0.0" },
          { capabilities: {} }
        );
      }
      shutdown() {
        for (const [name, spoke] of this.spokes.entries()) {
          try {
            spoke.transport.close();
          } catch (err) {
          }
        }
        this.spokes.clear();
      }
    };
    module2.exports = SpokeManager2;
  }
});

// src/services/tool-search.js
var require_tool_search = __commonJS({
  "src/services/tool-search.js"(exports2, module2) {
    "use strict";
    var { logger: logger3 } = require_logger();
    var TOOL_KEYWORDS = {
      get_health: ["health", "status", "alive", "uptime", "circuit", "breaker", "db", "integrity", "ok", "process", "memory", "ping"],
      get_model_config: ["model", "config", "temperature", "task", "type", "router", "prompt", "selection", "llm", "routing"],
      get_skill_session_report: [
        "report",
        "session",
        "summary",
        "token count",
        "telemetry",
        "session summary",
        "token usage",
        "how many tokens",
        "session stats",
        "what happened",
        "total tokens",
        "session total",
        "usage report",
        "session metrics",
        "cost so far"
      ],
      get_task_taxonomy: ["taxonomy", "task", "types", "category", "list", "architecture", "debugging", "implementation", "optimization", "security"],
      load_skill: ["load", "skill", "instructions", "markdown", "cache", "read", "file", "instruction", "set", "use"],
      log_skill_step: [
        "log",
        "record",
        "step",
        "write step",
        "written",
        "action entry",
        "execution step",
        "pipeline step",
        "append log",
        "mark step",
        "track action",
        "current step",
        "this step",
        "just happened",
        "now running",
        "active step",
        "file"
      ],
      query_skills: ["query", "skills", "semantic", "search", "cosine", "similarity", "tf-idf", "rank", "match", "find", "score"],
      update_project_rules: ["update", "rules", "project", "conventions", "custom", "preferences", "learn", "style", "ase-project", "json"],
      validate_output: ["validate", "output", "lint", "typecheck", "typescript", "tests", "verify", "build", "compile", "check", "errors"],
      claim_task: ["claim", "task", "next", "assign", "work", "queue", "graph"],
      complete_task: ["complete", "finish", "task", "done", "output", "unlock", "downstream"],
      create_task: ["create", "task", "seed", "graph", "dag", "dependency", "depends"],
      write_memory: ["write", "memory", "shared", "context", "state", "namespace", "save"],
      read_memory: ["read", "memory", "shared", "context", "state", "namespace", "load"],
      acquire_file_lock: ["acquire", "lock", "file", "conflict", "exclusive", "shared", "prevent", "overwrite"],
      release_file_lock: ["release", "lock", "file", "unlock", "free"],
      subscribe_events: ["subscribe", "events", "bus", "listen", "react", "notification"],
      poll_events: ["poll", "events", "bus", "read", "notification", "messages"],
      heartbeat: ["heartbeat", "ping", "alive", "liveness", "dead", "recovery", "timeout"],
      get_orchestration_state: ["orchestration", "state", "dashboard", "snapshot", "tasks", "agents", "locks", "bottleneck"]
    };
    var STOP_WORDS = /* @__PURE__ */ new Set([
      "the",
      "a",
      "an",
      "of",
      "and",
      "in",
      "to",
      "for",
      "is",
      "with",
      "by",
      "on",
      "at",
      "from",
      "it",
      "this",
      "that",
      "how",
      "what",
      "where",
      "why",
      "who",
      "your",
      "my",
      "our",
      "me",
      "i",
      "want",
      "should"
    ]);
    function tokenize(text) {
      if (!text) return [];
      return text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((word) => word.length > 0 && !STOP_WORDS.has(word));
    }
    function getFrequencies(words) {
      const freqs = {};
      for (const word of words) {
        freqs[word] = (freqs[word] || 0) + 1;
      }
      return freqs;
    }
    function scoreTool(queryTokens, queryFreq, tool) {
      const toolNameLower = tool.name.toLowerCase();
      const toolDescLower = tool.description.toLowerCase();
      const keywords = (TOOL_KEYWORDS[tool.name] || []).flatMap((k) => tokenize(k));
      const toolText = `${toolNameLower} ${toolDescLower} ${(TOOL_KEYWORDS[tool.name] || []).join(" ")}`;
      const toolTokens = tokenize(toolText);
      const toolFreq = getFrequencies(toolTokens);
      const uniqueWords = /* @__PURE__ */ new Set([...Object.keys(queryFreq), ...Object.keys(toolFreq)]);
      let dotProduct = 0;
      let normQuery = 0;
      let normTool = 0;
      for (const word of uniqueWords) {
        const valQ = queryFreq[word] || 0;
        const valT = toolFreq[word] || 0;
        dotProduct += valQ * valT;
        normQuery += valQ * valQ;
        normTool += valT * valT;
      }
      let score = 0;
      if (normQuery > 0 && normTool > 0) {
        score = dotProduct / (Math.sqrt(normQuery) * Math.sqrt(normTool));
      }
      let keywordMatches = 0;
      for (const token of queryTokens) {
        if (toolNameLower.includes(token)) {
          score += 0.4;
        }
        if (keywords.includes(token)) {
          keywordMatches++;
        }
      }
      if (keywordMatches > 0) {
        score += 0.3 * keywordMatches;
      }
      return score;
    }
    function findRelevantTools(query, topK, registry2, virtualKeyManager2 = null, virtualKey = null) {
      const queryTokens = tokenize(query);
      let tools = registry2.getSchemas();
      if (virtualKeyManager2) {
        tools = virtualKeyManager2.filterAuthorizedTools(virtualKey, tools);
      }
      if (queryTokens.length === 0) {
        return tools.slice(0, topK).map((t) => ({ ...t, relevance_score: 0.1 }));
      }
      const queryFreq = getFrequencies(queryTokens);
      const scoredTools = tools.map((tool) => {
        const score = scoreTool(queryTokens, queryFreq, tool);
        return {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          relevance_score: Math.min(1, parseFloat(score.toFixed(4))),
          raw_score: score
        };
      });
      scoredTools.sort((a, b) => {
        if (b.raw_score !== a.raw_score) {
          return b.raw_score - a.raw_score;
        }
        return a.name.localeCompare(b.name);
      });
      return scoredTools.slice(0, topK).map(({ raw_score, ...rest }) => rest);
    }
    module2.exports = {
      findRelevantTools,
      tokenize,
      scoreTool
    };
  }
});

// src/server/resources.js
var require_resources = __commonJS({
  "src/server/resources.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var { logger: logger3 } = require_logger();
    var metrics2 = require_metrics();
    var SKILLS_DIR = process.env.ASE_SKILLS_DIR || path2.resolve(__dirname, "../../../../../");
    function registerResourceHandlers2(server2, embeddingService2, skillCache2) {
      const {
        ListResourcesRequestSchema,
        ListResourceTemplatesRequestSchema,
        ReadResourceRequestSchema
      } = require("@modelcontextprotocol/sdk/types.js");
      server2.setRequestHandler(ListResourcesRequestSchema, async () => {
        const resources = [
          {
            uri: "health://status",
            name: "Server Health",
            description: "Live health status: circuit breaker state, DB integrity, skill count, uptime.",
            mimeType: "application/json"
          },
          {
            uri: "metrics://snapshot",
            name: "Metrics Snapshot",
            description: "Raw in-process metrics: counters and histogram percentiles (p50/p95/p99).",
            mimeType: "application/json"
          }
        ];
        try {
          const entries = await fs2.readdir(SKILLS_DIR, { withFileTypes: true });
          for (const dirent of entries) {
            if (dirent.isDirectory() && !dirent.name.startsWith(".") && dirent.name !== "tools" && dirent.name !== "docs") {
              resources.push({
                uri: `skill://${dirent.name}`,
                name: dirent.name,
                description: `Instruction set for the "${dirent.name}" skill.`,
                mimeType: "text/markdown"
              });
            }
          }
        } catch (err) {
          logger3.error("Resources", `Failed to read skills directory: ${err.message}`);
        }
        return { resources };
      });
      server2.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
        return {
          resourceTemplates: [
            {
              uriTemplate: "skill://{name}",
              name: "Skill Instruction Set",
              description: [
                "Retrieves the full SKILL.md (or README.md) for the named skill folder.",
                "Example: skill://modern-web-guidance",
                "Use list_resources first to discover available skill names."
              ].join(" "),
              mimeType: "text/markdown"
            }
          ]
        };
      });
      server2.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri;
        if (uri === "health://status") {
          const health = embeddingService2.healthSnapshot;
          const metricsSnapshot = metrics2.snapshot();
          const status = {
            server: "ase-mcp-server",
            version: "4.1.0",
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
              mimeType: "application/json",
              text: JSON.stringify(status, null, 2)
            }]
          };
        }
        if (uri === "metrics://snapshot") {
          const snap = metrics2.snapshot();
          return {
            contents: [{
              uri,
              mimeType: "application/json",
              text: JSON.stringify({
                captured_at: (/* @__PURE__ */ new Date()).toISOString(),
                uptime_seconds: Math.floor(process.uptime()),
                ...snap
              }, null, 2)
            }]
          };
        }
        if (uri.startsWith("skill://")) {
          const name = uri.substring(8);
          if (!name || name.includes("..") || name.includes("/")) {
            throw new Error(`Invalid skill name in URI: ${uri}`);
          }
          const skillData = await skillCache2.getSkillContent(name);
          if (!skillData) {
            throw new Error(`Resource not found: ${uri}`);
          }
          return {
            contents: [{
              uri,
              mimeType: "text/markdown",
              text: skillData.content
            }]
          };
        }
        throw new Error(`Unknown resource URI scheme: ${uri}`);
      });
    }
    module2.exports = { registerResourceHandlers: registerResourceHandlers2 };
  }
});

// src/services/project-prompt-generator.js
var require_project_prompt_generator = __commonJS({
  "src/services/project-prompt-generator.js"(exports2, module2) {
    "use strict";
    var fs2 = require("fs").promises;
    var path2 = require("path");
    var PROJECT_CONFIG_FILE = ".ase-project.json";
    var SCHEMA = {
      name: { type: "string", required: true, description: 'Project name (e.g. "my-saas-app")' },
      version: { type: "string", required: false, description: 'Semantic version (e.g. "1.2.0")' },
      description: { type: "string", required: true, description: "One-paragraph project description" },
      tech_stack: { type: "array", required: true, description: "Array of strings \u2014 each technology and its version" },
      conventions: { type: "array", required: true, description: "Array of coding convention strings" },
      architecture_patterns: { type: "array", required: false, description: "Array of architecture pattern strings in use" },
      file_structure: { type: "object", required: false, description: 'Map of directory \u2192 purpose (e.g. {"src/lib": "shared utilities"})' },
      testing_strategy: { type: "object", required: false, description: "Testing config: {framework, coverage_target, patterns}" },
      deployment: { type: "object", required: false, description: "Deployment config: {platform, branch_strategy, environments}" },
      sprint_focus: { type: "string", required: false, description: "Current sprint goal \u2014 guides the AI to prioritize relevant work" },
      sprint_skills: { type: "array", required: false, description: "Array of Agent Skills Pack skills relevant to the current sprint" },
      never_do: { type: "array", required: true, description: "Array of hard constraint strings \u2014 the AI must NEVER violate these" },
      preferred_patterns: { type: "array", required: false, description: "Array of preferred pattern strings \u2014 the AI should PREFER these" },
      agent_skills: { type: "object", required: false, description: "Agent Skills Pack configuration and reporting preferences" }
    };
    function validateConfig(config) {
      const errors = [];
      const warnings = [];
      for (const [field, rule] of Object.entries(SCHEMA)) {
        const value = config[field];
        if (rule.required && (value === void 0 || value === null || value === "")) {
          errors.push(`Missing required field "${field}": ${rule.description}`);
          continue;
        }
        if (value === void 0 || value === null) continue;
        if (rule.type === "string" && typeof value !== "string") {
          errors.push(`"${field}" must be a string, got ${typeof value}`);
        }
        if (rule.type === "array" && !Array.isArray(value)) {
          errors.push(`"${field}" must be an array, got ${typeof value}`);
        } else if (rule.type === "array" && Array.isArray(value) && value.length === 0) {
          warnings.push(`"${field}" is an empty array \u2014 consider populating it`);
        }
        if (rule.type === "object" && (typeof value !== "object" || Array.isArray(value))) {
          errors.push(`"${field}" must be an object, got ${Array.isArray(value) ? "array" : typeof value}`);
        }
      }
      for (const key of Object.keys(config)) {
        if (key.startsWith("_")) continue;
        if (!SCHEMA[key]) {
          warnings.push(`Unrecognized field "${key}" \u2014 check for typos (valid fields: ${Object.keys(SCHEMA).join(", ")})`);
        }
      }
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    }
    async function findProjectConfig(startDir) {
      let dir = startDir || process.cwd();
      const root = path2.parse(dir).root;
      const envAllowed = process.env.ASE_ALLOWED_DIRS ? process.env.ASE_ALLOWED_DIRS.split(",") : [];
      const allowedRoots = envAllowed.map((d) => path2.resolve(d.trim()));
      while (dir !== root) {
        if (allowedRoots.length > 0) {
          const isAllowed = allowedRoots.some((r) => dir === r || dir.startsWith(r + path2.sep));
          if (!isAllowed) break;
        }
        const candidate = path2.join(dir, PROJECT_CONFIG_FILE);
        try {
          await fs2.access(candidate);
          return candidate;
        } catch (err) {
          if (err.code !== "ENOENT") {
            require_logger().logger.warn("PromptGenerator", `Access check failed for ${candidate}: ${err.message}`);
          }
        }
        dir = path2.dirname(dir);
      }
      return null;
    }
    async function generateProjectPrompt(projectDir) {
      const configPath = await findProjectConfig(projectDir || process.cwd());
      if (!configPath) {
        return {
          error: `No ${PROJECT_CONFIG_FILE} found. Create one in your project root.`,
          hint: 'Run "ase-init" in your project directory to auto-generate one.',
          template: getConfigTemplate()
        };
      }
      let raw;
      try {
        raw = await fs2.readFile(configPath, "utf8");
      } catch (err) {
        return { error: `Cannot read ${configPath}: ${err.message}` };
      }
      let config;
      try {
        config = JSON.parse(raw);
      } catch (err) {
        return { error: `Invalid JSON in ${configPath}: ${err.message}` };
      }
      const validation = validateConfig(config);
      if (!validation.valid) {
        return {
          error: `Schema validation failed for ${configPath}`,
          validation,
          hint: "Fix the errors above, then retry."
        };
      }
      const lines = [];
      lines.push(`# Project: ${config.name}`);
      if (config.version) lines.push(`Version: ${config.version}`);
      lines.push("");
      if (config.sprint_focus) {
        lines.push("## \u{1F3AF} Current Sprint Focus");
        lines.push(`> ${config.sprint_focus}`);
        if (config.sprint_skills && config.sprint_skills.length) {
          lines.push("");
          lines.push(`**Relevant Sprint Skills**: ${config.sprint_skills.join(", ")}`);
        }
        lines.push("");
      }
      lines.push("## Description");
      lines.push(config.description);
      lines.push("");
      lines.push("## Tech Stack");
      for (const tech of config.tech_stack) {
        lines.push(`- ${tech}`);
      }
      lines.push("");
      lines.push("## Coding Conventions");
      for (const conv of config.conventions) {
        lines.push(`- ${conv}`);
      }
      lines.push("");
      if (config.architecture_patterns && config.architecture_patterns.length) {
        lines.push("## Architecture Patterns");
        for (const pattern of config.architecture_patterns) {
          lines.push(`- ${pattern}`);
        }
        lines.push("");
      }
      if (config.file_structure && typeof config.file_structure === "object") {
        lines.push("## File Structure");
        for (const [dir, purpose] of Object.entries(config.file_structure)) {
          lines.push(`- \`${dir}/\` \u2014 ${purpose}`);
        }
        lines.push("");
      }
      if (config.testing_strategy) {
        lines.push("## Testing Strategy");
        const ts = config.testing_strategy;
        if (ts.framework) lines.push(`- Framework: ${ts.framework}`);
        if (ts.coverage_target) lines.push(`- Coverage target: ${ts.coverage_target}`);
        if (ts.patterns && Array.isArray(ts.patterns)) {
          for (const p of ts.patterns) {
            lines.push(`- ${p}`);
          }
        }
        lines.push("");
      }
      if (config.deployment) {
        lines.push("## Deployment");
        const dep = config.deployment;
        if (dep.platform) lines.push(`- Platform: ${dep.platform}`);
        if (dep.branch_strategy) lines.push(`- Branch strategy: ${dep.branch_strategy}`);
        if (dep.environments && Array.isArray(dep.environments)) {
          lines.push(`- Environments: ${dep.environments.join(", ")}`);
        }
        lines.push("");
      }
      lines.push("## \u26D4 NEVER Do the Following");
      lines.push("> Violating ANY of these will break the project. Treat as non-negotiable.");
      for (const rule of config.never_do) {
        lines.push(`- \u274C ${rule}`);
      }
      lines.push("");
      if (config.preferred_patterns && config.preferred_patterns.length) {
        lines.push("## \u2705 Always Prefer These Patterns");
        for (const pref of config.preferred_patterns) {
          lines.push(`- ${pref}`);
        }
        lines.push("");
      }
      if (config.agent_skills) {
        lines.push("## \u{1F916} Agent Workflow");
        const skills = config.agent_skills;
        if (skills.directory) lines.push(`- **Skills Directory**: ${skills.directory}`);
        if (skills.default_skills && skills.default_skills.length) {
          lines.push(`- **Default Skills to Load**: ${skills.default_skills.join(", ")}`);
        }
        if (skills.mandatory_skills) {
          const triggers = Object.entries(skills.mandatory_skills).map(([k, v]) => `${k} files -> ${v}`).join(", ");
          lines.push(`- **Mandatory Skills**: ${triggers}`);
        }
        if (skills.session_reporting_preference !== void 0) {
          lines.push(`- **Session Reporting**: ${skills.session_reporting_preference ? "Yes (Call get_skill_session_report at session end)" : "No"}`);
        }
        lines.push("");
      }
      const prompt = lines.join("\n");
      return {
        config_path: configPath,
        project_name: config.name,
        prompt,
        prompt_token_estimate: Math.ceil(prompt.length / 4),
        validation
      };
    }
    function getConfigTemplate() {
      return {
        name: "my-project",
        version: "1.0.0",
        description: "One-paragraph description of what this project does and who it serves.",
        tech_stack: [
          "Next.js 15 (App Router)",
          "TypeScript 5.5",
          "PostgreSQL 16 via Drizzle ORM",
          "Tailwind CSS v4",
          "Vercel Deployment"
        ],
        conventions: [
          "All components use named exports, never default exports",
          "Database queries live exclusively in /lib/db/*.ts",
          "API routes use Route Handlers in /app/api/**/*.ts",
          "Zod schemas validate all external input"
        ],
        architecture_patterns: [
          "Server Components for data fetching, Client Components for interactivity only",
          "Repository pattern for database access",
          "Feature-based folder structure under /features"
        ],
        file_structure: {
          "src/app": "Next.js App Router pages and layouts",
          "src/features": "Feature modules with co-located components, hooks, and types",
          "src/lib": "Shared utilities, database client, auth helpers",
          "src/components/ui": "Reusable UI primitives (Button, Modal, Input)",
          "tests": "Test files mirroring src/ structure"
        },
        testing_strategy: {
          framework: "Vitest + React Testing Library",
          coverage_target: "80%",
          patterns: [
            "Unit tests for all utility functions",
            "Integration tests for API routes",
            "Component tests for interactive UI elements"
          ]
        },
        deployment: {
          platform: "Vercel",
          branch_strategy: "main \u2192 production, dev \u2192 preview",
          environments: ["development", "staging", "production"]
        },
        sprint_focus: "Building the user onboarding flow with email verification and profile setup.",
        sprint_skills: [
          "lifecycle/security-and-hardening",
          "lifecycle/api-and-interface-design",
          "lifecycle/test-driven-development"
        ],
        never_do: [
          "Never use useEffect for data fetching \u2014 use Server Components or SWR",
          "Never store secrets in .env files committed to git",
          "Never use inline styles \u2014 always use Tailwind classes",
          "Never use `any` TypeScript type \u2014 always type explicitly",
          "Never mix database queries into React components"
        ],
        preferred_patterns: [
          "Use Zod for all schema validation",
          "Use Drizzle ORM for all database access",
          "Use server actions for mutations",
          "Use Next.js Image component for all images"
        ],
        agent_skills: {
          directory: "/home/thor/skiils",
          default_skills: [
            "lifecycle/using-agent-skills",
            "lifecycle/context-engineering"
          ],
          mandatory_skills: {
            api: "lifecycle/api-and-interface-design",
            auth: "lifecycle/security-and-hardening"
          },
          session_reporting_preference: true
        }
      };
    }
    module2.exports = { generateProjectPrompt, findProjectConfig, getConfigTemplate, validateConfig };
  }
});

// src/server/prompts.js
var require_prompts = __commonJS({
  "src/server/prompts.js"(exports2, module2) {
    "use strict";
    var { generateProjectPrompt } = require_project_prompt_generator();
    function registerPromptHandlers2(server2) {
      const {
        ListPromptsRequestSchema,
        GetPromptRequestSchema
      } = require("@modelcontextprotocol/sdk/types.js");
      server2.setRequestHandler(ListPromptsRequestSchema, async () => {
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
            },
            {
              name: "code_review",
              description: "Generates a comprehensive code review checklist prompt for a given code snippet or file path.",
              arguments: [
                {
                  name: "file_path",
                  description: "Optional. Path to the file being reviewed. Used to provide context.",
                  required: false
                },
                {
                  name: "focus",
                  description: 'Optional. Focus area for the review: "security", "performance", "architecture", "style", or "all". Defaults to "all".',
                  required: false
                }
              ]
            }
          ]
        };
      });
      server2.setRequestHandler(GetPromptRequestSchema, async (request) => {
        const { name, arguments: args2 } = request.params;
        if (name === "project_prompt") {
          const dir = args2?.project_dir || process.cwd();
          const promptData = await generateProjectPrompt(dir);
          if (promptData.error) {
            throw new Error(`Failed to generate prompt: ${promptData.error}`);
          }
          return {
            description: "ASE Project System Prompt",
            messages: [
              {
                role: "user",
                content: { type: "text", text: promptData.prompt }
              }
            ]
          };
        }
        if (name === "code_review") {
          const filePath = args2?.file_path || "(not specified)";
          const focus = args2?.focus || "all";
          const focusInstructions = {
            security: "Focus exclusively on security vulnerabilities: injection, auth bypass, secrets exposure, input validation, CSRF, XSS, and data sanitization.",
            performance: "Focus exclusively on performance: algorithmic complexity, N+1 queries, caching opportunities, memory leaks, and async bottlenecks.",
            architecture: "Focus exclusively on architectural concerns: SOLID principles, coupling, cohesion, testability, separation of concerns, and design patterns.",
            style: "Focus exclusively on code style: naming conventions, readability, documentation, dead code, and consistency with project conventions.",
            all: "Cover all dimensions: correctness, security, performance, architecture, style, and test coverage."
          };
          const prompt = [
            `# Code Review Request`,
            ``,
            `**File**: \`${filePath}\``,
            `**Review Focus**: ${focus}`,
            ``,
            `## Instructions`,
            focusInstructions[focus] || focusInstructions.all,
            ``,
            `## Review Checklist`,
            `For each finding, provide:`,
            `- **Severity**: critical / high / medium / low / info`,
            `- **Location**: Line number or function name`,
            `- **Issue**: Clear description of the problem`,
            `- **Recommendation**: Specific, actionable fix`,
            ``,
            `## Additional Context`,
            `- Check for any deviations from patterns established in .ase-project.json`,
            `- Flag any hardcoded secrets, credentials, or absolute paths`,
            `- Note any missing error handling or unguarded async operations`
          ].join("\n");
          return {
            description: `Code Review Prompt \u2014 ${focus} focus`,
            messages: [
              {
                role: "user",
                content: { type: "text", text: prompt }
              }
            ]
          };
        }
        throw new Error(`Unknown prompt: ${name}`);
      });
    }
    module2.exports = { registerPromptHandlers: registerPromptHandlers2 };
  }
});

// src/core/Cache.ts
var Cache_exports = {};
__export(Cache_exports, {
  SessionToolCache: () => SessionToolCache
});
var SessionToolCache;
var init_Cache = __esm({
  "src/core/Cache.ts"() {
    "use strict";
    SessionToolCache = class {
      cache = /* @__PURE__ */ new Map();
      get(name, args2) {
        const key = name;
        const entry = this.cache.get(key);
        if (!entry) return null;
        const argsStr = JSON.stringify(args2 || {});
        if (entry.argsStr !== argsStr) return null;
        return entry.result;
      }
      set(name, args2, result) {
        const argsStr = JSON.stringify(args2 || {});
        this.cache.set(name, { argsStr, result, timestamp: Date.now() });
      }
    };
  }
});

// src/transports/http-keepalive.js
var require_http_keepalive = __commonJS({
  "src/transports/http-keepalive.js"(exports2, module2) {
    "use strict";
    var http2 = require("http");
    var crypto4 = require("crypto");
    var { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
    var { logger: logger3 } = require_logger();
    var Redis2 = require("ioredis");
    var OrchestrationDB2 = require_orchestration_db();
    var { AsyncLocalStorage } = require("async_hooks");
    var httpContextStorage = new AsyncLocalStorage();
    async function startHttpTransport(mcpServer, port = 3100) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto4.randomUUID()
      });
      const httpServer = http2.createServer(async (req, res) => {
        httpContextStorage.run({ req, res }, async () => {
          const requiredToken = process.env.ASE_HTTP_TOKEN;
          if (requiredToken) {
            const authHeader = req.headers.authorization;
            if (!authHeader || authHeader !== `Bearer ${requiredToken}`) {
              res.writeHead(401, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing Bearer token" }));
              return;
            }
          }
          res.setHeader("Connection", "keep-alive");
          res.setHeader("Keep-Alive", "timeout=120, max=1000");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
          const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
          if (parsedUrl.pathname === "/events" && req.method === "GET") {
            const agentId = parsedUrl.searchParams.get("agent_id");
            if (!agentId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "agent_id query parameter is required" }));
              return;
            }
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
              "Access-Control-Allow-Origin": "*"
            });
            res.write(": ok\n\n");
            const redisUrl = process.env.ASE_REDIS_URL || "redis://127.0.0.1:6379";
            const subRedis = new Redis2(redisUrl, { maxRetriesPerRequest: null });
            subRedis.subscribe("ase:events").catch((err) => {
              logger3.error("HTTP-SSE", `Redis subscribe failed: ${err.message}`);
            });
            const onMessage = (channel, message) => {
              try {
                const event = JSON.parse(message);
                const db = OrchestrationDB2.getInstance().getDB();
                const sub = db.prepare(
                  `SELECT 1 FROM event_subscriptions WHERE agent_id = ? AND event_type = ?`
                ).get(agentId, event.type);
                if (sub) {
                  res.write(`data: ${message}

`);
                }
              } catch (err) {
                logger3.error("HTTP-SSE", `SSE message error: ${err.message}`);
              }
            };
            subRedis.on("message", onMessage);
            req.on("close", () => {
              subRedis.disconnect().catch(() => {
              });
            });
            return;
          }
          if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
          }
          try {
            await transport.handleRequest(req, res);
          } catch (err) {
            logger3.error("HTTP", `Request handling error: ${err.message}`);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end(JSON.stringify({ error: err.message }));
            }
          }
        });
      });
      httpServer.keepAliveTimeout = 12e4;
      httpServer.headersTimeout = 125e3;
      httpServer.maxHeadersCount = 100;
      return new Promise((resolve, reject) => {
        httpServer.listen(port, "127.0.0.1", () => {
          logger3.info("HTTP", `MCP server listening on http://127.0.0.1:${port}`);
          logger3.info("HTTP", `Keep-Alive: timeout=120s, max=1000 requests`);
          if (!process.env.ASE_HTTP_TOKEN) {
            logger3.warn("Security", "HTTP transport is running UNAUTHENTICATED. Set ASE_HTTP_TOKEN to enable Bearer auth.");
          }
          mcpServer.connect(transport).then(() => {
            resolve({ httpServer, transport });
          }).catch(reject);
        });
        httpServer.on("error", reject);
      });
    }
    module2.exports = { startHttpTransport, httpContextStorage };
  }
});

// src/transports/buffered-stdio.js
var require_buffered_stdio = __commonJS({
  "src/transports/buffered-stdio.js"(exports2, module2) {
    "use strict";
    var { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
    var BufferedStdioTransport = class extends StdioServerTransport {
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
        for (const item of batch) {
          await super.send(item.message, item.options);
        }
      }
    };
    module2.exports = { BufferedStdioTransport };
  }
});

// ase-mcp-server.ts
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_dotenv = __toESM(require("dotenv"));
var import_crypto3 = __toESM(require("crypto"));
var import_http = __toESM(require("http"));
var import_server = require("@modelcontextprotocol/sdk/server/index.js");
var import_types = require("@modelcontextprotocol/sdk/types.js");

// src/core/Container.ts
var Container = class {
  services = /* @__PURE__ */ new Map();
  register(name, instance) {
    this.services.set(name, instance);
  }
  resolve(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found in container: ${name}`);
    }
    return service;
  }
  has(name) {
    return this.services.has(name);
  }
};

// src/services/redis-service.ts
var import_ioredis = __toESM(require("ioredis"));
var { logger } = require_logger();
var RedisService = class {
  client;
  constructor() {
    const url = process.env.ASE_REDIS_URL || "redis://127.0.0.1:6379";
    this.client = new import_ioredis.default(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    });
    this.client.on("connect", () => {
      logger.info("Redis", `Connected to Redis at ${url}`);
    });
    this.client.on("error", (err) => {
      logger.error("Redis", `Redis connection error: ${err.message}`);
    });
  }
  getClient() {
    return this.client;
  }
  async close() {
    await this.client.quit();
  }
};

// src/server/handlers.ts
var import_crypto2 = __toESM(require("crypto"));

// src/middleware/Pipeline.ts
var Pipeline = class {
  middlewares = [];
  use(middleware) {
    this.middlewares.push(middleware);
    return this;
  }
  async execute(context) {
    let index = -1;
    const dispatch = async (i) => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      if (i === this.middlewares.length) {
        return;
      }
      const middleware = this.middlewares[i];
      await middleware.handle(context, () => dispatch(i + 1));
    };
    await dispatch(0);
    if (!context.handled) {
      throw new Error(`Unhandled tool call: ${context.name}`);
    }
    return context.result;
  }
};

// src/middleware/AuthMiddleware.ts
var import_crypto = __toESM(require("crypto"));
var AuthMiddleware = class {
  async handle(context, next) {
    const { name, args: args2 } = context;
    if (name === "register_agent") {
      await next();
      return;
    }
    const virtualKeyManager2 = context.container.resolve("VirtualKeyManager");
    const virtualKey = process.env.MCP_VIRTUAL_KEY;
    if (virtualKey && !virtualKeyManager2.isAuthorized(virtualKey, name)) {
      context.result = {
        content: [{ type: "text", text: `Gateway Security Error: Unauthorized access to tool '${name}'` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    const tokenSecret2 = context.container.resolve("TokenSecret");
    const agentToken = args2?.agent_token;
    if (!agentToken || typeof agentToken !== "string") {
      context.result = {
        content: [{ type: "text", text: `Authentication Error: Missing 'agent_token' for tool '${name}'` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    const parts = agentToken.split(".");
    if (parts.length !== 2) {
      context.result = {
        content: [{ type: "text", text: `Authentication Error: Invalid 'agent_token' format` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    const [base64Payload, signature] = parts;
    const computedSignature = import_crypto.default.createHmac("sha256", tokenSecret2).update(base64Payload).digest("base64");
    const sigBuffer = Buffer.from(signature, "base64");
    const computedBuffer = Buffer.from(computedSignature, "base64");
    if (sigBuffer.length !== computedBuffer.length || !import_crypto.default.timingSafeEqual(sigBuffer, computedBuffer)) {
      context.result = {
        content: [{ type: "text", text: `Authentication Error: Invalid signature on 'agent_token'` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    let payload;
    try {
      const json = Buffer.from(base64Payload, "base64").toString("utf8");
      payload = JSON.parse(json);
    } catch (err) {
      context.result = {
        content: [{ type: "text", text: `Authentication Error: Failed to parse 'agent_token' payload` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    const now = Math.floor(Date.now() / 1e3);
    if (payload.expires_at && payload.expires_at < now) {
      context.result = {
        content: [{ type: "text", text: `Authentication Error: 'agent_token' has expired` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    const capabilities = payload.capabilities || [];
    const isAuthorized = capabilities.includes("*") || capabilities.includes(name);
    if (!isAuthorized) {
      context.result = {
        content: [{ type: "text", text: `Authorization Error: Agent role '${payload.role}' does not possess capability to invoke tool '${name}'` }],
        isError: true
      };
      context.handled = true;
      return;
    }
    context.extra = {
      ...context.extra,
      agentId: payload.session_id,
      agentRole: payload.role
    };
    await next();
  }
};

// src/middleware/SpokeProxyMiddleware.ts
var SpokeProxyMiddleware = class {
  async handle(context, next) {
    if (context.name.includes("__")) {
      const spokeManager2 = context.container.resolve("SpokeManager");
      try {
        const result = await spokeManager2.callTool(context.name, context.args || {});
        context.result = result;
        context.handled = true;
      } catch (err) {
        context.result = {
          content: [{ type: "text", text: JSON.stringify({ error: err.message, req_id: context.reqId }) }],
          isError: true
        };
        context.handled = true;
      }
      return;
    }
    await next();
  }
};

// src/middleware/CacheMiddleware.ts
var CacheMiddleware = class {
  async handle(context, next) {
    const cache = context.container.resolve("SessionToolCache");
    const cachedResult = cache.get(context.name, context.args);
    if (cachedResult) {
      context.result = {
        content: [{ type: "text", text: `[CACHED]
${JSON.stringify(cachedResult, null, 2)}` }]
      };
      context.handled = true;
      return;
    }
    await next();
    if (context.handled && !context.isError && context.result) {
      cache.set(context.name, context.args, context.result);
    }
  }
};

// src/middleware/ToolExecutionMiddleware.ts
var ToolExecutionMiddleware = class {
  async handle(context, next) {
    const registry2 = context.container.resolve("ToolRegistry");
    if (context.name === "search_tools") {
      const toolSearch = context.container.resolve("ToolSearch");
      try {
        const results = toolSearch.findRelevantTools(context.args?.query, context.args?.top_k || 4, registry2);
        context.result = { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
      } catch (err) {
        context.result = { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }], isError: true };
      }
      context.handled = true;
      return;
    }
    const tool = registry2.get(context.name);
    if (!tool) {
      context.result = { content: [{ type: "text", text: `Tool not found: ${context.name}` }], isError: true };
      context.handled = true;
      return;
    }
    try {
      let rawResult;
      if (tool.validateAndExecute) {
        rawResult = await tool.validateAndExecute(context.args, {
          container: context.container,
          reqId: context.reqId
        });
      } else {
        rawResult = await tool.handler(context.args || {}, { reqId: context.reqId });
      }
      context.result = { content: [{ type: "text", text: JSON.stringify(rawResult, null, 2) }] };
      context.handled = true;
    } catch (err) {
      context.result = { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }], isError: true };
      context.isError = true;
      context.handled = true;
    }
    await next();
  }
};

// src/middleware/MetricsMiddleware.ts
var MetricsMiddleware = class {
  async handle(context, next) {
    const metrics2 = context.container.resolve("Metrics");
    const sessionState2 = context.container.resolve("SessionState");
    metrics2.inc("tool_calls_total", context.name);
    metrics2.inc("tool_calls_total");
    const startMs = Date.now();
    let isError = false;
    try {
      await next();
    } catch (err) {
      isError = true;
      metrics2.inc("tool_errors_total", context.name);
      metrics2.inc("tool_errors_total");
      throw err;
    } finally {
      const durationMs = Date.now() - startMs;
      metrics2.record("tool_call_duration_ms", durationMs, context.name);
      metrics2.record("tool_call_duration_ms", durationMs);
      if (sessionState2 && typeof sessionState2.logToolCall === "function") {
        sessionState2.logToolCall(context.name, durationMs, isError);
      }
      try {
        const orch = context.container.resolve("OrchestrationDB");
        if (orch) {
          const redis = orch.getRedisClient();
          const thresholdsRaw = await redis.get("ase:alert_thresholds");
          if (thresholdsRaw) {
            const thresholds = JSON.parse(thresholdsRaw);
            const summary = metrics2.summarize("tool_call_duration_ms");
            const p99 = summary && typeof summary.p99 === "number" ? summary.p99 : 0;
            const totalCalls = metrics2.getCount("tool_calls_total") || 0;
            const totalErrors = metrics2.getCount("tool_errors_total") || 0;
            const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;
            const hits = (metrics2.getCount("cache_hits") || 0) + (metrics2.getCount("skill_cache_hits") || 0);
            const misses = (metrics2.getCount("cache_misses") || 0) + (metrics2.getCount("skill_cache_misses") || 0);
            const totalCache = hits + misses;
            const cacheHitRatio = totalCache > 0 ? hits / totalCache : 1;
            let breached = false;
            if (thresholds.p99_latency_ms !== void 0 && p99 > thresholds.p99_latency_ms) breached = true;
            if (thresholds.max_error_rate !== void 0 && errorRate > thresholds.max_error_rate) breached = true;
            if (thresholds.min_cache_hit_ratio !== void 0 && cacheHitRatio < thresholds.min_cache_hit_ratio) breached = true;
            const prevDegraded = await redis.get("ase:system_degraded") === "true";
            if (breached) {
              if (!prevDegraded) {
                await redis.set("ase:system_degraded", "true");
                orch.emitEvent("system_degraded", { p99, errorRate, cacheHitRatio });
              }
            } else {
              if (prevDegraded) {
                await redis.set("ase:system_degraded", "false");
                orch.emitEvent("system_recovered", { p99, errorRate, cacheHitRatio });
              }
            }
          }
        }
      } catch (e) {
      }
    }
  }
};

// src/server/handlers.ts
function createToolCallHandler(container2) {
  const pipeline = new Pipeline().use(new MetricsMiddleware()).use(new AuthMiddleware()).use(new SpokeProxyMiddleware()).use(new CacheMiddleware()).use(new ToolExecutionMiddleware());
  return async (request, extra) => {
    let { name, arguments: toolArgs } = request.params;
    const reqId = import_crypto2.default.randomUUID();
    if (name === "invoke_tool") {
      name = toolArgs?.tool_name;
      toolArgs = toolArgs?.tool_input;
    }
    const context = {
      container: container2,
      reqId,
      name,
      args: toolArgs,
      extra
    };
    try {
      const result = await pipeline.execute(context);
      return result;
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message, req_id: reqId }) }],
        isError: true
      };
    }
  };
}

// ase-mcp-server.ts
var envPath = import_fs.default.existsSync(import_path.default.join(__dirname, ".env")) ? import_path.default.join(__dirname, ".env") : import_path.default.join(__dirname, "..", ".env");
import_dotenv.default.config({ path: envPath, quiet: true });
var ToolRegistry = require_registry();
var SkillCache = require_cache();
var WorkerPool = require_worker_pool();
var EmbeddingService = require_embedding_service();
var SessionState = require_session_state();
var KnowledgeGraphService = require_knowledge_graph_service();
var ASTIndexer = require_ast_indexer();
var MCTSEngine = require_mcts_engine();
var MemoryService = require_memory_service();
var VirtualKeyManager = require_virtual_key_manager();
var OrchestrationDB = require_orchestration_db();
var SpokeManager = require_spoke_manager();
var ToolSearch = require_tool_search();
var { logger: logger2 } = require_logger();
var metrics = require_metrics();
var { registerResourceHandlers } = require_resources();
var { registerPromptHandlers } = require_prompts();
var args = process.argv.slice(2);
var useHttp = args.includes("--http");
var portFlag = args.find((a, i) => args[i - 1] === "--port");
var httpPort = portFlag ? parseInt(portFlag, 10) : parseInt(process.env.ASE_HTTP_PORT || "3100", 10);
var metricsPort = parseInt(process.env.ASE_METRICS_PORT || "9090", 10);
var container = new Container();
var tokenSecret = import_crypto3.default.randomBytes(32).toString("hex");
container.register("TokenSecret", tokenSecret);
var serverSessionId = import_crypto3.default.randomUUID();
var workerPool = new WorkerPool();
var registry = new ToolRegistry();
var skillCache = new SkillCache();
var embeddingService = new EmbeddingService(workerPool);
var sessionState = new SessionState(serverSessionId);
var knowledgeGraphService = new KnowledgeGraphService();
var astIndexer = new ASTIndexer(knowledgeGraphService);
var mctsEngine = new MCTSEngine(knowledgeGraphService, embeddingService);
var memoryService = new MemoryService(workerPool);
var virtualKeyManager = new VirtualKeyManager();
var orchestrationDb = OrchestrationDB.getInstance();
var spokeManager = new SpokeManager();
var redisService = new RedisService();
spokeManager.initialize().catch((err) => {
  logger2.error("Server", `Failed to initialize Spoke Manager: ${err.message}`);
});
container.register("WorkerPool", workerPool);
container.register("ToolRegistry", registry);
container.register("SkillCache", skillCache);
container.register("EmbeddingService", embeddingService);
container.register("SessionState", sessionState);
container.register("KnowledgeGraphService", knowledgeGraphService);
container.register("ASTIndexer", astIndexer);
container.register("MCTSEngine", mctsEngine);
container.register("MemoryService", memoryService);
container.register("VirtualKeyManager", virtualKeyManager);
container.register("OrchestrationDB", orchestrationDb);
container.register("SpokeManager", spokeManager);
container.register("Redis", redisService);
container.register("ToolSearch", ToolSearch);
container.register("Metrics", metrics);
container.register("SessionToolCache", new (init_Cache(), __toCommonJS(Cache_exports)).SessionToolCache());
var deps = {
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
var server = new import_server.Server(
  { name: "ase-mcp-server", version: "4.2.0-max-level" },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      logging: {}
    }
  }
);
var serverRoot = __dirname.endsWith("dist") ? import_path.default.join(__dirname, "..") : __dirname;
var toolsDir = import_path.default.join(serverRoot, "src", "tools");
registry.loadToolsFromDirectory(toolsDir, deps);
var searchToolsSchema = {
  name: "search_tools",
  description: 'Search for available tools by describing what you want to do. Returns the most relevant tool schemas. Call this first before calling any other tool. Example: search_tools("run lint and tests to validate code")',
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Description of the task or action you want to perform." },
      top_k: { type: "number", description: "Optional. Maximum number of tools to return. Defaults to 4." }
    },
    required: ["query"]
  }
};
var invokeToolSchema = {
  name: "invoke_tool",
  description: "Invoke a specific tool by name with its parameters. First call search_tools to find the correct tool name and parameters.",
  inputSchema: {
    type: "object",
    properties: {
      tool_name: { type: "string", description: "The exact name of the tool to invoke." },
      tool_input: { type: "object", description: "The arguments/parameters to pass to the tool." }
    },
    required: ["tool_name", "tool_input"]
  }
};
server.setRequestHandler(import_types.ListToolsRequestSchema, async () => {
  const spokeTools = await spokeManager.listAggregatedTools();
  return {
    tools: [searchToolsSchema, invokeToolSchema, ...spokeTools]
  };
});
server.setRequestHandler(
  import_types.CallToolRequestSchema,
  createToolCallHandler(container)
);
registerResourceHandlers(server, embeddingService, skillCache);
registerPromptHandlers(server);
server.setRequestHandler(import_types.PingRequestSchema, async () => ({}));
async function warmEmbeddingModel() {
  const startTime = Date.now();
  try {
    await embeddingService.embed("warmup");
    logger2.info({ warmup_ms: Date.now() - startTime }, "embedding_model_warmed");
  } catch (err) {
    logger2.warn({ err }, "embedding_warmup_failed_circuit_breaker_will_handle");
  }
}
setTimeout(() => {
  warmEmbeddingModel();
  embeddingService.syncSkillsBackground().then(() => {
    server.notification({ method: "notifications/tools/list_changed" }).catch((err) => {
      logger2.debug("Server", `Could not send list_changed notification: ${err.message}`);
    });
  }).catch((err) => {
    logger2.error("Server", `Background embedding sync failed: ${err.message}`);
  });
}, 2e3);
knowledgeGraphService.initializeSchema().catch((err) => {
  logger2.error("Server", `Failed to initialize Knowledge Graph schema: ${err.message}`);
});
var metricsServer = import_http.default.createServer((req, res) => {
  if (req.url === "/metrics" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(metrics.snapshot(), null, 2));
  } else {
    res.writeHead(404);
    res.end();
  }
});
metricsServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger2.warn("Server", `Port ${metricsPort} is in use. Metrics server will not be available in this instance.`);
  } else {
    logger2.error("Server", `Metrics server error: ${err.message}`);
  }
});
metricsServer.listen(metricsPort, "127.0.0.1", () => {
  logger2.info("Server", `Metrics server listening on 127.0.0.1:${metricsPort}`);
});
if (useHttp) {
  const { startHttpTransport } = require_http_keepalive();
  startHttpTransport(server, httpPort).catch((err) => {
    logger2.error("Transport", `Fatal: Failed to start HTTP transport: ${err.message}`);
    process.exit(1);
  });
} else {
  const { BufferedStdioTransport } = require_buffered_stdio();
  const transport = new BufferedStdioTransport();
  server.connect(transport).catch((err) => {
    logger2.error("Transport", `Fatal: Failed to connect StdioServerTransport: ${err.message}`);
    process.exit(1);
  });
}
if (process.env.NODE_ENV === "development") {
  const chokidar = require("chokidar");
  const watcher = chokidar.watch(import_path.default.join(serverRoot, "src", "tools"), {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
  });
  watcher.on("change", (filePath) => {
    if (!filePath.endsWith(".js") && !filePath.endsWith(".ts")) return;
    logger2.info("Server", { filePath }, "tool_file_changed_reloading");
    try {
      delete require.cache[require.resolve(filePath)];
      registry.loadToolsFromDirectory(import_path.default.join(serverRoot, "src", "tools"), deps);
      server.notification({ method: "notifications/tools/list_changed", params: {} });
      logger2.info("Server", "notified_client_tools_list_changed");
    } catch (err) {
      logger2.error("Server", `Failed to reload tools: ${err.message}`);
    }
  });
  watcher.on("error", (err) => {
    logger2.error("Server", `chokidar watch error: ${err.message}`);
  });
  logger2.info("Server", `Hot-reload active (chokidar) \u2014 watching: src/tools/`);
}
