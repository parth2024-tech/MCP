"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
class RollbackWriteTool extends BaseTool_1.BaseTool {
    name = 'rollback_write';
    description = 'Restore a previous file snapshot and release any current locks held on the file path.';
    schema = zod_1.z.object({
        file_path: zod_1.z.string().describe('Absolute path of the file to rollback'),
        snapshot_id: zod_1.z.string().describe('The snapshot ID to restore')
    });
    async execute(args, context) {
        const { file_path, snapshot_id } = args;
        const dbManager = context.container.resolve('OrchestrationDB');
        const db = dbManager.getDB();
        const snapshot = db.prepare(`SELECT content FROM file_snapshots WHERE id = ? AND file_path = ?`).get(snapshot_id, file_path);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshot_id} for file ${file_path} not found`);
        }
        // Restore content
        if (snapshot.content === null) {
            // File did not exist prior to this write, so delete it
            try {
                await promises_1.default.unlink(file_path);
            }
            catch (err) {
                if (err.code !== 'ENOENT') {
                    throw err;
                }
            }
        }
        else {
            // Restore the old content
            await promises_1.default.writeFile(file_path, snapshot.content, 'utf8');
        }
        // Release all active locks on this file in Redis and SQLite
        const redis = await dbManager.getRedisClient();
        await redis.del(`ase:lock:${file_path}`);
        db.prepare(`DELETE FROM file_locks WHERE file_path = ?`).run(file_path);
        db.prepare(`
      INSERT INTO events (type, payload)
      VALUES ('file_rolled_back', ?)
    `).run(JSON.stringify({ file_path, snapshot_id }));
        return {
            status: "ROLLED_BACK",
            file_path,
            snapshot_id,
            restored_existing: snapshot.content !== null
        };
    }
}
exports.default = RollbackWriteTool;
