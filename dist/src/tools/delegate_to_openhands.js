"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENHANDS_SETTINGS_PATH = void 0;
const zod_1 = require("zod");
const BaseTool_1 = require("../core/BaseTool");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
exports.OPENHANDS_SETTINGS_PATH = path_1.default.join(os_1.default.homedir(), '.openhands', 'settings.json');
// Global store for jobs (now tracking API-based jobs)
const openhandsJobs = new Map();
class DelegateToOpenHandsTool extends BaseTool_1.BaseTool {
    name = 'delegate_to_openhands';
    description = 'Spawns an OpenHands agent headlessly to complete a complex coding task for ANY software project. Returns a Job ID to track progress with check_openhands_status.';
    schema = zod_1.z.object({
        agent_token: zod_1.z.string().optional(),
        task_description: zod_1.z.string().describe('The detailed task you want OpenHands to accomplish'),
        workspace_dir: zod_1.z.string().optional().describe('The project directory OpenHands should operate in. Defaults to current working directory.'),
        llm_model: zod_1.z.string().optional().describe('LLM model to use. Defaults to gemini/gemini-2.0-flash-exp.'),
    });
    async execute(args, context) {
        const { logger } = context.container;
        // ── Step 1: Pre-flight checks ────────────────────────────────────────────
        if (!fs_1.default.existsSync(exports.OPENHANDS_SETTINGS_PATH)) {
            return {
                success: false,
                error: 'OpenHands settings.json not found.',
                fix: 'Call configure_openhands with your gemini_api_key first.'
            };
        }
        const settingsContent = fs_1.default.readFileSync(exports.OPENHANDS_SETTINGS_PATH, 'utf-8');
        if (!settingsContent.includes('"api_key"') || settingsContent.includes('"api_key": ""')) {
            return {
                success: false,
                error: 'OpenHands settings.json exists but no API key is configured.',
                fix: `Edit ${exports.OPENHANDS_SETTINGS_PATH} and set a valid api_key under agent_settings.llm`,
                hint: 'Call: configure_openhands({ gemini_api_key: "YOUR_KEY_HERE" }) to fix this automatically.'
            };
        }
        // ── Step 2: Start OpenHands Backend if not running ────────────────────────
        const ohRoot = path_1.default.join(process.env.HOME || '/root', 'skiils', 'OpenHands');
        const hasMakefile = fs_1.default.existsSync(path_1.default.join(ohRoot, 'Makefile'));
        if (!hasMakefile) {
            return { success: false, error: `OpenHands not found at ${ohRoot}. Please check the installation.` };
        }
        const workspace = args.workspace_dir || process.cwd();
        logger.info('OpenHands', `Ensuring backend is running for ${workspace}...`);
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
            const ohProcess = (0, child_process_1.spawn)('make', ['start-backend'], {
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
            // Wait for it to boot
            for (let i = 0; i < 15; i++) {
                await new Promise(r => setTimeout(r, 2000));
                try {
                    const ping = await fetch('http://127.0.0.1:3000/openapi.json');
                    if (ping.ok) {
                        isRunning = true;
                        break;
                    }
                }
                catch (e) { }
            }
            if (!isRunning) {
                return { success: false, error: 'Failed to start OpenHands backend.' };
            }
        }
        // ── Step 3: Create App Conversation Headlessly ────────────────────────────
        logger.info('OpenHands', `Submitting task to headless API...`);
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
exports.default = DelegateToOpenHandsTool;
