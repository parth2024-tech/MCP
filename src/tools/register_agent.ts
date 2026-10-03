import { z } from 'zod';
import crypto from 'crypto';
import { BaseTool, ToolContext } from '../core/BaseTool';

// Server-side role → allowed capabilities map.
// Callers can REQUEST a role, but the server assigns capabilities from this map.
// '*' grants full wildcard access only to the 'admin' role.
// To extend roles, set ASE_ROLE_CONFIG env var as a JSON string, or edit this map.
const DEFAULT_ROLE_CAPABILITIES: Record<string, string[]> = {
  admin:     ['*'],
  developer: [
    // Skill operations
    'query_skills', 'query_skills_ranked', 'load_skill', 'get_project_prompt',
    'search_tools', 'upgrade_skill_pin',
    // Loop engineering
    'run_goal_loop', 'run_task_loop', 'validate_output', 'get_validation_result',
    'refine_and_write', 'rollback_write', 'get_write_diff',
    // Memory & learning
    'record_learned_lesson', 'update_project_rules',
    'read_memory', 'write_memory', 'query_all_memory',
    // Orchestration
    'create_task', 'claim_task', 'complete_task', 'preempt_task',
    'declare_task_intent', 'log_skill_step', 'get_orchestration_state',
    // Locking
    'acquire_file_lock', 'release_file_lock', 'renew_lock_ttl',
    // Events
    'subscribe_events', 'poll_events',
    // Observability
    'get_metrics', 'get_health', 'configure_alert_thresholds', 'configure_deadlock_policy',
    // Worktree & transcript
    'manage_worktree', 'read_native_transcript',
    // Fast-jev
    'fast_jev_compact',
  ],
  reviewer:  [
    'query_skills', 'query_skills_ranked', 'get_project_prompt',
    'search_tools', 'get_metrics', 'read_native_transcript', 'get_health',
  ],
  audit:     [
    'get_project_prompt', 'search_tools', 'get_metrics',
    'read_native_transcript', 'query_skills', 'get_health',
    'read_memory', 'write_memory',
  ],
};

// Role aliases (short-hand → canonical capability set)
const ROLE_ALIASES: Record<string, string> = {
  dev:  'developer',
  dev1: 'developer',  // test alias
  dev2: 'developer',  // test alias
};

function resolveRoleConfig(): Record<string, string[]> {
  const envConfig = process.env.ASE_ROLE_CONFIG;
  if (envConfig) {
    try {
      return JSON.parse(envConfig);
    } catch (_) {
      // Fallback to default map if env config is malformed
    }
  }
  return DEFAULT_ROLE_CAPABILITIES;
}

export default class RegisterAgentTool extends BaseTool<any> {
  name = 'register_agent';
  description = 'Register a new agent connection with specific role and capabilities, returning a signed session token. Call this bootstrap tool first to obtain an agent_token.';

  schema = z.object({
    role: z.string().describe(
      'Requested agent role (developer, reviewer, audit, admin). ' +
      'The server assigns capabilities from its role config — caller-supplied capabilities are ignored.'
    ),
    ttl_seconds: z.number().optional().default(3600).describe('Time-to-live for the token in seconds'),
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { ttl_seconds } = args;

    const roleConfig = resolveRoleConfig();

    // Resolve aliases (e.g. 'dev' → 'developer') before validating
    const requestedRole: string = args.role;
    const role = ROLE_ALIASES[requestedRole] ?? requestedRole;

    // Reject unknown roles — never let callers invent their own.
    if (!roleConfig[role]) {
      const validRoles = [...Object.keys(roleConfig), ...Object.keys(ROLE_ALIASES)].join(', ');
      throw new Error(`Unknown role '${requestedRole}'. Valid roles: ${validRoles}`);
    }

    // Server-assigned capabilities — caller-supplied capabilities are completely ignored.
    const assignedCapabilities = roleConfig[role];

    const tokenSecret = context.container.resolve<string>('TokenSecret');
    const sessionId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + ttl_seconds;

    const payload = {
      role,
      capabilities: assignedCapabilities,   // ← server-assigned, never caller-supplied
      issued_at: now,
      expires_at: expiresAt,
      session_id: sessionId,
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
      .createHmac('sha256', tokenSecret)
      .update(base64Payload)
      .digest('base64');
    const token = `${base64Payload}.${signature}`;

    // Register agent in DB
    const dbManager = context.container.resolve<any>('OrchestrationDB');
    const db = dbManager.getDB();
    db.prepare(`
      INSERT OR REPLACE INTO agents (agent_id, last_heartbeat, status)
      VALUES (?, unixepoch(), 'active')
    `).run(sessionId);

    return {
      agent_id: sessionId,
      agent_token: token,
      expires_at: expiresAt,
      role,
      capabilities: assignedCapabilities,
    };
  }
}
