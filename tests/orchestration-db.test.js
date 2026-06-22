'use strict';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const OrchestrationDB = require('../src/services/orchestration-db');
const fs = require('fs');
const path = require('path');

describe('OrchestrationDB', () => {
  let dbInstance;

  beforeEach(() => {
    process.env.ASE_ORCHESTRATION_DB = path.join(__dirname, `test_orchestration_${Date.now()}.db`);
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB)) fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB);
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB + '-wal')) fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB + '-wal');
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB + '-shm')) fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB + '-shm');
    dbInstance = new OrchestrationDB();
  });

  afterEach(() => {
    if (dbInstance) {
      dbInstance.close();
    }
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB)) {
      fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB);
    }
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB + '-wal')) {
      fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB + '-wal');
    }
    if (fs.existsSync(process.env.ASE_ORCHESTRATION_DB + '-shm')) {
      fs.unlinkSync(process.env.ASE_ORCHESTRATION_DB + '-shm');
    }
  });

  it('creates all required tables', () => {
    const db = dbInstance.getDB();
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(t => t.name);
    
    expect(tables).toContain('tasks');
    expect(tables).toContain('task_dependencies');
    expect(tables).toContain('shared_memory');
    expect(tables).toContain('memory_changelog');
    expect(tables).toContain('file_locks');
    expect(tables).toContain('file_intentions');
    expect(tables).toContain('events');
    expect(tables).toContain('event_subscriptions');
    expect(tables).toContain('agents');
  });

  it('emits events to the event bus', () => {
    const db = dbInstance.getDB();
    dbInstance.emitEvent('test_event', { foo: 'bar' }, 'agent-1', 'task-1');
    
    const events = db.prepare('SELECT * FROM events').all();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('test_event');
    expect(events[0].source_agent).toBe('agent-1');
    expect(JSON.parse(events[0].payload).foo).toBe('bar');
  });

  it('expires stale locks', () => {
    const db = dbInstance.getDB();
    
    // Insert a stale lock
    db.prepare(`
      INSERT INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at)
      VALUES ('/test.txt', 'agent-1', 'task-1', 'exclusive', unixepoch() - 100)
    `).run();
    
    // Insert a valid lock
    db.prepare(`
      INSERT INTO file_locks (file_path, locked_by, task_id, lock_type, expires_at)
      VALUES ('/valid.txt', 'agent-2', 'task-2', 'exclusive', unixepoch() + 100)
    `).run();
    
    dbInstance.expireStaleLocks();
    
    const locks = db.prepare('SELECT file_path FROM file_locks').all();
    expect(locks).toHaveLength(1);
    expect(locks[0].file_path).toBe('/valid.txt');
  });
});
