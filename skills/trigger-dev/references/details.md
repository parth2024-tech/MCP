# Trigger Dev — Code Reference

## # Configure explicit timeouts:

```typescript
export const processDocument = task({
  id: 'process-document',
  machine: {
    preset: 'large-2x',  // More resources = longer allowed time
  },
  run: async (payload) => {
    logger.log('Starting document processing', { docId: payload.id });

    // Log progress at each step
    logger.log('Step 1: Extracting text');
    const text = await extractText(payload.fileUrl);

    logger.log('Step 2: Generating embeddings', { textLength: text.length });
    const embeddings = await generateEmbeddings(text);

    logger.log('Step 3: Storing vectors', { count: embeddings.length });
    await storeVectors(embeddings);

    logger.log('Completed successfully');
    return { processed: true };
  },
});
```


## # In task, reconstitute as needed:

```

### Environment variables not synced to Trigger.dev cloud

Severity: CRITICAL

Situation: Task works locally but fails in production. Env var that exists in Vercel
is undefined in Trigger.dev. API calls fail, database connections fail.

Symptoms:
- "Environment variable not found"
- API calls return 401 in production tasks
- Works in dev, fails in production
- Database connection errors in tasks

Why this breaks:
Trigger.dev runs tasks in its own cloud, separate from your Vercel/Railway
deployment. Environment variables must be configured in BOTH places. They
don't automatically sync.

Recommended fix:

# Sync env vars to Trigger.dev:
1. Go to Trigger.dev dashboard
2. Project Settings > Environment Variables
3. Add ALL required env vars

# Or use CLI:
```bash


## # Push to Trigger.dev

```

# Common missing vars:
- DATABASE_URL
- OPENAI_API_KEY / ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY
- Service API keys
- Internal service URLs

# Test in staging:
Trigger.dev has separate envs - configure staging too

### SDK version mismatch between CLI and package

Severity: HIGH

Situation: Updated @trigger.dev/sdk but forgot to update CLI. Or vice versa.
Tasks fail to register. Weird type errors. Dev server crashes.

Symptoms:
- Tasks not appearing in dashboard
- Type errors in trigger.config.ts
- "Failed to register task"
- Dev server crashes on start

Why this breaks:
The Trigger.dev SDK and CLI must be on compatible versions. Breaking changes
between versions cause registration failures. The CLI generates types that
must match the SDK.

Recommended fix:

# Always update together:
```bash


## # In CI/CD:

```

### Task retries cause duplicate side effects

Severity: HIGH

Situation: Task sends email, then fails on next step. Retry sends email again.
Customer gets 3 identical emails. Or 3 Stripe charges. Or 3 Slack messages.

Symptoms:
- Duplicate emails on retry
- Multiple charges for same order
- Duplicate webhook deliveries
- Data inserted multiple times

Why this breaks:
Trigger.dev retries failed tasks from the beginning. If your task has side
effects before the failure point, those execute again. Without idempotency,
you create duplicates.

Recommended fix:

# Use idempotency keys:
```typescript


## # Alternative: Track in database

```

### High concurrency overwhelms downstream services

Severity: HIGH

Situation: Burst of 1000 tasks triggered. All hit OpenAI API simultaneously.
Rate limited. All fail. Retry. Rate limited again. Vicious cycle.

Symptoms:
- Rate limit errors (429)
- Database connection pool exhausted
- API returns "too many requests"
- Mass task failures

Why this breaks:
Trigger.dev scales to handle many concurrent tasks. But your downstream
APIs (OpenAI, databases, external services) have rate limits. Without
concurrency control, you overwhelm them.

Recommended fix:

# Set queue concurrency limits:
```typescript


## # For rate-limited APIs:

