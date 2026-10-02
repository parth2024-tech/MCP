---
name: trigger-dev
description: Trigger.dev expert for background jobs, AI workflows, and reliable. Use when the task involves trigger dev.
  async execution with excellent developer experience and TypeScript-first
  design.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Trigger.dev Integration

Trigger.dev expert for background jobs, AI workflows, and reliable async
execution with excellent developer experience and TypeScript-first design.

## Principles

- Tasks are the building blocks - each task is independently retryable
- Runs are durable - state survives crashes and restarts
- Integrations are first-class - use built-in API wrappers for reliability
- Logs are your debugging lifeline - log liberally in tasks
- Concurrency protects your resources - always set limits
- Delays and schedules are built-in - no external cron needed
- AI-ready by design - long-running AI tasks just work
- Local development matches production - use the CLI

## Capabilities

- trigger-dev-tasks
- ai-background-jobs
- integration-tasks
- scheduled-triggers
- webhook-handlers
- long-running-tasks
- task-queues
- batch-processing

## Scope

- redis-queues -> bullmq-specialist
- pure-event-driven -> inngest
- workflow-orchestration -> temporal-craftsman
- infrastructure -> infra-architect

## Tooling

### Core

- trigger-dev-sdk
- trigger-cli

### Frameworks

- nextjs
- remix
- express
- hono

### Integrations

- openai
- anthropic
- resend
- stripe
- slack
- supabase

### Deployment

- trigger-cloud
- self-hosted
- docker

## Patterns

### Basic Task Setup

Setting up Trigger.dev in a Next.js project

**When to use**: Starting with Trigger.dev in any project

// trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'my-project',
  runtime: 'node',
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});

// src/trigger/tasks.ts
import { task, logger } from '@trigger.dev/sdk/v3';

export const helloWorld = task({
  id: 'hello-world',
  run: async (payload: { name: string }) => {
    logger.log('Processing hello world', { payload });

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { message: `Hello, ${payload.name}!` };
  },
});

// Triggering from your app
import { helloWorld } from '@/trigger/tasks';

// Fire and forget
await helloWorld.trigger({ name: 'World' });

// Wait for result
const handle = await helloWorld.trigger({ name: 'World' });
const result = await handle.wait();

### AI Task with OpenAI Integration

Using built-in OpenAI integration with automatic retries

**When to use**: Building AI-powered background tasks

import { task, logger } from '@trigger.dev/sdk/v3';
import { openai } from '@trigger.dev/openai';

// Configure OpenAI with Trigger.dev
const openaiClient = openai.configure({
  id: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
});

