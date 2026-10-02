# Electron Development — Code Reference

## ### 1. Project Structure & Architecture

```
my-electron-app/
├── package.json
├── electron-builder.yml        # or forge.config.ts
├── src/
│   ├── main/
│   │   ├── main.ts             # Main process entry
│   │   ├── ipc-handlers.ts     # IPC channel handlers
│   │   ├── menu.ts             # Application menu
│   │   ├── tray.ts             # System tray
│   │   └── updater.ts          # Auto-update logic
│   ├── preload/
│   │   └── preload.ts          # Bridge between main ↔ renderer
│   ├── renderer/
│   │   ├── index.html          # Entry HTML
│   │   ├── App.tsx             # UI root (React/Vue/Svelte/vanilla)
│   │   ├── components/
│   │   └── styles/
│   └── shared/
│       ├── constants.ts        # IPC channel names, shared enums
│       └── types.ts            # Shared TypeScript interfaces
├── resources/
│   ├── icon.png                # App icon (1024x1024)
│   └── entitlements.mac.plist  # macOS entitlements
├── tests/
│   ├── unit/
│   └── e2e/
└── tsconfig.json
```


## ### 2. Process Model (Main / Renderer / Preload / Utility)

```typescript
import { BrowserWindow } from 'electron';
import path from 'node:path';

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // ── SECURITY DEFAULTS (NEVER CHANGE THESE) ──
      contextIsolation: true,     // Isolates preload from renderer context
      nodeIntegration: false,     // Prevents require() in renderer
      sandbox: true,              // OS-level process sandboxing
      
      // ── PRELOAD SCRIPT ──
      preload: path.join(__dirname, '../preload/preload.js'),
      
      // ── ADDITIONAL HARDENING ──
      webSecurity: true,          // Enforce same-origin policy
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
        ],
      },
    });
  });

  return win;
}
```


## ### 3. Secure IPC Communication

```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// ── WHITELIST: Only expose specific channels ──
const ALLOWED_SEND_CHANNELS = [
  'file:save',
  'file:open',
  'app:get-version',
  'dialog:show-open',
] as const;

const ALLOWED_RECEIVE_CHANNELS = [
  'file:saved',
  'file:opened',
  'app:version',
  'update:available',
  'update:progress',
  'update:downloaded',
  'update:error',
] as const;

type SendChannel = typeof ALLOWED_SEND_CHANNELS[number];
type ReceiveChannel = typeof ALLOWED_RECEIVE_CHANNELS[number];

contextBridge.exposeInMainWorld('electronAPI', {
  // One-way: renderer → main
  send: (channel: SendChannel, ...args: unknown[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Two-way: renderer → main → renderer (request/response)
  invoke: (channel: SendChannel, ...args: unknown[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
  },

  // One-way: main → renderer (subscriptions)
  on: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
```


```typescript
// src/main/ipc-handlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';

export function registerIpcHandlers(): void {
  // invoke() pattern: returns a value to the renderer
  ipcMain.handle('file:open', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }],
    });
    
    if (canceled || filePaths.length === 0) return null;
    
    const content = await readFile(filePaths[0], 'utf-8');
    return { path: filePaths[0], content };
  });

  ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
    // VALIDATE INPUTS — never trust renderer data blindly
    if (typeof filePath !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid arguments');
    }
    await writeFile(filePath, content, 'utf-8');
    return { success: true };
  });

  ipcMain.handle('app:get-version', () => {
    return process.versions.electron;
  });
}
```


```typescript
// src/renderer/App.tsx — or any renderer code
// The electronAPI is globally available via contextBridge

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, ...args: unknown[]) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

// Open a file via IPC
async function openFile() {
  const result = await window.electronAPI.invoke('file:open');
  if (result) {
    console.log('File content:', result.content);
  }
}

// Subscribe to updates from main process
const unsubscribe = window.electronAPI.on('update:available', (version) => {
  console.log('Update available:', version);
});

// Cleanup on unmount
// unsubscribe();
```


## #### Production Security Checklist

```
── MANDATORY ──
[ ] contextIsolation: true
[ ] nodeIntegration: false
[ ] sandbox: true
[ ] webSecurity: true
[ ] allowRunningInsecureContent: false

── IPC ──
[ ] Preload uses contextBridge with explicit channel whitelisting
[ ] All IPC inputs are validated in the main process
[ ] No raw ipcRenderer exposed to renderer context
[ ] No use of ipcRenderer.sendSync()

── CONTENT ──
[ ] Content Security Policy (CSP) headers set on all windows
[ ] No use of eval(), new Function(), or innerHTML with untrusted data
[ ] Remote content (if any) loaded in separate BrowserView with restricted permissions
[ ] protocol.registerSchemesAsPrivileged() uses minimal permissions

── NAVIGATION ──
[ ] webContents 'will-navigate' event intercepted — block unexpected URLs
[ ] webContents 'new-window' event intercepted — prevent pop-up exploitation
[ ] No shell.openExternal() with unsanitized URLs

── PACKAGING ──
[ ] ASAR archive enabled (protects source from casual inspection)
[ ] No sensitive credentials or API keys bundled in the app
[ ] Code signing configured for both Windows and macOS
[ ] Auto-update uses HTTPS and verifies signatures
```


