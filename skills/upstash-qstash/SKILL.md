---
name: upstash-qstash
description: Upstash QStash expert for serverless message queues, scheduled. Use when the task involves upstash qstash.
  jobs, and reliable HTTP-based task delivery without managing infrastructure.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Upstash QStash

Upstash QStash expert for serverless message queues, scheduled jobs, and
reliable HTTP-based task delivery without managing infrastructure.

## Principles

- HTTP is the interface - if it speaks HTTPS, it speaks QStash
- Endpoints must be public - QStash calls your URLs from the cloud
- Verify signatures always - never trust unverified webhooks
- Schedules are fire-and-forget - QStash handles the cron
- Retries are built-in - but configure them for your use case
- Delays are free - schedule seconds to days in the future
- Callbacks complete the loop - know when delivery succeeds or fails
- Deduplication prevents double-processing - use message IDs

## Capabilities

- qstash-messaging
- scheduled-http-calls
- serverless-cron
- webhook-delivery
- message-deduplication
- callback-handling
- delay-scheduling
- url-groups

## Scope

- complex-workflows -> inngest
- redis-queues -> bullmq-specialist
- event-sourcing -> event-architect
- workflow-orchestration -> temporal-craftsman

## Tooling

### Core

- qstash-sdk
- upstash-console

### Frameworks

- nextjs
- cloudflare-workers
- vercel-functions
- aws-lambda
- netlify-functions

### Patterns

- scheduled-jobs
- delayed-messages
- webhook-fanout
- callback-verification

### Related

- upstash-redis
- upstash-kafka

## Patterns

### Basic Message Publishing

Sending messages to be delivered to endpoints

**When to use**: Need reliable async HTTP calls

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Simple message to endpoint
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: {
    userId: '123',
    action: 'welcome-email',
  },
});

// With delay (process in 1 hour)
await qstash.publishJSON({
  url: 'https://myapp.com/api/reminder',
  body: { userId: '123' },
  delay: 60 * 60,  // seconds
});

// With specific delivery time
await qstash.publishJSON({
  url: 'https://myapp.com/api/scheduled',
  body: { report: 'daily' },
  notBefore: Math.floor(Date.now() / 1000) + 86400,  // tomorrow
});

### Scheduled Cron Jobs

Setting up recurring scheduled tasks

