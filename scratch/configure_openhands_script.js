const fs = require('fs');
const path = require('path');

const apiKey = "AQ.Ab8RN6LF6mVD8g75PcVT2j4w32VXcT_DEp6O08qY2nL9s25_ZQ";
const model = "gemini/gemini-3.1-pro"; 

const OPENHANDS_DIR = path.join(process.env.HOME || '/root', '.openhands');
const SETTINGS_PATH = path.join(OPENHANDS_DIR, 'settings.json');

if (!fs.existsSync(OPENHANDS_DIR)) {
  fs.mkdirSync(OPENHANDS_DIR, { recursive: true });
}

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

fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
console.log(`Settings written to ${SETTINGS_PATH}`);
