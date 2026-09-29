import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { WorktreeManager } from '../src/services/worktree-manager';
import ManageWorktreeTool from '../src/tools/manage_worktree';
import { TranscriptReader } from '../src/services/transcript-reader';
import ReadNativeTranscriptTool from '../src/tools/read_native_transcript';

describe('Git Worktree Isolation & Native Transcript Subsystem', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const testBranch = `test-wt-${Date.now()}`;
  let createdWorktreePath = '';

  describe('1. WorktreeManager & ManageWorktreeTool', () => {
    it('detects git repository and identifies main worktree', async () => {
      const isInside = await WorktreeManager.isInsideGitRepo(repoRoot);
      expect(isInside).toBe(true);

      const list = await WorktreeManager.listWorktrees(repoRoot);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const main = list.find(w => w.isMain);
      expect(main).toBeDefined();
      expect(path.resolve(main!.path)).toBe(repoRoot);
    });

    it('rejects invalid branch names to prevent command injection', async () => {
      await expect(WorktreeManager.createWorktree({
        repoPath: repoRoot,
        branch: 'invalid..branch'
      })).rejects.toThrow(/Invalid branch name/);

      await expect(WorktreeManager.createWorktree({
        repoPath: repoRoot,
        branch: '-dashbranch'
      })).rejects.toThrow(/Invalid branch name/);
    });

    it('creates an isolated worktree successfully', async () => {
      const result = await WorktreeManager.createWorktree({
        repoPath: repoRoot,
        branch: testBranch
      });

      expect(result.success).toBe(true);
      expect(result.branch).toBe(testBranch);
      expect(fs.existsSync(result.worktreePath)).toBe(true);
      createdWorktreePath = result.worktreePath;

      const list = await WorktreeManager.listWorktrees(repoRoot);
      const found = list.find(w => w.branch === testBranch);
      expect(found).toBeDefined();
    });

    it('refuses to remove the main repository root', async () => {
      await expect(WorktreeManager.removeWorktree({
        repoPath: repoRoot,
        worktreePath: repoRoot
      })).rejects.toThrow(/Refusing to remove the main repository root/);
    });

    it('refuses to remove a dirty worktree without force', async () => {
      if (!createdWorktreePath || !fs.existsSync(createdWorktreePath)) return;

      // Create a modified uncommitted file in the worktree
      fs.writeFileSync(path.join(createdWorktreePath, 'dirty-file.txt'), 'uncommitted changes');

      await expect(WorktreeManager.removeWorktree({
        repoPath: repoRoot,
        worktreePath: createdWorktreePath,
        force: false
      })).rejects.toThrow(/uncommitted modifications/);
    });

    it('removes the worktree cleanly with force: true and deletes the test branch', async () => {
      if (!createdWorktreePath || !fs.existsSync(createdWorktreePath)) return;

      const result = await WorktreeManager.removeWorktree({
        repoPath: repoRoot,
        worktreePath: createdWorktreePath,
        force: true,
        deleteBranch: true
      });

      expect(result.success).toBe(true);
      expect(result.branchDeleted).toBe(true);
      expect(fs.existsSync(createdWorktreePath)).toBe(false);

      const list = await WorktreeManager.listWorktrees(repoRoot);
      const found = list.find(w => w.branch === testBranch);
      expect(found).toBeUndefined();
    });

    it('executes ManageWorktreeTool end-to-end via MCP interface', async () => {
      const tool = new ManageWorktreeTool();
      const mockContext = { container: {} as any, reqId: 'test-wt' };
      const listResult = await tool.validateAndExecute({ action: 'list' }, mockContext);
      expect(listResult.success).toBe(true);
      expect(listResult.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. TranscriptReader & ReadNativeTranscriptTool', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ase-test-transcripts-'));
    const testTranscriptPath = path.join(tempDir, 'test-transcript.jsonl');

    beforeAll(() => {
      const lines = [
        JSON.stringify({
          step_index: 0,
          source: 'USER_EXPLICIT',
          type: 'USER_INPUT',
          content: 'Add an authentication middleware and update database schema.'
        }),
        JSON.stringify({
          step_index: 1,
          source: 'MODEL',
          type: 'PLANNER_RESPONSE',
          content: 'I will inspect the existing auth files and apply changes.',
          tool_calls: [
            {
              id: 'call_1',
              name: 'run_command',
              arguments: { CommandLine: 'git status', Cwd: '/home/thor/project' }
            },
            {
              id: 'call_2',
              name: 'write_to_file',
              arguments: { TargetFile: '/home/thor/project/src/auth.ts', CodeContent: 'export const auth = true;' }
            }
          ]
        }),
        JSON.stringify({
          step_index: 2,
          source: 'SYSTEM',
          type: 'TOOL_RESPONSE',
          content: 'File created successfully.'
        })
      ];
      fs.writeFileSync(testTranscriptPath, lines.join('\n') + '\n', 'utf-8');
    });

    afterAll(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_) {}
    });

    it('streams and parses transcript lines with zero PTY wrapper', async () => {
      const parsed = await TranscriptReader.readTranscript(testTranscriptPath);
      expect(parsed.sourcePath).toBe(testTranscriptPath);
      expect(parsed.steps.length).toBe(3);
      expect(parsed.steps[0].role).toBe('user');
      expect(parsed.steps[1].role).toBe('assistant');
      expect(parsed.steps[1].toolCalls.length).toBe(2);
    });

    it('extracts metrics including tool call counts and modified files', async () => {
      const parsed = await TranscriptReader.readTranscript(testTranscriptPath);
      expect(parsed.metrics.totalSteps).toBe(3);
      expect(parsed.metrics.userTurns).toBe(1);
      expect(parsed.metrics.assistantTurns).toBe(1);
      expect(parsed.metrics.toolInvocations['run_command']).toBe(1);
      expect(parsed.metrics.toolInvocations['write_to_file']).toBe(1);
      expect(parsed.metrics.modifiedFiles).toContain('/home/thor/project/src/auth.ts');
    });

    it('converts normalized steps into fast-jev compatible message format', async () => {
      const parsed = await TranscriptReader.readTranscript(testTranscriptPath);
      expect(parsed.messages.length).toBe(3);
      expect(parsed.messages[0].role).toBe('user');
      expect(parsed.messages[0].text).toContain('authentication middleware');
      expect(parsed.messages[1].role).toBe('assistant');
      expect(parsed.messages[1].toolUses.length).toBe(2);
    });

    it('executes ReadNativeTranscriptTool end-to-end with optional fast-jev compaction', async () => {
      const tool = new ReadNativeTranscriptTool();
      const mockContext = { container: {} as any, reqId: 'test-transcript' };
      const result = await tool.validateAndExecute({
        transcript_path: testTranscriptPath,
        compact: true,
        tail: 10
      }, mockContext);

      expect(result.success).toBe(true);
      expect(result.source_file).toBe(testTranscriptPath);
      expect(result.metrics.totalSteps).toBe(3);
      expect(result.compaction).toBeDefined();
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });
});
