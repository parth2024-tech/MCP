import fs from 'fs/promises';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { CODE_LOOP_TRANSFORMS, CodeLoopContext } from '../loops/code-loops';

export default class RefineAndWriteTool extends BaseTool<any> {
  name = 'refine_and_write';
  description = 'Submit code through 5-loop refinement pipeline. Only writes file if all loops pass.';
  schema = z.object({
    task_id: z.string(),
    agent_id: z.string(),
    file_path: z.string(),
    code: z.string(),
    dry_run: z.boolean().optional().default(false),
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { task_id, agent_id, file_path, code, dry_run = false } = args;
    const dbManager = context.container.resolve<any>('OrchestrationDB');
    const db = dbManager.getDB();
    const sessionId = randomUUID();

    const redis = await dbManager.getRedisClient();
    const lockData = await redis.get(`ase:lock:${file_path}`);
    let lockHolder: string | null = null;
    if (lockData) {
      const lockObj = JSON.parse(lockData);
      lockHolder = lockObj.locked_by || (lockObj.locks && lockObj.locks[0] && lockObj.locks[0].locked_by);
    }

    if (!lockHolder || lockHolder !== agent_id) {
      throw new Error(`Agent ${agent_id} does not hold exclusive lock on ${file_path}`);
    }

    // Capture snapshot of the current file content
    const snapshotId = randomUUID();
    let currentContent: string | null = null;
    try {
      currentContent = await fs.readFile(file_path, 'utf8');
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    if (!dry_run) {
      db.prepare(`
        INSERT INTO file_snapshots (id, file_path, content, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(snapshotId, file_path, currentContent, now);
    }

    const ctx: CodeLoopContext = {
      file_path,
      task_id,
      never_do_rules: [], // Extendable in the future
      ast_rules: [],      // Extendable in the future
      previous_loops: [],
    };

    let current = code;
    const loopResults: { number: number; changes: string[] }[] = [];

    for (const loopDef of CODE_LOOP_TRANSFORMS) {
      const result = await loopDef.transform(current, ctx);

      if (!dry_run) {
        await dbManager.recordCodeLoop(
          sessionId,
          task_id,
          loopDef.number,
          loopDef.name,
          current,
          result.code,
          result.changes,
          now
        );
      }

      loopResults.push({ number: loopDef.number, changes: result.changes });
      ctx.previous_loops = loopResults;
      current = result.code;
    }

    const hasViolations =
      current.includes("⚠️ ASE_VIOLATION") ||
      current.includes("⚠️ ASE_TYPE") ||
      current.includes("⚠️ ASE_UNUSED_IMPORT");

    if (hasViolations) {
      const rulesViolations: string[] = [];
      const typesViolations: string[] = [];
      const unusedImportsViolations: string[] = [];

      const lines = current.split('\n');
      for (const line of lines) {
        if (line.includes('⚠️ ASE_VIOLATION')) {
          const match = line.match(/⚠️\s*ASE_VIOLATION\[(.*?)\]:\s*(.*?)(?:\s*\*\/)?\s*$/);
          if (match) {
            rulesViolations.push(`${match[1]}: ${match[2]}`);
          } else {
            rulesViolations.push(line.trim());
          }
        }
        if (line.includes('⚠️ ASE_TYPE')) {
          const match = line.match(/⚠️\s*ASE_TYPE\[(.*?)\]:\s*(.*?)(?:\s*\*\/)?\s*$/);
          if (match) {
            typesViolations.push(`${match[1]}: ${match[2]}`);
          } else {
            typesViolations.push(line.trim());
          }
        }
        if (line.includes('⚠️ ASE_UNUSED_IMPORT')) {
          const match = line.match(/⚠️\s*ASE_UNUSED_IMPORT:\s*(.*?)(?:\s*\*\/)?\s*$/);
          if (match) {
            unusedImportsViolations.push(match[1]);
          } else {
            unusedImportsViolations.push(line.trim());
          }
        }
      }

      const totalCount = rulesViolations.length + typesViolations.length + unusedImportsViolations.length;

      const violations_summary = {
        total_count: totalCount,
        categories: {
          rules: {
            count: rulesViolations.length,
            severity: 'error',
            fix_hint: 'Remove or modify expressions matching the violated never_do project rules.',
            violations: rulesViolations
          },
          types: {
            count: typesViolations.length,
            severity: 'error',
            fix_hint: 'Correct TypeScript type signatures, casts, or variable declarations.',
            violations: typesViolations
          },
          unused_imports: {
            count: unusedImportsViolations.length,
            severity: 'warning',
            fix_hint: 'Remove unused import statements from the file.',
            violations: unusedImportsViolations
          }
        }
      };

      throw new Error(JSON.stringify({
        error_code: 'VALIDATION_FAILED',
        message: `Validation failed with ${totalCount} unresolved violations after 5 loops.`,
        violations_summary
      }));
    }

    if (dry_run) {
      return {
        status: "DRY_RUN_PREVIEW",
        file_path,
        original_code: currentContent,
        refined_code: current,
        loops_run: 5,
        loop_summary: loopResults,
        index_updated: false,
        index_staleness: "none"
      };
    }

    await fs.writeFile(file_path, current, "utf-8");

    // T4-C: Synchronously re-index the written file in the AST database
    let indexUpdated = false;
    let indexStaleness = "none";
    let estimatedReindexTime = 0;
    try {
      const astIndexer = context.container.has('ASTIndexer') ? context.container.resolve<any>('ASTIndexer') : null;
      if (astIndexer && astIndexer.indexFile) {
        await astIndexer.indexFile(file_path, current);
        indexUpdated = true;
      }
    } catch (err: any) {
      indexStaleness = "warning";
      estimatedReindexTime = 5;
      const log = context.container.has('reqLogger') ? context.container.resolve<any>('reqLogger') : require('../utils/logger').logger;
      log.warn('RefineAndWrite', `Synchronous indexing failed for ${file_path}: ${err.message}`);
    }

    db.prepare(`
      INSERT INTO events (type, payload, source_agent, task_id)
      VALUES ('file_written', ?, ?, ?)
    `).run(
      JSON.stringify({ file_path, session_id: sessionId, snapshot_id: snapshotId, loops_run: 5 }),
      agent_id,
      task_id
    );

    const response: any = {
      status: "WRITTEN",
      file_path,
      session_id: sessionId,
      snapshot_id: snapshotId,
      loops_run: 5,
      loop_summary: loopResults,
      index_updated: indexUpdated
    };

    if (indexStaleness === "warning") {
      response.index_staleness = "warning";
      response.estimated_reindex_time_seconds = estimatedReindexTime;
    }

    return response;
  }
}
