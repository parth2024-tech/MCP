const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.ASE_STATE_DB
  || path.join(__dirname, '..', 'services', 'session_state.db');

module.exports = (deps) => ({
  name: 'get_metrics',
  description: 'Return server performance metrics and skill usage statistics from the tool call execution logs.',
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: async (args, extra) => {
    try {
      const db = new Database(DB_PATH);
      
      // Enable WAL mode
      db.pragma('journal_mode = WAL');
      db.pragma('synchronous = NORMAL');

      // Get tool performance stats in the last hour
      const toolStats = db.prepare(`
        SELECT
          tool_name,
          COUNT(*) as call_count,
          ROUND(AVG(duration_ms), 1) as avg_ms,
          MAX(duration_ms) as max_ms,
          SUM(is_error) as error_count
        FROM tool_call_log
        WHERE called_at > strftime('%s', 'now') - 3600  -- last hour
        GROUP BY tool_name
        ORDER BY call_count DESC
      `).all();

      const prunedCountRow = db.prepare(
        `SELECT COUNT(*) as n FROM pruned_skills`
      ).get();
      const prunedCount = prunedCountRow ? prunedCountRow.n : 0;

      const activeCountRow = db.prepare(
        `SELECT COUNT(*) as n FROM session_steps WHERE status = 'started' OR status = 'in_progress'`
      ).get();
      const activeCount = activeCountRow ? activeCountRow.n : 0;

      const report = {
        window: 'last_60_minutes',
        active_skills_steps: activeCount,
        pruned_skills: prunedCount,
        tool_performance: toolStats
      };

      db.close();

      return report;
    } catch (err) {
      return { error: `Failed to retrieve metrics: ${err.message}` };
    }
  }
});
