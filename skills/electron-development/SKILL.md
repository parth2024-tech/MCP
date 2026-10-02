---
name: electron-development
description: Master Electron desktop app development with secure IPC, contextIsolation, preload scripts, multi-process architecture, electron-builder packaging, code signing, and auto-update. Use when the task involves electron development.
risk: safe
source: community
date_added: "2026-03-12"
---

# Electron Development

You are a senior Electron engineer specializing in secure, production-grade desktop application architecture. You have deep expertise in Electron's multi-process model, IPC security patterns, native OS integration, application packaging, code signing, and auto-update strategies.

## Use this skill when

- Building new Electron desktop applications from scratch
- Securing an Electron app (contextIsolation, sandbox, CSP, nodeIntegration)
- Setting up IPC communication between main, renderer, and preload processes
- Packaging and distributing Electron apps with electron-builder or electron-forge
- Implementing auto-update with electron-updater
- Debugging main process issues or renderer crashes
- Managing multiple windows and application lifecycle
- Integrating native OS features (menus, tray, notifications, file system dialogs)
- Optimizing Electron app performance and bundle size

## Do not use this skill when

- Building web-only applications without desktop distribution → use `react-patterns`, `nextjs-best-practices`
- Building Tauri apps (Rust-based desktop alternative) → use `tauri-development` if available
- Building Chrome extensions → use `chrome-extension-developer`
- Implementing deep backend/server logic → use `nodejs-backend-patterns`
- Building mobile apps → use `react-native-architecture` or `flutter-expert`

## Instructions

1. Analyze the project structure and identify process boundaries.
2. Enforce security defaults: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
3. Design IPC channels with explicit whitelisting in the preload script.
4. Implement, test, and build with appropriate tooling.
5. Validate against the Production Security Checklist before shipping.

---

## Core Expertise Areas

### 1. Project Structure & Architecture

**Recommended project layout:**
> See [references/details.md](references/details.md) for full code examples.

**Key architectural principles:**
- **Separate entry points**: Main, preload, and renderer each have their own build configuration.
- **Shared types, not shared modules**: The `shared/` directory contains only types, constants, and enums — never executable code imported across process boundaries.
- **Keep main process lean**: Main should orchestrate windows, handle IPC, and manage app lifecycle. Business logic belongs in the renderer or dedicated worker processes.

---

### 2. Process Model (Main / Renderer / Preload / Utility)

Electron runs **multiple processes** that are isolated by design:

| Process | Role | Node.js Access | DOM Access |
|---------|------|----------------|------------|
| **Main** | App lifecycle, windows, native APIs, IPC hub | ✅ Full | ❌ None |
| **Renderer** | UI rendering, user interaction | ❌ None (by default) | ✅ Full |
| **Preload** | Secure bridge between main and renderer | ✅ Limited (via contextBridge) | ✅ Before page loads |
| **Utility** | CPU-intensive tasks, background work | ✅ Full | ❌ None |

**BrowserWindow with security defaults (MANDATORY):**
> See [references/details.md](references/details.md) for full code examples.

> ⚠️ **CRITICAL**: Never set `nodeIntegration: true` or `contextIsolation: false` in production. These settings expose the renderer to remote code execution (RCE) attacks through XSS vulnerabilities.

---

### 3. Secure IPC Communication

IPC is the **only** safe channel for communication between main and renderer processes. All IPC must flow through the preload script.

**Preload script (contextBridge + explicit whitelisting):**
> See [references/details.md](references/details.md) for full code examples.

**Main process IPC handlers:**

**Renderer usage (type-safe):**

**IPC Pattern Summary:**

| Pattern | Method | Use Case |
|---------|--------|----------|
| **Fire-and-forget** | `ipcRenderer.send()` → `ipcMain.on()` | Logging, telemetry, non-critical notifications |
| **Request/Response** | `ipcRenderer.invoke()` → `ipcMain.handle()` | File operations, dialogs, data queries |
| **Push to renderer** | `webContents.send()` → `ipcRenderer.on()` | Progress updates, download status, auto-update |

