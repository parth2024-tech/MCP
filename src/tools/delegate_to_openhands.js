import { z } from 'zod';
import { BaseTool } from '../core/BaseTool';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import * as os from 'os';
export const OPENHANDS_SETTINGS_PATH = path.join(os.homedir(), '.openhands', 'settings.json');
// Global store for jobs (now tracking API-based jobs)
const openhandsJobs = new Map();
export default class DelegateToOpenHandsTool extends BaseTool {
    name = 'delegate_to_openhands';
    description = 'Spawns an OpenHands agent headlessly to complete a complex coding task for ANY software project. Returns a Job ID to track progress with check_openhands_status.';
    schema = z.object({
        agent_token: z.string().optional(),
        task_description: z.string().describe('The detailed task you want OpenHands to accomplish'),
        workspace_dir: z.string().optional().describe('The project directory OpenHands should operate in. Defaults to current working directory.'),
        llm_model: z.string().optional().describe('LLM model to use. Defaults to gemini/gemini-2.0-flash-exp.'),
    });
    async execute(args, context) {
        // ── Step 1: Pre-flight checks ────────────────────────────────────────────
        if (!fs.existsSync(OPENHANDS_SETTINGS_PATH)) {
            return {
                success: false,
                error: 'OpenHands settings.json not found.',
                fix: 'Call configure_openhands with your gemini_api_key first.'
            };
        }
        const settingsContent = fs.readFileSync(OPENHANDS_SETTINGS_PATH, 'utf-8');
        if (!settingsContent.includes('"api_key"') || settingsContent.includes('"api_key": ""')) {
            return {
                success: false,
                error: 'OpenHands settings.json exists but no API key is configured.',
                fix: `Edit ${OPENHANDS_SETTINGS_PATH} and set a valid api_key under agent_settings.llm`,
                hint: 'Call: configure_openhands({ gemini_api_key: "YOUR_KEY_HERE" }) to fix this automatically.'
            };
        }
        // ── Step 2: Start OpenHands Backend if not running ────────────────────────
        const ohRoot = path.join(process.env.HOME || '/root', 'skiils', 'OpenHands');
        const hasMakefile = fs.existsSync(path.join(ohRoot, 'Makefile'));
        if (!hasMakefile) {
            return { success: false, error: `OpenHands not found at ${ohRoot}. Please check the installation.` };
        }
        const workspace = args.workspace_dir || process.cwd();
        // Try to hit the API first to see if it's already running
        let isRunning = false;
        try {
            const ping = await fetch('http://127.0.0.1:3000/openapi.json');
            if (ping.ok)
                isRunning = true;
        }
        catch (e) {
            isRunning = false;
        }
        if (!isRunning) {
            const ohProcess = spawn('make', ['start-backend'], {
                cwd: ohRoot,
                env: {
                    ...process.env,
                    PORT: '3000',
                    WORKSPACE_BASE: workspace,
                    PROJECTS_PATH: workspace,
                    ...(args.llm_model ? { LLM_MODEL: args.llm_model } : {})
                },
                detached: true,
                stdio: 'ignore'
            });
            ohProcess.unref();
            // Wait for it to boot (max 10 seconds to avoid MCP timeout)
            for (let i = 0; i < 10; i++) {
                await new Promise(r => setTimeout(r, 1000));
                try {
                    const ping = await fetch('http://127.0.0.1:3000/openapi.json', { signal: AbortSignal.timeout(500) });
                    if (ping.ok) {
                        isRunning = true;
                        break;
                    }
                }
                catch (e) { }
            }
            if (!isRunning) {
                return { success: false, error: 'OpenHands backend is starting but taking longer than expected. Please wait a few seconds and try delegating the task again.' };
            }
        }
        // ── Step 3: Create App Conversation Headlessly ────────────────────────────
        try {
            const payload = {
                initial_message: {
                    role: "user",
                    content: [{ type: "text", text: args.task_description }],
                    run: true
                }
            };
            const res = await fetch('http://127.0.0.1:3000/api/v1/app-conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                return { success: false, error: `API error: ${res.statusText}`, detail: await res.text() };
            }
            const data = await res.json();
            const jobId = data.id; // This is the task id
            return {
                success: true,
                job_id: jobId,
                workspace,
                message: `OpenHands agent task submitted headlessly. Job ID: ${jobId}. Use check_openhands_status({ job_id: "${jobId}" }) to monitor it. No UI is required.`
            };
        }
        catch (err) {
            return { success: false, error: `Failed to submit task to OpenHands: ${err.message}` };
        }
    }
}