```typescript
// In main process, after creating a BrowserWindow
win.webContents.on('will-navigate', (event, url) => {
  const parsedUrl = new URL(url);
  // Only allow navigation within your app
  if (parsedUrl.origin !== 'http://localhost:5173') { // dev server
    event.preventDefault();
    console.warn(`Blocked navigation to: ${url}`);
  }
});

// Prevent new windows from being opened
win.webContents.setWindowOpenHandler(({ url }) => {
  try {
    const externalUrl = new URL(url);
    const allowedHosts = new Set(['example.com', 'docs.example.com']);

    // Never forward raw renderer-controlled URLs to the OS.
    // Unvalidated links can enable phishing or abuse platform URL handlers.
    if (externalUrl.protocol === 'https:' && allowedHosts.has(externalUrl.hostname)) {
      require('electron').shell.openExternal(externalUrl.toString());
    } else {
      console.warn(`Blocked external URL: ${url}`);
    }
  } catch {
    console.warn(`Rejected invalid external URL: ${url}`);
  }

  return { action: 'deny' }; // Block all new Electron windows
});
```


```typescript
import { protocol } from 'electron';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

// Register a custom protocol for loading local assets securely
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const baseDir = path.resolve(__dirname, '../renderer');
    // Strip the leading slash so path.resolve keeps baseDir as the root.
    const relativePath = path.normalize(decodeURIComponent(url.pathname).replace(/^[/\\]+/, ''));
    const filePath = path.resolve(baseDir, relativePath);

    if (!filePath.startsWith(baseDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    const data = await readFile(filePath);
    return new Response(data);
  });
});
```


## ### 5. State Management Across Processes

```typescript
// src/main/store.ts
import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface AppState {
  theme: 'light' | 'dark';
  recentFiles: string[];
  windowBounds: { x: number; y: number; width: number; height: number };
}

const DEFAULTS: AppState = {
  theme: 'light',
  recentFiles: [],
  windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
};

class Store {
  private data: AppState;
  private filePath: string;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
    this.data = this.load();
  }

  private load(): AppState {
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.data[key];
  }

  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    this.data[key] = value;
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

export const store = new Store();
```


```typescript
import Store from 'electron-store';

const store = new Store({
  schema: {
    theme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
    windowBounds: {
      type: 'object',
      properties: {
        width: { type: 'number', default: 1200 },
        height: { type: 'number', default: 800 },
      },
    },
  },
});

// Usage
store.set('theme', 'dark');
console.log(store.get('theme')); // 'dark'
```


## #### electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.mycompany.myapp
productName: My App
directories:
  output: dist
  buildResources: resources

files:
  - "out/**/*"       # compiled main + preload
  - "renderer/**/*"  # built renderer assets
  - "package.json"

asar: true
compression: maximum

# ── macOS ──
mac:
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]

# ── Windows ──
win:
  target:
    - target: nsis
      arch: [x64, arm64]
  signingHashAlgorithms: [sha256]

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false

# ── Linux ──
linux:
  target:
    - target: AppImage
    - target: deb
  category: Development
  maintainer: your-email@example.com

# ── Auto Update ──
publish:
  provider: github
  owner: your-org
  repo: your-repo
```


## #### Auto-Update with electron-updater

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false; // Let user decide
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    mainWindow.webContents.send('update:error', err.message);
  });

  // Check for updates every 4 hours
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  autoUpdater.checkForUpdates();
}

// Expose to renderer via IPC
ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());
ipcMain.handle('update:install', () => autoUpdater.quitAndInstall());
```


## #### Debugging the Main Process

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": [".", "--remote-debugging-port=9223"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```


## #### Testing Strategy

```typescript
// tests/e2e/app.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches and shows main window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Wait for the app to fully load
  await window.waitForLoadState('domcontentloaded');

  const title = await window.title();
  expect(title).toBe('My App');

  // Take a screenshot for visual regression
  await window.screenshot({ path: 'tests/screenshots/main-window.png' });

  await app.close();
});

test('file open dialog works via IPC', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Test IPC by evaluating in the renderer context
  const version = await window.evaluate(async () => {
    return window.electronAPI.invoke('app:get-version');
  });

  expect(version).toBeTruthy();
  await app.close();
});
```


## ## Application Lifecycle Management

```typescript
// src/main/main.ts
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc-handlers';
import { setupAutoUpdater } from './updater';
import { store } from './store';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();

  // Restore window bounds
  const bounds = store.get('windowBounds');
  if (bounds) mainWindow.setBounds(bounds);

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) store.set('windowBounds', mainWindow.getBounds());
  });

  // Auto-update (only in production)
  if (app.isPackaged) {
    setupAutoUpdater(mainWindow);
  }

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent additional renderers from being created
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault(); // Block <webview> tags
  });
});
```


