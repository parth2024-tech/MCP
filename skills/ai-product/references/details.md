# Ai Product — Code Reference

## # Always validate output:

```typescript
import { z } from 'zod';

const ResponseSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  sources: z.array(z.string()).optional(),
});

async function queryLLM(prompt: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const validated = ResponseSchema.parse(parsed); // Throws if invalid
  return validated;
}
```


## ### 1. Separate user input:

```

### 2. Input sanitization:
- Limit input length
- Strip control characters
- Detect prompt injection patterns

### 3. Output filtering:
- Check for system prompt leakage
- Validate against expected patterns

### 4. Least privilege:
- LLM should not have dangerous capabilities
- Limit tool access

### Stuffing too much into context window

Severity: HIGH

Situation: RAG system retrieves 50 chunks. All shoved into context. Hits token
limit. Error. Or worse - important info truncated silently.

Symptoms:
- Token limit errors
- Truncated responses
- Including all retrieved chunks
- No token counting

Why this breaks:
Context windows are finite. Overshooting causes errors or truncation.
More context isn't always better - noise drowns signal.

Recommended fix:

# Calculate tokens before sending:

```typescript


```

# Strategies:
- Rank chunks by relevance, take top-k
- Summarize if too long
- Use sliding window for long documents
- Reserve tokens for response

### Waiting for complete response before showing anything

Severity: HIGH

Situation: User asks question. Spinner for 15 seconds. Finally wall of text
appears. User has already left. Or thinks it is broken.

Symptoms:
- Long spinner before response
- Stream: false in API calls
- Complete response handling only

Why this breaks:
LLM responses take time. Waiting for complete response feels broken.
Streaming shows progress, feels faster, keeps users engaged.

Recommended fix:

# Stream responses:

```typescript


## # Frontend:

```

# Fallback for structured output:
Stream thinking, then parse final JSON
Or show skeleton + stream into it

### Not monitoring LLM API costs

Severity: HIGH

Situation: Ship feature. Users love it. Month end bill: $50,000. One user
made 10,000 requests. Prompt was 5000 tokens each. Nobody noticed.

Symptoms:
- No usage.tokens logging
- No per-user tracking
- Surprise bills
- No rate limiting per user

Why this breaks:
LLM costs add up fast. GPT-4 is $30-60 per million tokens. Without
tracking, you won't know until the bill arrives. At scale, this is
existential.

Recommended fix:

# Track per-request:

```typescript


```

# Implement limits:
- Per-user daily/monthly limits
- Alert thresholds
- Usage dashboard

# Optimize:
- Use cheaper models where possible
- Cache common queries
- Shorter prompts

### App breaks when LLM API fails

Severity: HIGH

Situation: OpenAI has outage. Your entire app is down. Or rate limited during
traffic spike. Users see error screens. No graceful degradation.

Symptoms:
- Single LLM provider
- No try-catch on API calls
- Error screens on API failure
- No cached responses

Why this breaks:
LLM APIs fail. Rate limits exist. Outages happen. Building without
fallbacks means your uptime is their uptime.

Recommended fix:

# Defense in depth:

```typescript


```

# Strategies:
- Multiple providers (OpenAI + Anthropic)
- Response caching for common queries
- Graceful degradation UI
- Queue + retry for non-urgent requests

# Circuit breaker:
After N failures, stop trying for X minutes
Don't burn rate limits on broken service

### Not validating facts from LLM responses

Severity: CRITICAL

Situation: LLM says a citation exists. It doesn't. Or gives a plausible-sounding
but wrong answer. User trusts it because it sounds confident.
Liability ensues.

Symptoms:
- No source citations
- No confidence indicators
- Factual claims without verification
- User complaints about wrong info

Why this breaks:
LLMs hallucinate. They sound confident when wrong. Users cannot tell
the difference. In high-stakes domains (medical, legal, financial),
this is dangerous.

Recommended fix:

# For factual claims:

## RAG with source verification:
```typescript