```

# Start conservative:
- 5-10 for external APIs
- 20-50 for databases
- Increase based on monitoring

### trigger.config.ts not at project root

Severity: HIGH

Situation: Running npx trigger.dev dev but CLI can't find config.
Or config exists but in wrong location (monorepo issue).

Symptoms:
- "Could not find trigger.config.ts"
- Tasks not discovered
- Empty task list in dashboard
- Works for one package, not another

Why this breaks:
The CLI looks for trigger.config.ts at the current working directory.
In monorepos, you must run from the package directory, not the root.
Wrong location = tasks not discovered.

Recommended fix:

# Config must be at package root:
```


## # Specify config location:

```

### wait.for in loops causes memory issues

Severity: MEDIUM

Situation: Processing thousands of items with wait.for between each.
Task memory grows. Eventually killed for memory.

Symptoms:
- Task killed for memory
- Slow task execution
- State blob too large error
- Works for small batches, fails for large

Why this breaks:
Each wait.for creates checkpoint state. In a loop with thousands of
iterations, this accumulates. The task's state blob grows until it
hits memory limits.

Recommended fix:

# Batch instead of individual waits:
```typescript


## # For very large datasets, use subtasks:

```

### Using raw SDK instead of Trigger.dev integrations

Severity: MEDIUM

Situation: Using OpenAI SDK directly. API call fails. No automatic retry.
Rate limits not handled. Have to implement all resilience manually.

Symptoms:
- Manual retry logic in tasks
- Rate limit errors not handled
- No automatic logging of API calls
- Inconsistent error handling

Why this breaks:
Trigger.dev integrations wrap SDKs with automatic retries, rate limit
handling, and proper logging. Using raw SDKs means you lose these
features and have to implement them yourself.

Recommended fix:

# Use integrations when available:
```typescript


```

# Available integrations:
- @trigger.dev/openai
- @trigger.dev/anthropic
- @trigger.dev/resend
- @trigger.dev/slack
- @trigger.dev/stripe

### Triggering tasks without dev server running

Severity: MEDIUM

Situation: Called task.trigger() but nothing happens. No errors either.
Task just disappears into void. Dev server wasn't running.

Symptoms:
- Triggers don't run
- No task in dashboard
- No errors, just silence
- Works in production, not dev

Why this breaks:
In development, tasks run through the local dev server (npx trigger.dev dev).
If it's not running, triggers queue up or fail silently depending on
configuration. Production works differently.

Recommended fix:

# Always run dev server during development:
```bash


## # In package.json:

```

## Validation Checks

### Task without logging

Severity: WARNING

Message: Task has no logging. Add logger.log() calls for debugging in production.

Fix action: Import { logger } from '@trigger.dev/sdk/v3' and add log statements

### Task without error handling

Severity: ERROR

Message: Task lacks explicit error handling. Unhandled errors may cause unclear failures.

Fix action: Wrap task logic in try/catch and log errors with context

### Task without concurrency limit

Severity: WARNING

Message: Task has no concurrency limit. High load may overwhelm downstream services.

Fix action: Add queue: { concurrencyLimit: 10 } to protect APIs and databases

### Date object in trigger payload

Severity: ERROR

Message: Date objects are serialized to strings. Use ISO string format instead.

Fix action: Use date.toISOString() instead of new Date()

### Class instance in trigger payload

Severity: ERROR

Message: Class instances lose methods when serialized. Use plain objects.

Fix action: Convert class instance to plain object before triggering

### Task without explicit ID

Severity: ERROR

Message: Task must have an explicit id property for registration.

Fix action: Add id: 'my-task-name' to task definition

### Trigger.dev API key hardcoded

Severity: CRITICAL

Message: Trigger.dev API key should not be hardcoded - use TRIGGER_SECRET_KEY env var

Fix action: Remove hardcoded key and use process.env.TRIGGER_SECRET_KEY

### Using raw OpenAI SDK instead of integration

Severity: WARNING

Message: Consider using @trigger.dev/openai for automatic retries and rate limiting

Fix action: Replace with: import { openai } from '@trigger.dev/openai'

### Using raw Anthropic SDK instead of integration

Severity: WARNING

Message: Consider using @trigger.dev/anthropic for automatic retries and rate limiting

Fix action: Replace with: import { anthropic } from '@trigger.dev/anthropic'

### wait.for inside loop

Severity: WARNING

Message: wait.for in loops creates many checkpoints. Consider batching instead.

Fix action: Batch items and use fewer waits, or split into subtasks

## Collaboration

### Delegation Triggers

- redis|bullmq|traditional queue -> bullmq-specialist (Need Redis-backed queues instead of managed service)
- vercel|deployment|serverless -> vercel-deployment (Trigger.dev needs deployment config)
- database|postgres|supabase -> supabase-backend (Tasks need database access)
- openai|anthropic|ai model|llm -> llm-architect (Tasks need AI model integration)
- event-driven|event sourcing|fan out -> inngest (Need pure event-driven model)

### AI Background Processing

Skills: trigger-dev, llm-architect, nextjs-app-router, supabase-backend

Workflow:

```


