---
name: n8n-node-configuration
description: Operation-aware node configuration guidance. Use when configuring nodes, understanding property dependencies, determining required fields, choosing between get_node detail levels, or learning common configuration patterns by node type.
risk: unknown
source: community
---

# n8n Node Configuration

Expert guidance for operation-aware node configuration with property dependencies.

## When to Use
- You need to configure an n8n node correctly for a specific resource and operation.
- The task involves required fields, property dependencies, or choosing the right `get_node` detail level.
- You are troubleshooting node setup rather than overall workflow architecture.

---

## Configuration Philosophy

**Progressive disclosure**: Start minimal, add complexity as needed

Configuration best practices:
- `get_node` with `detail: "standard"` is the most used discovery pattern
- 56 seconds average between configuration edits
- Covers 95% of use cases with 1-2K tokens response

**Key insight**: Most configurations need only standard detail, not full schema!

---

## Core Concepts

### 1. Operation-Aware Configuration

**Not all fields are always required** - it depends on operation!

**Example**: Slack node
```javascript
// For operation='post'
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",  // Required for post
  "text": "Hello!"        // Required for post
}

// For operation='update'
{
  "resource": "message",
  "operation": "update",
  "messageId": "123",     // Required for update (different!)
  "text": "Updated!"      // Required for update
  // channel NOT required for update
}
```

**Key**: Resource + operation determine which fields are required!

### 2. Property Dependencies

**Fields appear/disappear based on other field values**

**Example**: HTTP Request node
```javascript
// When method='GET'
{
  "method": "GET",
  "url": "https://api.example.com"
  // sendBody not shown (GET doesn't have body)
}

// When method='POST'
{
  "method": "POST",
  "url": "https://api.example.com",
  "sendBody": true,       // Now visible!
  "body": {               // Required when sendBody=true
    "contentType": "json",
    "content": {...}
  }
}
> See [references/details.md](references/details.md) for full code examples.
1. Identify node type and operation
   ↓
2. Use get_node (standard detail is default)
   ↓
3. Configure required fields
   ↓
4. Validate configuration
   ↓
5. If field unclear → get_node({mode: "search_properties"})
   ↓
6. Add optional fields as needed
   ↓
7. Validate again
   ↓
8. Deploy
```

### Example: Configuring HTTP Request

**Step 1**: Identify what you need
```javascript
// Goal: POST JSON to API
```

**Step 2**: Get node info
```javascript
const info = get_node({
  nodeType: "nodes-base.httpRequest"
});

// Returns: method, url, sendBody, body, authentication required/optional
```

**Step 3**: Minimal config
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none"
}
```

**Step 4**: Validate
```javascript
validate_node({
  nodeType: "nodes-base.httpRequest",
  config,
  profile: "runtime"
});
// → Error: "sendBody required for POST"
```

**Step 5**: Add required field
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none",
  "sendBody": true
}
```

**Step 6**: Validate again
```javascript
validate_node({...});
// → Error: "body required when sendBody=true"
```

**Step 7**: Complete configuration
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/create",
  "authentication": "none",
  "sendBody": true,
  "body": {
    "contentType": "json",
    "content": {
      "name": "={{$json.name}}",
      "email": "={{$json.email}}"
    }
  }
}
```

**Step 8**: Final validation
```javascript
validate_node({...});
// → Valid! ✅
```

---

## get_node Detail Levels

### Standard Detail (DEFAULT - Use This!)

**✅ Starting configuration**
```javascript
get_node({
  nodeType: "nodes-base.slack"
});
// detail="standard" is the default
```

**Returns** (~1-2K tokens):
- Required fields
- Common options
- Operation list
- Metadata

**Use**: 95% of configuration needs

### Full Detail (Use Sparingly)

**✅ When standard isn't enough**
```javascript
get_node({
  nodeType: "nodes-base.slack",
  detail: "full"
});
```

**Returns** (~3-8K tokens):
- Complete schema
- All properties
- All nested options

**Warning**: Large response, use only when standard insufficient

### Search Properties Mode

**✅ Looking for specific field**
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  mode: "search_properties",
  propertyQuery: "auth"
});
```

**Use**: Find authentication, headers, body fields, etc.

### Decision Tree

> See [references/details.md](references/details.md) for full code examples.

---

## Property Dependencies Deep Dive

### displayOptions Mechanism

**Fields have visibility rules**:

```javascript
{
  "name": "body",
  "displayOptions": {
    "show": {
      "sendBody": [true],
      "method": ["POST", "PUT", "PATCH"]
    }
  }
}
```

