# Upstash Qstash — Code Reference

## # Always verify signatures with both keys:

```typescript
import { Receiver } from '@upstash/qstash';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature');
  const body = await req.text();  // Raw body required

  const isValid = await receiver.verify({
    signature: signature!,
    body,
    url: req.url,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Safe to process
}
```


## # Alternative: Use QStash for the heavy work

```

# For Vercel: Consider using Edge runtime for faster cold starts

### Hitting QStash rate limits unexpectedly

Severity: HIGH

Situation: Burst of events triggers mass message publishing. QStash rate limit hit.
Messages rejected. Users don't get notifications. Critical tasks delayed.

Symptoms:
- 429 errors from QStash
- Messages not being delivered
- Sudden drop in processing during peak times

Why this breaks:
QStash has plan-based rate limits. Free tier: 500 messages/day. Pro: higher
but still limited. Bursts can exhaust limits quickly. Without monitoring,
you won't know until users complain.

Recommended fix:

# Check your plan limits:
- Free: 500 messages/day
- Pay as you go: Check dashboard
- Pro: Higher limits, check dashboard

# Implement rate limit handling:
```typescript


## # Batch messages when possible:

```

# Monitor in dashboard:
Upstash Console shows usage and limits

### Not using deduplication for critical operations

Severity: HIGH

Situation: Network hiccup during publish. SDK retries. Same message sent twice.
Customer charged twice. Email sent twice. Data corrupted.

Symptoms:
- Duplicate charges or emails
- Double processing of same event
- User complaints about duplicates

Why this breaks:
Network failures and retries happen. Without deduplication, the same logical
message can be sent multiple times. QStash provides deduplication, but you
must use it for critical operations.

Recommended fix:

# Use deduplication for critical messages:
```typescript


```

# Deduplication window:
- Default: 60 seconds
- Messages with same ID in window are deduplicated
- Plan for this in your retry logic

# Also make endpoints idempotent:
Check if operation already completed before processing

### Expecting QStash to reach private/localhost endpoints

Severity: CRITICAL

Situation: Development works with local server. Deploy to production with internal URL.
QStash can't reach it. All messages fail silently. No processing happens.

Symptoms:
- Messages show "failed" in QStash dashboard
- Works locally but fails in "production"
- Using http:// instead of https://

Why this breaks:
QStash runs in Upstash's cloud. It can only reach public, internet-accessible
URLs. localhost, internal IPs, and private networks are unreachable. This is
a fundamental architecture requirement, not a configuration issue.

Recommended fix:

# Production requirements:
- URL must be publicly accessible
- HTTPS required (HTTP will fail)
- No localhost, 127.0.0.1, or private IPs

# Local development options:

# Option 1: ngrok/localtunnel
```bash


## # Option 2: QStash local development mode

```

# Option 3: Use Vercel preview URLs
Preview deploys give you public URLs for testing

### Using default retry behavior for all message types

Severity: MEDIUM

Situation: Critical payment webhook uses defaults. 3 retries over minutes. Payment
processor is temporarily down for 15 minutes. Message marked as failed.
Payment reconciliation manual work required.

Symptoms:
- Critical messages marked failed
- Manual intervention needed for retries
- Temporary outages causing permanent failures

Why this breaks:
Default retry behavior (3 attempts, short backoff) works for many cases but
not all. Some endpoints need more attempts, longer backoff, or different
strategies. One size doesn't fit all.

Recommended fix:

# Configure retries per message:
```typescript


## # Use failure callbacks for dead letter handling:

```

### Sending large payloads instead of references

Severity: MEDIUM

Situation: Message contains entire document (5MB). QStash rejects - body too large.
Even if accepted, slow to transmit. Expensive. Wastes bandwidth.

Symptoms:
- Message publish failures
- Slow message delivery
- High bandwidth costs

Why this breaks:
QStash has message size limits (around 500KB body). Large payloads slow
delivery, increase costs, and can fail entirely. Messages should be
lightweight triggers, not data carriers.

Recommended fix:

# Send references, not data:
```typescript


