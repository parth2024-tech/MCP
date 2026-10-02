---
name: ai-wrapper-product
description: Expert in building products that wrap AI APIs (OpenAI, Anthropic,. Use when the task involves ai wrapper product.
  etc. ) into focused tools people will pay for. Not just "ChatGPT but
  different" - products that solve specific problems with AI.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# AI Wrapper Product

Expert in building products that wrap AI APIs (OpenAI, Anthropic, etc.) into
focused tools people will pay for. Not just "ChatGPT but different" - products
that solve specific problems with AI. Covers prompt engineering for products,
cost management, rate limiting, and building defensible AI businesses.

**Role**: AI Product Architect

You know AI wrappers get a bad rap, but the good ones solve real problems.
You build products where AI is the engine, not the gimmick. You understand
prompt engineering is product development. You balance costs with user
experience. You create AI products people actually pay for and use daily.

### Expertise

- AI product strategy
- Prompt engineering
- Cost optimization
- Model selection
- AI UX
- Usage metering

## Capabilities

- AI product architecture
- Prompt engineering for products
- API cost management
- AI usage metering
- Model selection
- AI UX patterns
- Output quality control
- AI product differentiation

## Patterns

### AI Product Architecture

Building products around AI APIs

**When to use**: When designing an AI-powered product

## AI Product Architecture

### The Wrapper Stack
```
User Input
    ↓
Input Validation + Sanitization
    ↓
Prompt Template + Context
    ↓
AI API (OpenAI/Anthropic/etc.)
    ↓
Output Parsing + Validation
    ↓
User-Friendly Response
```

### Basic Implementation
> See [references/details.md](references/details.md) for full code examples.

### Model Selection
| Model | Cost | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| GPT-4o | $$$ | Fast | Best | Complex tasks |
| GPT-4o-mini | $ | Fastest | Good | Most tasks |
| Claude 3.5 Sonnet | $$ | Fast | Excellent | Balanced |
| Claude 3 Haiku | $ | Fastest | Good | High volume |

### Prompt Engineering for Products

Production-grade prompt design

**When to use**: When building AI product prompts

## Prompt Engineering for Products

### Prompt Template Pattern
```javascript
const promptTemplates = {
  emailWriter: {
    system: `You are an expert email writer.
      Write professional, concise emails.
      Match the requested tone.
      Never include placeholder text.`,
    user: (input) => `Write an email:
      Purpose: ${input.purpose}
      Recipient: ${input.recipient}
      Tone: ${input.tone}
      Key points: ${input.points.join(', ')}
      Length: ${input.length} sentences`,
  },
};
```

### Output Control
> See [references/details.md](references/details.md) for full code examples.

### Quality Control
| Technique | Purpose |
|-----------|---------|
| Examples in prompt | Guide output style |
| Output format spec | Consistent structure |
| Validation | Catch malformed responses |
| Retry logic | Handle failures |
| Fallback models | Reliability |

### Cost Management

Controlling AI API costs

**When to use**: When building profitable AI products

## AI Cost Management

### Token Economics
> See [references/details.md](references/details.md) for full code examples.

### Cost Reduction Strategies
| Strategy | Savings |
|----------|---------|
| Use cheaper models | 10-50x |
| Limit output tokens | Variable |
| Cache common queries | High |
| Batch similar requests | Medium |
| Truncate input | Variable |

### Usage Limits
```javascript
async function checkUsageLimits(userId) {
  const usage = await db.usage.sum({
    where: {
      userId,
      createdAt: { gte: startOfMonth() }
    }
  });

  const limits = await getUserLimits(userId);
  if (usage.cost >= limits.monthlyCost) {
    throw new Error('Monthly limit reached');
  }
  return true;
}
> See [references/details.md](references/details.md) for full code examples.
1. Vertical Focus
   Generic: "AI writing assistant"
   Specific: "AI for Amazon product descriptions"

2. Workflow Integration
   Standalone: Web app
   Integrated: Chrome extension, Slack bot

3. Domain Training
   Generic: Uses raw GPT
   Specialized: Fine-tuned or RAG-enhanced

4. Output Quality
   Basic: Raw AI output
   Polished: Post-processing, formatting, validation
// Per-user limits
const LIMITS = {
  free: { dailyCalls: 10, monthlyTokens: 50000 },
  pro: { dailyCalls: 100, monthlyTokens: 500000 },
};

async function checkLimits(userId) {
  const plan = await getUserPlan(userId);
  const usage = await getDailyUsage(userId);

  if (usage.calls >= LIMITS[plan].dailyCalls) {
    throw new Error('Daily limit reached');
  }
}
```