**Translation**: "body" field shows when:
- sendBody = true AND
- method = POST, PUT, or PATCH

### Common Dependency Patterns

#### Pattern 1: Boolean Toggle

**Example**: HTTP Request sendBody
```javascript
// sendBody controls body visibility
{
  "sendBody": true   // → body field appears
}
```

#### Pattern 2: Operation Switch

**Example**: Slack resource/operation
```javascript
// Different operations → different fields
{
  "resource": "message",
  "operation": "post"
  // → Shows: channel, text, attachments, etc.
}

{
  "resource": "message",
  "operation": "update"
  // → Shows: messageId, text (different fields!)
}
```

#### Pattern 3: Type Selection

**Example**: IF node conditions
```javascript
{
  "type": "string",
  "operation": "contains"
  // → Shows: value1, value2
}

{
  "type": "boolean",
  "operation": "equals"
  // → Shows: value1, value2, different operators
}
```

### Finding Property Dependencies

**Use get_node with search_properties mode**:
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  mode: "search_properties",
  propertyQuery: "body"
});

// Returns property paths matching "body" with descriptions
```

**Or use full detail for complete schema**:
```javascript
get_node({
  nodeType: "nodes-base.httpRequest",
  detail: "full"
});

// Returns complete schema with displayOptions rules
```

**Use this when**: Validation fails and you don't understand why field is missing/required

---

## Common Node Patterns

### Pattern 1: Resource/Operation Nodes

**Examples**: Slack, Google Sheets, Airtable

**Structure**:
```javascript
{
  "resource": "<entity>",      // What type of thing
  "operation": "<action>",     // What to do with it
  // ... operation-specific fields
}
```

**How to configure**:
1. Choose resource
2. Choose operation
3. Use get_node to see operation-specific requirements
4. Configure required fields

### Pattern 2: HTTP-Based Nodes

**Examples**: HTTP Request, Webhook

**Structure**:
```javascript
{
  "method": "<HTTP_METHOD>",
  "url": "<endpoint>",
  "authentication": "<type>",
  // ... method-specific fields
}
```

**Dependencies**:
- POST/PUT/PATCH → sendBody available
- sendBody=true → body required
- authentication != "none" → credentials required

### Pattern 3: Database Nodes

**Examples**: Postgres, MySQL, MongoDB

**Structure**:
```javascript
{
  "operation": "<query|insert|update|delete>",
  // ... operation-specific fields
}
```

**Dependencies**:
- operation="executeQuery" → query required
- operation="insert" → table + values required
- operation="update" → table + values + where required

### Pattern 4: Conditional Logic Nodes

**Examples**: IF, Switch, Merge

**Structure**:
```javascript
{
  "conditions": {
    "<type>": [
      {
        "operation": "<operator>",
        "value1": "...",
        "value2": "..."  // Only for binary operators
      }
    ]
  }
}
```

**Dependencies**:
- Binary operators (equals, contains, etc.) → value1 + value2
- Unary operators (isEmpty, isNotEmpty) → value1 only + singleValue: true

---

## Operation-Specific Configuration

### Slack Node Examples

#### Post Message
```javascript
{
  "resource": "message",
  "operation": "post",
  "channel": "#general",      // Required
  "text": "Hello!",           // Required
  "attachments": [],          // Optional
  "blocks": []                // Optional
}
```

#### Update Message
```javascript
{
  "resource": "message",
  "operation": "update",
  "messageId": "1234567890",  // Required (different from post!)
  "text": "Updated!",         // Required
  "channel": "#general"       // Optional (can be inferred)
}
```

#### Create Channel
```javascript
{
  "resource": "channel",
  "operation": "create",
  "name": "new-channel",      // Required
  "isPrivate": false          // Optional
  // Note: text NOT required for this operation
}
```

### HTTP Request Node Examples

#### GET Request
```javascript
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "authentication": "predefinedCredentialType",
  "nodeCredentialType": "httpHeaderAuth",
  "sendQuery": true,                    // Optional
  "queryParameters": {                  // Shows when sendQuery=true
    "parameters": [
      {
        "name": "limit",
        "value": "100"
      }
    ]
  }
}
```

#### POST with JSON
```javascript
{
  "method": "POST",
  "url": "https://api.example.com/users",
  "authentication": "none",
  "sendBody": true,                     // Required for POST
  "body": {                             // Required when sendBody=true
    "contentType": "json",
    "content": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### IF Node Examples

#### String Comparison (Binary)
```javascript
{
  "conditions": {
    "string": [
      {
        "value1": "={{$json.status}}",