## # In your handler:

```

# Large data storage options:
- S3/R2/Blob storage for files
- Database for structured data
- Redis for temporary data (Upstash Redis pairs well)

### Not using callback/failureCallback for critical flows

Severity: MEDIUM

Situation: Important task published. QStash delivers. Endpoint processes. But your
system doesn't know it succeeded. User stuck waiting. No feedback loop.

Symptoms:
- No visibility into message delivery
- Users waiting for actions that completed
- No alerting on failures

Why this breaks:
QStash is fire-and-forget by default. Without callbacks, you don't know
if messages were delivered successfully. For critical flows, you need
the feedback loop to update state and handle failures.

Recommended fix:

# Use callbacks for critical operations:
```typescript


## # Failure callback for alerting:

```

### Cron schedules using wrong timezone

Severity: MEDIUM

Situation: Scheduled daily report at "9am". But 9am in which timezone? QStash uses UTC.
Report runs at 4am local time. Users confused. Support tickets filed.

Symptoms:
- Schedules running at unexpected times
- Off-by-one-hour issues during DST
- User complaints about report timing

Why this breaks:
QStash cron schedules run in UTC. If you think in local time but configure
in UTC, schedules will run at unexpected times. This is especially tricky
with daylight saving time changes.

Recommended fix:

# QStash uses UTC:
```typescript


## # Document timezone in schedule name:

```

# Handle DST programmatically if needed:
Update schedules when DST changes, or accept UTC timing

### URL groups with dead or outdated endpoints

Severity: MEDIUM

Situation: URL group has 5 endpoints. One service deprecated months ago. Messages
still fan out to it. Failures in dashboard. Wasted attempts. Slower delivery.

Symptoms:
- Failed deliveries in URL groups
- Messages to deprecated services
- Slow fan-out due to timeouts

Why this breaks:
URL groups persist until explicitly updated. When services change, endpoints
become stale. QStash tries to deliver to dead URLs, wastes retries, and
the failure noise obscures real issues.

Recommended fix:

# Audit URL groups regularly:
```typescript


## # Update groups when services change:

```

# Automate in CI/CD:
Check URL group health as part of deployment

## Validation Checks

### Webhook signature verification

Severity: CRITICAL

Message: QStash webhook handlers must verify signatures using Receiver

Fix action: Add signature verification: const receiver = new Receiver({ currentSigningKey, nextSigningKey }); await receiver.verify({ signature, body, url })

### Both signing keys configured

Severity: CRITICAL

Message: QStash Receiver must have both currentSigningKey and nextSigningKey for key rotation

Fix action: Configure both keys: new Receiver({ currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY })

### QStash token hardcoded

Severity: CRITICAL

Message: QStash token must not be hardcoded - use environment variables

Fix action: Use process.env.QSTASH_TOKEN

### QStash signing keys hardcoded

Severity: CRITICAL

Message: QStash signing keys must not be hardcoded

Fix action: Use process.env.QSTASH_CURRENT_SIGNING_KEY and process.env.QSTASH_NEXT_SIGNING_KEY

### Localhost URL in QStash publish

Severity: CRITICAL

Message: QStash cannot reach localhost - endpoints must be publicly accessible

Fix action: Use a public URL (e.g., your deployed domain or ngrok for testing)

### HTTP URL instead of HTTPS

Severity: ERROR

Message: QStash requires HTTPS URLs for security

Fix action: Change http:// to https://

### QStash publish without error handling

Severity: ERROR

Message: QStash publish calls should have error handling for rate limits and failures

Fix action: Wrap in try/catch and handle errors appropriately

### Using parsed JSON for signature verification

Severity: CRITICAL

Message: Signature verification requires raw body (req.text()), not parsed JSON

Fix action: Use await req.text() to get raw body for verification

### Callback endpoint without signature verification

Severity: CRITICAL

Message: Callback endpoints must also verify signatures - they receive QStash requests too

Fix action: Add Receiver signature verification to callback handlers

### Schedule without destination URL

Severity: ERROR

Message: QStash schedules require a destination URL

Fix action: Add destination: 'https://your-app.com/api/endpoint' to schedule options

## Collaboration

### Delegation Triggers

- complex workflow|multi-step|state machine -> inngest (Need durable step functions with checkpointing)
- redis queue|worker process|job priority -> bullmq-specialist (Need traditional queue with workers)
- ai background|long running ai|model inference -> trigger-dev (Need AI-specific background processing)
- deploy|vercel|production|environment -> vercel-deployment (Need deployment configuration for QStash)
- database|persistence|state|sync -> supabase-backend (Need database for job state)
- auth|user context|session -> nextjs-supabase-auth (Need user context in message handlers)

### Serverless Background Jobs

Skills: upstash-qstash, nextjs-app-router, vercel-deployment

Workflow:

```


