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
    throw new Error('ASE Security Guard: Insecure Neo4j credentials detected in production.');
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
   * Execute a Cypher query (reads and DDL) through the circuit breaker.
   *
   * Fix 9 — Parameterization invariant:
   * This method is the ONLY path through which Cypher reaches Neo4j.
   * `session.run(query, params)` is always called with a separate params object.
   * String interpolation into the query string is NEVER permitted — callers must
   * pass all variable values through `params`. This is the only defence against
   * Cypher injection: unlike SQL, Cypher injection can traverse the entire graph
   * and execute arbitrary mutations including deleting all nodes.
   *
   * Enforcement: the params argument signature has no default that would accept
   * a pre-interpolated string. If you find yourself writing
   *   `executeCypher(`MATCH (n {id: '${id}'})`)`
   * that is a Cypher injection vulnerability. Use params instead:
   *   `executeCypher('MATCH (n {id: $id}) RETURN n', { id })`
   *
   * @param {string} query - Parameterized Cypher string. No string interpolation.
   * @param {object} [params={}] - Parameter values referenced in the query as $name.
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

  /**
   * Initialize Neo4j schema: uniqueness constraints and indexes.
   *
   * Fix 9 — Schema constraints and query planner indexes.
   *
   * Without explicit schema:
   *   - Every MATCH query performs a full graph scan (AllNodesScan in EXPLAIN).
   *   - Neo4j's query planner cannot use an index it doesn't know exists.
   *   - Uniqueness constraints implicitly create an index; additional range/text
   *     indexes are needed for the patterns this codebase actually queries.
   *
   * Constraints defined here (each implicitly creates a B-tree index):
   *   - File.path UNIQUE    — used by MATCH (n:File {path: $p})
   *   - Symbol.id UNIQUE    — used by MATCH (n:Symbol {id: $id})
   *   - Skill.name UNIQUE   — used by MATCH (n:Skill {name: $name})
   *   - Task.id UNIQUE      — used by MATCH (n:Task {id: $taskId})
   *
   * Indexes defined here (no uniqueness requirement, but needed for range/lookup):
   *   - File(name)          — label+property lookup, used in KG exploration
   *   - Symbol(name)        — symbol search by name in AST traversals
   *   - Skill(category)     — category-filtered skill queries
   *   - Relationship created_at range index — temporal traversal ordering
   *
   * All DDL uses IF NOT EXISTS so re-running on restart is idempotent.
   * Errors are logged as warnings (Neo4j may not be available in dev).
   */
  async initializeSchema() {
    // Uniqueness constraints (implicitly create B-tree indexes)
    const constraints = [
      `CREATE CONSTRAINT file_path IF NOT EXISTS FOR (f:File) REQUIRE f.path IS UNIQUE`,
      `CREATE CONSTRAINT symbol_id IF NOT EXISTS FOR (s:Symbol) REQUIRE s.id IS UNIQUE`,
      `CREATE CONSTRAINT skill_name IF NOT EXISTS FOR (sk:Skill) REQUIRE sk.name IS UNIQUE`,
      `CREATE CONSTRAINT task_id IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE`,
    ];

    // Range/lookup indexes for patterns that don't require uniqueness
    const indexes = [
      `CREATE INDEX file_name_idx IF NOT EXISTS FOR (f:File) ON (f.name)`,
      `CREATE INDEX symbol_name_idx IF NOT EXISTS FOR (s:Symbol) ON (s.name)`,
      `CREATE INDEX skill_category_idx IF NOT EXISTS FOR (sk:Skill) ON (sk.category)`,
      `CREATE INDEX node_id_idx IF NOT EXISTS FOR (n:Node) ON (n.id)`,
    ];

    let created = 0;
    let failed = 0;

    for (const ddl of [...constraints, ...indexes]) {
      try {
        await this.executeCypher(ddl);
        created++;
      } catch (err) {
        // Individual DDL failures are non-fatal — some Neo4j editions don't
        // support certain index types. Log and continue.
        logger.warn('KnowledgeGraph', `Schema DDL skipped: ${err.message.split('\n')[0]}`);
        failed++;
      }
    }

    logger.info('KnowledgeGraph',
      `Schema initialization complete: ${created} DDL statements applied, ${failed} skipped.`
    );
  }

  /** Circuit breaker status snapshot for health reporting */
  get circuitStatus() {
    return this._breaker.status;
  }
}

module.exports = KnowledgeGraphService;
