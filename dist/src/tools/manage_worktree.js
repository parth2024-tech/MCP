"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const worktree_manager_1 = require("../services/worktree-manager");
class ManageWorktreeTool extends BaseTool_1.BaseTool {
    name = 'manage_worktree';
    description = 'Manages isolated Git worktrees with zero daemon overhead. Enables parallel agent tasks, experiments, and subagents to run in clean, separate branches without dirtying the main working tree.';
    schema = zod_1.z.object({
        action: zod_1.z.enum(['create', 'list', 'remove', 'merge', 'prune']).describe('Action to perform: create, list, remove, merge, or prune'),
        branch: zod_1.z.string().optional().describe('Branch name for worktree creation or merging'),
        path: zod_1.z.string().optional().describe('Path to worktree directory (optional for create, required for remove)'),
        base_branch: zod_1.z.string().optional().describe('Base branch or commit to branch off from (defaults to HEAD)'),
        target_branch: zod_1.z.string().optional().describe('Target branch to merge into (defaults to main)'),
        force: zod_1.z.boolean().optional().default(false).describe('Force removal even if worktree contains uncommitted modifications'),
        delete_branch: zod_1.z.boolean().optional().default(false).describe('Delete associated git branch upon worktree removal'),
        squash: zod_1.z.boolean().optional().default(false).describe('Squash commits when merging worktree branch'),
        repo_path: zod_1.z.string().optional().describe('Path to repository root (defaults to process.cwd())')
    });
    async execute(args, _context) {
        const { action, branch, path: worktreePath, base_branch, target_branch, force = false, delete_branch = false, squash = false, repo_path } = args;
        const isInsideRepo = await worktree_manager_1.WorktreeManager.isInsideGitRepo(repo_path);
        if (!isInsideRepo) {
            throw new Error(`Directory '${repo_path || process.cwd()}' is not inside a git repository.`);
        }
        switch (action) {
            case 'list': {
                const worktrees = await worktree_manager_1.WorktreeManager.listWorktrees(repo_path);
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
                const result = await worktree_manager_1.WorktreeManager.createWorktree({
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
                const result = await worktree_manager_1.WorktreeManager.removeWorktree({
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
                const result = await worktree_manager_1.WorktreeManager.pruneWorktrees(repo_path);
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
                const result = await worktree_manager_1.WorktreeManager.mergeWorktree({
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
exports.default = ManageWorktreeTool;
