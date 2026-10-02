# N8N Validation Expert — Code Reference

## ### Example

```javascript
// Iteration 1
let config = {
  resource: "channel",
  operation: "create"
};

const result1 = validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "runtime"
});
// → Error: Missing "name"

// ⏱️  23 seconds thinking...

// Iteration 2
config.name = "general";

const result2 = validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "runtime"
});
// → Error: Missing "text"

// ⏱️  58 seconds fixing...

// Iteration 3
config.text = "Hello!";

const result3 = validate_node({
  nodeType: "nodes-base.slack",
  config,
  profile: "runtime"
});
// → Valid! ✅
```


## ### 5. invalid_reference

```

---

## Auto-Sanitization System

### What It Does
**Automatically fixes common operator structure issues** on ANY workflow update

**Runs when**:
- `n8n_create_workflow`
- `n8n_update_partial_workflow`
- Any workflow save operation

### What It Fixes

#### 1. Binary Operators (Two Values)
**Operators**: equals, notEquals, contains, notContains, greaterThan, lessThan, startsWith, endsWith

**Fix**: Removes `singleValue` property (binary operators compare two values)

**Before**:
```javascript


## #### 2. Unary Operators (One Value)

```

#### 3. IF/Switch Metadata
**Fix**: Adds complete `conditions.options` metadata for IF v2.2+ and Switch v3.2+

### What It CANNOT Fix

#### 1. Broken Connections
References to non-existent nodes

**Solution**: Use `cleanStaleConnections` operation in `n8n_update_partial_workflow`

#### 2. Branch Count Mismatches
3 Switch rules but only 2 output connections

**Solution**: Add missing connections or remove extra rules

#### 3. Paradoxical Corrupt States
API returns corrupt data but rejects updates

**Solution**: May require manual database intervention

---

## False Positives

### What Are They?
Validation warnings that are technically "wrong" but acceptable in your use case

### Common False Positives

#### 1. "Missing error handling"
**Warning**: No error handling configured

**When acceptable**:
- Simple workflows where failures are obvious
- Testing/development workflows
- Non-critical notifications

**When to fix**: Production workflows handling important data

#### 2. "No retry logic"
**Warning**: Node doesn't retry on failure

**When acceptable**:
- APIs with their own retry logic
- Idempotent operations
- Manual trigger workflows

**When to fix**: Flaky external services, production automation

#### 3. "Missing rate limiting"
**Warning**: No rate limiting for API calls

**When acceptable**:
- Internal APIs with no limits
- Low-volume workflows
- APIs with server-side rate limiting

**When to fix**: Public APIs, high-volume workflows

#### 4. "Unbounded query"
**Warning**: SELECT without LIMIT

**When acceptable**:
- Small known datasets
- Aggregation queries
- Development/testing

**When to fix**: Production queries on large tables

### Reducing False Positives

**Use `ai-friendly` profile**:
```javascript


## ### Complete Response

```javascript
{
  "valid": false,
  "errors": [
    {
      "type": "missing_required",
      "property": "channel",
      "message": "Channel name is required",
      "fix": "Provide a channel name (lowercase, no spaces)"
    }
  ],
  "warnings": [
    {
      "type": "best_practice",
      "property": "errorHandling",
      "message": "Slack API can have rate limits",
      "suggestion": "Add onError: 'continueRegularOutput'"
    }
  ],
  "suggestions": [
    {
      "type": "optimization",
      "message": "Consider using batch operations for multiple messages"
    }
  ],
  "summary": {
    "hasErrors": true,
    "errorCount": 1,
    "warningCount": 1,
    "suggestionCount": 1
  }
}
```


## #### 4. Disconnected Nodes

```

**Fix**: Connect node or remove if unused

---

## Recovery Strategies

### Strategy 1: Start Fresh
**When**: Configuration is severely broken

**Steps**:
1. Note required fields from `get_node`
2. Create minimal valid configuration
3. Add features incrementally
4. Validate after each addition

### Strategy 2: Binary Search
**When**: Workflow validates but executes incorrectly

**Steps**:
1. Remove half the nodes
2. Validate and test
3. If works: problem is in removed nodes
4. If fails: problem is in remaining nodes
5. Repeat until problem isolated

### Strategy 3: Clean Stale Connections
**When**: "Node not found" errors

**Steps**:
```javascript


## ### Strategy 4: Use Auto-fix

```

---

## Best Practices

### ✅ Do

- Validate after every significant change
- Read error messages completely
- Fix errors iteratively (one at a time)
- Use `runtime` profile for pre-deployment
- Check `valid` field before assuming success
- Trust auto-sanitization for operator issues
- Use `get_node` when unclear about requirements
- Document false positives you accept

### ❌ Don't

- Skip validation before activation
- Try to fix all errors at once
- Ignore error messages
- Use `strict` profile during development (too noisy)
- Assume validation passed (always check result)
- Manually fix auto-sanitization issues
- Deploy with unresolved errors
- Ignore all warnings (some are important!)

---

## Detailed Guides

For comprehensive error catalogs and false positive examples:

- **ERROR_CATALOG.md** - Complete list of error types with examples
- **FALSE_POSITIVES.md** - When warnings are acceptable

---

## Summary

**Key Points**:
1. **Validation is iterative** (avg 2-3 cycles, 23s + 58s)
2. **Errors must be fixed**, warnings are optional
3. **Auto-sanitization** fixes operator structures automatically
4. **Use runtime profile** for balanced validation
5. **False positives exist** - learn to recognize them
6. **Read error messages** - they contain fix guidance

**Validation Process**:
1. Validate → Read errors → Fix → Validate again
2. Repeat until valid (usually 2-3 iterations)
3. Review warnings and decide if acceptable
4. Deploy with confidence

**Related Skills**:
- n8n MCP Tools Expert - Use validation tools correctly
- n8n Expression Syntax - Fix expression errors
- n8n Node Configuration - Understand required fields

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


