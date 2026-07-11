import { z } from 'zod';
import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BaseTool, ToolContext } from '../core/BaseTool';
const { logger } = require('../utils/logger');

// In-memory job store for background OpenHands runs
const openhandsJobs = new Map<string, any>();

// Path to the OpenHands settings file (where the LLM API key lives)
const OPENHANDS_SETTINGS_PATH = path.join(process.env.HOME || '/root', '.openhands', 'settings.json');
const OPENHANDS_DIR = path.join(process.env.HOME || '/root', '.skiils', 'OpenHands');

export default class DelegateToOpenHandsTool extends BaseTool<any> {
  name = 'delegate_to_openhands';
  description = 'Spawns an OpenHands agent in the background to complete a complex coding task for ANY software project. Returns a Job ID to track progress with check_openhands_status.';
  
  schema = z.object({
    agent_token: z.string().optional(),
    task_description: z.string().describe('The detailed task you want OpenHands to accomplish'),
    workspace_dir: z.string().optional().describe('The project directory OpenHands should operate in. Defaults to current working directory.'),
    llm_model: z.string().optional().describe('LLM model to use. Defaults to gemini/gemini-2.0-flash-exp. Examples: gemini/gemini-2.0-flash-exp, anthropic/claude-3-5-sonnet-20241022'),
  });

  protected async execute(args: any, context: ToolContext): Promise<any> {
    // ── Step 1: Verify settings.json exists with an API key ──────────────────
    if (!fs.existsSync(OPENHANDS_SETTINGS_PATH)) {
      return {
        success: false,
        error: 'OpenHands is not configured. No settings.json found.',
        fix: `Run the configure_openhands tool first, or manually create ${OPENHANDS_SETTINGS_PATH} with your Gemini API key.`,
        hint: 'Call: configure_openhands({ gemini_api_key: "YOUR_KEY_HERE" })'
      };
    }

    let settings: any;
    try {
      settings = JSON.parse(fs.readFileSync(OPENHANDS_SETTINGS_PATH, 'utf8'));
    } catch (e: any) {
      return { success: false, error: `Failed to parse ${OPENHANDS_SETTINGS_PATH}: ${e.message}` };
    }

    // Validate that a model and API key are present
    const apiKey = settings?.agent_settings?.llm?.api_key ||
                   settings?.llm_profiles?.profiles?.Default?.api_key;
    if (!apiKey || apiKey === '' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      return {
        success: false,
        error: 'OpenHands settings.json exists but no API key is configured.',
        fix: `Edit ${OPENHANDS_SETTINGS_PATH} and set a valid api_key under agent_settings.llm`,
        hint: 'Call: configure_openhands({ gemini_api_key: "YOUR_KEY_HERE" }) to fix this automatically.'
      };
    }

    // ── Step 2: Create and register the job ──────────────────────────────────
    const jobId = `OH-${crypto.randomBytes(4).toString('hex')}`;
    const workspace = args.workspace_dir || process.cwd();

    logger.info('OpenHands', `Starting job ${jobId} in ${workspace} for task: ${args.task_description.substring(0, 80)}...`);

    openhandsJobs.set(jobId, {
      status: 'starting',
      task: args.task_description,
      workspace,
      startTime: Date.now(),
      logs: []
    });

    // ── Step 3: Find and use the right start command ─────────────────────────
    const ohRoot = path.join(process.env.HOME || '/root', 'skiils', 'OpenHands');
    const startCmd = fs.existsSync(path.join(ohRoot, 'package.json')) ? 'npm' : null;

    if (!startCmd) {
      openhandsJobs.get(jobId).status = 'failed';
      return { success: false, error: `OpenHands not found at ${ohRoot}. Please check the installation.` };
    }

    const ohProcess = spawn(startCmd, ['run', 'dev'], {
      cwd: ohRoot,
      env: { 
        ...process.env, 
        PORT: '8000',
        WORKSPACE_BASE: workspace,
        PROJECTS_PATH: workspace,
        // OpenHands reads settings from ~/.openhands/settings.json automatically
        // Pass the model selection if specified
        ...(args.llm_model ? { LLM_MODEL: args.llm_model } : {})
      },
      detached: false
    });

    ohProcess.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const job = openhandsJobs.get(jobId);
      if (!job) return;
      job.logs.push(text);
      if (text.includes('started') || text.includes('listening') || text.includes('ready')) {
        job.status = 'running';
      }
    });

    ohProcess.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      const job = openhandsJobs.get(jobId);
      if (!job) return;
      job.logs.push(`[ERR] ${text}`);
      // Detect common auth errors
      if (text.includes('API key') || text.includes('authentication') || text.includes('401')) {
        job.status = 'auth_error';
        job.error = 'Invalid or missing API key in ~/.openhands/settings.json';
      }
    });

    ohProcess.on('close', (code: number | null) => {
      const job = openhandsJobs.get(jobId);
      if (!job) return;
      job.status = code === 0 ? 'completed' : (job.status === 'auth_error' ? 'auth_error' : 'failed');
      job.exitCode = code;
    });

    openhandsJobs.get(jobId).process = ohProcess;

    return {
      success: true,
      job_id: jobId,
      workspace,
      message: `OpenHands agent started. Job ID: ${jobId}. Use check_openhands_status({ job_id: "${jobId}" }) to monitor it.`,
      ui_url: 'http://localhost:8000'
    };
  }
}

// Expose the job store globally so check_openhands_status can access it
(global as any).openhandsJobs = openhandsJobs;
