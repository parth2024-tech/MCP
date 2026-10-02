# Ai Wrapper Product — Code Reference

## ### Basic Implementation

```javascript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

async function generateContent(userInput, context) {
  // 1. Validate input
  if (!userInput || userInput.length > 5000) {
    throw new Error('Invalid input');
  }

  // 2. Build prompt
  const systemPrompt = `You are a ${context.role}.
    Always respond in ${context.format}.
    Tone: ${context.tone}`;

  // 3. Call API
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userInput
    }]
  });

  // 4. Parse and validate output
  const output = response.content[0].text;
  return parseOutput(output);
}
```


## ### Output Control

```javascript
// Force structured output
const systemPrompt = `
  Always respond with valid JSON in this format:
  {
    "title": "string",
    "content": "string",
    "suggestions": ["string"]
  }
  Never include any text outside the JSON.
`;

// Parse with fallback
function parseAIOutput(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON from response
    const match = text.match(/\{[/s/S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid AI output');
  }
}
```


## ### Token Economics

```javascript
// Track usage
async function callWithCostTracking(userId, prompt) {
  const response = await anthropic.messages.create({...});

  // Log usage
  await db.usage.create({
    userId,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cost: calculateCost(response.usage),
    model: 'claude-3-haiku',
  });

  return response;
}

function calculateCost(usage) {
  const rates = {
    'claude-3-haiku': { input: 0.25, output: 1.25 }, // per 1M tokens
  };
  const rate = rates['claude-3-haiku'];
  return (usage.input_tokens * rate.input +
          usage.output_tokens * rate.output) / 1_000_000;
}
```


## ### Usage Limits

```

### AI Product Differentiation

Standing out from other AI wrappers

**When to use**: When planning AI product strategy

## AI Product Differentiation

### What Makes AI Products Defensible
| Moat | Example |
|------|---------|
| Workflow integration | Email inside Gmail |
| Domain expertise | Legal AI with law training |
| Data/context | Company-specific knowledge |
| UX excellence | Perfectly designed for task |
| Distribution | Built-in audience |

### Differentiation Strategies
```


```

### Avoid "Thin Wrappers"
| Thin Wrapper | Real Product |
|--------------|--------------|
| ChatGPT with custom prompt | Domain-specific workflow tool |
| API passthrough | Processed, validated outputs |
| Single feature | Complete solution |
| No unique value | Solves specific pain point |

## Sharp Edges

### AI API costs spiral out of control

Severity: HIGH

Situation: Monthly AI bill is higher than revenue

Symptoms:
- Surprise API bills
- Costs > revenue
- Rapid usage spikes
- No visibility into costs

Why this breaks:
No usage tracking.
No user limits.
Using expensive models.
Abuse or bugs.

Recommended fix:

## Controlling AI Costs

### Set Hard Limits
```javascript


## ### Emergency Shutoff

```

### App breaks when hitting API rate limits

Severity: HIGH

Situation: API calls fail with 429 errors

Symptoms:
- 429 Too Many Requests errors
- Requests failing in bursts
- Users seeing errors
- Inconsistent behavior

Why this breaks:
No retry logic.
Not queuing requests.
Burst traffic not handled.
No backoff strategy.

Recommended fix:

## Handling Rate Limits

### Retry with Exponential Backoff
```javascript


## ### User-Facing Handling

```

### AI gives wrong or made-up information

Severity: HIGH

Situation: Users complain about incorrect outputs

Symptoms:
- Users report wrong information
- Made-up facts in outputs
- Outdated information
- Trust issues

Why this breaks:
No output validation.
Trusting AI blindly.
No fact-checking.
Wrong use case for AI.

Recommended fix:

## Handling Hallucinations

### Output Validation
```javascript


## ### Domain-Specific Validation

```

### Use Cases to Avoid
| Risky | Safer Alternative |
|-------|-------------------|
| Medical advice | Summarize, not diagnose |
| Legal advice | Draft, not advise |
| Current events | Use with data sources |
| Precise calculations | Validate or use code |

### User Expectations
- Disclaimer for generated content
- "AI-generated" labels
- Edit capability for users
- Feedback mechanism

### AI responses too slow for good UX

Severity: MEDIUM

Situation: Users complain about slow responses

Symptoms:
- Long wait times
- Users abandoning
- Timeout errors
- Poor perceived performance

Why this breaks:
Large prompts.
Expensive models.
No streaming.
No caching.

Recommended fix:

## Improving AI Latency

### Streaming Responses
```javascript


## ### Caching

```

### Use Faster Models
| Model | Typical Latency |
|-------|-----------------|
| GPT-4 | 5-15s |
| GPT-4o-mini | 1-3s |
| Claude 3 Haiku | 1-3s |
| Claude 3.5 Sonnet | 2-5s |

## Validation Checks

### AI API Key Exposed

Severity: HIGH

Message: AI API key may be exposed - security risk!

Fix action: Move API calls to backend, use environment variables

### No AI Usage Tracking

Severity: HIGH

Message: Not tracking AI usage - cost control issue.

Fix action: Log tokens and costs for every API call

### No AI Error Handling

Severity: HIGH

Message: AI errors not handled gracefully.

Fix action: Add try/catch, retry logic, and user-friendly error messages

### No AI Output Validation

Severity: MEDIUM

Message: Not validating AI outputs.

Fix action: Add output parsing, validation, and error handling

### No Response Streaming

Severity: LOW

Message: Not using streaming - could improve UX.

Fix action: Implement streaming for better perceived performance

## Collaboration

### Delegation Triggers

- prompt engineering|advanced LLM|fine-tuning -> llm-architect (Advanced AI patterns)
- SaaS|pricing|launch|business -> micro-saas-launcher (AI product business)
- frontend|UI|react -> frontend (AI product interface)
- backend|API|database -> backend (AI product backend)
- browser extension -> browser-extension-builder (AI browser extension)
- telegram bot -> telegram-bot-builder (AI telegram bot)

### AI Writing Tool

Skills: ai-wrapper-product, frontend, micro-saas-launcher

Workflow:

```


