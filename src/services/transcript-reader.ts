import fs from 'fs';
import path from 'path';
import readline from 'readline';
import os from 'os';
import { type Message } from './fast-jev/types';

export interface NormalizedToolCall {
  id?: string;
  name: string;
  arguments: any;
  summary?: string;
  action?: string;
}

export interface NormalizedStep {
  stepIndex: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  type: string;
  content: string;
  toolCalls: NormalizedToolCall[];
  toolResults?: Array<{ id: string; text: string; isError?: boolean }>;
  isError?: boolean;
  timestamp?: string;
}

export interface TranscriptMetrics {
  totalSteps: number;
  userTurns: number;
  assistantTurns: number;
  toolInvocations: Record<string, number>;
  totalToolCalls: number;
  failedToolCalls: number;
  modifiedFiles: string[];
  recentErrors: string[];
}

export interface ParsedTranscript {
  sourcePath: string;
  steps: NormalizedStep[];
  metrics: TranscriptMetrics;
  messages: Message[];
}

export class TranscriptReader {
  /**
   * Resolves a transcript path or conversation ID into a real file path.
   */
  public static resolveTranscriptPath(filePathOrId: string): string {
    if (fs.existsSync(filePathOrId)) {
      return path.resolve(filePathOrId);
    }

    // Check Antigravity brain directories
    const homeDir = os.homedir();
    const antigravityBrainDir = path.join(homeDir, '.gemini', 'antigravity', 'brain', filePathOrId);
    if (fs.existsSync(antigravityBrainDir)) {
      const logDir = path.join(antigravityBrainDir, '.system_generated', 'logs');
      const fullLog = path.join(logDir, 'transcript_full.jsonl');
      const compactLog = path.join(logDir, 'transcript.jsonl');
      if (fs.existsSync(fullLog)) return fullLog;
      if (fs.existsSync(compactLog)) return compactLog;
    }

    // Check direct relative to brain directory
    const directLog = path.join(homeDir, '.gemini', 'antigravity', 'brain', filePathOrId, 'transcript.jsonl');
    if (fs.existsSync(directLog)) return directLog;

    throw new Error(`Transcript file or conversation ID not found: ${filePathOrId}`);
  }

  /**
   * Discovers recent agent transcript files across Antigravity, Claude, and local logs.
   */
  public static async discoverRecentTranscripts(searchDir?: string, limit: number = 10): Promise<string[]> {
    const found: Array<{ path: string; mtime: number }> = [];
    const homeDir = os.homedir();

    const searchDirs = [
      searchDir ? path.resolve(searchDir) : null,
      path.join(homeDir, '.gemini', 'antigravity', 'brain'),
      path.join(homeDir, '.claude', 'projects'),
      path.join(process.cwd(), '.transcripts'),
      path.join(process.cwd(), 'logs')
    ].filter(Boolean) as string[];

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const potentialLogs = [
              path.join(dir, entry.name, '.system_generated', 'logs', 'transcript.jsonl'),
              path.join(dir, entry.name, 'transcript.jsonl'),
              path.join(dir, entry.name, 'session.jsonl')
            ];
            for (const p of potentialLogs) {
              if (fs.existsSync(p)) {
                found.push({ path: p, mtime: fs.statSync(p).mtimeMs });
              }
            }
          } else if (entry.isFile() && (entry.name.endsWith('.jsonl') || entry.name.endsWith('.transcript.json'))) {
            const p = path.join(dir, entry.name);
            found.push({ path: p, mtime: fs.statSync(p).mtimeMs });
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }

