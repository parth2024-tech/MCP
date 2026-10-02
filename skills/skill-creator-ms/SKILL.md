---
name: skill-creator-ms
description: "Guide for creating effective skills for AI coding agents working with Azure SDKs and Microsoft Foundry services. Use when creating new skills or updating existing skills."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Skill Creator

Guide for creating skills that extend AI agent capabilities, with emphasis on Azure SDKs and Microsoft Foundry.

> **Required Context:** When creating SDK or API skills, users MUST provide the SDK package name, documentation URL, or repository reference for the skill to be based on.

## About Skills

Skills are modular knowledge packages that transform general-purpose agents into specialized experts:

1. **Procedural knowledge** — Multi-step workflows for specific domains
2. **SDK expertise** — API patterns, authentication, error handling for Azure services
3. **Domain context** — Schemas, business logic, company-specific patterns
4. **Bundled resources** — Scripts, references, templates for complex tasks

---

## Core Principles

### 1. Concise is Key

The context window is a shared resource. Challenge each piece: "Does this justify its token cost?"

**Default assumption: Agents are already capable.** Only add what they don't already know.

### 2. Fresh Documentation First

**Azure SDKs change constantly.** Skills should instruct agents to verify documentation:

```markdown
## Before Implementation

Search `microsoft-docs` MCP for current API patterns:
- Query: "[SDK name] [operation] python"
- Verify: Parameters match your installed SDK version
> See [references/details.md](references/details.md) for full code examples.
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/      — Executable code
    ├── references/   — Documentation loaded as needed
    └── assets/       — Output resources (templates, images)
# Python
from azure.identity import DefaultAzureCredential
credential = DefaultAzureCredential()
client = ServiceClient(endpoint, credential)
```

```csharp
// C#
var credential = new DefaultAzureCredential();
var client = new ServiceClient(new Uri(endpoint), credential);
```

```java
// Java
TokenCredential credential = new DefaultAzureCredentialBuilder().build();
ServiceClient client = new ServiceClientBuilder()
    .endpoint(endpoint)
    .credential(credential)
    .buildClient();
```

```typescript
// TypeScript
import { DefaultAzureCredential } from "@azure/identity";
const credential = new DefaultAzureCredential();
const client = new ServiceClient(endpoint, credential);
> See [references/details.md](references/details.md) for full code examples.
---
name: skill-creator
description: |
  Azure AI Example SDK for Python. Use for [specific service features].
  Triggers: "example service", "create example", "list examples".
---

# Azure AI Example SDK

## Installation

\`\`\`bash
pip install azure-ai-example
\`\`\`

## Environment Variables

\`\`\`bash
AZURE_EXAMPLE_ENDPOINT=https://<resource>.example.azure.com
\`\`\`

## Authentication

\`\`\`python
from azure.identity import DefaultAzureCredential
from azure.ai.example import ExampleClient

credential = DefaultAzureCredential()
client = ExampleClient(
    endpoint=os.environ["AZURE_EXAMPLE_ENDPOINT"],
    credential=credential
)
\`\`\`

## Core Workflow

\`\`\`python
# Create
item = client.create_item(name="example", data={...})

# List (pagination handled automatically)
for item in client.list_items():
    print(item.name)

# Long-running operation
poller = client.begin_process(item_id)
result = poller.result()

# Cleanup
client.delete_item(item_id)
\`\`\`

## Reference Files

| File | Contents |
|------|----------|
| references/tools.md | Tool integrations |
| references/streaming.md | Event streaming patterns |
> See [references/details.md](references/details.md) for full code examples.
To create this skill, I need:
1. The SDK package name (e.g., azure-ai-projects)
2. The Microsoft Learn documentation URL or GitHub repo
3. The target language (py/dotnet/ts/java)
```

