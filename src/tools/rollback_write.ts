import fs from 'fs/promises';
import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';

export default class RollbackWriteTool extends BaseTool<any> {
  name = 'rollback_write';
  description = 'Restore a previous file snapshot and release any current locks held on the file path.';
  
  schema = z.object({
    file_path: z.string().describe('Absolute path of the file to rollback'),
    snapshot_id: z.string().describe('The snapshot ID to restore')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { file_path, snapshot_id } = args;
    const dbManager = context.container.resolve<any>('OrchestrationDB');
    const db = dbManager.getDB();

    const snapshot = db.prepare(
      `SELECT content FROM file_snapshots WHERE id = ? AND file_path = ?`
    ).get(snapshot_id, file_path) as any;

    if (!snapshot) {
      throw new Error(`Snapshot ${snapshot_id} for file ${file_path} not found`);
    }

    // Restore content
    if (snapshot.content === null) {
      // File did not exist prior to this write, so delete it
      try {
        await fs.unlink(file_path);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
      }
    } else {
      // Restore the old content
      await fs.writeFile(file_path, snapshot.content, 'utf8');
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