    return found
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(f => f.path);
  }

  /**
   * Reads and parses a transcript line-by-line via streaming with zero PTY overhead.
   */
  public static async readTranscript(
    filePathOrId: string,
    options: { tail?: number; limit?: number } = {}
  ): Promise<ParsedTranscript> {
    const resolvedPath = this.resolveTranscriptPath(filePathOrId);

    const steps: NormalizedStep[] = [];
    const fileStream = fs.createReadStream(resolvedPath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let index = 0;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const parsed = JSON.parse(trimmed);
        const normalized = this.normalizeEntry(parsed, index++);
        if (normalized) {
          steps.push(normalized);
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Apply tail or limit if requested
    let processedSteps = steps;
    if (options.tail && options.tail > 0 && processedSteps.length > options.tail) {
      processedSteps = processedSteps.slice(processedSteps.length - options.tail);
    } else if (options.limit && options.limit > 0 && processedSteps.length > options.limit) {
      processedSteps = processedSteps.slice(0, options.limit);
    }

    const metrics = this.extractMetrics(processedSteps);
    const messages = this.toFastJevMessages(processedSteps);

    return {
      sourcePath: resolvedPath,
      steps: processedSteps,
      metrics,
      messages
    };
  }

  /**
   * Normalizes disparate transcript schemas (Antigravity, Claude Code, generic) into a common structure.
   */
  private static normalizeEntry(raw: any, fallbackIndex: number): NormalizedStep | null {
    // 1. Antigravity format
    if (raw.source || raw.step_index !== undefined || raw.type) {
      let role: NormalizedStep['role'] = 'assistant';
      if (raw.source === 'USER_EXPLICIT' || raw.type === 'USER_INPUT') {
        role = 'user';
      } else if (raw.source === 'SYSTEM' || raw.type === 'SYSTEM_MESSAGE') {
        role = 'system';
      } else if (raw.type === 'TOOL_RESPONSE') {
        role = 'tool';
      }

      const toolCalls: NormalizedToolCall[] = [];
      if (Array.isArray(raw.tool_calls)) {
        for (const tc of raw.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.name || tc.tool_name || 'unknown_tool',
            arguments: tc.arguments || tc.parameters || tc.input || {},
            summary: tc.tool_summary || tc.summary,
            action: tc.tool_action || tc.action
          });
        }
      }

      return {
        stepIndex: raw.step_index ?? fallbackIndex,
        role,
        type: raw.type || 'UNKNOWN',
        content: typeof raw.content === 'string' ? raw.content : JSON.stringify(raw.content || ''),
        toolCalls,
        isError: raw.status === 'ERROR' || raw.status === 'FAILED',
        timestamp: raw.created_at || raw.timestamp
      };
    }

    // 2. Claude Code or OpenAI messages format
    if (raw.role) {
      const roleMap: Record<string, NormalizedStep['role']> = {
        user: 'user',
        assistant: 'assistant',
        system: 'system',
        tool: 'tool'
      };

      const toolCalls: NormalizedToolCall[] = [];
      if (Array.isArray(raw.tool_calls)) {
        for (const tc of raw.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function?.name || tc.name || 'tool',
            arguments: tc.function?.arguments ? (typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments) : {}
          });
        }
      }

      const content = typeof raw.content === 'string'
        ? raw.content
        : Array.isArray(raw.content)
          ? raw.content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
          : '';

      return {
        stepIndex: fallbackIndex,
        role: roleMap[raw.role] || 'assistant',
        type: raw.type || raw.role.toUpperCase(),
        content,
        toolCalls,
        timestamp: raw.timestamp
      };
    }

    return null;
  }

  /**
   * Computes key metrics from the normalized steps.
   */
  public static extractMetrics(steps: NormalizedStep[]): TranscriptMetrics {
    const toolInvocations: Record<string, number> = {};
    const modifiedFilesSet = new Set<string>();
    const recentErrors: string[] = [];
    let totalToolCalls = 0;
    let failedToolCalls = 0;
    let userTurns = 0;
    let assistantTurns = 0;

    for (const step of steps) {
      if (step.role === 'user') userTurns++;
      if (step.role === 'assistant') assistantTurns++;
      if (step.isError && step.content) {
        recentErrors.push(step.content.slice(0, 200));
      }

      for (const call of step.toolCalls) {
        totalToolCalls++;
        toolInvocations[call.name] = (toolInvocations[call.name] || 0) + 1;

        // Check modified files from tool arguments
        const args = call.arguments || {};
        const filePath = args.TargetFile || args.targetFile || args.path || args.file_path || args.filename;
        if (filePath && typeof filePath === 'string' && (
          call.name.includes('write') ||
          call.name.includes('replace') ||
          call.name.includes('edit') ||
          call.name.includes('create')
        )) {
          modifiedFilesSet.add(path.resolve(filePath));
        }
      }

      if (step.toolResults) {
        for (const res of step.toolResults) {
          if (res.isError) {
            failedToolCalls++;
            recentErrors.push(res.text.slice(0, 200));
          }
        }
      }
    }

    return {
      totalSteps: steps.length,
      userTurns,
      assistantTurns,
      toolInvocations,
      totalToolCalls,
      failedToolCalls,
      modifiedFiles: Array.from(modifiedFilesSet),
      recentErrors: recentErrors.slice(-5)
    };
  }

  /**
   * Converts normalized steps into the exact fast-jev Message format.
   */
  public static toFastJevMessages(steps: NormalizedStep[]): Message[] {
    const messages: Message[] = [];

    for (const step of steps) {
      const toolUses = step.toolCalls.map((tc, idx) => ({
        tool_use_id: tc.id || `call_${step.stepIndex}_${idx}`,
        tool: tc.name,
        input: tc.arguments,
        text: tc.summary,
        isError: step.isError
      }));

      const toolResults = step.toolResults?.map(tr => ({
        tool_use_id: tr.id,
        text: tr.text,
        isError: tr.isError
      }));

      messages.push({
        role: step.role === 'user' ? 'user' : 'assistant',
        text: step.content || '',
        toolUses,
        ...(toolResults && toolResults.length > 0 ? { toolResults } : {})
      });
    }

    return messages;
  }
}