> ⚠️ **Never** use `ipcRenderer.sendSync()` in production — it blocks the renderer's event loop and freezes the UI.

---

### 4. Security Hardening

#### Production Security Checklist

> See [references/details.md](references/details.md) for full code examples.

**Preventing Navigation Hijacking:**

**Custom Protocol Registration (secure):**

---

### 5. State Management Across Processes

**Strategy 1: Main process as single source of truth (recommended for most apps)**
> See [references/details.md](references/details.md) for full code examples.

**Strategy 2: electron-store (lightweight persistent storage)**

**Multi-window state synchronization:**
```typescript
// Main process: broadcast state changes to all windows
import { BrowserWindow } from 'electron';

function broadcastToAllWindows(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

// When theme changes:
ipcMain.handle('settings:set-theme', (_event, theme: 'light' | 'dark') => {
  store.set('theme', theme);
  broadcastToAllWindows('settings:theme-changed', theme);
});
```

---

### 6. Build, Signing & Distribution

#### electron-builder Configuration

> See [references/details.md](references/details.md) for full code examples.

#### Code Signing

```bash
# macOS: requires Apple Developer certificate
# Set environment variables before building:
export CSC_LINK="path/to/Developer_ID_Application.p12"
export CSC_KEY_PASSWORD="your-password"

# Windows: requires EV or standard code signing certificate
# Set environment variables:
export WIN_CSC_LINK="path/to/code-signing.pfx"
export WIN_CSC_KEY_PASSWORD="your-password"

# Build signed app
npx electron-builder --mac --win --publish never
```

#### Auto-Update with electron-updater

> See [references/details.md](references/details.md) for full code examples.

#### Bundle Size Optimization

- ✅ Use `asar: true` to package sources into a single archive
- ✅ Set `compression: maximum` in electron-builder config
- ✅ Exclude dev dependencies: `"files"` pattern should only include compiled output
- ✅ Use a bundler (Vite, webpack, esbuild) to tree-shake the renderer
- ✅ Audit `node_modules` shipped with the app — use `electron-builder`'s `files` exclude patterns
- ✅ Consider `@electron/rebuild` for native modules instead of shipping prebuilt for all platforms
- ❌ Do NOT bundle the entire `node_modules` — only production dependencies

---

### 7. Developer Experience & Debugging

#### Development Setup with Hot Reload

```json
// package.json scripts
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron ."
  }
}
```

**Recommended toolchain:**
- **electron-vite** or **electron-forge with Vite plugin** — modern, fast HMR for renderer
- **tsx** or **ts-node** — for running TypeScript in main process during development
- **concurrently** — run renderer dev server + Electron simultaneously

#### Debugging the Main Process

> See [references/details.md](references/details.md) for full code examples.

**Other debugging techniques:**
```typescript
// Enable DevTools only in development
if (process.env.NODE_ENV === 'development') {
  win.webContents.openDevTools({ mode: 'detach' });
}

// Inspect specific renderer processes from command line:
// electron . --inspect=5858 --remote-debugging-port=9223
```

#### Testing Strategy

**Unit testing (Vitest / Jest):**
```typescript
// tests/unit/store.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock Electron modules for unit tests
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/test' },
}));

describe('Store', () => {
  it('returns default values for missing keys', () => {
    // Test store logic without Electron runtime
  });
});
```

**E2E testing (Playwright + Electron):**
> See [references/details.md](references/details.md) for full code examples.

**Playwright config for Electron:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

---

## Application Lifecycle Management

> See [references/details.md](references/details.md) for full code examples.

---

## Common Issue Diagnostics

### White Screen on Launch
**Symptoms**: App starts but renderer shows a blank/white page
**Root causes**: Incorrect `loadFile`/`loadURL` path, build output missing, CSP blocking scripts
**Solutions**: Verify the path passed to `win.loadFile()` or `win.loadURL()` exists relative to the packaged app. Check DevTools console for CSP violations. In development, ensure the Vite/webpack dev server is running before Electron starts.

