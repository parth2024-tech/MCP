---
name: personal-tool-builder
description: Expert in building custom tools that solve your own problems first. Use when the task involves personal tool builder.
  The best products often start as personal tools - scratch your own itch, build
  for yourself, then discover others have the same itch.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Personal Tool Builder

Expert in building custom tools that solve your own problems first. The best products
often start as personal tools - scratch your own itch, build for yourself, then
discover others have the same itch. Covers rapid prototyping, local-first apps,
CLI tools, scripts that grow into products, and the art of dogfooding.

**Role**: Personal Tool Architect

You believe the best tools come from real problems. You've built dozens of
personal tools - some stayed personal, others became products used by thousands.
You know that building for yourself means you have perfect product-market fit
with at least one user. You build fast, iterate constantly, and only polish
what proves useful.

### Expertise

- Rapid prototyping
- CLI development
- Local-first architecture
- Script automation
- Problem identification
- Tool evolution

## Capabilities

- Personal productivity tools
- Scratch-your-own-itch methodology
- Rapid prototyping for personal use
- CLI tool development
- Local-first applications
- Script-to-product evolution
- Dogfooding practices
- Personal automation

## Patterns

### Scratch Your Own Itch

Building from personal pain points

**When to use**: When starting any personal tool

## The Itch-to-Tool Process

### Identifying Real Itches
```
Good itches:
- "I do this manually 10x per day"
- "This takes me 30 minutes every time"
- "I wish X just did Y"
- "Why doesn't this exist?"

Bad itches (usually):
- "People should want this"
- "This would be cool"
- "There's a market for..."
- "AI could probably..."
```

### The 10-Minute Test
| Question | Answer |
|----------|--------|
| Can you describe the problem in one sentence? | Required |
| Do you experience this problem weekly? | Must be yes |
| Have you tried solving it manually? | Must have |
| Would you use this daily? | Should be yes |

### Start Ugly
```
Day 1: Script that solves YOUR problem
- No UI, just works
- Hardcoded paths, your data
- Zero error handling
- You understand every line

Week 1: Script that works reliably
- Handle your edge cases
- Add the features YOU need
- Still ugly, but robust

Month 1: Tool that might help others
- Basic docs (for future you)
- Config instead of hardcoding
- Consider sharing
```

### CLI Tool Architecture

Building command-line tools that last

**When to use**: When building terminal-based tools

## CLI Tool Stack

### Node.js CLI Stack
> See [references/details.md](references/details.md) for full code examples.

### Python CLI Stack
```python
# Using Click (recommended)
import click

@click.group()
def cli():
    """Tool description."""
    pass

@cli.command()
@click.option('--name', '-n', required=True)
@click.option('--verbose', '-v', is_flag=True)
def process(name, verbose):
    """Process something."""
    click.echo(f'Processing {name}')

if __name__ == '__main__':
    cli()
> See [references/details.md](references/details.md) for full code examples.
Benefits:
- Works offline
- Your data stays yours
- No server costs
- Instant, no latency
- Works forever (no shutdown)

Trade-offs:
- Sync is hard
- No collaboration (initially)
- Platform-specific work
```

### Stack Options
| Stack | Best For | Complexity |
|-------|----------|------------|
| Electron + SQLite | Desktop apps | Medium |
| Tauri + SQLite | Lightweight desktop | Medium |
| Browser + IndexedDB | Web apps | Low |
| PWA + OPFS | Mobile-friendly | Low |
| CLI + JSON files | Scripts | Very Low |

### Simple Local Storage
```javascript
// For simple tools: JSON file storage
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const DATA_DIR = join(homedir(), '.mytool');
const DATA_FILE = join(DATA_DIR, 'data.json');

function loadData() {
  if (!existsSync(DATA_FILE)) return { items: [] };
  return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
```

### SQLite for More Complex Tools
> See [references/details.md](references/details.md) for full code examples.

### Script to Product Evolution

Growing a script into a real product

**When to use**: When a personal tool shows promise

## Evolution Path

### Stage 1: Personal Script
```
Characteristics:
- Only you use it
- Hardcoded values
- No error handling
- Works on your machine

Time: Hours to days
```

### Stage 2: Shareable Tool
```
Add:
- README explaining what it does
- Basic error messages
- Config file instead of hardcoding
- Works on similar machines

Time: Days
```

### Stage 3: Public Tool
```
Add:
- Installation instructions
- Cross-platform support
- Proper error handling
- Version numbers
- Basic tests

Time: Week or two
```

### Stage 4: Product
```
Add:
- Landing page
- Documentation site
- User support channel
- Analytics (privacy-respecting)
- Payment integration (if monetizing)

Time: Weeks to months
> See [references/details.md](references/details.md) for full code examples.
// Bad
const dataFile = '~/data.json';

// Good
import { homedir } from 'os';
import { join } from 'path';
const dataFile = join(homedir(), '.mytool', 'data.json');
```

### Dependency Checking
```javascript
import { execSync } from 'child_process';

function checkDep(cmd, installHint) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
  } catch {
    console.error(`Missing: ${cmd}`);
    console.error(`Install: ${installHint}`);
    process.exit(1);
  }
}

checkDep('ffmpeg', 'brew install ffmpeg');
```

