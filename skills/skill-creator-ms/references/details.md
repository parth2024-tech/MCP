# Skill Creator Ms — Code Reference

## ## Before Implementation

```

### 3. Degrees of Freedom

Match specificity to task fragility:

| Freedom | When | Example |
|---------|------|---------|
| **High** | Multiple valid approaches | Text guidelines |
| **Medium** | Preferred pattern with variation | Pseudocode |
| **Low** | Must be exact | Specific scripts |

### 4. Progressive Disclosure

Skills load in three levels:

1. **Metadata** (~100 words) — Always in context
2. **SKILL.md body** (<5k words) — When skill triggers
3. **References** (unlimited) — As needed

**Keep SKILL.md under 500 lines.** Split into reference files when approaching this limit.

---

## Skill Structure

```


```

### SKILL.md

- **Frontmatter**: `name` and `description`. The description is the trigger mechanism.
- **Body**: Instructions loaded only after triggering.

### Bundled Resources

| Type | Purpose | When to Include |
|------|---------|-----------------|
| `scripts/` | Deterministic operations | Same code rewritten repeatedly |
| `references/` | Detailed patterns | API docs, schemas, detailed guides |
| `assets/` | Output resources | Templates, images, boilerplate |

**Don't include**: README.md, CHANGELOG.md, installation guides.

---

## Creating Azure SDK Skills

When creating skills for Azure SDKs, follow these patterns consistently.

### Skill Section Order

Follow this structure (based on existing Azure SDK skills):

1. **Title** — `# SDK Name`
2. **Installation** — `pip install`, `npm install`, etc.
3. **Environment Variables** — Required configuration
4. **Authentication** — Always `DefaultAzureCredential`
5. **Core Workflow** — Minimal viable example
6. **Feature Tables** — Clients, methods, tools
7. **Best Practices** — Numbered list
8. **Reference Links** — Table linking to `/references/*.md`

### Authentication Pattern (All Languages)

Always use `DefaultAzureCredential`:

```python


## # Python

```

**Never hardcode credentials. Use environment variables.**

### Standard Verb Patterns

Azure SDKs use consistent verbs across all languages:

| Verb | Behavior |
|------|----------|
| `create` | Create new; fail if exists |
| `upsert` | Create or update |
| `get` | Retrieve; error if missing |
| `list` | Return collection |
| `delete` | Succeed even if missing |
| `begin` | Start long-running operation |

### Language-Specific Patterns

See `references/azure-sdk-patterns.md` for detailed patterns including:

- **Python**: `ItemPaged`, `LROPoller`, context managers, Sphinx docstrings
- **.NET**: `Response<T>`, `Pageable<T>`, `Operation<T>`, mocking support
- **Java**: Builder pattern, `PagedIterable`/`PagedFlux`, Reactor types
- **TypeScript**: `PagedAsyncIterableIterator`, `AbortSignal`, browser considerations

### Example: Azure SDK Skill Structure

```markdown


## ## Reference Files

```

---

## Skill Creation Process

1. **Gather SDK Context** — User provides SDK/API reference (REQUIRED)
2. **Understand** — Research SDK patterns from official docs
3. **Plan** — Identify reusable resources and product area category
4. **Create** — Write SKILL.md in `.github/skills/<skill-name>/`
5. **Categorize** — Create symlink in `skills/<language>/<category>/`
6. **Test** — Create acceptance criteria and test scenarios
7. **Document** — Update README.md skill catalog
8. **Iterate** — Refine based on real usage

### Step 1: Gather SDK Context (REQUIRED)

**Before creating any SDK skill, the user MUST provide:**

| Required | Example | Purpose |
|----------|---------|---------|
| **SDK Package** | `azure-ai-agents`, `Azure.AI.OpenAI` | Identifies the exact SDK |
| **Documentation URL** | `https://learn.microsoft.com/en-us/azure/ai-services/...` | Primary source of truth |
| **Repository** (optional) | `Azure/azure-sdk-for-python` | For code patterns |

**Prompt the user if not provided:**
```


## # Verify: Parameters match the latest SDK version

```

### Step 2: Understand the Skill

Gather concrete examples:

- "What SDK operations should this skill cover?"
- "What triggers should activate this skill?"
- "What errors do developers commonly encounter?"

| Example Task | Reusable Resource |
|--------------|-------------------|
| Same auth code each time | Code example in SKILL.md |
| Complex streaming patterns | `references/streaming.md` |
| Tool configurations | `references/tools.md` |
| Error handling patterns | `references/error-handling.md` |

### Step 3: Plan Product Area Category

Skills are organized by **language** and **product area** in the `skills/` directory via symlinks.

**Product Area Categories:**

| Category | Description | Examples |
|----------|-------------|----------|
| `foundry` | AI Foundry, agents, projects, inference | `azure-ai-agents-py`, `azure-ai-projects-py` |
| `data` | Storage, Cosmos DB, Tables, Data Lake | `azure-cosmos-py`, `azure-storage-blob-py` |
| `messaging` | Event Hubs, Service Bus, Event Grid | `azure-eventhub-py`, `azure-servicebus-py` |
| `monitoring` | OpenTelemetry, App Insights, Query | `azure-monitor-opentelemetry-py` |
| `identity` | Authentication, DefaultAzureCredential | `azure-identity-py` |
| `security` | Key Vault, secrets, keys, certificates | `azure-keyvault-py` |
| `integration` | API Management, App Configuration | `azure-appconfiguration-py` |
| `compute` | Batch, ML compute | `azure-compute-batch-java` |
| `container` | Container Registry, ACR | `azure-containerregistry-py` |

