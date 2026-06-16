"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const BaseTool_1 = require("../core/BaseTool");
class RegisterAgentTool extends BaseTool_1.BaseTool {
    name = 'register_agent';
    description = 'Register a new agent connection with specific role and capabilities, returning a signed session token. Call this bootstrap tool first to obtain an agent_token.';
    schema = zod_1.z.object({
        role: zod_1.z.string().describe('The role of the registering agent (e.g., developer, audit, reviewer)'),
        capabilities: zod_1.z.array(zod_1.z.string()).describe('List of authorized tool names, or ["*"] for full wildcard access'),
        ttl_seconds: zod_1.z.number().optional().default(3600).describe('Time-to-live for the token in seconds')
    });
    async execute(args, context) {
        const { role, capabilities, ttl_seconds } = args;
        const tokenSecret = context.container.resolve('TokenSecret');
        const sessionId = crypto_1.default.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + ttl_seconds;
        const payload = {
            role,
            capabilities,
            issued_at: now,
            expires_at: expiresAt,
            session_id: sessionId
        };
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const signature = crypto_1.default
            .createHmac('sha256', tokenSecret)
            .update(base64Payload)
            .digest('base64');
        const token = `${base64Payload}.${signature}`;
        // Register agent in DB/Redis
        const dbManager = context.container.resolve('OrchestrationDB');
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
            capabilities
        };
    }
}
exports.default = RegisterAgentTool;
