import { z } from 'zod';
import { BaseTool, ToolContext } from '../core/BaseTool';
import { WorktreeManager } from '../services/worktree-manager';

export default class ManageWorktreeTool extends BaseTool<any> {
  name = 'manage_worktree';
  description = 'Manages isolated Git worktrees with zero daemon overhead. Enables parallel agent tasks, experiments, and subagents to run in clean, separate branches without dirtying the main working tree.';

  schema = z.object({
    action: z.enum(['create', 'list', 'remove', 'merge', 'prune']).describe('Action to perform: create, list, remove, merge, or prune'),
    branch: z.string().optional().describe('Branch name for worktree creation or merging'),
    path: z.string().optional().describe('Path to worktree directory (optional for create, required for remove)'),
    base_branch: z.string().optional().describe('Base branch or commit to branch off from (defaults to HEAD)'),
    target_branch: z.string().optional().describe('Target branch to merge into (defaults to main)'),
    force: z.boolean().optional().default(false).describe('Force removal even if worktree contains uncommitted modifications'),
    delete_branch: z.boolean().optional().default(false).describe('Delete associated git branch upon worktree removal'),
    squash: z.boolean().optional().default(false).describe('Squash commits when merging worktree branch'),
    repo_path: z.string().optional().describe('Path to repository root (defaults to process.cwd())')
  });

  protected async execute(args: any, _context: ToolContext): Promise<any> {
    const {
      action,
      branch,
      path: worktreePath,
      base_branch,
      target_branch,
      force = false,
      delete_branch = false,
      squash = false,
      repo_path
    } = args;

    const isInsideRepo = await WorktreeManager.isInsideGitRepo(repo_path);
    if (!isInsideRepo) {
      throw new Error(`Directory '${repo_path || process.cwd()}' is not inside a git repository.`);
    }

    switch (action) {
      case 'list': {
        const worktrees = await WorktreeManager.listWorktrees(repo_path);
        return {
          success: true,
          count: worktrees.length,
          worktrees
        };
      }

      case 'create': {
        if (!branch) {
          throw new Error("Parameter 'branch' is required for action 'create'.");
        }
        const result = await WorktreeManager.createWorktree({
          repoPath: repo_path,
          branch,
          worktreeDir: worktreePath,
          baseBranch: base_branch
        });
        return {
          success: true,
          action: 'created',
          worktree_path: result.worktreePath,
          branch: result.branch,
          head_commit: result.head
        };
      }

      case 'remove': {
        if (!worktreePath) {
          throw new Error("Parameter 'path' is required for action 'remove'.");
        }
        const result = await WorktreeManager.removeWorktree({
          repoPath: repo_path,
          worktreePath,
          force,
          deleteBranch: delete_branch
        });
        return {
          success: true,
          action: 'removed',
          removed_path: result.removedPath,
          branch_deleted: result.branchDeleted
        };
      }

      case 'prune': {
        const result = await WorktreeManager.pruneWorktrees(repo_path);
        return {
          success: true,
          action: 'pruned',
          pruned: result.pruned
        };
      }

      case 'merge': {
        if (!branch) {
          throw new Error("Parameter 'branch' (source branch) is required for action 'merge'.");
        }
        const result = await WorktreeManager.mergeWorktree({
          repoPath: repo_path,
          sourceBranch: branch,
          targetBranch: target_branch,
          squash
        });
        return {
          success: true,
          action: 'merged',
          target_branch: result.targetBranch,
          source_branch: result.sourceBranch,
          merge_commit: result.mergeCommit
        };
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
}
