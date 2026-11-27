"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const vault_exporter_1 = require("../services/vault-exporter");
const ExportSecondBrainSchema = zod_1.z.object({
    vault_dir: zod_1.z.string().optional().describe('Target folder path for the exported Obsidian vault (default: "vault")')
});
class ExportSecondBrainTool extends BaseTool_1.BaseTool {
    name = 'export_second_brain';
    description = 'Exports skills, conventions, and learned lessons into an Obsidian-compatible markdown vault with bidirectional [[wiki-links]] for visual graph view.';
    schema = ExportSecondBrainSchema;
    async execute(args, context) {
        const orchDb = context.container.resolve('OrchestrationDB');
        let dbHandle = null;
        if (orchDb && typeof orchDb.getDB === 'function') {
            dbHandle = orchDb.getDB();
        }
        const exporter = new vault_exporter_1.VaultExporter({
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
exports.default = ExportSecondBrainTool;
