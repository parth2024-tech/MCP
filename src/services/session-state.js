const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

const DB_PATH = process.env.ASE_STATE_DB
  || path.join(__dirname, 'session_state.db');
const ARCHIVE_FILE = (process.env.ASE_STATE_FILE || path.join(process.cwd(), 'skills_session_state.json'))
  .replace(/\.json$/, '.archive.json');

const MAX_SESSIONS = 20;

class SessionState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.db = new Database(DB_PATH);
    
    // Enable WAL mode
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this._initDb();

    // Create session if not exists
    const sessionExists = this.db.prepare('SELECT 1 FROM sessions WHERE session_id = ?').get(this.sessionId);
    if (!sessionExists) {
      this.db.prepare('INSERT INTO sessions (session_id, started_at) VALUES (?, ?)')
        .run(this.sessionId, new Date().toISOString());
      
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
    `);
  }

  _rotateSessions() {
    try {
      const allSessions = this.db.prepare('SELECT session_id, started_at FROM sessions ORDER BY started_at ASC').all();
      if (allSessions.length > MAX_SESSIONS) {
        const overflowCount = allSessions.length - MAX_SESSIONS;
        const toArchive = allSessions.slice(0, overflowCount);

        let archive = {};
        if (fs.existsSync(ARCHIVE_FILE)) {
          try {
            archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
          } catch (archErr) {
            logger.warn('SessionState', `Failed to read archive file: ${archErr.message}`);
          }
        }

        // Export data for each session being rotated
        for (const session of toArchive) {
          const sessionObj = {
            startedAt: session.started_at,
            skills: {}
          };

          const skills = this.db.prepare('SELECT skill_name, loaded_at FROM session_skills WHERE session_id = ?')
            .all(session.session_id);

          for (const skill of skills) {
            const stepsObj = {};
            const steps = this.db.prepare('SELECT step_id, status FROM session_steps WHERE session_id = ? AND skill_name = ?')
              .all(session.session_id, skill.skill_name);

            for (const step of steps) {
              const history = this.db.prepare('SELECT status, timestamp, context FROM session_step_history WHERE session_id = ? AND skill_name = ? AND step_id = ? ORDER BY timestamp ASC')
                .all(session.session_id, skill.skill_name, step.step_id);

              stepsObj[step.step_id] = {
                status: step.status,
                history: history.map(h => ({
                  status: h.status,
                  timestamp: h.timestamp,
                  context: h.context || ''
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

        // Write archive
        fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
        logger.info('SessionState', `Archived ${toArchive.length} old session(s) to ${ARCHIVE_FILE}`);

        // Delete from database
        const deleteTx = this.db.transaction((sessionsToDelete) => {
          for (const s of sessionsToDelete) {
            // Delete steps history -> steps -> skills -> session
            this.db.prepare('DELETE FROM session_step_history WHERE session_id = ?').run(s.session_id);
            this.db.prepare('DELETE FROM session_steps WHERE session_id = ?').run(s.session_id);
            this.db.prepare('DELETE FROM session_skills WHERE session_id = ?').run(s.session_id);
            this.db.prepare('DELETE FROM pruned_skills WHERE session_id = ?').run(s.session_id);
            this.db.prepare('DELETE FROM sessions WHERE session_id = ?').run(s.session_id);
          }
        });

        deleteTx(toArchive);
      }
    } catch (err) {
      logger.error('SessionState', `Failed during session rotation: ${err.message}`);
    }
  }

  /**
   * Initialize a skill in the current session.
   * @param {string} skillName 
   * @param {string[]} stepIds 
   */
  initSkill(skillName, stepIds = []) {
    try {
      const skillExists = this.db.prepare('SELECT 1 FROM session_skills WHERE session_id = ? AND skill_name = ?')
        .get(this.sessionId, skillName);

      if (!skillExists) {
        const tx = this.db.transaction(() => {
          this.db.prepare('INSERT INTO session_skills (session_id, skill_name, loaded_at) VALUES (?, ?, ?)')
            .run(this.sessionId, skillName, new Date().toISOString());

          for (const stepId of stepIds) {
            this.db.prepare('INSERT INTO session_steps (session_id, skill_name, step_id, status) VALUES (?, ?, ?, ?)')
              .run(this.sessionId, skillName, stepId, 'pending');
          }
        });

        tx();
        logger.info('SessionState', `Initialized telemetry for skill: ${skillName} (${stepIds.length} steps)`);
      }
    } catch (err) {
      logger.error('SessionState', `Failed to initialize skill ${skillName}: ${err.message}`);
    }
  }

  /**
   * Log a step transition.
   * @param {string} skillName 
   * @param {string} stepId 
   * @param {string} status - started, completed, skipped, blocked, failed
   * @param {string} context - optional context/reason
   */
  logStep(skillName, stepId, status, context = '') {
    try {
      const skillExists = this.db.prepare('SELECT 1 FROM session_skills WHERE session_id = ? AND skill_name = ?')
        .get(this.sessionId, skillName);

      if (!skillExists) {
        throw new Error(`Skill ${skillName} has not been loaded in this session.`);
      }

      const tx = this.db.transaction(() => {
        // Upsert step status
        this.db.prepare(`
          INSERT INTO session_steps (session_id, skill_name, step_id, status)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(session_id, skill_name, step_id) DO UPDATE SET status = excluded.status
        `).run(this.sessionId, skillName, stepId, status);

        // Record history
        this.db.prepare(`
          INSERT INTO session_step_history (session_id, skill_name, step_id, status, timestamp, context)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(this.sessionId, skillName, stepId, status, new Date().toISOString(), context);
      });

      tx();
      logger.info('SessionState', `Logged step ${stepId} as ${status} [${skillName}]`);
    } catch (err) {
      logger.error('SessionState', `Failed to log step ${stepId}: ${err.message}`);
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
      `).run(this.sessionId, skillName, new Date().toISOString());
      logger.info('SessionState', `Pruned skill: ${skillName}`);
    } catch (err) {
      logger.error('SessionState', `Failed to prune skill ${skillName}: ${err.message}`);
    }
  }

  /**
   * Check if a skill is pruned in this session.
   * @param {string} skillName 
   */
  isPruned(skillName) {
    try {
      const row = this.db.prepare('SELECT 1 FROM pruned_skills WHERE session_id = ? AND skill_name = ?')
        .get(this.sessionId, skillName);
      return !!row;
    } catch (err) {
      logger.error('SessionState', `Failed to check pruned status for ${skillName}: ${err.message}`);
      return false;
    }
  }

  /**
   * Log a tool call.
   */
  logToolCall(toolName, durationMs, isError) {
    try {
      this.db.prepare('INSERT INTO tool_call_log (tool_name, duration_ms, is_error) VALUES (?, ?, ?)')
        .run(toolName, durationMs, isError ? 1 : 0);
    } catch (err) {
      logger.error('SessionState', `Failed to log tool call: ${err.message}`);
    }
  }

  /**
   * Get a report of the current session's skill progression.
   */
  getReport() {
    try {
      const session = this.db.prepare('SELECT started_at FROM sessions WHERE session_id = ?')
        .get(this.sessionId);

      if (!session) return { sessionId: this.sessionId, skills: {} };

      const activeSkills = this.db.prepare('SELECT skill_name, loaded_at FROM session_skills WHERE session_id = ?')
        .all(this.sessionId);

      const report = {
        sessionId: this.sessionId,
        uptime_seconds: Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000),
        active_skills: activeSkills.map(s => s.skill_name),
        skills: {}
      };

      for (const skill of activeSkills) {
        const steps = this.db.prepare('SELECT step_id, status FROM session_steps WHERE session_id = ? AND skill_name = ?')
          .all(this.sessionId, skill.skill_name);

        let completed = 0;
        let skipped = 0;
        let failed = 0;
        let pending = 0;
        let blocked = 0;

        const stepDetails = {};

        for (const step of steps) {
          if (step.status === 'completed') completed++;
          else if (step.status === 'skipped') skipped++;
          else if (step.status === 'failed') failed++;
          else if (step.status === 'blocked') blocked++;
          else pending++;

          const history = this.db.prepare('SELECT status, timestamp FROM session_step_history WHERE session_id = ? AND skill_name = ? AND step_id = ? ORDER BY timestamp ASC')
            .all(this.sessionId, skill.skill_name, step.step_id);

          let timeSpentMs = 0;
          let startedTime = null;
          for (const evt of history) {
            if (evt.status === 'started') {
              startedTime = new Date(evt.timestamp).getTime();
            } else if (startedTime && ['completed', 'skipped', 'failed', 'blocked'].includes(evt.status)) {
              timeSpentMs += new Date(evt.timestamp).getTime() - startedTime;
              startedTime = null;
            }
          }

          stepDetails[step.step_id] = {
            current_status: step.status,
            time_spent_seconds: Math.round(timeSpentMs / 1000),
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
      logger.error('SessionState', `Failed to generate session report: ${err.message}`);
      return { sessionId: this.sessionId, error: err.message };
    }
  }
}

module.exports = SessionState;
