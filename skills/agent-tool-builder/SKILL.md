---
name: agent-tool-builder
description: Tools are how AI agents interact with the world. A well-designed. Use when the task involves agent tool builder.
  tool is the difference between an agent that works and one that hallucinates,
  fails silently, or costs 10x more tokens than necessary. This skill covers
  tool design from schema to error handling.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Agent Tool Builder

Tools are how AI agents interact with the world. A well-designed tool is the
difference between an agent that works and one that hallucinates, fails
silently, or costs 10x more tokens than necessary.

This skill covers tool design from schema to error handling. JSON Schema
best practices, description writing that actually helps the LLM, validation,
and the emerging MCP standard that's becoming the lingua franca for AI tools.

Key insight: Tool descriptions are more important than tool implementations.
The LLM never sees your code - it only sees the schema and description.

## Principles

- Description quality > implementation quality for LLM accuracy
- Aim for fewer than 20 tools - more causes confusion
- Every tool needs explicit error handling - silent failures poison agents
- Return strings, not objects - LLMs process text
- Validation gates before execution - reject, fix, or escalate, never silent fail
- Test tools with the LLM, not just unit tests

## Capabilities

- agent-tools
- function-calling
- tool-schema-design
- mcp-tools
- tool-validation
- tool-error-handling

## Scope

- multi-agent-coordination → multi-agent-orchestration
- agent-memory → agent-memory-systems
- api-design → api-designer
- llm-prompting → prompt-engineering

## Tooling

### Standards

- JSON Schema - When: All tool definitions Note: The universal format for tool schemas
- MCP (Model Context Protocol) - When: Building reusable, cross-platform tools Note: Anthropic's open standard, widely adopted

### Frameworks

- Anthropic SDK - When: Claude-based agents Note: Beta tool runner handles most complexity
- OpenAI Functions - When: OpenAI-based agents Note: Use strict mode for guaranteed schema compliance
- Vercel AI SDK - When: Multi-provider tool handling Note: Abstracts differences between providers
- LangChain Tools - When: LangChain-based agents Note: Converts MCP tools to LangChain format

## Patterns

### Tool Schema Design

Creating clear, unambiguous JSON Schema for tools

**When to use**: Defining any new tool for an agent

# TOOL SCHEMA BEST PRACTICES:

## 1. Detailed Descriptions (Most Important)
"""
BAD - Too vague:
{
  "name": "get_stock_price",
  "description": "Gets stock price",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticker": {"type": "string"}
    }
  }
}

GOOD - Comprehensive:
{
  "name": "get_stock_price",
  "description": "Retrieves the current stock price for a given ticker
    symbol. The ticker symbol must be a valid symbol for a publicly
    traded company on a major US stock exchange like NYSE or NASDAQ.
    Returns the latest trade price in USD. Use when the user asks
    about current or recent stock prices. Does NOT provide historical
    data, company info, or predictions.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticker": {
        "type": "string",
        "description": "The stock ticker symbol, e.g. AAPL for Apple Inc."
      }
    },
    "required": ["ticker"]
  }
}
"""

## 2. Parameter Descriptions
"""
Every parameter needs:
- What it is
- Format expected
- Example value
- Edge cases/limitations

{
  "location": {
    "type": "string",
    "description": "City and state/country. Format: 'City, State' for US
      (e.g., 'San Francisco, CA') or 'City, Country' for international
      (e.g., 'Tokyo, Japan'). Do not use ZIP codes or coordinates."
  },
  "unit": {
    "type": "string",
    "enum": ["celsius", "fahrenheit"],
    "description": "Temperature unit. Defaults to user's locale if not
      specified. Use 'fahrenheit' for US users, 'celsius' for others."
  }
}
"""

## 3. Use Enums When Possible
"""
Enums constrain the LLM to valid values:

"priority": {
  "type": "string",
  "enum": ["low", "medium", "high", "critical"],
  "description": "Task priority level"
}

"action": {
  "type": "string",
  "enum": ["create", "read", "update", "delete"],
  "description": "The CRUD operation to perform"
}
"""

## 4. Required vs Optional
"""
Be explicit about what's required:

{
  "type": "object",
  "properties": {
    "query": {...},      // Required
    "limit": {...},      // Optional with default
    "offset": {...}      // Optional
  },
  "required": ["query"],
  "additionalProperties": false  // Strict mode
}
"""

### Tool with Input Examples

Using examples to guide LLM tool usage

**When to use**: Complex tools with nested objects or format-sensitive inputs

# TOOL USE EXAMPLES (Anthropic Beta Feature):

"""
Examples show Claude concrete patterns that schemas can't express.
Improves accuracy from 72% to 90% on complex operations.
"""

{
  "name": "create_calendar_event",
  "description": "Creates a calendar event with optional attendees and reminders",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string", "description": "Event title"},
      "start_time": {
        "type": "string",
        "description": "ISO 8601 datetime, e.g. 2024-03-15T14:00:00Z"
      },
      "duration_minutes": {"type": "integer", "description": "Event duration"},
      "attendees": {
        "type": "array",
        "items": {"type": "string"},
        "description": "Email addresses of attendees"
      }
    },
    "required": ["title", "start_time", "duration_minutes"]
  },
  "input_examples": [
    {
      "title": "Team Standup",
      "start_time": "2024-03-15T09:00:00Z",
      "duration_minutes": 30,
      "attendees": ["alice@company.com", "bob@company.com"]
    },
    {
      "title": "Quick Chat",
      "start_time": "2024-03-15T14:00:00Z",
      "duration_minutes": 15
    },
    {
      "title": "Project Review",
      "start_time": "2024-03-15T16:00:00-05:00",
      "duration_minutes": 60,
      "attendees": ["team@company.com"]
    }
  ]
}

