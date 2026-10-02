# Personal Tool Builder — Code Reference

## ### Node.js CLI Stack

```javascript
// package.json
{
  "name": "my-tool",
  "version": "1.0.0",
  "bin": {
    "mytool": "./bin/cli.js"
  },
  "dependencies": {
    "commander": "^12.0.0",    // Argument parsing
    "chalk": "^5.3.0",          // Colors
    "ora": "^8.0.0",            // Spinners
    "inquirer": "^9.2.0",       // Interactive prompts
    "conf": "^12.0.0"           // Config storage
  }
}

// bin/cli.js
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('mytool')
  .description('What it does in one line')
  .version('1.0.0');

program
  .command('do-thing')
  .description('Does the thing')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    // Your logic here
  });

program.parse();
```


## # Using Click (recommended)

```

### Distribution
| Method | Complexity | Reach |
|--------|------------|-------|
| npm publish | Low | Node devs |
| pip install | Low | Python devs |
| Homebrew tap | Medium | Mac users |
| Binary release | Medium | Everyone |
| Docker image | Medium | Tech users |

### Local-First Apps

Apps that work offline and own your data

**When to use**: When building personal productivity apps

## Local-First Architecture

### Why Local-First for Personal Tools
```


## ### SQLite for More Complex Tools

```javascript
// better-sqlite3 for Node.js
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const db = new Database(join(homedir(), '.mytool', 'data.db'));

// Create tables on first run
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Fast synchronous queries
const items = db.prepare('SELECT * FROM items').all();
```


## ### Stage 4: Product

```

### Signs You Should Productize
| Signal | Strength |
|--------|----------|
| Others asking for it | Strong |
| You use it daily | Strong |
| Solves $100+ problem | Strong |
| Others would pay | Very strong |
| Competition exists but sucks | Strong |
| You're embarrassed by it | Actually good |

## Sharp Edges

### Tool only works in your specific environment

Severity: MEDIUM

Situation: Script fails when you try to share it

Symptoms:
- Works on my machine
- Scripts failing for others
- Path not found errors
- Command not found errors

Why this breaks:
Hardcoded absolute paths.
Relies on your installed tools.
Assumes your OS/shell.
Uses your auth tokens.

Recommended fix:

## Making Tools Portable

### Common Portability Issues
| Issue | Fix |
|-------|-----|
| Hardcoded paths | Use ~ or env vars |
| Specific shell | Declare shell in shebang |
| Missing deps | Check and prompt to install |
| Auth tokens | Use config file or env |
| OS-specific | Test on other OS or use cross-platform libs |

### Path Portability
```javascript


## ### Cross-Platform Considerations

```

### Configuration becomes unmanageable

Severity: MEDIUM

Situation: Too many config options making the tool unusable

Symptoms:
- Config file is huge
- Users confused by options
- You forget what options exist
- Every bug fix adds a flag

Why this breaks:
Adding options instead of opinions.
Fear of making decisions.
Every edge case becomes an option.
Config file larger than the tool.

Recommended fix:

## Taming Configuration

### The Config Hierarchy
```


## ### Config File Pattern

```

### When to Add Options
| Add option if... | Don't add if... |
|------------------|-----------------|
| Users ask repeatedly | You imagine someone might want |
| Security/auth related | It's a "nice to have" |
| Fundamental behavior change | It's a micro-preference |
| Environment-specific | You can pick a good default |

### Personal tool becomes unmaintained

Severity: LOW

Situation: Tool you built is now broken and you don't want to fix it

Symptoms:
- Script hasn't run in months
- Don't remember how it works
- Dependencies outdated
- Workflow has changed

Why this breaks:
Built for old workflow.
Dependencies broke.
Lost interest.
No documentation for yourself.

Recommended fix:

## Sustainable Personal Tools

### Design for Abandonment
```


## ### When to Let Go

```

### Personal tools with security vulnerabilities

Severity: HIGH

Situation: Your personal tool exposes sensitive data or access

Symptoms:
- API keys in source code
- Tool accessible on network
- Credentials in git history
- Personal data exposed

Why this breaks:
"It's just for me" mentality.
Credentials in code.
No input validation.
Accidental exposure.

Recommended fix:

## Security in Personal Tools

### Common Mistakes
| Risk | Mitigation |
|------|------------|
| API keys in code | Use env vars or config file |
| Tool exposed on network | Bind to localhost only |
| No input validation | Validate even your own input |
| Logs contain secrets | Sanitize logging |
| Git commits with secrets | .gitignore config files |

### Credential Management
```javascript


## ### Before Sharing

```

## Validation Checks

### Hardcoded Absolute Paths

Severity: MEDIUM

Message: Hardcoded absolute path - use homedir() or environment variables.

Fix action: Use os.homedir() or path.join for portable paths

### Hardcoded Credentials

Severity: CRITICAL

Message: Potential hardcoded credential - use environment variables or config file.

Fix action: Move to process.env.VAR or external config file (gitignored)

### Server Bound to All Interfaces

Severity: HIGH

Message: Server exposed to network - bind to localhost for personal tools.

Fix action: Use '127.0.0.1' or 'localhost' instead of '0.0.0.0'

### Missing Error Handling

Severity: MEDIUM

Message: Sync operation without error handling - wrap in try/catch.

Fix action: Add try/catch for graceful error messages

### CLI Without Help

Severity: LOW

Message: CLI has no help - future you will forget how to use it.

Fix action: Add .description() and --help to CLI commands

### Tool Without README

Severity: LOW

Message: No README - document for your future self.

Fix action: Add README with: what it does, why you built it, how to use it

### Debug Console Logs Left In

Severity: LOW

Message: Debug logging left in code - remove or use proper logging.

Fix action: Remove debug logs or use a proper logger with levels

### Script Missing Shebang

Severity: LOW

Message: Script missing shebang - won't execute directly.

Fix action: Add #!/usr/bin/env node (or python3) at top of file

### Tool Without Version

Severity: LOW

Message: No version tracking - will cause confusion when updating.

Fix action: Add version to package.json and --version flag

## Collaboration

### Delegation Triggers

- sell|monetize|SaaS|charge -> micro-saas-launcher (Productizing personal tool)
- browser extension|chrome extension -> browser-extension-builder (Building browser-based tool)
- automate|workflow|cron|trigger -> workflow-automation (Automation setup)
- API|server|database|postgres -> backend (Backend infrastructure)
- telegram bot -> telegram-bot-builder (Telegram-based tool)
- AI|GPT|Claude|LLM -> ai-wrapper-product (AI-powered tool)

### CLI Tool That Becomes Product

Skills: personal-tool-builder, micro-saas-launcher

Workflow:

```


## ### Browser Tool to Extension

```

## Related Skills

Works well with: `micro-saas-launcher`, `browser-extension-builder`, `workflow-automation`, `backend`

## When to Use
- User mentions or implies: build a tool
- User mentions or implies: personal tool
- User mentions or implies: scratch my itch
- User mentions or implies: solve my problem
- User mentions or implies: CLI tool
- User mentions or implies: local app
- User mentions or implies: automate my
- User mentions or implies: build for myself

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