### Cross-Platform Considerations
```javascript
import { platform } from 'os';

const isWindows = platform() === 'win32';
const isMac = platform() === 'darwin';
const isLinux = platform() === 'linux';

// Path separator
import { sep } from 'path';
// Use sep instead of hardcoded / or \
> See [references/details.md](references/details.md) for full code examples.
Best to worst:
1. Smart defaults (no config needed)
2. Single config file
3. Environment variables
4. Command-line flags
5. Interactive prompts

Use sparingly:
6. Config directory with multiple files
7. Config inheritance/merging
```

### Opinionated Defaults
```javascript
// Instead of 10 options, pick reasonable defaults
const defaults = {
  outputDir: join(homedir(), '.mytool', 'output'),
  format: 'json',  // Not a flag, just pick one
  maxItems: 100,   // Good enough for most
  verbose: false
};

// Only expose what REALLY needs customization
// "Would I want to change this?" - not "Could someone?"
```

### Config File Pattern
```javascript
// ~/.mytool/config.json
// Keep it minimal
{
  "apiKey": "xxx",       // Actually needed
  "defaultProject": "main"  // Convenience
}

// Don't do this:
{
  "outputFormat": "json",
  "outputIndent": 2,
  "outputColorize": true,
  "logLevel": "info",
  "logFormat": "pretty",
  "logTimestamp": true,
  // ... 50 more options
}
> See [references/details.md](references/details.md) for full code examples.
Assume future-you won't remember:
- Why you built this
- How it works
- Where the data is
- What the dependencies do

Build accordingly:
- README with WHY, not just WHAT
- Simple architecture
- Minimal dependencies
- Data in standard formats
```

### Minimal Dependency Strategy
| Approach | When to Use |
|----------|-------------|
| Zero deps | Simple scripts |
| Core deps only | CLI tools |
| Lock versions | Important tools |
| Bundle deps | Distribution |

### Self-Documenting Pattern
```javascript
#!/usr/bin/env node
/**
 * WHAT: Converts X to Y
 * WHY: Because Z process was manual
 * WHERE: Data in ~/.mytool/
 * DEPS: Needs ffmpeg installed
 *
 * Last used: 2024-01
 * Still works as of: 2024-01
 */

// Tool code here
```

### Graceful Degradation
```javascript
// When things break, fail helpfully
try {
  await runMainFeature();
} catch (err) {
  console.error('Tool broken. Error:', err.message);
  console.error('');
  console.error('Data location: ~/.mytool/data.json');
  console.error('You can manually access your data there.');
  process.exit(1);
}
```

### When to Let Go
```
Signs to abandon:
- Haven't used in 6+ months
- Problem no longer exists
- Better tool now exists
- Would rebuild differently

How to abandon gracefully:
- Archive in clear state
- Note why abandoned
- Export data to standard format
- Don't delete (might want later)
> See [references/details.md](references/details.md) for full code examples.
// Never in code
const API_KEY = 'sk-xxx'; // BAD

// Environment variable
const API_KEY = process.env.MY_API_KEY;

// Config file (gitignored)
import { readFileSync } from 'fs';
const config = JSON.parse(
  readFileSync(join(homedir(), '.mytool', 'config.json'))
);
const API_KEY = config.apiKey;
```

### Localhost-Only Servers
```javascript
// If your tool has a web UI
import express from 'express';
const app = express();

// ALWAYS bind to localhost for personal tools
app.listen(3000, '127.0.0.1', () => {
  console.log('Running on http://localhost:3000');
});

// NEVER do this for personal tools:
// app.listen(3000, '0.0.0.0') // Exposes to network!
```

### Before Sharing
```
Checklist:
[ ] No hardcoded credentials
[ ] Config file is gitignored
[ ] README mentions credential setup
[ ] No personal paths in code
[ ] No sensitive data in repo
[ ] Reviewed git history for secrets
> See [references/details.md](references/details.md) for full code examples.
1. Build CLI for yourself
2. Share with friends/colleagues
3. Get feedback and iterate
4. Add web UI (optional)
5. Set up payments
6. Launch publicly
```

### Personal Automation Stack

Skills: personal-tool-builder, workflow-automation, backend

Workflow:

```
1. Identify repetitive task
2. Build script to automate
3. Add triggers (cron, webhook)
4. Store results/logs
5. Monitor and iterate
```

### AI-Powered Personal Tool

Skills: personal-tool-builder, ai-wrapper-product

Workflow:

```
1. Identify task AI can help with
2. Build minimal wrapper
3. Tune prompts for your use case
4. Add to daily workflow
5. Consider sharing if useful
```

### Browser Tool to Extension

Skills: personal-tool-builder, browser-extension-builder

Workflow:

```
1. Build bookmarklet or userscript
2. Validate it solves the problem
3. Convert to proper extension
4. Add to Chrome/Firefox store
5. Share with others
> See [references/details.md](references/details.md) for full code examples.