# EXAMPLE DESIGN PRINCIPLES:
# - Use realistic data, not placeholders
# - Show minimal, partial, and full specification patterns
# - Keep concise: 1-5 examples per tool
# - Focus on ambiguous cases

### Tool Error Handling

Returning errors that help the LLM recover

**When to use**: Any tool that can fail

# ERROR HANDLING BEST PRACTICES:

## Return Informative Errors
"""
BAD:
{"error": "Failed"}
{"error": true}

GOOD:
{
  "error": true,
  "error_type": "not_found",
  "message": "Location 'Atlantis' not found in weather database.
    Please provide a real city name like 'San Francisco, CA'.",
  "suggestions": ["San Francisco, CA", "Los Angeles, CA"]
}
"""

## Anthropic Tool Result with Error
"""
{
  "type": "tool_result",
  "tool_use_id": "toolu_01A09q90qw90lq917835lq9",
  "content": "Error: Location 'Atlantis' not found in weather database.
    Please provide a real city name like 'San Francisco, CA'.",
  "is_error": true
}
"""

## Error Categories to Handle
"""
1. Input Validation Errors
   - Missing required parameters
   - Invalid format
   - Out of range values

2. External Service Errors
   - API unavailable
   - Rate limited
   - Timeout

3. Business Logic Errors
   - Resource not found
   - Permission denied
   - Conflict/duplicate

4. Internal Errors
   - Unexpected exceptions
   - Data corruption
"""

## Implementation Pattern
"""
from dataclasses import dataclass
from typing import Union

@dataclass
class ToolResult:
    success: bool
    content: str
    error_type: str = None
    suggestions: list[str] = None

    def to_response(self) -> dict:
        if self.success:
            return {"content": self.content}
        return {
            "content": f"Error ({self.error_type}): {self.content}",
            "is_error": True
        }

def get_weather(location: str) -> ToolResult:
    # Validate input
    if not location or len(location) < 2:
        return ToolResult(
            success=False,
            content="Location must be at least 2 characters",
            error_type="validation_error"
        )

    try:
        data = weather_api.fetch(location)
        return ToolResult(
            success=True,
            content=f"Temperature: {data.temp}°F, Conditions: {data.conditions}"
        )
    except LocationNotFound:
        return ToolResult(
            success=False,
            content=f"Location '{location}' not found",
            error_type="not_found",
            suggestions=weather_api.suggest_locations(location)
        )
    except RateLimitError:
        return ToolResult(
            success=False,
            content="Weather service rate limit exceeded. Try again in 60 seconds.",
            error_type="rate_limit"
        )
    except Exception as e:
        return ToolResult(
            success=False,
            content=f"Unexpected error: {str(e)}",
            error_type="internal_error"
        )
"""

### MCP Tool Pattern

Building tools using Model Context Protocol

**When to use**: Creating reusable, cross-platform tools

# MCP TOOL IMPLEMENTATION:

"""
MCP (Model Context Protocol) is Anthropic's open standard for
connecting AI agents to external systems. Build once, use everywhere.
"""

## Basic MCP Server (TypeScript)
"""
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "weather-server",
  version: "1.0.0"
});

// Define tools
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "get_weather",
      description: "Get current weather for a location. Returns
        temperature, conditions, and humidity. Use for weather
        queries about specific cities.",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City and state, e.g. 'San Francisco, CA'"
          },
          unit: {
            type: "string",
            enum: ["celsius", "fahrenheit"],
            default: "fahrenheit"
          }
        },
        required: ["location"]
      }
    }
  ]
}));

// Handle tool calls
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_weather") {
    try {
      const weather = await fetchWeather(args.location, args.unit);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(weather)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
"""

## MCP Benefits
"""
- Universal compatibility across LLM providers
- Reusable tool libraries
- Streaming and SSE transport support
- Built-in observability
- Tool access controls
"""

### Tool Runner Pattern

Using SDK tool runners for automatic handling

**When to use**: Building tool loops without manual management

# TOOL RUNNER (Anthropic SDK Beta):

"""
The tool runner handles the tool call loop automatically:
- Executes tools when Claude calls them
- Manages conversation state
- Handles error retries
- Provides streaming support
"""

## Python Example
"""
import anthropic
from anthropic import beta_tool

client = anthropic.Anthropic()

@beta_tool
def get_weather(location: str, unit: str = "fahrenheit") -> str:
    '''Get the current weather in a given location.

    Args:
        location: The city and state, e.g. San Francisco, CA
        unit: Temperature unit, either 'celsius' or 'fahrenheit'
    '''
    # Implementation
    return json.dumps({"temperature": "72°F", "conditions": "Sunny"})

@beta_tool
def search_web(query: str) -> str:
    '''Search the web for information.

    Args:
        query: The search query
    '''
    # Implementation
    return json.dumps({"results": [...]})

# Tool runner handles the loop
runner = client.beta.messages.tool_runner(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=[get_weather, search_web],
    messages=[
        {"role": "user", "content": "What's the weather in Paris?"}
    ]
)

# Process each message


> See [references/details.md](references/details.md) for extended content.
