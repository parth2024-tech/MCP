# Autonomous Agents — Extended Reference

result = agent.invoke({"goal": goal}, config)

# Human reviews state
state = agent.get_state(config)
if human_approves(state):
    # Continue from pause point
    agent.invoke(None, config)
else:
    # Modify state and continue
    agent.update_state(config, {"approved": False})
    agent.invoke(None, config)
"""

## Time-Travel Debugging
"""
# LangGraph stores full history
history = list(agent.get_state_history(config))

# Go back to any previous state
past_state = history[5]
agent.update_state(config, past_state.values)

# Replay from that point with modifications
agent.invoke(None, config)
"""

## Sharp Edges

### Error Probability Compounds Exponentially

Severity: CRITICAL

Situation: Building multi-step autonomous agents

Symptoms:
Agent works in demos but fails in production. Simple tasks succeed,
complex tasks fail mysteriously. Success rate drops dramatically
as task complexity increases. Users lose trust.

Why this breaks:
Each step has independent failure probability. A 95% success rate
per step sounds great until you realize:
- 5 steps: 77% success (0.95^5)
- 10 steps: 60% success (0.95^10)
- 20 steps: 36% success (0.95^20)

This is the fundamental limit of autonomous agents. Every additional
step multiplies failure probability.

Recommended fix:

## Reduce step count
# Combine steps where possible
# Prefer fewer, more capable steps over many small ones

## Increase per-step reliability
# Use structured outputs (JSON schemas)
# Add validation at each step
# Use better models for critical steps

## Design for failure
class RobustAgent:
    def execute_with_retry(self, step, max_retries=3):
        for attempt in range(max_retries):
            try:
                result = step.execute()
                if self.validate(result):
                    return result
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                self.log_retry(step, attempt, e)

## Break into checkpointed segments
# Human review at each segment
# Resume from last good checkpoint

### API Costs Explode with Context Growth

Severity: CRITICAL

Situation: Running agents with growing conversation context

Symptoms:
$47 to close a single support ticket. Thousands in surprise API bills.
Agents getting slower as they run longer. Token counts exceeding
model limits.

Why this breaks:
Transformer costs scale quadratically with context length. Double
the context, quadruple the compute. A long-running agent that
re-sends its full conversation each turn can burn money exponentially.

Most agents append to context without trimming. Context grows:
- Turn 1: 500 tokens → $0.01
- Turn 10: 5000 tokens → $0.10
- Turn 50: 25000 tokens → $0.50
- Turn 100: 50000 tokens → $1.00+ per message

Recommended fix:

## Set hard cost limits
class CostLimitedAgent:
    MAX_COST_PER_TASK = 1.00  # USD

    def __init__(self):
        self.total_cost = 0

    def before_call(self, estimated_tokens):
        estimated_cost = self.estimate_cost(estimated_tokens)
        if self.total_cost + estimated_cost > self.MAX_COST_PER_TASK:
            raise CostLimitExceeded(
                f"Would exceed ${self.MAX_COST_PER_TASK} limit"
            )

    def after_call(self, response):
        self.total_cost += self.calculate_actual_cost(response)

## Trim context aggressively
def trim_context(messages, max_tokens=4000):
    # Keep: system prompt + last N messages
    # Summarize: everything in between
    if count_tokens(messages) <= max_tokens:
        return messages

    system = messages[0]
    recent = messages[-5:]
    middle = messages[1:-5]

    if middle:
        summary = summarize(middle)  # Compress history
        return [system, summary] + recent

    return [system] + recent

## Use streaming to track costs in real-time
## Alert at 50% of budget, halt at 90%

### Demo Works But Production Fails

Severity: CRITICAL

Situation: Moving from prototype to production

Symptoms:
Impressive demo to stakeholders. Months of failure in production.
Works for the founder's use case, fails for real users. Edge cases
overwhelm the system.

Why this breaks:
Demos show the happy path with curated inputs. Production means:
- Unexpected inputs (typos, ambiguity, adversarial)
- Scale (1000 users, not 3)
- Reliability (99.9% uptime, not "usually works")
- Edge cases (the 1% that breaks everything)

The methodology is questionable, but the core problem is real.
The gap between a working demo and a reliable production system
is where projects die.

Recommended fix:

## Test at scale before production
# Run 1000+ test cases, not 10
# Measure P95/P99 success rate, not average
# Include adversarial inputs

## Build observability first
import structlog
logger = structlog.get_logger()

class ObservableAgent:
    def execute(self, task):
        with logger.bind(task_id=task.id):
            logger.info("task_started")
            try:
                result = self._execute(task)
                logger.info("task_completed", result=result)
                return result
            except Exception as e:
                logger.error("task_failed", error=str(e))
                raise

## Have escape hatches
# Human takeover when confidence < threshold
# Graceful degradation to simpler behavior
# "I don't know" is a valid response

## Deploy incrementally
# 1% of traffic, then 10%, then 50%
# Monitor error rates at each stage

### Agent Fabricates Data When Stuck

Severity: HIGH

Situation: Agent can't complete task with available information

Symptoms:
Agent invents plausible-looking data. Fake restaurant names on expense
reports. Made-up statistics in reports. Confident answers that are
completely wrong.

Why this breaks:
LLMs are trained to be helpful and produce plausible outputs. When
stuck, they don't say "I can't do this" - they fabricate. Autonomous
agents compound this by acting on fabricated data without human review.

The agent that fabricated expense entries was trying to meet its goal
(complete the expense report). It "solved" the problem by inventing data.

Recommended fix:

## Validate against ground truth
def validate_expense(expense):
    # Cross-check with external sources
    if expense.restaurant:
        if not verify_restaurant_exists(expense.restaurant):
            raise ValidationError("Restaurant not found")

    # Check for suspicious patterns
    if expense.amount == round(expense.amount, -1):
        flag_for_review("Suspiciously round amount")

## Require evidence
system_prompt = '''
For every factual claim, cite the specific tool output that
supports it. If you cannot find supporting evidence, say
"I could not verify this" rather than guessing.
'''

## Use structured outputs
from pydantic import BaseModel

class VerifiedClaim(BaseModel):
    claim: str
    source: str  # Must reference tool output
    confidence: float

## Detect uncertainty
# Train to output confidence scores
# Flag low-confidence outputs for human review
# Never auto-execute on uncertain data

### Integration Is Where Agents Die

Severity: HIGH

Situation: Connecting agent to external systems

Symptoms:
Works with mock APIs, fails with real ones. Rate limits cause crashes.
Auth tokens expire mid-task. Data format mismatches. Partial failures
leave systems in inconsistent state.

Why this breaks:
The companies promising "autonomous agents that integrate with your
entire tech stack" haven't built production systems at scale.
Real integrations have:
- Rate limits (429 errors mid-task)
- Auth complexity (OAuth refresh, token expiry)
- Data format variations (API v1 vs v2)
- Partial failures (webhook received, processing failed)
- Eventual consistency (data not immediately available)

Recommended fix:

## Build robust API clients
from tenacity import retry, stop_after_attempt, wait_exponential

class RobustAPIClient:
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60)
    )
    async def call(self, endpoint, data):
        response = await self.client.post(endpoint, json=data)
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After", 60)
            await asyncio.sleep(int(retry_after))
            raise RateLimitError()
        return response

## Handle auth lifecycle
class TokenManager:
    def __init__(self):
        self.token = None
        self.expires_at = None

    async def get_token(self):
        if self.is_expired():
            self.token = await self.refresh_token()
        return self.token

    def is_expired(self):
        buffer = timedelta(minutes=5)  # Refresh early
        return datetime.now() > (self.expires_at - buffer)

## Use idempotency keys
# Every external action should be idempotent
# If agent retries, external system handles duplicate

## Design for partial failure
# Each step is independently recoverable
# Checkpoint before external calls
# Rollback capability for each integration

### Agent Takes Dangerous Actions

Severity: HIGH

Situation: Agent with broad permissions

Symptoms:
Agent deletes production data. Sends emails to wrong recipients.
Makes purchases without approval. Modifies settings it shouldn't.
Actions that can't be undone.

Why this breaks:
Agents optimize for their goal. Without guardrails, they'll take the
shortest path - even if that path is destructive. An agent told to
"clean up the database" might interpret that as "delete everything."

Broad permissions + autonomy + goal optimization = danger.

Recommended fix:

### Least privilege principle
PERMISSIONS = {
    "research_agent": ["read_web", "read_docs"],
    "code_agent": ["read_file", "write_file", "run_tests"],
    "email_agent": ["read_email", "draft_email"],  # NOT send
    "admin_agent": ["all"],  # Rarely used
}

## Separate read/write permissions
# Agent can read anything
# Write requires explicit approval

## Dangerous actions require confirmation
DANGEROUS_ACTIONS = [
    "delete_*",
    "send_email",
    "transfer_money",
    "modify_production",
    "revoke_access",
]

async def execute_action(action):
    if matches_dangerous_pattern(action):
        approval = await request_human_approval(action)
        if not approval:
            return ActionRejected(action)
    return await actually_execute(action)

## Dry-run mode for testing
# Agent describes what it would do
# Human approves the plan
# Then agent executes

## Audit logging for everything
# Every action logged with context
# Who authorized it
# What changed
# How to reverse it

### Agent Runs Out of Context Window

Severity: MEDIUM

Situation: Long-running agent tasks

Symptoms:
Agent forgets earlier instructions. Contradicts itself. Loses track
of the goal. Starts repeating itself. Model errors about token limits.

Why this breaks:
Every message, observation, and thought consumes context. Long tasks
exhaust the window. When context is truncated:
- System prompt gets dropped
- Early important context lost
- Agent loses coherence

Recommended fix:

## Track context usage
class ContextManager:
    def __init__(self, max_tokens=100000):
        self.max_tokens = max_tokens
        self.messages = []

    def add(self, message):
        self.messages.append(message)
        self.maybe_compact()

    def maybe_compact(self):
        if self.token_count() > self.max_tokens * 0.8:
            self.compact()

    def compact(self):
        # Always keep: system prompt
        system = self.messages[0]

        # Always keep: last N messages
        recent = self.messages[-10:]

        # Summarize: everything else
        middle = self.messages[1:-10]
        if middle:
            summary = summarize_messages(middle)
            self.messages = [system, summary] + recent

## Use external memory
# Don't keep everything in context
# Store in vector DB, retrieve when needed
# See agent-memory-systems skill

## Hierarchical summarization
# Recent: full detail
# Medium: key points
# Old: compressed summary

### Can't Debug What You Can't See

Severity: MEDIUM

Situation: Agent fails mysteriously

Symptoms:
"It just didn't work." No idea why agent failed. Can't reproduce
issues. Users report problems you can't explain. Debugging is
guesswork.

Why this breaks:
Agents make dozens of internal decisions. Without visibility into
each step, you're blind to failure modes. Production debugging
without traces is impossible.

Recommended fix:

## Structured logging
import structlog

logger = structlog.get_logger()

class TracedAgent:
    def think(self, context):
        with logger.bind(step="think"):
            thought = self.llm.generate(context)
            logger.info("thought_generated",
                thought=thought,
                tokens=count_tokens(thought)
            )
            return thought

    def act(self, action):
        with logger.bind(step="act", action=action.name):
            logger.info("action_started")
            try:
                result = action.execute()
                logger.info("action_completed", result=result)
                return result
            except Exception as e:
                logger.error("action_failed", error=str(e))
                raise

## Use LangSmith or similar
from langsmith import trace

@trace
def agent_step(state):
    # Automatically traced with inputs/outputs
    return next_state

## Save full traces
# Every step, every decision
# Inputs and outputs
# Latency at each step
# Token usage

## Validation Checks

### Agent Loop Without Step Limit

Severity: ERROR

Autonomous agents must have maximum step limits

Message: Agent loop without step limit. Add max_steps to prevent infinite loops.

### No Cost Tracking or Limits

Severity: ERROR

Agents should track and limit API costs

Message: Agent uses LLM without cost tracking. Add cost limits to prevent runaway spending.

### Agent Without Timeout

Severity: WARNING

Long-running agents need timeouts

Message: Agent invocation without timeout. Add timeout to prevent hung tasks.

### MemorySaver Used in Production

Severity: ERROR

MemorySaver is for development only

Message: MemorySaver is not persistent. Use PostgresSaver or SqliteSaver for production.

### Long-Running Agent Without Checkpointing

Severity: WARNING

Agents that run multiple steps need checkpointing

Message: Multi-step agent without checkpointing. Add checkpointer for durability.

### Agent Without Thread ID

Severity: WARNING

Checkpointed agents need unique thread IDs

Message: Agent invocation without thread_id. State won't persist correctly.

### Using Agent Output Without Validation

Severity: WARNING

Agent outputs should be validated before use

Message: Agent output used without validation. Validate before acting on results.

### Agent Without Structured Output

Severity: INFO

Structured outputs are more reliable

Message: Consider using structured outputs (Pydantic) for more reliable parsing.

### Agent Without Error Recovery

Severity: WARNING

Agents should handle and recover from errors

Message: Agent call without error handling. Add try/catch or error handler.

### Destructive Actions Without Rollback

Severity: WARNING

Actions that modify state should be reversible

Message: Destructive action without rollback capability. Save state before modification.

## Collaboration

### Delegation Triggers

- user needs multi-agent coordination -> multi-agent-orchestration (Multiple agents working together)
- user needs to test/evaluate agent -> agent-evaluation (Benchmarking and testing)
- user needs tools for agent -> agent-tool-builder (Tool design and implementation)
- user needs persistent memory -> agent-memory-systems (Long-term memory architecture)
- user needs workflow automation -> workflow-automation (When agent is overkill for the task)
- user needs computer control -> computer-use-agents (GUI automation, screen interaction)

## Related Skills

Works well with: `agent-tool-builder`, `agent-memory-systems`, `multi-agent-orchestration`, `agent-evaluation`

## When to Use
- User mentions or implies: autonomous agent
- User mentions or implies: autogpt
- User mentions or implies: babyagi
- User mentions or implies: self-prompting
- User mentions or implies: goal decomposition
- User mentions or implies: react pattern
- User mentions or implies: agent loop
- User mentions or implies: self-correcting agent
- User mentions or implies: reflection agent
- User mentions or implies: langgraph
- User mentions or implies: agentic ai
- User mentions or implies: agent planning

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
