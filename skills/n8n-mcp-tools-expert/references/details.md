# N8N Mcp Tools Expert — Code Reference

## ### Mistake 2: Using detail="full" by Default

```

**When to use detail="full"**:
- Debugging complex configuration issues
- Need complete property schema with all nested options
- Exploring advanced features

**Better alternatives**:
1. `get_node({detail: "standard"})` - for operations list (default)
2. `get_node({mode: "docs"})` - for readable documentation
3. `get_node({mode: "search_properties", propertyQuery: "auth"})` - for specific property

### Mistake 3: Not Using Validation Profiles

**Problem**: Too many false positives OR missing real errors

**Profiles**:
- `minimal` - Only required fields (fast, permissive)
- `runtime` - Values + types (recommended for pre-deployment)
- `ai-friendly` - Reduce false positives (for AI configuration)
- `strict` - Maximum validation (for production)

```javascript


## ### Mistake 5: Not Using Smart Parameters

```javascript
// IF node - semantic branch names
{
  type: "addConnection",
  source: "IF",
  target: "True Handler",
  branch: "true"  // Clear and readable!
}

{
  type: "addConnection",
  source: "IF",
  target: "False Handler",
  branch: "false"
}

// Switch node - semantic case numbers
{
  type: "addConnection",
  source: "Switch",
  target: "Handler A",
  case: 0
}
```


## ### Pattern 2: Validation Loop

```javascript
// Step 1: Validate
const result = await validate_node({
  nodeType: "nodes-base.slack",
  config: {
    resource: "channel",
    operation: "create"
  },
  profile: "runtime"
});

// Step 2: Check errors (~23s thinking)
if (!result.valid) {
  console.log(result.errors);  // "Missing required field: name"
}

// Step 3: Fix config (~58s fixing)
config.name = "general";

// Step 4: Validate again
await validate_node({...});  // Repeat until clean
```


## ### Pattern 3: Workflow Editing

```javascript
// Iterative workflow building (NOT one-shot!)
// Edit 1
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Add webhook trigger",
  operations: [{type: "addNode", node: {...}}]
});

// ~56s later...

// Edit 2
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Connect webhook to processor",
  operations: [{type: "addConnection", source: "...", target: "..."}]
});

// ~56s later...

// Edit 3 (validation)
await n8n_validate_workflow({id: "workflow-id"});

// Ready? Activate!
await n8n_update_partial_workflow({
  id: "workflow-id",
  intent: "Activate workflow for production",
  operations: [{type: "activateWorkflow"}]
});
```


## ### Search Templates

```javascript
// Search by keyword (default mode)
search_templates({
  query: "webhook slack",
  limit: 20
});

// Search by node types
search_templates({
  searchMode: "by_nodes",
  nodeTypes: ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"]
});

// Search by task type
search_templates({
  searchMode: "by_task",
  task: "webhook_processing"
});

// Search by metadata (complexity, setup time)
search_templates({
  searchMode: "by_metadata",
  complexity: "simple",
  maxSetupMinutes: 15
});
```


## ### Health Check

```

---

## Tool Availability

**Always Available** (no n8n API needed):
- search_nodes, get_node
- validate_node, validate_workflow
- search_templates, get_template
- tools_documentation, ai_agents_guide

**Requires n8n API** (N8N_API_URL + N8N_API_KEY):
- n8n_create_workflow
- n8n_update_partial_workflow
- n8n_validate_workflow (by ID)
- n8n_list_workflows, n8n_get_workflow
- n8n_test_workflow
- n8n_executions
- n8n_deploy_template
- n8n_workflow_versions
- n8n_autofix_workflow

If API tools unavailable, use templates and validation-only workflows.

---

## Unified Tool Reference

### get_node (Unified Node Information)

**Detail Levels** (mode="info", default):
- `minimal` (~200 tokens) - Basic metadata only
- `standard` (~1-2K tokens) - Essential properties + operations (RECOMMENDED)
- `full` (~3-8K tokens) - Complete schema (use sparingly)

**Operation Modes**:
- `info` (default) - Node schema with detail level
- `docs` - Readable markdown documentation
- `search_properties` - Find specific properties (use with propertyQuery)
- `versions` - List all versions with breaking changes
- `compare` - Compare two versions
- `breaking` - Show only breaking changes
- `migrations` - Show auto-migratable changes

```javascript


## ### validate_node (Unified Validation)

```

---

## Performance Characteristics

| Tool | Response Time | Payload Size |
|------|---------------|--------------|
| search_nodes | <20ms | Small |
| get_node (standard) | <10ms | ~1-2KB |
| get_node (full) | <100ms | 3-8KB |
| validate_node (minimal) | <50ms | Small |
| validate_node (full) | <100ms | Medium |
| validate_workflow | 100-500ms | Medium |
| n8n_create_workflow | 100-500ms | Medium |
| n8n_update_partial_workflow | 50-200ms | Small |
| n8n_deploy_template | 200-500ms | Medium |

---

## Best Practices

### Do
- Use `get_node({detail: "standard"})` for most use cases
- Specify validation profile explicitly (`profile: "runtime"`)
- Use smart parameters (`branch`, `case`) for clarity
- Include `intent` parameter in workflow updates
- Follow search → get_node → validate workflow
- Iterate workflows (avg 56s between edits)
- Validate after every significant change
- Use `includeExamples: true` for real configs
- Use `n8n_deploy_template` for quick starts

### Don't
- Use `detail: "full"` unless necessary (wastes tokens)
- Forget nodeType prefix (`nodes-base.*`)
- Skip validation profiles
- Try to build workflows in one shot (iterate!)
- Ignore auto-sanitization behavior
- Use full prefix (`n8n-nodes-base.*`) with search/validate tools
- Forget to activate workflows after building

---

## Summary

**Most Important**:
1. Use **get_node** with `detail: "standard"` (default) - covers 95% of use cases
2. nodeType formats differ: `nodes-base.*` (search/validate) vs `n8n-nodes-base.*` (workflows)
3. Specify **validation profiles** (`runtime` recommended)
4. Use **smart parameters** (`branch="true"`, `case=0`)
5. Include **intent parameter** in workflow updates
6. **Auto-sanitization** runs on ALL nodes during updates
7. Workflows can be **activated via API** (`activateWorkflow` operation)
8. Workflows are built **iteratively** (56s avg between edits)

**Common Workflow**:
1. search_nodes → find node
2. get_node → understand config
3. validate_node → check config
4. n8n_create_workflow → build
5. n8n_validate_workflow → verify
6. n8n_update_partial_workflow → iterate
7. activateWorkflow → go live!

For details, see:
- SEARCH_GUIDE.md - Node discovery
- VALIDATION_GUIDE.md - Configuration validation
- WORKFLOW_GUIDE.md - Workflow management

---

**Related Skills**:
- n8n Expression Syntax - Write expressions in workflow fields
- n8n Workflow Patterns - Architectural patterns from templates
- n8n Validation Expert - Interpret validation errors
- n8n Node Configuration - Operation-specific requirements
- n8n Code JavaScript - Write JavaScript in Code nodes
- n8n Code Python - Write Python in Code nodes

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