## ### Scheduled Reports

```

## Related Skills

Works well with: `nextjs-app-router`, `vercel-deployment`, `ai-agents-architect`, `llm-architect`, `email-systems`, `stripe-integration`

## When to Use
- User mentions or implies: trigger.dev
- User mentions or implies: trigger dev
- User mentions or implies: background task
- User mentions or implies: ai background job
- User mentions or implies: long running task
- User mentions or implies: integration task
- User mentions or implies: scheduled task

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

  await wait.for({ milliseconds: 100 });  // 1000 waits = bloated state
}

// RIGHT - Batch processing
const chunks = chunkArray(items, 50);
for (const chunk of chunks) {
  await Promise.all(chunk.map(processItem));
  await wait.for({ milliseconds: 500 });  // Only 20 waits
}
```

# For very large datasets, use subtasks:
```typescript
export const processAll = task({
  id: 'process-all',
  run: async (payload: { items: string[] }) => {
    const chunks = chunkArray(payload.items, 100);

    // Each chunk is a separate task
    await Promise.all(
      chunks.map(chunk =>
        processChunk.triggerAndWait({ items: chunk })
      )
    );
  },
});
> See [references/details.md](references/details.md) for full code examples.
// WRONG - Raw SDK
import OpenAI from 'openai';
const openai = new OpenAI();

// RIGHT - Trigger.dev integration
import { openai } from '@trigger.dev/openai';

const openaiClient = openai.configure({
  id: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

// Now has automatic retries and rate limiting
export const generateContent = task({
  id: 'generate-content',
  run: async (payload) => {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: payload.prompt }],
    });
    return response;
  },
});
# Terminal 1: Your app
npm run dev

# Terminal 2: Trigger.dev dev server
npx trigger.dev dev
```

# Check dev server is connected:
- Should show "Connected to Trigger.dev"
- Tasks should appear in console
- Dashboard shows task registrations

# In package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "trigger:dev": "trigger.dev dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run trigger:dev\""
  }
}
> See [references/details.md](references/details.md) for full code examples.
1. User triggers via UI (nextjs-app-router)
2. Task queued (trigger-dev)
3. AI processing (llm-architect)
4. Results stored (supabase-backend)
```

### Webhook Processing Pipeline

Skills: trigger-dev, stripe-integration, email-systems, supabase-backend

Workflow:

```
1. Webhook received (stripe-integration)
2. Task triggered (trigger-dev)
3. Database updated (supabase-backend)
4. Notification sent (email-systems)
```

### Batch Data Processing

Skills: trigger-dev, supabase-backend, backend

Workflow:

```
1. Batch job triggered (backend)
2. Data chunked and processed (trigger-dev)
3. Results aggregated (supabase-backend)
```

### Scheduled Reports

Skills: trigger-dev, supabase-backend, email-systems

Workflow:

```
1. Cron triggers task (trigger-dev)
2. Data aggregated (supabase-backend)
3. Report generated and sent (email-systems)
> See [references/details.md](references/details.md) for full code examples.