**Search official docs first:**
```bash
# Use microsoft-docs MCP to get current API patterns
# Query: "[SDK name] [operation] [language]"
# Verify: Parameters match the latest SDK version
> See [references/details.md](references/details.md) for full code examples.
---
name: skill-name-py
description: |
  Azure Service SDK for Python. Use for [specific features].
  Triggers: "service name", "create resource", "specific operation".
---
```

### Step 5: Categorize with Symlinks

After creating the skill in `.github/skills/`, create a symlink in the appropriate category:

```bash
# Pattern: skills/<language>/<category>/<short-name> -> ../../../.github/skills/<full-skill-name>

# Example for azure-ai-agents-py in python/foundry:
cd skills/python/foundry
ln -s ../../../.github/skills/azure-ai-agents-py agents

# Example for azure-cosmos-db-py in python/data:
cd skills/python/data
ln -s ../../../.github/skills/azure-cosmos-db-py cosmos-db
```

**Symlink naming:**
- Use short, descriptive names (e.g., `agents`, `cosmos`, `blob`)
- Remove the `azure-` prefix and language suffix
- Match existing patterns in the category

**Verify the symlink:**
```bash
ls -la skills/python/foundry/agents
# Should show: agents -> ../../../.github/skills/azure-ai-agents-py
```

### Step 6: Create Tests

**Every skill MUST have acceptance criteria and test scenarios.**

#### 6.1 Create Acceptance Criteria

**Location:** `.github/skills/<skill-name>/references/acceptance-criteria.md`

**Source materials** (in priority order):
1. Official Microsoft Learn docs (via `microsoft-docs` MCP)
2. SDK source code from the repository
3. Existing reference files in the skill

**Format:**
> See [references/details.md](references/details.md) for full code examples.

**Critical patterns to document:**
- Import paths (these vary significantly between Azure SDKs)
- Authentication patterns
- Client initialization
- Async variants (`.aio` modules)
- Common anti-patterns

#### 6.2 Create Test Scenarios

**Location:** `tests/scenarios/<skill-name>/scenarios.yaml`

> See [references/details.md](references/details.md) for full code examples.

**Scenario design principles:**
- Each scenario tests ONE specific pattern or feature
- `expected_patterns` — patterns that MUST appear
- `forbidden_patterns` — common mistakes that must NOT appear
- `mock_response` — complete, working code that passes all checks
- `tags` — for filtering (`basic`, `async`, `streaming`, `tools`)

#### 6.3 Run Tests

```bash
cd tests
pnpm install

# Check skill is discovered
pnpm harness --list

# Run in mock mode (fast, deterministic)
pnpm harness <skill-name> --mock --verbose

# Run with Ralph Loop (iterative improvement)
pnpm harness <skill-name> --ralph --mock --max-iterations 5 --threshold 85
> See [references/details.md](references/details.md) for full code examples.
   cd docs-site && npx tsx scripts/extract-skills.ts
   ```
   This updates `docs-site/src/data/skills.json` which feeds the Astro-based docs site.
   Then rebuild the docs site:
   ```bash
   cd docs-site && npm run build
   ```
   This outputs to `docs/` which is served by GitHub Pages.

3. **Verify AGENTS.md** — Ensure the skill count is accurate

---

## Progressive Disclosure Patterns

### Pattern 1: High-Level Guide with References

```markdown
# SDK Name

## Quick Start
[Minimal example]

## Advanced Features
- **Streaming**: See references/streaming.md
- **Tools**: See references/tools.md
```

### Pattern 2: Language Variants

```
azure-service-skill/
├── SKILL.md (overview + language selection)
└── references/
    ├── python.md
    ├── dotnet.md
    ├── java.md
    └── typescript.md
```

### Pattern 3: Feature Organization

```
azure-ai-agents/
├── SKILL.md (core workflow)
└── references/
    ├── tools.md
    ├── streaming.md
    ├── async-patterns.md
    └── error-handling.md
> See [references/details.md](references/details.md) for full code examples.