export const generateContent = task({
  id: 'generate-content',
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { topic: string; style: string }) => {
    logger.log('Generating content', { topic: payload.topic });

    // Uses Trigger.dev's OpenAI integration - handles retries automatically
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a ${payload.style} writer.`,
        },
        {
          role: 'user',
          content: `Write about: ${payload.topic}`,
        },
      ],
    });

    const content = completion.choices[0].message.content;
    logger.log('Generated content', { length: content?.length });

    return { content, tokens: completion.usage?.total_tokens };
  },
});

### Scheduled Task with Cron

Tasks that run on a schedule

**When to use**: Periodic jobs like reports, cleanup, or syncs

import { schedules, task, logger } from '@trigger.dev/sdk/v3';

export const dailyCleanup = schedules.task({
  id: 'daily-cleanup',
  cron: '0 2 * * *',  // 2 AM daily
  run: async () => {
    logger.log('Starting daily cleanup');

    // Clean up old records
    const deleted = await db.logs.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    logger.log('Cleanup complete', { deletedCount: deleted.count });

    return { deleted: deleted.count };
  },
});

// Weekly report
export const weeklyReport = schedules.task({
  id: 'weekly-report',
  cron: '0 9 * * 1',  // Monday 9 AM
  run: async () => {
    const stats = await generateWeeklyStats();
    await sendReportEmail(stats);
    return stats;
  },
});

### Batch Processing

Processing large datasets in batches

**When to use**: Need to process many items with rate limiting

import { task, logger, wait } from '@trigger.dev/sdk/v3';

export const processBatch = task({
  id: 'process-batch',
  queue: {
    concurrencyLimit: 5,  // Only 5 running at once
  },
  run: async (payload: { items: string[] }) => {
    const results = [];

    for (const item of payload.items) {
      logger.log('Processing item', { item });

      const result = await processItem(item);
      results.push(result);

      // Respect rate limits
      await wait.for({ seconds: 1 });
    }

    return { processed: results.length, results };
  },
});

// Trigger batch processing
export const startBatchJob = task({
  id: 'start-batch',
  run: async (payload: { datasetId: string }) => {
    const items = await fetchDataset(payload.datasetId);

    // Split into chunks of 100
    const chunks = chunkArray(items, 100);

    // Trigger parallel batch tasks
    const handles = await Promise.all(
      chunks.map(chunk => processBatch.trigger({ items: chunk }))
    );

    logger.log('Started batch processing', {
      totalItems: items.length,
      batches: chunks.length,
    });

    return { batches: handles.length };
  },
});

### Webhook Handler

Processing webhooks reliably with deduplication

**When to use**: Handling webhooks from Stripe, GitHub, etc.

import { task, logger, idempotencyKeys } from '@trigger.dev/sdk/v3';

export const handleStripeEvent = task({
  id: 'handle-stripe-event',
  run: async (payload: {
    eventId: string;
    type: string;
    data: any;
  }) => {
    // Idempotency based on Stripe event ID
    const idempotencyKey = await idempotencyKeys.create(payload.eventId);

    if (idempotencyKey.isNew === false) {
      logger.log('Duplicate event, skipping', { eventId: payload.eventId });
      return { skipped: true };
    }

    logger.log('Processing Stripe event', {
      type: payload.type,
      eventId: payload.eventId,
    });

    switch (payload.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(payload.data);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(payload.data);
        break;
    }

    return { processed: true, type: payload.type };
  },
});

## Sharp Edges

### Task timeout kills execution without clear error

Severity: CRITICAL

Situation: Long-running AI task or batch process suddenly stops. No error in logs.
Task shows as failed in dashboard but no stack trace. Data partially processed.

Symptoms:
- Task fails with no error message
- Partial data processing
- Works locally, fails in production
- "Task timed out" in dashboard

Why this breaks:
Trigger.dev has execution timeouts (defaults vary by plan). When exceeded, the
task is killed mid-execution. If you're not logging progress, you won't know
where it stopped. This is especially common with AI tasks that can take minutes.

Recommended fix:

# Configure explicit timeouts:
> See [references/details.md](references/details.md) for full code examples.

# For very long tasks, break into subtasks:
- Use triggerAndWait for sequential steps
- Each subtask has its own timeout
- Progress is visible in dashboard

### Non-serializable payload causes silent task failure

Severity: CRITICAL

Situation: Passing Date objects, class instances, or circular references in payload.
Task queued but never runs. Or runs with undefined/null values.

Symptoms:
- Payload values are undefined in task
- Date objects become strings
- Class methods not available
- "Converting circular structure to JSON"

Why this breaks:
Trigger.dev serializes payloads to JSON. Dates become strings, class instances
lose methods, functions disappear, circular refs throw. Your task sees different
data than you sent.

Recommended fix:

# Always use plain objects:
```typescript
// WRONG - Date becomes string
await myTask.trigger({ createdAt: new Date() });

// RIGHT - ISO string
await myTask.trigger({ createdAt: new Date().toISOString() });

// WRONG - Class instance
await myTask.trigger({ user: new User(data) });

// RIGHT - Plain object
await myTask.trigger({ user: { id: data.id, email: data.email } });

// WRONG - Circular reference
const obj = { parent: null };
obj.parent = obj;
await myTask.trigger(obj);  // Throws!
```

# In task, reconstitute as needed:
```typescript
run: async (payload: { createdAt: string }) => {
  const date = new Date(payload.createdAt);
  // ...
}
> See [references/details.md](references/details.md) for full code examples.
# Create .env.trigger file
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...

# Push to Trigger.dev
npx trigger.dev@latest env push
> See [references/details.md](references/details.md) for full code examples.
# Update both SDK and CLI
npm install @trigger.dev/sdk@latest
npx trigger.dev@latest dev

# Or pin to same version
npm install @trigger.dev/sdk@3.3.0
npx trigger.dev@3.3.0 dev
```

# Check versions:
```bash
npx trigger.dev@latest --version
npm list @trigger.dev/sdk
```

# In CI/CD:
```yaml
- run: npm install @trigger.dev/sdk@${{ env.TRIGGER_VERSION }}
- run: npx trigger.dev@${{ env.TRIGGER_VERSION }} deploy
> See [references/details.md](references/details.md) for full code examples.
import { task, idempotencyKeys } from '@trigger.dev/sdk/v3';

export const sendOrderEmail = task({
  id: 'send-order-email',
  run: async (payload: { orderId: string }) => {
    // Check if already sent
    const key = await idempotencyKeys.create(`email-${payload.orderId}`);

    if (!key.isNew) {
      logger.log('Email already sent, skipping');
      return { skipped: true };
    }

    await sendEmail(payload.orderId);
    return { sent: true };
  },
});
```

# Alternative: Track in database
```typescript
const existing = await db.emailLogs.findUnique({
  where: { orderId_type: { orderId, type: 'order_confirmation' } }
});

if (existing) {
  logger.log('Already sent');
  return;
}

await sendEmail(orderId);
await db.emailLogs.create({ data: { orderId, type: 'order_confirmation' } });
> See [references/details.md](references/details.md) for full code examples.
export const callOpenAI = task({
  id: 'call-openai',
  queue: {
    concurrencyLimit: 10,  // Only 10 running at once
  },
  run: async (payload) => {
    // Protected by concurrency limit
    return await openai.chat.completions.create(payload);
  },
});
```

# For rate-limited APIs:
```typescript
export const callRateLimitedAPI = task({
  id: 'call-api',
  queue: {
    concurrencyLimit: 5,
  },
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 5000,  // Wait before retry
    factor: 2,  // Exponential backoff
  },
  run: async (payload) => {
    // Add delay between calls
    await wait.for({ milliseconds: 200 });
    return await externalAPI.call(payload);
  },
});
> See [references/details.md](references/details.md) for full code examples.
my-app/
├── trigger.config.ts  <- Here
├── package.json
├── src/
│   └── trigger/
│       └── tasks.ts
```

# In monorepos:
```
monorepo/
├── apps/
│   └── web/
│       ├── trigger.config.ts  <- Here, not at monorepo root
│       ├── package.json
│       └── src/trigger/

# Run from package directory
cd apps/web && npx trigger.dev dev
```

# Specify config location:
```bash
npx trigger.dev dev --config ./apps/web/trigger.config.ts
> See [references/details.md](references/details.md) for full code examples.
// WRONG - Wait per item
for (const item of items) {
  await processItem(item);