**When to use**: Need periodic background jobs without infrastructure

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Create a scheduled job
const schedule = await qstash.schedules.create({
  destination: 'https://myapp.com/api/cron/daily-report',
  cron: '0 9 * * *',  // Every day at 9 AM UTC
  body: JSON.stringify({ type: 'daily' }),
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('Schedule created:', schedule.scheduleId);

// List all schedules
const schedules = await qstash.schedules.list();

// Delete a schedule
await qstash.schedules.delete(schedule.scheduleId);

### Signature Verification

Verifying QStash message signatures in your endpoint

**When to use**: Any endpoint receiving QStash messages (always!)

// app/api/webhook/route.ts (Next.js App Router)
import { Receiver } from '@upstash/qstash';
import { NextRequest, NextResponse } from 'next/server';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature');
  const body = await req.text();

  // ALWAYS verify signature
  const isValid = await receiver.verify({
    signature: signature!,
    body,
    url: req.url,
  });

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Safe to process
  const data = JSON.parse(body);
  await processMessage(data);

  return NextResponse.json({ success: true });
}

### Callback for Delivery Status

Getting notified when messages are delivered or fail

**When to use**: Need to track delivery status for critical messages

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Publish with callback
await qstash.publishJSON({
  url: 'https://myapp.com/api/critical-task',
  body: { taskId: '456' },
  callback: 'https://myapp.com/api/qstash-callback',
  failureCallback: 'https://myapp.com/api/qstash-failed',
});

// Callback endpoint receives delivery status
// app/api/qstash-callback/route.ts
export async function POST(req: NextRequest) {
  // Verify signature first!
  const data = await req.json();

  // data contains:
  // - sourceMessageId: original message ID
  // - url: destination URL
  // - status: HTTP status code
  // - body: response body

  if (data.status >= 200 && data.status < 300) {
    await markTaskComplete(data.sourceMessageId);
  }

  return NextResponse.json({ received: true });
}

### URL Groups (Fan-out)

Sending messages to multiple endpoints at once

**When to use**: Need to notify multiple services about an event

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Create a URL group
await qstash.urlGroups.addEndpoints({
  name: 'order-processors',
  endpoints: [
    { url: 'https://inventory.myapp.com/api/process' },
    { url: 'https://shipping.myapp.com/api/process' },
    { url: 'https://analytics.myapp.com/api/track' },
  ],
});

// Publish to the group - all endpoints receive the message
await qstash.publishJSON({
  urlGroup: 'order-processors',
  body: {
    orderId: '789',
    event: 'order.placed',
  },
});

### Message Deduplication

Preventing duplicate message processing

**When to use**: Idempotency is critical (payments, notifications)

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Deduplicate by custom ID (within deduplication window)
await qstash.publishJSON({
  url: 'https://myapp.com/api/charge',
  body: { orderId: '123', amount: 5000 },
  deduplicationId: 'charge-order-123',  // Won't send again within window
});

// Content-based deduplication
await qstash.publishJSON({
  url: 'https://myapp.com/api/notify',
  body: { userId: '456', message: 'Hello' },
  contentBasedDeduplication: true,  // Hash of body used as ID
});

## Sharp Edges

### Not verifying QStash webhook signatures

Severity: CRITICAL

Situation: Endpoint accepts any POST request. Attacker discovers your callback URL.
Fake messages flood your system. Malicious payloads processed as trusted.

Symptoms:
- No Receiver import in webhook handler
- Missing upstash-signature header check
- Processing request before verification

Why this breaks:
QStash endpoints are public URLs. Without signature verification, anyone
can send requests. This is a direct path to unauthorized message processing
and potential data manipulation.

Recommended fix:

# Always verify signatures with both keys:
> See [references/details.md](references/details.md) for full code examples.

# Why two keys?
- QStash rotates signing keys
- nextSigningKey becomes current during rotation
- Both must be checked for seamless key rotation

### Callback endpoint taking too long to respond

Severity: HIGH

Situation: Webhook handler does heavy processing. Takes 30+ seconds. QStash times out.
Marks message as failed. Retries. Double processing begins.

Symptoms:
- Webhook timeouts in QStash dashboard
- Messages marked failed then retried
- Duplicate processing of same message

Why this breaks:
QStash has a 30-second timeout for callbacks. If your endpoint doesn't respond
in time, QStash considers it failed and retries. Long-running handlers create
duplicate message processing and wasted retries.

Recommended fix:

# Design for fast acknowledgment:
```typescript
export async function POST(req: NextRequest) {
  // 1. Verify signature first (fast)
  // 2. Parse and validate message (fast)
  // 3. Queue for async processing (fast)

  const message = await parseMessage(req);

  // Don't do this:
  // await processHeavyWork(message);  // Could timeout!

  // Do this instead:
  await db.jobs.create({ data: message, status: 'pending' });
  // Or use another QStash message for the heavy work

  return NextResponse.json({ queued: true });  // Respond fast
}
```

# Alternative: Use QStash for the heavy work
```typescript
// Webhook receives trigger
await qstash.publishJSON({
  url: 'https://myapp.com/api/heavy-process',
  body: { jobId: message.id },
});
return NextResponse.json({ delegated: true });
> See [references/details.md](references/details.md) for full code examples.
try {
  await qstash.publishJSON({ url, body });
} catch (error) {
  if (error.message?.includes('rate limit')) {
    // Queue locally and retry later
    await localQueue.add('qstash-retry', { url, body });
  }
  throw error;
}
```

# Batch messages when possible:
```typescript
// Instead of 100 individual publishes
await qstash.batchJSON({
  messages: items.map(item => ({
    url: 'https://myapp.com/api/process',
    body: { itemId: item.id },
  })),
});
> See [references/details.md](references/details.md) for full code examples.
// Custom ID (best for business operations)
await qstash.publishJSON({
  url: 'https://myapp.com/api/charge',
  body: { orderId: '123', amount: 5000 },
  deduplicationId: `charge-${orderId}`,  // Same ID = same message
});

// Content-based (good for notifications)
await qstash.publishJSON({
  url: 'https://myapp.com/api/notify',
  body: { userId: '456', type: 'welcome' },
  contentBasedDeduplication: true,  // Hash of body
});
ngrok http 3000
# Use the ngrok URL for QStash testing
```

# Option 2: QStash local development mode
```typescript
// In development, skip QStash and call directly
if (process.env.NODE_ENV === 'development') {
  await fetch('http://localhost:3000/api/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
} else {
  await qstash.publishJSON({ url, body: data });
}
> See [references/details.md](references/details.md) for full code examples.
// Critical operations: more retries, longer backoff
await qstash.publishJSON({
  url: 'https://myapp.com/api/payment-webhook',
  body: { paymentId: '123' },
  retries: 5,
  // Backoff: 10s, 30s, 1m, 5m, 30m
});

// Non-critical notifications: fewer retries
await qstash.publishJSON({
  url: 'https://myapp.com/api/analytics',
  body: { event: 'pageview' },
  retries: 1,  // Fail fast, not critical
});
```

# Consider your endpoint's recovery time:
- Database down: May need 5+ minutes
- Third-party API: May need hours
- Internal service: Usually quick

# Use failure callbacks for dead letter handling:
```typescript
await qstash.publishJSON({
  url: 'https://myapp.com/api/critical',
  body: data,
  failureCallback: 'https://myapp.com/api/dead-letter',
});
> See [references/details.md](references/details.md) for full code examples.
// BAD: Large payload
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: { document: largeDocumentContent },  // 5MB!
});

// GOOD: Reference only
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: { documentId: 'doc_123' },  // Fetch in handler
});
```

# In your handler:
```typescript
export async function POST(req: NextRequest) {
  const { documentId } = await req.json();
  const document = await storage.get(documentId);  // Fetch actual data
  await processDocument(document);
}
> See [references/details.md](references/details.md) for full code examples.
await qstash.publishJSON({
  url: 'https://myapp.com/api/send-email',
  body: { userId: '123', template: 'welcome' },
  callback: 'https://myapp.com/api/email-callback',
  failureCallback: 'https://myapp.com/api/email-failed',
});
```

# Handle the callback:
```typescript
// app/api/email-callback/route.ts
export async function POST(req: NextRequest) {
  // Verify signature first!
  const data = await req.json();

  // data.sourceMessageId - original message
  // data.status - HTTP status code
  // data.body - response from endpoint

  await db.emailLogs.update({
    where: { messageId: data.sourceMessageId },
    data: { status: 'delivered' },
  });

  return NextResponse.json({ received: true });
}
```

# Failure callback for alerting:
```typescript
// app/api/email-failed/route.ts
export async function POST(req: NextRequest) {
  const data = await req.json();
  await alerting.notify(`Email failed: ${data.sourceMessageId}`);
  await db.emailLogs.update({
    where: { messageId: data.sourceMessageId },
    data: { status: 'failed', error: data.body },
  });
}
> See [references/details.md](references/details.md) for full code examples.
// This runs at 9am UTC, not local time
await qstash.schedules.create({
  destination: 'https://myapp.com/api/daily-report',
  cron: '0 9 * * *',  // 9am UTC
});
```

