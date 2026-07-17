"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const BaseTool_1 = require("../core/BaseTool");
const { logger } = require('../utils/logger');
const OPENHANDS_DIR = path_1.default.join(process.env.HOME || '/root', '.openhands');
const SETTINGS_PATH = path_1.default.join(OPENHANDS_DIR, 'settings.json');
class ConfigureOpenHandsTool extends BaseTool_1.BaseTool {
    name = 'configure_openhands';
    description = 'Configure OpenHands with your LLM API key and model. Run this once before using delegate_to_openhands. Supports Gemini, Anthropic, and OpenAI keys.';
    schema = zod_1.z.object({
        gemini_api_key: zod_1.z.string().optional().describe('Your Google Gemini API key (get from https://aistudio.google.com/apikey)'),
        anthropic_api_key: zod_1.z.string().optional().describe('Your Anthropic Claude API key'),
        openai_api_key: zod_1.z.string().optional().describe('Your OpenAI API key'),
        model: zod_1.z.string().optional().describe('LLM model to use. Auto-detected from key type if not specified. Examples: gemini/gemini-2.0-flash-exp, anthropic/claude-sonnet-4-5'),
    });
    async execute(args, _context) {
        // Determine API key and model
        let apiKey;
        let model;
        if (args.gemini_api_key) {
            apiKey = args.gemini_api_key;
            model = args.model || 'gemini/gemini-2.0-flash-exp';
        }
        else if (args.anthropic_api_key) {
            apiKey = args.anthropic_api_key;
            model = args.model || 'anthropic/claude-sonnet-4-5';
        }
        else if (args.openai_api_key) {
            apiKey = args.openai_api_key;
            model = args.model || 'openai/gpt-4o';
        }
        else {
            return {
                success: false,
                error: 'Please provide one of: gemini_api_key, anthropic_api_key, or openai_api_key.',
                hint: 'Example: configure_openhands({ gemini_api_key: "AIza..." })'
            };
        }
        // Validate key looks real (basic sanity check)
        if (apiKey.length < 10) {
            return { success: false, error: 'API key appears too short to be valid.' };
        }
        // Create ~/.openhands directory if needed
        if (!fs_1.default.existsSync(OPENHANDS_DIR)) {
            fs_1.default.mkdirSync(OPENHANDS_DIR, { recursive: true });
        }
        // Build the settings.json in the format OpenHands expects
        const settings = {
            language: 'en',
            agent_settings: {
                enable_cli_session: false,
                llm: {
                    model,
                    api_key: apiKey,
                    temperature: 0.0
                }
            },
            llm_profiles: {
                selected_profile: 'Default',
                profiles: {
                    Default: {
                        model,
                        api_key: apiKey,
                        temperature: 0.0
                    }
                }
            }
        };
        // Write settings.json
        fs_1.default.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        logger.info('OpenHands', `Settings configured: model=${model}, settings written to ${SETTINGS_PATH}`);
        return {
            success: true,
            message: `✅ OpenHands configured successfully!`,
            settings_path: SETTINGS_PATH,
            model,
            api_key_preview: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
            next_step: 'You can now use delegate_to_openhands to start the agent on any task.'
        };
    }
}
exports.default = ConfigureOpenHandsTool;