**Determine the category** based on:
1. Azure service family (Storage → `data`, Event Hubs → `messaging`)
2. Primary use case (AI agents → `foundry`)
3. Existing skills in the same service area

### Step 4: Create the Skill

**Location:** `.github/skills/<skill-name>/SKILL.md`

**Naming convention:**
- `azure-<service>-<subservice>-<language>`
- Examples: `azure-ai-agents-py`, `azure-cosmos-java`, `azure-storage-blob-ts`

**For Azure SDK skills:**

1. Search `microsoft-docs` MCP for current API patterns
2. Verify against installed SDK version
3. Follow the section order above
4. Include cleanup code in examples
5. Add feature comparison tables

**Write bundled resources first**, then SKILL.md.

**Frontmatter:**

```yaml


## #### 6.1 Create Acceptance Criteria

```markdown
# Acceptance Criteria: <skill-name>

**SDK**: `package-name`
**Repository**: https://github.com/Azure/azure-sdk-for-<language>
**Purpose**: Skill testing acceptance criteria

---

## 1. Correct Import Patterns

### 1.1 Client Imports

#### ✅ CORRECT: Main Client
\`\`\`python
from azure.ai.mymodule import MyClient
from azure.identity import DefaultAzureCredential
\`\`\`

#### ❌ INCORRECT: Wrong Module Path
\`\`\`python
from azure.ai.mymodule.models import MyClient  # Wrong - Client is not in models
\`\`\`

## 2. Authentication Patterns

#### ✅ CORRECT: DefaultAzureCredential
\`\`\`python
credential = DefaultAzureCredential()
client = MyClient(endpoint, credential)
\`\`\`

#### ❌ INCORRECT: Hardcoded Credentials
\`\`\`python
client = MyClient(endpoint, api_key="hardcoded")  # Security risk
\`\`\`
```


## #### 6.2 Create Test Scenarios

```yaml
config:
  model: gpt-4
  max_tokens: 2000
  temperature: 0.3

scenarios:
  - name: basic_client_creation
    prompt: |
      Create a basic example using the Azure SDK.
      Include proper authentication and client initialization.
    expected_patterns:
      - "DefaultAzureCredential"
      - "MyClient"
    forbidden_patterns:
      - "api_key="
      - "hardcoded"
    tags:
      - basic
      - authentication
    mock_response: |
      import os
      from azure.identity import DefaultAzureCredential
      from azure.ai.mymodule import MyClient
      
      credential = DefaultAzureCredential()
      client = MyClient(
          endpoint=os.environ["AZURE_ENDPOINT"],
          credential=credential
      )
      # ... rest of working example
```


## # Run with Ralph Loop (iterative improvement)

```

**Success criteria:**
- All scenarios pass (100% pass rate)
- No false positives (mock responses always pass)
- Patterns catch real mistakes

### Step 7: Update Documentation

After creating the skill:

1. **Update README.md** — Add the skill to the appropriate language section in the Skill Catalog
   - Update total skill count (line ~73: `> N skills in...`)
   - Update Skill Explorer link count (line ~15: `Browse all N skills`)
   - Update language count table (lines ~77-83)
   - Update language section count (e.g., `> N skills • suffix: -py`)
   - Update category count (e.g., `<summary><strong>Foundry & AI</strong> (N skills)</summary>`)
   - Add skill row in alphabetical order within its category
   - Update test coverage summary (line ~622: `**N skills with N test scenarios**`)
   - Update test coverage table — update skill count, scenario count, and top skills for the language

2. **Regenerate GitHub Pages data** — Run the extraction script to update the docs site
   ```bash


## ### Pattern 3: Feature Organization

```

---

## Design Pattern References

| Reference | Contents |
|-----------|----------|
| `references/workflows.md` | Sequential and conditional workflows |
| `references/output-patterns.md` | Templates and examples |
| `references/azure-sdk-patterns.md` | Language-specific Azure SDK patterns |

---

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Create skill without SDK context | Users must provide package name/docs URL |
| Put "when to use" in body | Body loads AFTER triggering |
| Hardcode credentials | Security risk |
| Skip authentication section | Agents will improvise poorly |
| Use outdated SDK patterns | APIs change; search docs first |
| Include README.md | Agents don't need meta-docs |
| Deeply nest references | Keep one level deep |
| Skip acceptance criteria | Skills without tests can't be validated |
| Skip symlink categorization | Skills won't be discoverable by category |
| Use wrong import paths | Azure SDKs have specific module structures |

---

## Checklist

Before completing a skill:

**Prerequisites:**
- [ ] User provided SDK package name or documentation URL
- [ ] Verified SDK patterns via `microsoft-docs` MCP

**Skill Creation:**
- [ ] Description includes what AND when (trigger phrases)
- [ ] SKILL.md under 500 lines
- [ ] Authentication uses `DefaultAzureCredential`
- [ ] Includes cleanup/delete in examples
- [ ] References organized by feature

**Categorization:**
- [ ] Skill created in `.github/skills/<skill-name>/`
- [ ] Symlink created in `skills/<language>/<category>/<short-name>`
- [ ] Symlink points to `../../../.github/skills/<skill-name>`

**Testing:**
- [ ] `references/acceptance-criteria.md` created with correct/incorrect patterns
- [ ] `tests/scenarios/<skill-name>/scenarios.yaml` created
- [ ] All scenarios pass (`pnpm harness <skill> --mock`)
- [ ] Import paths documented precisely

**Documentation:**
- [ ] README.md skill catalog updated
- [ ] Instructs to search `microsoft-docs` MCP for current APIs

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