```

## Show uncertainty:
- Confidence scores visible to user
- "I'm not sure about this" when uncertain
- Links to sources for verification

## Domain-specific validation:
- Cross-check against authoritative sources
- Human review for high-stakes answers

### Making LLM calls in synchronous request handlers

Severity: HIGH

Situation: User action triggers LLM call. Handler waits for response. 30 second
timeout. Request fails. Or thread blocked, can't handle other requests.

Symptoms:
- Request timeouts on LLM features
- Blocking await in handlers
- No job queue for LLM tasks

Why this breaks:
LLM calls are slow (1-30 seconds). Blocking on them in request handlers
causes timeouts, poor UX, and scalability issues.

Recommended fix:

# Async patterns:

## Streaming (best for chat):
Response streams as it generates

## Job queue (best for processing):
```typescript


```

## Optimistic UI:
Return immediately with placeholder
Push update when complete

## Serverless consideration:
Edge function timeout is often 30s
Background processing for long tasks

### Changing prompts in production without version control

Severity: HIGH

Situation: Tweaked prompt to fix one issue. Broke three other cases. Cannot
remember what the old prompt was. No way to roll back.

Symptoms:
- Prompts inline in code
- No git history of prompt changes
- Cannot reproduce old behavior
- No A/B testing infrastructure

Why this breaks:
Prompts are code. Changes affect behavior. Without versioning, you
cannot track what changed, roll back issues, or A/B test improvements.

Recommended fix:

# Treat prompts as code:

## Store in version control:
```


## ## Version in database:

```

## A/B test prompts:
Randomly assign users to prompt versions
Track metrics per version

### Fine-tuning before exhausting RAG and prompting

Severity: MEDIUM

Situation: Want model to know about company. Immediately jump to fine-tuning.
Expensive. Slow. Hard to update. Should have just used RAG.

Symptoms:
- Jumping to fine-tuning for knowledge
- Haven't tried RAG first
- Complaining about RAG performance without optimization

Why this breaks:
Fine-tuning is expensive, slow to iterate, and hard to update.
RAG + good prompting solves 90% of knowledge problems. Only fine-tune
when you have clear evidence RAG is insufficient.

Recommended fix:

# Try in order:

### 1. Better prompts:
- Few-shot examples
- Clearer instructions
- Output format specification

### 2. RAG:
- Document retrieval
- Knowledge base integration
- Updates in real-time

### 3. Fine-tuning (last resort):
- When you need specific tone/style
- When context window isn't enough
- When latency matters (smaller fine-tuned model)

# Fine-tuning requirements:
- 100+ high-quality examples
- Clear evaluation metrics
- Budget for iteration

## Validation Checks

### LLM output used without validation

Severity: WARNING

LLM responses should be validated against a schema

Message: LLM output parsed as JSON without schema validation. Use Zod or similar to validate.

### Unsanitized user input in prompt

Severity: WARNING

User input in prompts risks injection attacks

Message: User input interpolated directly in prompt content. Sanitize or use separate message.

### LLM response without streaming

Severity: INFO

Long LLM responses should be streamed for better UX

Message: LLM call without streaming. Consider stream: true for better user experience.

### LLM call without error handling

Severity: WARNING

LLM API calls can fail and should be handled

Message: LLM API call without apparent error handling. Add try-catch for failures.

### LLM API key in code

Severity: ERROR

API keys should come from environment variables

Message: LLM API key appears hardcoded. Use environment variable.

### LLM usage without token tracking

Severity: INFO

Track token usage for cost monitoring

Message: LLM call without apparent usage tracking. Log token usage for cost monitoring.

### LLM call without timeout

Severity: WARNING

LLM calls should have timeout to prevent hanging

Message: LLM call without apparent timeout. Add timeout to prevent hanging requests.

### User-facing LLM without rate limiting

Severity: WARNING

LLM endpoints should be rate limited per user

Message: LLM API endpoint without apparent rate limiting. Add per-user limits.

### Sequential embedding generation

Severity: INFO

Bulk embeddings should be batched, not sequential

Message: Embeddings generated sequentially. Batch requests for better performance.

### Single LLM provider with no fallback

Severity: INFO

Consider fallback provider for reliability

Message: Single LLM provider without fallback. Consider backup provider for outages.

## Collaboration

### Delegation Triggers

- backend|api|server|database -> backend (AI needs backend implementation)
- ui|component|streaming|chat -> frontend (AI needs frontend implementation)
- cost|billing|usage|optimize -> devops (AI costs need monitoring)
- security|pii|data protection -> security (AI handling sensitive data)

### AI Feature Development

Skills: ai-product, backend, frontend, qa-engineering

Workflow:

```


