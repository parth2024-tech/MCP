/**
 * KnowledgeGraphService — Neo4j driver wrapper with circuit breaker protection.
 *
 * Configuration is exclusively via environment variables (no hardcoded credentials):
 *   NEO4J_URI      — Bolt URI (default: neo4j://127.0.0.1:7687)
 *   NEO4J_USER     — Auth username (default: neo4j)
 *   NEO4J_PASSWORD — Auth password (REQUIRED in production)
 *
 * Startup guard: if NEO4J_PASSWORD === 'password' in non-development environments,
 * the process logs a prominent error and refuses to continue.
 */

const neo4j = require('neo4j-driver');
const { logger } = require('../utils/logger');
const CircuitBreaker = require('./circuit-breaker');

// ─────────────────────────────────────────────────────────────
// Startup Guard — Refuse default credentials in production
// ─────────────────────────────────────────────────────────────
function assertSecureCredentials() {
  const password = process.env.NEO4J_PASSWORD;
  const env = process.env.NODE_ENV || 'production';

  if (env !== 'development' && (!password || password === 'password' || password === 'change_me_in_production')) {
    const msg = [
      '',
      '╔══════════════════════════════════════════════════════════════════╗',
      '║  🚨  ASE SECURITY GUARD — STARTUP REFUSED                       ║',
      '║                                                                  ║',
      '║  NEO4J_PASSWORD is set to a default/insecure value in a         ║',
      '║  non-development environment. This is a critical security risk.  ║',
      '║                                                                  ║',
      '║  ACTION REQUIRED:                                                ║',
      '║    1. Set a strong password in your .env file:                  ║',
      '║       NEO4J_PASSWORD=<your-secure-password>                     ║',
      '║    2. Or set NODE_ENV=development to suppress this guard.       ║',
      '║                                                                  ║',
      '╚══════════════════════════════════════════════════════════════════╝',
      ''
    ].join('\n');

    // Write to stderr directly — logger might not be initialized yet
    process.stderr.write(msg + '\n');
    process.exit(1);
  }

  if (!password) {
    logger.warn('KnowledgeGraphService', 'NEO4J_PASSWORD is not set — Neo4j connection will likely fail.');
  }
}

// Run guard at module load time (before any constructor is called)
assertSecureCredentials();

class KnowledgeGraphService {
  constructor() {
    const uri  = process.env.NEO4J_URI  || 'neo4j://127.0.0.1:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || '';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

    this._breaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryMs: 60_000,
      serviceName: 'neo4j'
    });

    logger.info('KnowledgeGraphService', `Initialized Neo4j driver — URI: ${uri}, User: ${user}`);
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
        return result.records.map(record => {
          const obj = {};
          record.keys.forEach(key => {
            const val = record.get(key);
            obj[key] = neo4j.isInt(val) ? val.toNumber() : val;
          });
          return obj;
        });
      } catch (err) {
        logger.error('KnowledgeGraph', `Cypher Execution Failed: ${err.message}`, { query, params });
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
        const result = await session.executeWrite(tx => tx.run(query, params));
        return result;
      } catch (err) {
        logger.error('KnowledgeGraph', `Cypher Write Failed: ${err.message}`, { query, params });
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
      logger.info('KnowledgeGraph', 'Neo4j schema initialized successfully.');
    } catch (err) {
      logger.warn('KnowledgeGraph', `Schema initialization failed (Neo4j might not be running): ${err.message}`);
    }
  }

  /** Circuit breaker status snapshot for health reporting */
  get circuitStatus() {
    return this._breaker.status;
  }
}

module.exports = KnowledgeGraphService;
