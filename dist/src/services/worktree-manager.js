"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorktreeManager = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class WorktreeManager {
    static async execGit(args, cwd = process.cwd()) {
        try {
            const { stdout, stderr } = await execFileAsync('git', args, {
                cwd,
                maxBuffer: 10 * 1024 * 1024,
                env: { ...process.env, LC_ALL: 'C' }
            });
            return { stdout: stdout.trim(), stderr: stderr.trim() };
        }
        catch (err) {
            const msg = err.stderr ? err.stderr.trim() : err.message;
            throw new Error(`Git command failed [git ${args.join(' ')}]: ${msg}`);
        }
    }
    static async isInsideGitRepo(cwd = process.cwd()) {
        try {
            const { stdout } = await this.execGit(['rev-parse', '--is-inside-work-tree'], cwd);
            return stdout === 'true';
        }
        catch {
            return false;
        }
    }
    static async getRepoRoot(cwd = process.cwd()) {
        const { stdout } = await this.execGit(['rev-parse', '--show-toplevel'], cwd);
        return path_1.default.resolve(stdout);
    }
    static async listWorktrees(repoPath) {
        const cwd = repoPath ? path_1.default.resolve(repoPath) : await this.getRepoRoot();
        const { stdout } = await this.execGit(['worktree', 'list', '--porcelain'], cwd);
        const worktrees = [];
        const entries = stdout.split('\n\n').filter(Boolean);
        for (let i = 0; i < entries.length; i++) {
            const lines = entries[i].split('\n');
            let wtPath = '';
            let head = '';
            let branch = '';
            let isBare = false;
            let isLocked = false;
            for (const line of lines) {
                if (line.startsWith('worktree ')) {
                    wtPath = line.substring(9).trim();
                }
                else if (line.startsWith('HEAD ')) {
                    head = line.substring(5).trim();
                }
                else if (line.startsWith('branch ')) {
                    branch = line.substring(7).replace('refs/heads/', '').trim();
                }
                else if (line === 'bare') {
                    isBare = true;
                }
                else if (line.startsWith('locked')) {
                    isLocked = true;
                }
            }
            if (wtPath) {
                worktrees.push({
                    path: wtPath,
                    head,
                    branch,
                    isBare,
                    isLocked,
                    isMain: i === 0 // The first entry in porcelain list is always the main worktree
                });
            }
        }
        return worktrees;
    }
    static async createWorktree(options) {
        const repoRoot = options.repoPath ? path_1.default.resolve(options.repoPath) : await this.getRepoRoot();
        // Sanitize branch name
        const branch = options.branch.trim();
        if (!branch || !/^[a-zA-Z0-9_\-\./]+$/.test(branch) || branch.includes('..') || branch.startsWith('-')) {
            throw new Error(`Invalid branch name '${branch}'. Use standard alphanumeric, dash, and slash characters.`);
        }
        // Determine target directory
        let targetPath;
        if (options.worktreeDir) {
            targetPath = path_1.default.isAbsolute(options.worktreeDir)
                ? options.worktreeDir
                : path_1.default.resolve(repoRoot, options.worktreeDir);
        }
        else {
            const sanitizedDirName = branch.replace(/\//g, '-');
            targetPath = path_1.default.resolve(repoRoot, '.worktrees', sanitizedDirName);
        }
        // Ensure target path does not already exist
        if (fs_1.default.existsSync(targetPath)) {
            throw new Error(`Worktree destination path already exists: ${targetPath}`);
        }
        // Auto-ignore .worktrees in git exclude if target is inside repoRoot
        if (targetPath.startsWith(repoRoot)) {
            await this.ensureIgnored(repoRoot, targetPath);
        }
        // Check if branch already exists
        let branchExists = false;
        try {
            await this.execGit(['rev-parse', '--verify', `refs/heads/${branch}`], repoRoot);
            branchExists = true;
        }
        catch {
            branchExists = false;
        }
        const addArgs = ['worktree', 'add'];
        if (!branchExists) {
            addArgs.push('-b', branch, targetPath);
            if (options.baseBranch) {
                addArgs.push(options.baseBranch);
            }
        }
        else {
            addArgs.push(targetPath, branch);
        }
        await this.execGit(addArgs, repoRoot);
        // Get head commit of newly created worktree
        const { stdout: head } = await this.execGit(['rev-parse', 'HEAD'], targetPath);
        return {
            success: true,
            worktreePath: targetPath,
            branch,
            head,
            created: true
        };
    }
    static async removeWorktree(options) {
        const repoRoot = options.repoPath ? path_1.default.resolve(options.repoPath) : await this.getRepoRoot();
        const targetPath = path_1.default.resolve(options.worktreePath);
        if (targetPath === repoRoot) {
            throw new Error('Refusing to remove the main repository root as a worktree.');
        }
        if (!fs_1.default.existsSync(targetPath)) {
            throw new Error(`Worktree directory does not exist: ${targetPath}`);
        }
        // Check if worktree is dirty
        if (!options.force) {
            try {
                const { stdout: status } = await this.execGit(['status', '--porcelain'], targetPath);
                if (status.length > 0) {
                    throw new Error(`Worktree has uncommitted modifications at ${targetPath}. Use force: true to remove anyway.`);
                }
            }
            catch (err) {
                if (!options.force && err.message.includes('uncommitted modifications')) {
                    throw err;
                }
            }
        }
        // Find the associated branch before removing
        let associatedBranch = '';
        const worktrees = await this.listWorktrees(repoRoot);
        const targetWt = worktrees.find(w => path_1.default.resolve(w.path) === targetPath);
        if (targetWt) {
            associatedBranch = targetWt.branch;
        }
        const removeArgs = ['worktree', 'remove'];
        if (options.force) {
            removeArgs.push('--force');
        }
        removeArgs.push(targetPath);
        await this.execGit(removeArgs, repoRoot);
        await this.execGit(['worktree', 'prune'], repoRoot);
        let branchDeleted = false;
        if (options.deleteBranch && associatedBranch) {
            try {
                await this.execGit(['branch', '-D', associatedBranch], repoRoot);
                branchDeleted = true;
            }
            catch {
                branchDeleted = false;
            }
        }
        return {
            success: true,
            removedPath: targetPath,
            branchDeleted
        };
    }
    static async pruneWorktrees(repoPath) {
        const repoRoot = repoPath ? path_1.default.resolve(repoPath) : await this.getRepoRoot();
        await this.execGit(['worktree', 'prune'], repoRoot);
        return { pruned: true };
    }
    static async mergeWorktree(options) {
        const repoRoot = options.repoPath ? path_1.default.resolve(options.repoPath) : await this.getRepoRoot();
        const target = options.targetBranch || 'main';
        const source = options.sourceBranch;
        if (!source) {
            throw new Error('Source branch must be specified for merge.');
        }
        // Ensure main worktree is on target branch
        const { stdout: currentBranch } = await this.execGit(['branch', '--show-current'], repoRoot);
        if (currentBranch !== target) {
            await this.execGit(['checkout', target], repoRoot);
        }
        // Pull or verify clean state
        const { stdout: status } = await this.execGit(['status', '--porcelain'], repoRoot);
        if (status.length > 0) {
            throw new Error(`Target branch '${target}' working tree is dirty. Commit or stash changes before merging.`);
        }
        const mergeArgs = ['merge'];
        if (options.squash) {
            mergeArgs.push('--squash');
        }
        mergeArgs.push(source);
        await this.execGit(mergeArgs, repoRoot);
        if (options.squash) {
            await this.execGit(['commit', '-m', `feat(worktree): squash merge ${source} into ${target}`], repoRoot);
        }
        const { stdout: mergeCommit } = await this.execGit(['rev-parse', 'HEAD'], repoRoot);
        return {
            success: true,
            targetBranch: target,
            sourceBranch: source,
            mergeCommit
        };
    }
    static async ensureIgnored(repoRoot, targetPath) {
        try {
            // Check if already ignored
            const relPath = path_1.default.relative(repoRoot, targetPath);
            const { stdout } = await this.execGit(['check-ignore', relPath], repoRoot).catch(() => ({ stdout: '' }));
            if (stdout) {
                return; // Already ignored
            }
            // Add to .git/info/exclude (clean, doesn't dirty git status or modify .gitignore)
            const excludeFile = path_1.default.join(repoRoot, '.git', 'info', 'exclude');
            if (fs_1.default.existsSync(path_1.default.dirname(excludeFile))) {
                const content = fs_1.default.existsSync(excludeFile) ? fs_1.default.readFileSync(excludeFile, 'utf-8') : '';
                if (!content.includes('.worktrees')) {
                    fs_1.default.appendFileSync(excludeFile, '\n.worktrees/\nworktrees/\n');
                }
            }
        }
        catch {
            // Non-critical, ignore
        }
    }
}
exports.WorktreeManager = WorktreeManager;
