/**
 * tests/virtual-key-manager.test.js
 *
 * Unit tests for the VirtualKeyManager authorization gateway.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

// Mock logger
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import VirtualKeyManager from '../src/services/virtual-key-manager.js';

describe('VirtualKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAuthorized — no virtual key configured', () => {
    it('allows all tools when no key is passed', () => {
      const manager = new VirtualKeyManager();
      manager.keys = {}; // simulate no keys loaded
      expect(manager.isAuthorized(undefined, 'any_tool')).toBe(true);
      expect(manager.isAuthorized(null, 'any_tool')).toBe(true);
    });
  });

  describe('isAuthorized — with virtual keys loaded', () => {
    const mockKeys = {
      'read-only-key': ['get_health', 'query_skills', 'get_model_config'],
      'master-key': ['*'],
      'write-key': ['remember_action', 'update_project_rules']
    };

    it('denies unknown keys', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      expect(manager.isAuthorized('nonexistent-key', 'get_health')).toBe(false);
    });

    it('grants access for tools in a scoped key', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      expect(manager.isAuthorized('read-only-key', 'get_health')).toBe(true);
      expect(manager.isAuthorized('read-only-key', 'query_skills')).toBe(true);
    });

    it('denies access for tools outside a scoped key', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      expect(manager.isAuthorized('read-only-key', 'remember_action')).toBe(false);
      expect(manager.isAuthorized('read-only-key', 'validate_output')).toBe(false);
    });

    it('grants wildcard access for master-key', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      expect(manager.isAuthorized('master-key', 'any_tool_whatsoever')).toBe(true);
    });

    it('grants write key access to write tools', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      expect(manager.isAuthorized('write-key', 'remember_action')).toBe(true);
      expect(manager.isAuthorized('write-key', 'update_project_rules')).toBe(true);
      expect(manager.isAuthorized('write-key', 'get_health')).toBe(false);
    });
  });

  describe('filterAuthorizedTools', () => {
    const mockKeys = {
      'limited-key': ['get_health', 'query_skills']
    };

    it('returns all tools when no key provided', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      const tools = [{ name: 'get_health' }, { name: 'remember_action' }];
      expect(manager.filterAuthorizedTools(null, tools)).toHaveLength(2);
    });

    it('filters to only authorized tools for a scoped key', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      const tools = [
        { name: 'get_health' },
        { name: 'remember_action' },
        { name: 'query_skills' },
        { name: 'validate_output' }
      ];
      const filtered = manager.filterAuthorizedTools('limited-key', tools);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(t => t.name)).toEqual(['get_health', 'query_skills']);
    });

    it('returns empty array for unknown key', () => {
      const manager = new VirtualKeyManager();
      manager.keys = mockKeys;
      const tools = [{ name: 'get_health' }];
      expect(manager.filterAuthorizedTools('unknown-key', tools)).toHaveLength(0);
    });
  });
});
