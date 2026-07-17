"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class RenewLockTtlTool extends BaseTool_1.BaseTool {
    name = 'renew_lock_ttl';
    description = 'Extend the TTL of a file lock using the lock_token.';
    schema = zod_1.z.object({
        lock_token: zod_1.z.string().describe('The unique lock token returned on acquire_file_lock')
    });
    async execute(args, context) {
        const { lock_token } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const db = dbManager.getDB();
        const redis = await dbManager.getRedisClient();
        // 1. Get the file path associated with the token from Redis
        const filePath = await redis.get(`ase:lock_token:${lock_token}`);
        if (!filePath) {
            return {
                success: false,
                message: 'Lock token is invalid or has already expired naturally.'
            };
        }
        const lockKey = `ase:lock:${filePath}`;
        const lockData = await redis.get(lockKey);
        if (!lockData) {
            return {
                success: false,
                message: 'Lock data not found in cache.'
            };
        }
        const now = Math.floor(Date.now() / 1000);
        const newExpiresAt = now + 30; // Extend lease by 30 seconds
        const lockObj = JSON.parse(lockData);
        // Update expiration times in Redis
        if (lockObj.lock_type === 'exclusive') {
            if (lockObj.lock_token !== lock_token) {
                return {
                    success: false,
                    message: 'Lock token mismatch for exclusive lock.'
                };
            }
            lockObj.expires_at = newExpiresAt;
        }
        else {
            // Shared lock: update the specific sub-lock that matches the token
            const subLock = (lockObj.locks || []).find((l) => l.lock_token === lock_token);
            if (!subLock) {
                return {
                    success: false,
                    message: 'Lock token mismatch for shared lock.'
                };
            }
            subLock.expires_at = newExpiresAt;
            lockObj.expires_at = Math.max(...(lockObj.locks || []).map((l) => l.expires_at));
        }
        const remainingTtl = lockObj.expires_at - now;
        await redis.set(lockKey, JSON.stringify(lockObj), 'EX', remainingTtl);
        await redis.set(`ase:lock_token:${lock_token}`, filePath, 'EX', remainingTtl);
        // Update SQLite DB
        db.prepare(`UPDATE file_locks SET expires_at = ? WHERE file_path = ? AND lock_token = ?`).run(newExpiresAt, filePath, lock_token);
        return {
            success: true,
            file_path: filePath,
            expires_at: newExpiresAt,
            message: 'Lock TTL successfully renewed for 30 seconds.'
        };
    }
}
exports.default = RenewLockTtlTool;