## ### Gradual Migration to Workflows

```

## Related Skills

Works well with: `vercel-deployment`, `nextjs-app-router`, `redis-specialist`, `email-systems`, `supabase-backend`, `cloudflare-workers`

## When to Use
- User mentions or implies: qstash
- User mentions or implies: upstash queue
- User mentions or implies: serverless cron
- User mentions or implies: scheduled http
- User mentions or implies: message queue serverless
- User mentions or implies: vercel cron
- User mentions or implies: delayed message

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

# Convert to UTC:
- 9am EST = 2pm UTC (winter) / 1pm UTC (summer)
- 9am PST = 5pm UTC (winter) / 4pm UTC (summer)

# Document timezone in schedule name:
```typescript
await qstash.schedules.create({
  destination: 'https://myapp.com/api/daily-report',
  cron: '0 14 * * *',  // 9am EST (14:00 UTC)
  body: JSON.stringify({
    timezone: 'America/New_York',
    localTime: '9:00 AM',
  }),
});
> See [references/details.md](references/details.md) for full code examples.
const groups = await qstash.urlGroups.list();
for (const group of groups) {
  console.log(`Group: ${group.name}`);
  for (const endpoint of group.endpoints) {
    // Check if endpoint is still valid
    try {
      await fetch(endpoint.url, { method: 'HEAD' });
      console.log(`  OK: ${endpoint.url}`);
    } catch {
      console.log(`  DEAD: ${endpoint.url}`);
    }
  }
}
```

# Update groups when services change:
```typescript
// Remove dead endpoint
await qstash.urlGroups.removeEndpoints({
  name: 'order-processors',
  endpoints: [{ url: 'https://old-service.myapp.com/api/process' }],
});
> See [references/details.md](references/details.md) for full code examples.
1. Define API route handlers (nextjs-app-router)
2. Configure QStash integration (upstash-qstash)
3. Deploy with environment vars (vercel-deployment)
```

### Reliable Webhooks

Skills: upstash-qstash, stripe-integration, supabase-backend

Workflow:

```
1. Receive webhooks from Stripe (stripe-integration)
2. Queue for reliable processing (upstash-qstash)
3. Persist state to database (supabase-backend)
```

### Scheduled Reports

Skills: upstash-qstash, email-systems, supabase-backend

Workflow:

```
1. Configure cron schedule (upstash-qstash)
2. Query data for report (supabase-backend)
3. Send via email system (email-systems)
```

### Fan-out Notifications

Skills: upstash-qstash, email-systems, slack-bot-builder

Workflow:

```
1. Publish to URL group (upstash-qstash)
2. Email handler receives (email-systems)
3. Slack handler receives (slack-bot-builder)
```

### Gradual Migration to Workflows

Skills: upstash-qstash, inngest

Workflow:

```
1. Start with simple QStash messages (upstash-qstash)
2. Identify multi-step patterns
3. Migrate complex flows to Inngest (inngest)
4. Keep simple schedules in QStash
> See [references/details.md](references/details.md) for full code examples.
