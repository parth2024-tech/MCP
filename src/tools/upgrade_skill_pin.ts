import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { parseFrontmatter } from '../utils/context-optimizer';

export default class UpgradeSkillPinTool extends BaseTool<any> {
  name = 'upgrade_skill_pin';
  description = 'Explicitly migrates the session pin for a specific skill to a new version.';

  schema = z.object({
    skill_id: z.string().describe('The name/ID of the skill to upgrade/pin'),
    new_version: z.string().describe('The semantic version (major.minor.patch) to pin the skill to')
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    const { skill_id, new_version } = args;
    const sessionState = context.container.resolve<any>('SessionState');
    const skillCache = context.container.resolve<any>('SkillCache');

    // 1. Check if the version exists in skill_versions table
    const db = sessionState.db;
    const verRow = db.prepare('SELECT content FROM skill_versions WHERE skill_name = ? AND version = ?')
      .get(skill_id, new_version);

    let content: string | null = null;
    if (verRow) {
      content = verRow.content;
    } else {
      // 2. Fall back to current disk content if its version matches new_version
      const skillData = await skillCache.getSkillContent(skill_id);
      if (skillData) {
        const fm = parseFrontmatter(skillData.content);
        const diskVersion = (fm && fm.version) ? fm.version : '1.0.0';
        if (diskVersion === new_version) {
          content = skillData.content;
        }
      }
    }

    if (!content) {
      return {
        success: false,
        message: `Version ${new_version} for skill ${skill_id} was not found in database history and does not match current disk version.`
      };
    }

    // 3. Update the pinned version in the session
    sessionState.pinSkill(skill_id, new_version, content);

    return {
      success: true,
      skill_id,
      new_version,
      message: `Successfully migrated session pin for skill ${skill_id} to version ${new_version}.`
    };
  }
}
