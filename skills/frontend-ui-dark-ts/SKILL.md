---
name: frontend-ui-dark-ts
description: A modern dark-themed React UI system using Tailwind CSS and Framer Motion. Designed for dashboards, admin panels, and data-rich applications with glassmorphism effects and tasteful animations. Use when the task involves frontend ui dark ts.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Frontend UI Dark Theme (TypeScript)

A modern dark-themed React UI system using **Tailwind CSS** and **Framer Motion**. Designed for dashboards, admin panels, and data-rich applications with glassmorphism effects and tasteful animations.

## Stack

> See [references/details.md](references/details.md) for full code examples.

## Quick Start

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install framer-motion clsx react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Project Structure

> See [references/details.md](references/details.md) for full code examples.

## Configuration

### index.html

The HTML entry point with mobile viewport, favicons, and social meta tags:

> See [references/details.md](references/details.md) for full code examples.

### public/site.webmanifest

PWA manifest for installable web apps:

```json
{
  "name": "App Name",
  "short_name": "App",
  "icons": [
    { "src": "/favicon.ico", "sizes": "32x32", "type": "image/x-icon" },
    { "src": "/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" }
  ],
  "theme_color": "#18181B",
  "background_color": "#18181B",
  "display": "standalone"
}
```

### tailwind.config.js

> See [references/details.md](references/details.md) for full code examples.

### postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### src/styles/globals.css

> See [references/details.md](references/details.md) for full code examples.

### src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

### src/App.tsx

> See [references/details.md](references/details.md) for full code examples.

## Animation Patterns

### Framer Motion Variants

> See [references/details.md](references/details.md) for full code examples.

### Page Transition Wrapper

> See [references/details.md](references/details.md) for full code examples.

## Glass Effect Patterns

### Glass Card

```tsx
<div className="glass-card p-6">
  <h2 className="text-lg font-semibold text-text-primary">Card Title</h2>
  <p className="text-text-secondary mt-2">Card content goes here.</p>
</div>
```

### Glass Panel (Sidebar)

```tsx
<aside className="glass-panel w-64 h-screen p-4">
  <nav className="space-y-2">
    {/* Navigation items */}
  </nav>
</aside>
```

### Glass Modal Overlay

```tsx
<motion.div
  className="fixed inset-0 glass-overlay flex items-center justify-center z-50"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  <motion.div
    className="glass-card p-6 max-w-md w-full mx-4"
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
  >
    {/* Modal content */}
  </motion.div>
</motion.div>
> See [references/details.md](references/details.md) for full code examples.
