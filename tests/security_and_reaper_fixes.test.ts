import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { Container } from '../src/core/Container';
import { createToolCallHandler } from '../src/server/handlers';
import { updateProjectRules } from '../src/services/rule-updater';
import { startHttpTransport } from '../src/transports/http-keepalive';
const OrchestrationDB = require('../src/services/orchestration-db');

describe('Security, Auth Pipeline, and Reaper Hardening Fixes', () => {
  // ── 1. Pipeline Ordering & Auth Gate ──────────────────────────────────────────
  it('AuthMiddleware rejects unauthenticated calls without consuming Concurrency semaphore permits', async () => {
    const container = new Container();
    container.register('TokenSecret', 'test-secret-key-12345');
    container.register('VirtualKeyManager', { isAuthorized: () => true });

    // Mock ToolRegistry
    const dummyTool = {
      name: 'sensitive_tool',
      description: 'A tool that requires authentication',
      handler: async () => ({ success: true })
    };
    container.register('ToolRegistry', {
      get: (name: string) => (name === 'sensitive_tool' ? dummyTool : null)
    });

    const handler = createToolCallHandler(container);
    const concurrencyMiddleware = container.resolve<any>('ConcurrencyMiddleware');

    // Call without agent_token
    const res = await handler(
      { params: { name: 'sensitive_tool', arguments: {} } },
      {}
    );

    // Assert authentication failure
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Authentication Error: Missing 'agent_token'");

    // Crucial check: Active semaphore permits must be 0!
    // If Concurrency was before Auth, this would have locked/queued or leaked.
    expect(concurrencyMiddleware.snapshot.active).toBe(0);
  });

  // ── 2. HTTP Transport Fail-Closed ─────────────────────────────────────────────
  it('startHttpTransport throws fatal security error if ASE_HTTP_TOKEN is unset', async () => {
    const oldToken = process.env.ASE_HTTP_TOKEN;
    delete process.env.ASE_HTTP_TOKEN;

    const mockMcpServer = { connect: async () => {} };

    await expect(startHttpTransport(mockMcpServer as any, 3999)).rejects.toThrow(
      'Fatal Security Error: HTTP transport requires ASE_HTTP_TOKEN to be set'
    );

    if (oldToken) {
      process.env.ASE_HTTP_TOKEN = oldToken;
    }
  });

  // ── 3. Draft-Mode Lockdown on never_do ────────────────────────────────────────
  it('updateProjectRules forces draftMode on never_do deletion and modifications', async () => {
    const testConfigPath = path.join(process.cwd(), '.ase-project.json');
    let originalConfig = '';
    try {
      originalConfig = await fs.readFile(testConfigPath, 'utf8');
    } catch (_) {}

    const dummyConfig = {
      name: 'TestSecurityProject',
      never_do: ['Never deploy to production on Friday'],
      conventions: ['Named exports only']
    };
    await fs.writeFile(testConfigPath, JSON.stringify(dummyConfig, null, 2), 'utf8');

    const proposalsPath = path.join(process.cwd(), 'rule_proposals.jsonl');
    try { await fs.unlink(proposalsPath); } catch (_) {}

    try {
      // Attempt to REMOVE never_do with draft_mode: false (unilateral AI override attempt)
      const result = await updateProjectRules(
        'never_do',
        'remove',
        'Never deploy to production on Friday',
        process.cwd(),
        false, // draft_mode explicitly false
        false  // dry_run false
      );

      // Must succeed by routing to proposal log, NOT by deleting the rule directly!
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully wrote proposed rule');

      // Verify rule still exists in .ase-project.json on disk
      const configOnDisk = JSON.parse(await fs.readFile(testConfigPath, 'utf8'));
      expect(configOnDisk.never_do).toContain('Never deploy to production on Friday');

      // Verify proposal was appended to rule_proposals.jsonl
      const proposalContent = await fs.readFile(proposalsPath, 'utf8');
      expect(proposalContent).toContain('"ruleType":"never_do"');
      expect(proposalContent).toContain('"action":"remove"');
    } finally {
      if (originalConfig) {
        await fs.writeFile(testConfigPath, originalConfig, 'utf8');
      }
      try { await fs.unlink(proposalsPath); } catch (_) {}
    }
  });

  // ── 4. Deterministic Reaper 105s Ceiling ──────────────────────────────────────
  it('recoverDeadAgents enforces exact 105s window (ignores agent at 90s, reclaims at 110s)', async () => {
    const orch = OrchestrationDB.getInstance();
    const db = orch.getDB();
    const now = Math.floor(Date.now() / 1000);

    // Register two agents
    await orch.registerAgentHeartbeat('agent-90s', null);
    await orch.registerAgentHeartbeat('agent-110s', null);

    // Backdate heartbeats
    db.prepare('UPDATE agents SET last_heartbeat = ? WHERE agent_id = ?').run(now - 90, 'agent-90s');
    db.prepare('UPDATE agents SET last_heartbeat = ? WHERE agent_id = ?').run(now - 110, 'agent-110s');

    const recovered = await orch.recoverDeadAgents();

    // Agent at 90s is within the 105s grace window (3*30 + 15) -> still alive
    expect(recovered).not.toContain('agent-90s');
    // Agent at 110s has exceeded the 105s window -> marked dead
    expect(recovered).toContain('agent-110s');

    const agent90Status = db.prepare('SELECT status FROM agents WHERE agent_id = ?').get('agent-90s');
    const agent110Status = db.prepare('SELECT status FROM agents WHERE agent_id = ?').get('agent-110s');

    expect(agent90Status.status).toBe('active');
    expect(agent110Status.status).toBe('dead');
  });
});
