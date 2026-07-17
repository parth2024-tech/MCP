const Database = require('better-sqlite3');
import path from 'path';
import fs from 'fs';
import { ASEError } from '../utils/errors';
const { logger } = require('../utils/logger');

const DB_DIR = '/home/thor/.agents/logs';
const DB_PATH = path.join(DB_DIR, 'dead_letters.db');

export interface DeadLetterEntry {
  id?: number;
  reqId: string;
  toolName: string;
  args: string; // JSON string
  errorCode: string;
  errorMessage: string;
  fingerprint: string;
  retryable: number; // 0 or 1
  createdAt: string;
  replayCount: number;
}

export class DeadLetterQueue {
  private db: any;

  constructor() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
    } catch (err: any) {
      process.stderr.write(`DeadLetterQueue: Failed to create DB directory: ${err.message}\n`);
    }

    this.db = new Database(DB_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this._initDb();
  }

  private _initDb() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dead_letters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        req_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        args TEXT,
        error_code TEXT NOT NULL,
        error_message TEXT,
        fingerprint TEXT,
        retryable INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        replay_count INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_dlq_fingerprint ON dead_letters(fingerprint);
      CREATE INDEX IF NOT EXISTS idx_dlq_created_at ON dead_letters(created_at);
    `);
  }

  /**
   * Enqueue a failed tool call.
   */
  async enqueue(failed: {
    reqId: string;
    toolName: string;
    args: any;
    error: ASEError;
  }): Promise<void> {
    try {
      const argsStr = JSON.stringify(failed.args || {});
      const insert = this.db.prepare(`
        INSERT INTO dead_letters (req_id, tool_name, args, error_code, error_message, fingerprint, retryable, created_at, replay_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `);

      insert.run(
        failed.reqId,
        failed.toolName,
        argsStr,
        failed.error.code,
        failed.error.message,
        failed.error.fingerprint,
        failed.error.retryable ? 1 : 0,
        new Date().toISOString()
      );

      logger.info('DLQ', `Enqueued failed call to '${failed.toolName}' [${failed.error.code}]`, {
        req_id: failed.reqId,
        fingerprint: failed.error.fingerprint,
      });
    } catch (err: any) {
      logger.error('DLQ', `Failed to enqueue dead letter: ${err.message}`, {
        tool: failed.toolName,
        req_id: failed.reqId,
      });
    }
  }

  /**
   * Retrieve a list of dead letters.
   */
  list(limit = 100, offset = 0): DeadLetterEntry[] {
    try {
      const rows = this.db
        .prepare(`
          SELECT id, req_id as reqId, tool_name as toolName, args, error_code as errorCode,
                 error_message as errorMessage, fingerprint, retryable, created_at as createdAt,
                 replay_count as replayCount
          FROM dead_letters
          ORDER BY id DESC
          LIMIT ? OFFSET ?
        `)
        .all(limit, offset) as DeadLetterEntry[];
      return rows;
    } catch (err: any) {
      logger.error('DLQ', `Failed to list dead letters: ${err.message}`);
      return [];
    }
  }

  /**
   * Delete a dead letter by id.
   */
  delete(id: number): boolean {
    try {
      const result = this.db.prepare('DELETE FROM dead_letters WHERE id = ?').run(id);
      return result.changes > 0;
    } catch (err: any) {
      logger.error('DLQ', `Failed to delete dead letter ${id}: ${err.message}`);
      return false;
    }
  }

  /**
   * Increment replay count.
   */
  incrementReplay(id: number): void {
    try {
      this.db.prepare('UPDATE dead_letters SET replay_count = replay_count + 1 WHERE id = ?').run(id);
    } catch (err: any) {
      logger.error('DLQ', `Failed to increment replay count for ${id}: ${err.message}`);
    }
  }

  /**
   * Purge old entries older than 7 days.
   */
  purge(days = 7): number {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const result = this.db.prepare('DELETE FROM dead_letters WHERE created_at < ?').run(cutoff);
      if (result.changes > 0) {
        logger.info('DLQ', `Purged ${result.changes} old dead letter entries older than ${days} days`);
      }
      return result.changes;
    } catch (err: any) {
      logger.error('DLQ', `Failed to purge old dead letters: ${err.message}`);
      return 0;
    }
  }

  /**
   * Close SQLite DB.
   */
  close() {
    try {
      this.db.close();
      logger.info('DLQ', 'Dead Letter Queue SQLite database closed gracefully');
    } catch (err: any) {
      logger.error('DLQ', `Failed to close database: ${err.message}`);
    }
  }
}
