const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// Path is configurable via ASE_STATE_FILE env var, defaulting to server working directory
const STATE_FILE = process.env.ASE_STATE_FILE
  || path.join(process.cwd(), 'skills_session_state.json');
const ARCHIVE_FILE = STATE_FILE.replace(/\.json$/, '.archive.json');

/** Maximum number of recent sessions to retain in the active state file */
const MAX_SESSIONS = 20;

class SessionState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.state = this._loadState();
    
    if (!this.state[this.sessionId]) {
      this.state[this.sessionId] = {
        startedAt: new Date().toISOString(),
        skills: {}
      };
      this._saveState();
    }
  }

  _loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      logger.error('SessionState', `Failed to load state file: ${err.message}`);
    }
    return {};
  }

  _saveState() {
    try {
      // ── Session Rotation: keep only the most recent MAX_SESSIONS sessions ──
      const allEntries = Object.entries(this.state);

      if (allEntries.length > MAX_SESSIONS) {
        // Sort by startedAt ascending (oldest first)
        allEntries.sort((a, b) => {
          const tA = new Date(a[1].startedAt || 0).getTime();
          const tB = new Date(b[1].startedAt || 0).getTime();
          return tA - tB;
        });

        const overflow = allEntries.length - MAX_SESSIONS;
        const toArchive = allEntries.slice(0, overflow);
        const toKeep   = allEntries.slice(overflow);

        // Merge archived sessions into archive file
        let archive = {};
        try {
          if (fs.existsSync(ARCHIVE_FILE)) {
            archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
          }
        } catch (archErr) {
          logger.warn('SessionState', `Failed to read archive file: ${archErr.message}`);
        }

        for (const [id, data] of toArchive) archive[id] = data;

        try {
          fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf8');
          logger.info('SessionState', `Archived ${toArchive.length} old session(s) to ${ARCHIVE_FILE}`);
        } catch (archErr) {
          logger.warn('SessionState', `Failed to write archive file: ${archErr.message}`);
        }

        // Rebuild state with only the recent sessions
        this.state = Object.fromEntries(toKeep);
      }

      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (err) {
      logger.error('SessionState', `Failed to save state file: ${err.message}`);
    }
  }

  /**
   * Initialize a skill in the current session.
   * @param {string} skillName 
   * @param {string[]} stepIds 
   */
  initSkill(skillName, stepIds = []) {
    const session = this.state[this.sessionId];
    
    // Don't overwrite if already initialized, but we could append new steps if needed
    if (!session.skills[skillName]) {
      const stepsState = {};
      for (const id of stepIds) {
        stepsState[id] = {
          status: 'pending',
          history: [] // { status, timestamp, context }
        };
      }
      
      session.skills[skillName] = {
        loadedAt: new Date().toISOString(),
        steps: stepsState
      };
      
      this._saveState();
      logger.info('SessionState', `Initialized telemetry for skill: ${skillName} (${stepIds.length} steps)`);
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
    const session = this.state[this.sessionId];
    if (!session.skills[skillName]) {
      throw new Error(`Skill ${skillName} has not been loaded in this session.`);
    }

    const skill = session.skills[skillName];
    if (!skill.steps[stepId]) {
      // Allow dynamic steps just in case, though they should be initialized
      skill.steps[stepId] = { status: 'pending', history: [] };
    }

    const timestamp = new Date().toISOString();
    
    skill.steps[stepId].status = status;
    skill.steps[stepId].history.push({
      status,
      timestamp,
      context
    });

    this._saveState();
    logger.info('SessionState', `Logged step ${stepId} as ${status} [${skillName}]`);
  }

  /**
   * Get a report of the current session's skill progression.
   */
  getReport() {
    const session = this.state[this.sessionId];
    const report = {
      sessionId: this.sessionId,
      uptime_seconds: Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000),
      active_skills: Object.keys(session.skills),
      skills: {}
    };

    for (const [skillName, skillData] of Object.entries(session.skills)) {
      const steps = skillData.steps;
      let completed = 0;
      let skipped = 0;
      let failed = 0;
      let pending = 0;
      let blocked = 0;
      
      const stepDetails = {};
      
      for (const [stepId, stepData] of Object.entries(steps)) {
        if (stepData.status === 'completed') completed++;
        else if (stepData.status === 'skipped') skipped++;
        else if (stepData.status === 'failed') failed++;
        else if (stepData.status === 'blocked') blocked++;
        else pending++;
        
        // Calculate time spent if completed/skipped/failed from 'started'
        let timeSpentMs = 0;
        let startedTime = null;
        for (const evt of stepData.history) {
          if (evt.status === 'started') {
            startedTime = new Date(evt.timestamp).getTime();
          } else if (startedTime && ['completed', 'skipped', 'failed', 'blocked'].includes(evt.status)) {
            timeSpentMs += new Date(evt.timestamp).getTime() - startedTime;
            startedTime = null;
          }
        }
        
        stepDetails[stepId] = {
          current_status: stepData.status,
          time_spent_seconds: Math.round(timeSpentMs / 1000),
          transitions: stepData.history.length
        };
      }
      
      report.skills[skillName] = {
        summary: {
          total_steps: Object.keys(steps).length,
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
  }
}

module.exports = SessionState;
