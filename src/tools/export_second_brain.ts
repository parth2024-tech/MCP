import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { VaultExporter } from '../services/vault-exporter';

const ExportSecondBrainSchema = z.object({
  vault_dir: z.string().optional().describe('Target folder path for the exported Obsidian vault (default: "vault")')
});

type ExportSecondBrainArgs = z.infer<typeof ExportSecondBrainSchema>;

export default class ExportSecondBrainTool extends BaseTool<ExportSecondBrainArgs> {
  name = 'export_second_brain';
  description = 'Exports skills, conventions, and learned lessons into an Obsidian-compatible markdown vault with bidirectional [[wiki-links]] for visual graph view.';
  schema = ExportSecondBrainSchema;

  protected async execute(args: ExportSecondBrainArgs, context: ToolContext): Promise<Record<string, unknown>> {
    const orchDb = context.container.resolve<unknown>('OrchestrationDB');
    let dbHandle = null;
    if (orchDb && typeof (orchDb as { getDB?: () => unknown }).getDB === 'function') {
      dbHandle = (orchDb as { getDB: () => unknown }).getDB();
    }

    const exporter = new VaultExporter({
      vaultDir: args.vault_dir,
      dbHandle
    });

    const result = exporter.exportVault();

    return {
      status: 'exported',
      vault_dir: result.vaultDir,
      files_generated: result.filesGenerated,
      skills_count: result.skillsCount,
      lessons_count: result.lessonsCount,
      conventions_count: result.conventionsCount,
      index_file: result.indexFile
    };
  }
}
