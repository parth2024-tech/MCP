# Agent Tool Builder — Extended Reference

for message in runner:
    print(message.content[0].text)

# Or just get final result
final = runner.until_done()
"""

## TypeScript with Zod
"""
import { Anthropic } from '@anthropic-ai/sdk';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

const anthropic = new Anthropic();

const getWeatherTool = betaZodTool({
  name: 'get_weather',
  description: 'Get the current weather in a given location',
  inputSchema: z.object({
    location: z.string().describe('City and state, e.g. San Francisco, CA'),
    unit: z.enum(['celsius', 'fahrenheit']).default('fahrenheit')
  }),
  run: async (input) => {
    // Type-safe input!
    return JSON.stringify({temperature: '72°F'});
  }
});

const runner = anthropic.beta.messages.toolRunner({
  model: 'claude-sonnet-4-5',
  max_tokens: 1024,
  tools: [getWeatherTool],
  messages: [{ role: 'user', content: "What's the weather in Paris?" }]
});

for await (const message of runner) {
  console.log(message.content[0].text);
}
"""

### Parallel Tool Execution

Running multiple tools simultaneously

**When to use**: Independent tool calls that can run in parallel

# PARALLEL TOOL EXECUTION:

"""
By default, Claude can call multiple tools in one response.
This dramatically reduces latency for independent operations.
"""

## Handling Parallel Results
"""
# Claude returns multiple tool_use blocks:
response.content = [
    {"type": "text", "text": "I'll check both locations..."},
    {"type": "tool_use", "id": "toolu_01", "name": "get_weather",
     "input": {"location": "San Francisco, CA"}},
    {"type": "tool_use", "id": "toolu_02", "name": "get_weather",
     "input": {"location": "New York, NY"}},
    {"type": "tool_use", "id": "toolu_03", "name": "get_time",
     "input": {"timezone": "America/Los_Angeles"}},
    {"type": "tool_use", "id": "toolu_04", "name": "get_time",
     "input": {"timezone": "America/New_York"}}
]

# Execute in parallel
import asyncio

async def execute_tools_parallel(tool_uses):
    tasks = [execute_tool(t) for t in tool_uses]
    return await asyncio.gather(*tasks)

results = await execute_tools_parallel(tool_uses)

# Return ALL results in SINGLE user message (critical!)
tool_results = [
    {"type": "tool_result", "tool_use_id": "toolu_01", "content": "72°F, Sunny"},
    {"type": "tool_result", "tool_use_id": "toolu_02", "content": "45°F, Cloudy"},
    {"type": "tool_result", "tool_use_id": "toolu_03", "content": "2:30 PM PST"},
    {"type": "tool_result", "tool_use_id": "toolu_04", "content": "5:30 PM EST"}
]

# CORRECT: All results in one message
messages.append({"role": "user", "content": tool_results})

# WRONG: Separate messages (breaks parallel execution pattern)
# messages.append({"role": "user", "content": [tool_results[0]]})
# messages.append({"role": "user", "content": [tool_results[1]]})
"""

## Encouraging Parallel Tool Use
"""
Add to system prompt:
"For maximum efficiency, whenever you need to perform multiple
independent operations, invoke all relevant tools simultaneously
rather than sequentially."
"""

## Disabling Parallel (When Needed)
"""
response = client.messages.create(
    model="claude-sonnet-4-5",
    tools=tools,
    tool_choice={"type": "auto", "disable_parallel_tool_use": True},
    messages=messages
)
"""

## Validation Checks

### Tool Description Must Be Comprehensive

Severity: WARNING

Tool descriptions should be at least 100 characters

Message: Tool description is too short. Add details about when to use it, parameters, and return values.

### Parameter Descriptions Required

Severity: WARNING

Every parameter should have a description

Message: Parameter missing description. Describe what it is and the expected format.

### Schema Should Specify Required Fields

Severity: INFO

Explicitly define which fields are required

Message: Schema doesn't specify required fields. Add 'required' array.

### Tool Implementation Needs Error Handling

Severity: ERROR

Tool functions should handle exceptions

Message: Tool function without try/except block. Add error handling.

### Error Results Need is_error Flag

Severity: WARNING

When returning errors, set is_error to true

Message: Error result without is_error flag. Add 'is_error': true.

### Tools Should Return Strings

Severity: WARNING

Return JSON string, not dict/object

Message: Returning dict instead of string. Use json.dumps() or JSON.stringify().

### Tools Should Validate Inputs

Severity: WARNING

Validate LLM-provided inputs before execution

Message: Tool function without visible input validation. Validate before execution.

### SQL Queries Must Use Parameterization

Severity: ERROR

Never concatenate user input into SQL

Message: SQL query appears to use string concatenation. Use parameterized queries.

### External Calls Need Timeouts

Severity: WARNING

HTTP requests and external calls should have timeouts

Message: External API call without timeout. Add timeout parameter.

### MCP Tools Must Have Input Schema

Severity: ERROR

All MCP tools require inputSchema

Message: MCP tool definition missing inputSchema.

## Collaboration

### Delegation Triggers

- user needs to coordinate multiple tools -> multi-agent-orchestration (Tool orchestration across agents)
- user needs persistent memory between tool calls -> agent-memory-systems (State management for tools)
- user building voice agent tools -> voice-agents (Audio/voice-specific tool requirements)
- user needs computer control tools -> computer-use-agents (Desktop automation tools)
- user wants to test their tools -> agent-evaluation (Tool testing and evaluation)

## Related Skills

Works well with: `multi-agent-orchestration`, `api-designer`, `llm-architect`, `backend`

## When to Use
- User mentions or implies: agent tool
- User mentions or implies: function calling
- User mentions or implies: tool schema
- User mentions or implies: tool design
- User mentions or implies: mcp server
- User mentions or implies: mcp tool
- User mentions or implies: tool use
- User mentions or implies: build tool for agent
- User mentions or implies: define function
- User mentions or implies: input_schema
- User mentions or implies: tool_use
- User mentions or implies: tool_result

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
