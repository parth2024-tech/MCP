"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const crypto_1 = __importDefault(require("crypto"));
class AuthMiddleware {
    async handle(context, next) {
        const { name, args } = context;
        // 1. Skip authentication for read-only / bootstrap tools that don't need a signed token.
        //    - register_agent: the bootstrap tool that ISSUES tokens — cannot require one
        //    - search_tools:   read-only semantic search over the tool list, no sensitive ops
        //    - check_openhands_status: read-only job status poll, no sensitive ops
        const AUTH_BYPASS = new Set(['register_agent', 'search_tools', 'check_openhands_status']);
        if (AUTH_BYPASS.has(name)) {
            await next();
            return;
        }
        // 2. Perform VirtualKeyManager check if MCP_VIRTUAL_KEY is set (legacy compatibility/gateway guard)
        const virtualKeyManager = context.container.resolve('VirtualKeyManager');
        const virtualKey = process.env.MCP_VIRTUAL_KEY;
        if (virtualKey && !virtualKeyManager.isAuthorized(virtualKey, name)) {
            context.result = {
                content: [{ type: 'text', text: `Gateway Security Error: Unauthorized access to tool '${name}'` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        // 3. Authenticate and authorize via agent_token
        const tokenSecret = context.container.resolve('TokenSecret');
        const agentToken = args?.agent_token;
        if (!agentToken || typeof agentToken !== 'string') {
            context.result = {
                content: [{ type: 'text', text: `Authentication Error: Missing 'agent_token' for tool '${name}'` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        const parts = agentToken.split('.');
        if (parts.length !== 2) {
            context.result = {
                content: [{ type: 'text', text: `Authentication Error: Invalid 'agent_token' format` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        const [base64Payload, signature] = parts;
        const computedSignature = crypto_1.default
            .createHmac('sha256', tokenSecret)
            .update(base64Payload)
            .digest('base64');
        // Use constant-time comparison to prevent timing attacks
        const sigBuffer = Buffer.from(signature, 'base64');
        const computedBuffer = Buffer.from(computedSignature, 'base64');
        if (sigBuffer.length !== computedBuffer.length || !crypto_1.default.timingSafeEqual(sigBuffer, computedBuffer)) {
            context.result = {
                content: [{ type: 'text', text: `Authentication Error: Invalid signature on 'agent_token'` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        // Decode and parse payload
        let payload;
        try {
            const json = Buffer.from(base64Payload, 'base64').toString('utf8');
            payload = JSON.parse(json);
        }
        catch (err) {
            context.result = {
                content: [{ type: 'text', text: `Authentication Error: Failed to parse 'agent_token' payload` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        // Verify expiration
        const now = Math.floor(Date.now() / 1000);
        if (payload.expires_at && payload.expires_at < now) {
            context.result = {
                content: [{ type: 'text', text: `Authentication Error: 'agent_token' has expired` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        // Verify capability scopes
        const capabilities = payload.capabilities || [];
        const isAuthorized = capabilities.includes('*') || capabilities.includes(name);
        if (!isAuthorized) {
            context.result = {
                content: [{ type: 'text', text: `Authorization Error: Agent role '${payload.role}' does not possess capability to invoke tool '${name}'` }],
                isError: true
            };
            context.handled = true;
            return;
        }
        // Attach agent_id and role to context for downstream middlewares/tools
        context.extra = {
            ...context.extra,
            agentId: payload.session_id,
            agentRole: payload.role
        };
        await next();
    }
}
exports.AuthMiddleware = AuthMiddleware;