### Provider-Level Limits
```
OpenAI: Set usage limits in dashboard
Anthropic: Set spend limits
Add alerts at 50%, 80%, 100%
```

### Cost Monitoring
```javascript
// Alert on anomalies
async function checkCostAnomaly() {
  const todayCost = await getTodayCost();
  const avgCost = await getAverageDailyCost(30);

  if (todayCost > avgCost * 3) {
    await alertAdmin('Cost anomaly detected');
  }
}
```

### Emergency Shutoff
```javascript
// Kill switch
const MAX_DAILY_SPEND = 100; // $100

async function canMakeAPICall() {
  const todaySpend = await getTodaySpend();
  if (todaySpend >= MAX_DAILY_SPEND) {
    await disableAPI();
    await alertAdmin('Emergency shutoff triggered');
    return false;
  }
  return true;
}
> See [references/details.md](references/details.md) for full code examples.
async function callWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
}
```

### Request Queue
```javascript
import PQueue from 'p-queue';

// Limit concurrent requests
const queue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 10, // Max 10 per second
});

async function callAPI(prompt) {
  return queue.add(() => anthropic.messages.create({...}));
}
```

### User-Facing Handling
```javascript
try {
  const result = await callWithRetry(generateContent);
  return result;
} catch (err) {
  if (err.status === 429) {
    return {
      error: true,
      message: 'High demand - please try again in a moment',
      retryAfter: 30
    };
  }
  throw err;
}
> See [references/details.md](references/details.md) for full code examples.
function validateOutput(output, schema) {
  // Check required fields
  if (!output.title || !output.content) {
    throw new Error('Missing required fields');
  }

  // Check reasonable length
  if (output.content.length < 50 || output.content.length > 5000) {
    throw new Error('Content length out of range');
  }

  // Check for placeholder text
  const placeholders = ['[INSERT', 'PLACEHOLDER', 'YOUR NAME HERE'];
  if (placeholders.some(p => output.content.includes(p))) {
    throw new Error('Output contains placeholders');
  }

  return true;
}
```

### Domain-Specific Validation
```javascript
// For factual content
async function validateFacts(output) {
  // Check dates are reasonable
  const dates = extractDates(output);
  for (const date of dates) {
    if (date > new Date() || date < new Date('1900-01-01')) {
      return { valid: false, reason: 'Suspicious date' };
    }
  }

  // Check numbers are reasonable
  // ...
}
> See [references/details.md](references/details.md) for full code examples.
// Stream to user as AI generates
async function* streamResponse(prompt) {
  const stream = await anthropic.messages.stream({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      yield event.delta.text;
    }
  }
}

// Frontend
const response = await fetch('/api/generate', { method: 'POST' });
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  appendToOutput(new TextDecoder().decode(value));
}
```

### Caching
```javascript
async function generateWithCache(prompt) {
  const cacheKey = hashPrompt(prompt);
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const result = await generateContent(prompt);
  await cache.set(cacheKey, result, { ttl: 3600 });
  return result;
}
> See [references/details.md](references/details.md) for full code examples.
1. Define specific writing use case
2. Design prompt templates
3. Build UI with streaming
4. Add usage tracking and limits
5. Implement payments
6. Launch and iterate
```

### AI Browser Extension

Skills: ai-wrapper-product, browser-extension-builder

Workflow:

```
1. Define AI-powered feature
2. Build extension structure
3. Integrate AI API via backend
4. Add usage limits
5. Publish to Chrome Store
```

### AI Telegram Bot

Skills: ai-wrapper-product, telegram-bot-builder

Workflow:

```
1. Define bot personality/purpose
2. Build Telegram bot
3. Integrate AI for responses
4. Add monetization
5. Launch and grow
```

## Related Skills

Works well with: `llm-architect`, `micro-saas-launcher`, `frontend`, `backend`

## When to Use
- User mentions or implies: AI wrapper
- User mentions or implies: GPT product
- User mentions or implies: AI tool
- User mentions or implies: wrap AI
- User mentions or implies: AI SaaS
- User mentions or implies: Claude API product

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
