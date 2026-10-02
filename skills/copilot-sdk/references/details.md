# Copilot Sdk — Code Reference

## ### .NET

```

---

## Hooks

Intercept and customize session behavior at key lifecycle points.

| Hook | Trigger | Use Case |
|------|---------|----------|
| `onPreToolUse` | Before tool executes | Permission control, argument modification |
| `onPostToolUse` | After tool executes | Result transformation, logging |
| `onUserPromptSubmitted` | User sends message | Prompt modification, filtering |
| `onSessionStart` | Session begins | Add context, configure session |
| `onSessionEnd` | Session ends | Cleanup, analytics |
| `onErrorOccurred` | Error happens | Custom error handling, retry logic |

### Example: Tool Permission Control

```typescript


```

### Pre-Tool Use Output

| Field | Type | Description |
|-------|------|-------------|
| `permissionDecision` | `"allow"` \| `"deny"` \| `"ask"` | Whether to allow the tool call |
| `permissionDecisionReason` | string | Explanation for deny/ask |
| `modifiedArgs` | object | Modified arguments to pass |
| `additionalContext` | string | Extra context for conversation |
| `suppressOutput` | boolean | Hide tool output from conversation |

---

## MCP Server Integration

Connect to MCP servers for pre-built tool capabilities.

### Remote HTTP Server

```typescript


## ### Local Stdio Server

```

### MCP Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"local"` \| `"http"` | Server transport type |
| `command` | string | Executable path (local) |
| `args` | string[] | Command arguments (local) |
| `url` | string | Server URL (http) |
| `tools` | string[] | `["*"]` or specific tool names |
| `env` | object | Environment variables |
| `cwd` | string | Working directory (local) |
| `timeout` | number | Timeout in milliseconds |

---

## Authentication

### Methods (Priority Order)

1. **Explicit token** — `githubToken` in constructor
2. **Environment variables** — `COPILOT_GITHUB_TOKEN` → `GH_TOKEN` → `GITHUB_TOKEN`
3. **Stored OAuth** — From `copilot auth login`
4. **GitHub CLI** — `gh auth` credentials

### Programmatic Token

```typescript


## ## External CLI Server

```

---

## Client Configuration

| Option | Type | Description |
|--------|------|-------------|
| `cliPath` | string | Path to Copilot CLI executable |
| `cliUrl` | string | URL of external CLI server |
| `githubToken` | string | GitHub token for auth |
| `useLoggedInUser` | boolean | Use stored CLI credentials (default: true) |
| `logLevel` | string | `"none"` \| `"error"` \| `"warning"` \| `"info"` \| `"debug"` |
| `autoRestart` | boolean | Auto-restart CLI on crash (default: true) |
| `useStdio` | boolean | Use stdio transport (default: true) |

## Session Configuration

| Option | Type | Description |
|--------|------|-------------|
| `model` | string | Model to use (e.g., `"gpt-4.1"`) |
| `sessionId` | string | Custom ID for resumable sessions |
| `streaming` | boolean | Enable streaming responses |
| `tools` | Tool[] | Custom tools |
| `mcpServers` | object | MCP server configurations |
| `hooks` | object | Session hooks |
| `provider` | object | BYOK provider config |
| `customAgents` | object[] | Custom agent definitions |
| `systemMessage` | object | System message override |
| `skillDirectories` | string[] | Directories to load skills from |
| `disabledSkills` | string[] | Skills to disable |
| `reasoningEffort` | string | Reasoning effort level |
| `availableTools` | string[] | Restrict available tools |
| `excludedTools` | string[] | Exclude specific tools |
| `infiniteSessions` | object | Auto-compaction config |
| `workingDirectory` | string | Working directory |

---

## Debugging

Enable debug logging to troubleshoot issues:

```typescript


```

**Common issues:**
- `CLI not found` → Install CLI or set `cliPath`
- `Not authenticated` → Run `copilot auth login` or provide `githubToken`
- `Session not found` → Don't use session after `destroy()`
- `Connection refused` → Check CLI process, enable `autoRestart`

---

## Key API Summary

| Language | Client | Session Create | Send | Stop |
|----------|--------|---------------|------|------|
| Node.js | `new CopilotClient()` | `client.createSession()` | `session.sendAndWait()` | `client.stop()` |
| Python | `CopilotClient()` | `client.create_session()` | `session.send_and_wait()` | `client.stop()` |
| Go | `copilot.NewClient(nil)` | `client.CreateSession()` | `session.SendAndWait()` | `client.Stop()` |
| .NET | `new CopilotClient()` | `client.CreateSessionAsync()` | `session.SendAndWaitAsync()` | `client.DisposeAsync()` |

## References

- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [Copilot CLI Installation](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