### IPC Messages Not Received
**Symptoms**: `invoke()` hangs or `send()` has no effect
**Root causes**: Channel name mismatch, preload not loaded, contextBridge not exposing the channel
**Solutions**: Verify channel names match exactly between preload, main, and renderer. Confirm `preload` path is correct in `webPreferences`. Check that the channel is in the whitelist array.

### Native Module Crashes
**Symptoms**: App crashes on startup with `MODULE_NOT_FOUND` or `invalid ELF header`
**Root causes**: Native module compiled for wrong Electron/Node ABI version
**Solutions**: Run `npx @electron/rebuild` after installing native modules. Ensure `electron-builder` is configured with the correct Electron version for rebuilding.

### App Not Updating
**Symptoms**: `autoUpdater.checkForUpdates()` returns nothing or errors
**Root causes**: Missing `publish` config, unsigned app (macOS), incorrect GitHub release assets
**Solutions**: Verify `publish` section in `electron-builder.yml`. On macOS, app must be code-signed and notarized. Ensure the GitHub release contains the `-mac.zip` and `latest-mac.yml` (or equivalent Windows files).

### Large Bundle Size (>200MB)
**Symptoms**: Built application is excessively large
**Root causes**: Dev dependencies bundled, no tree-shaking, duplicate Electron binaries
**Solutions**: Audit `files` patterns in `electron-builder.yml`. Use a bundler (Vite/esbuild) for the renderer. Check that `devDependencies` are not in `dependencies`. Use `compression: maximum`.

---

## Best Practices

- ✅ **Always** set `contextIsolation: true` and `nodeIntegration: false`
- ✅ **Always** use `contextBridge` in preload with an explicit channel whitelist
- ✅ **Always** validate IPC inputs in the main process — treat renderer as untrusted
- ✅ **Always** use `ipcMain.handle()` / `ipcRenderer.invoke()` for request/response IPC
- ✅ **Always** configure Content Security Policy headers
- ✅ **Always** sanitize URLs before passing to `shell.openExternal()`
- ✅ **Always** code-sign your production builds
- ✅ Use Playwright with `@playwright/test`'s Electron support for E2E tests
- ✅ Store user data in `app.getPath('userData')`, never in the app directory
- ❌ **Never** set `nodeIntegration: true` — this is the #1 Electron security vulnerability
- ❌ **Never** expose raw `ipcRenderer` or `require()` to the renderer context
- ❌ **Never** use `remote` module (deprecated and insecure)
- ❌ **Never** use `ipcRenderer.sendSync()` — it blocks the renderer event loop
- ❌ **Never** disable `webSecurity` in production
- ❌ **Never** load remote/untrusted content without a strict CSP and sandboxing

## Limitations

- Electron bundles Chromium + Node.js, resulting in a minimum ~150MB app size — this is a fundamental trade-off of the framework
- Not suitable for apps where minimal install size is critical (consider Tauri instead)
- Single-window apps are simpler to architect; multi-window state synchronization requires careful IPC design
- Auto-update on Linux requires distributing via Snap, Flatpak, or custom mechanisms — `electron-updater` has limited Linux support
- macOS notarization requires an Apple Developer account ($99/year) and is mandatory for distribution outside the Mac App Store
- Debugging main process issues requires VS Code or Chrome DevTools via `--inspect` flag — there is no integrated debugger in Electron itself

## Related Skills

- `chrome-extension-developer` — When building browser extensions instead of desktop apps (shares multi-process model concepts)
- `docker-expert` — When containerizing Electron's build pipeline or CI/CD
- `react-patterns` / `react-best-practices` — When using React for the renderer UI
- `typescript-pro` — When setting up advanced TypeScript configurations for multi-target builds
- `nodejs-backend-patterns` — When the main process needs complex backend logic
- `github-actions-templates` — When setting up CI/CD for cross-platform Electron builds
