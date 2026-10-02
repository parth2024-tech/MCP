---
name: computer-use-agents
description: Build AI agents that interact with computers like humans do -. Use when the task involves computer use agents.
  viewing screens, moving cursors, clicking buttons, and typing text. Covers
  Anthropic's Computer Use, OpenAI's Operator/CUA, and open-source alternatives.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Computer Use Agents

Build AI agents that interact with computers like humans do - viewing screens,
moving cursors, clicking buttons, and typing text. Covers Anthropic's Computer
Use, OpenAI's Operator/CUA, and open-source alternatives. Critical focus on
sandboxing, security, and handling the unique challenges of vision-based control.

## Patterns

### Perception-Reasoning-Action Loop

The fundamental architecture of computer use agents: observe screen,
reason about next action, execute action, repeat. This loop integrates
vision models with action execution through an iterative pipeline.

Key components:
1. PERCEPTION: Screenshot captures current screen state
2. REASONING: Vision-language model analyzes and plans
3. ACTION: Execute mouse/keyboard operations
4. FEEDBACK: Observe result, continue or correct

Critical insight: Vision agents are completely still during "thinking"
phase (1-5 seconds), creating a detectable pause pattern.

**When to use**: Building any computer use agent from scratch,Integrating vision models with desktop control,Understanding agent behavior patterns

from anthropic import Anthropic
from PIL import Image
import base64
import pyautogui
import time

class ComputerUseAgent:
    """
    Perception-Reasoning-Action loop implementation.
    Based on Anthropic Computer Use patterns.
    """

    def __init__(self, client: Anthropic, model: str = "claude-sonnet-4-20250514"):
        self.client = client
        self.model = model
        self.max_steps = 50  # Prevent runaway loops
        self.action_delay = 0.5  # Seconds between actions

    def capture_screenshot(self) -> str:
        """Capture screen and return base64 encoded image."""
        screenshot = pyautogui.screenshot()
        # Resize for token efficiency (1280x800 is good balance)
        screenshot = screenshot.resize((1280, 800), Image.LANCZOS)

        import io
        buffer = io.BytesIO()
        screenshot.save(buffer, format="PNG")
        return base64.b64encode(buffer.getvalue()).decode()

    def execute_action(self, action: dict) -> dict:
        """Execute mouse/keyboard action on the computer."""
        action_type = action.get("type")

        if action_type == "click":
            x, y = action["x"], action["y"]
            button = action.get("button", "left")
            pyautogui.click(x, y, button=button)
            return {"success": True, "action": f"clicked at ({x}, {y})"}

        elif action_type == "type":
            text = action["text"]
            pyautogui.typewrite(text, interval=0.02)
            return {"success": True, "action": f"typed {len(text)} chars"}

        elif action_type == "key":
            key = action["key"]
            pyautogui.press(key)
            return {"success": True, "action": f"pressed {key}"}

        elif action_type == "scroll":
            direction = action.get("direction", "down")
            amount = action.get("amount", 3)
            scroll = -amount if direction == "down" else amount
            pyautogui.scroll(scroll)
            return {"success": True, "action": f"scrolled {direction}"}

        elif action_type == "move":
            x, y = action["x"], action["y"]
            pyautogui.moveTo(x, y)
            return {"success": True, "action": f"moved to ({x}, {y})"}

        else:
            return {"success": False, "error": f"Unknown action: {action_type}"}

    def run(self, task: str) -> dict:
        """
        Run perception-reasoning-action loop until task complete.

        The loop:
        1. Screenshot current state
        2. Send to vision model with task context
        3. Parse action from response
        4. Execute action
        5. Repeat until done or max steps
        """
        messages = []
        step_count = 0

        system_prompt = """You are a computer use agent. You can see the screen
        and control mouse/keyboard.

        Available actions (respond with JSON):
        - {"type": "click", "x": 100, "y": 200, "button": "left"}
        - {"type": "type", "text": "hello world"}
        - {"type": "key", "key": "enter"}
        - {"type": "scroll", "direction": "down", "amount": 3}
        - {"type": "done", "result": "task completed successfully"}

        Always respond with ONLY a JSON action object.
        Be precise with coordinates - click exactly where needed.
        If you see an error, try to recover.
        """

        while step_count < self.max_steps:
            step_count += 1

            # 1. PERCEPTION: Capture current screen
            screenshot_b64 = self.capture_screenshot()

            # 2. REASONING: Send to vision model
            user_content = [
                {"type": "text", "text": f"Task: {task}/n/nStep {step_count}. What action should I take?"},
                {"type": "image", "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": screenshot_b64
                }}
            ]

            messages.append({"role": "user", "content": user_content})

            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages
            )

            assistant_message = response.content[0].text
            messages.append({"role": "assistant", "content": assistant_message})

            # 3. Parse action from response
            import json
            try:
                action = json.loads(assistant_message)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                match = re.search(r'\{[^}]+\}', assistant_message)
                if match:
                    action = json.loads(match.group())
                else:
                    continue

            # Check if done
            if action.get("type") == "done":
                return {
                    "success": True,
                    "result": action.get("result"),
                    "steps": step_count
                }

            # 4. ACTION: Execute
            result = self.execute_action(action)

            # Small delay for UI to update
            time.sleep(self.action_delay)

        return {
            "success": False,
            "error": "Max steps reached",
            "steps": step_count
        }

# Usage
agent = ComputerUseAgent(Anthropic())
result = agent.run("Open Chrome and search for 'weather today'")

### Anti_patterns

- Running without step limits (infinite loops)
- No delay between actions (UI can't keep up)
- Screenshots at full resolution (token explosion)
- Ignoring action failures (no recovery)

### Sandboxed Environment Pattern

Computer use agents MUST run in isolated, sandboxed environments.
Never give agents direct access to your main system - the security
risks are too high. Use Docker containers with virtual desktops.

Key isolation requirements:
1. NETWORK: Restrict to necessary endpoints only
2. FILESYSTEM: Read-only or scoped to temp directories
3. CREDENTIALS: No access to host credentials
4. SYSCALLS: Filter dangerous system calls
5. RESOURCES: Limit CPU, memory, time

The goal is "blast radius minimization" - if the agent goes wrong,
damage is contained to the sandbox.

**When to use**: Deploying any computer use agent,Testing agent behavior safely,Running untrusted automation tasks

# Dockerfile for sandboxed computer use environment
# Based on Anthropic's reference implementation pattern

FROM ubuntu:22.04

# Install desktop environment
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    xterm \
    firefox \
    python3 \
    python3-pip \
    supervisor

# Security: Create non-root user
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /home/agent/.vnc

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip3 install -r /tmp/requirements.txt

# Security: Drop capabilities
RUN apt-get install -y --no-install-recommends libcap2-bin && \
    setcap -r /usr/bin/python3 || true

# Copy agent code
COPY --chown=agent:agent . /app
WORKDIR /app

# Supervisor config for virtual display + VNC
COPY supervisord.conf /etc/supervisor/conf.d/

# Expose VNC port only (not desktop directly)
EXPOSE 5900

# Run as non-root
USER agent

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

---

# docker-compose.yml with security constraints
version: '3.8'

services:
  computer-use-agent:
    build: .
    ports:
      - "5900:5900"  # VNC for observation
      - "8080:8080"  # API for control

    # Security constraints
    security_opt:
      - no-new-privileges:true
      - seccomp:seccomp-profile.json

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G

    # Network isolation
    networks:
      - agent-network

    # No access to host filesystem
    volumes:
      - agent-tmp:/tmp

    # Read-only root filesystem
    read_only: true
    tmpfs:
      - /run
      - /var/run

    # Environment
    environment:
      - DISPLAY=:99
      - NO_PROXY=localhost

networks:
  agent-network:
    driver: bridge
    internal: true  # No internet by default

volumes:
  agent-tmp:

---

# Python wrapper with additional runtime sandboxing
import subprocess
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class SandboxConfig:
    """Configuration for agent sandbox."""
    network_allowed: list[str] = None  # Allowed domains
    max_runtime_seconds: int = 300
    max_memory_mb: int = 2048
    allow_downloads: bool = False
    allow_clipboard: bool = False

class SandboxedAgent:
    """
    Run computer use agent in Docker sandbox.
    """

    def __init__(self, config: SandboxConfig):
        self.config = config
        self.container_id: Optional[str] = None

    def start(self):
        """Start sandboxed environment."""
        # Build network rules
        network_rules = ""
        if self.config.network_allowed:
            for domain in self.config.network_allowed:
                network_rules += f"--add-host={domain}:$(dig +short {domain}) "
        else:
            network_rules = "--network=none"

        cmd = f"""
        docker run -d \
            --name computer-use-sandbox-$$ \
            --security-opt no-new-privileges \
            --cap-drop ALL \
            --memory {self.config.max_memory_mb}m \
            --cpus 2 \
            --read-only \
            --tmpfs /tmp \
            {network_rules} \
            computer-use-agent:latest
        """

        result = subprocess.run(cmd, shell=True, capture_output=True)
        self.container_id = result.stdout.decode().strip()

        # Set up kill timer
        subprocess.Popen([
            "sh", "-c",
            f"sleep {self.config.max_runtime_seconds} && docker kill {self.container_id}"
        ])

        return self.container_id

    def execute_task(self, task: str) -> dict:
        """Execute task in sandbox."""
        if not self.container_id:
            self.start()

        # Send task to agent via API
        import requests
        response = requests.post(
            f"http://localhost:8080/task",
            json={"task": task},
            timeout=self.config.max_runtime_seconds
        )

        return response.json()

    def stop(self):
        """Stop and remove sandbox."""
        if self.container_id:
            subprocess.run(f"docker rm -f {self.container_id}", shell=True)
            self.container_id = None

### Anti_patterns

- Running agents on host system directly
- Giving sandbox full network access
- Running as root in container
- No resource limits (denial of service)
- Persistent storage (data can leak between runs)

### Anthropic Computer Use Implementation

Official implementation pattern using Claude's computer use capability.
Claude 3.5 Sonnet was the first frontier model to offer computer use.
Claude Opus 4.5 is now the "best model in the world for computer use."

Key capabilities:
- screenshot: Capture current screen state
- mouse: Click, move, drag operations
- keyboard: Type text, press keys
- bash: Run shell commands
- text_editor: View and edit files

Tool versions:
- computer_20251124 (Opus 4.5): Adds zoom action for detailed inspection
- computer_20250124 (All other models): Standard capabilities

Critical limitation: "Some UI elements (like dropdowns and scrollbars)
might be tricky for Claude to manipulate" - Anthropic docs

**When to use**: Building production computer use agents,Need highest quality vision understanding,Full desktop control (not just browser)

from anthropic import Anthropic
from anthropic.types.beta import (
    BetaToolComputerUse20241022,
    BetaToolBash20241022,
    BetaToolTextEditor20241022,
)
import subprocess
import base64
from PIL import Image
import io

class AnthropicComputerUse:
    """
    Official Anthropic Computer Use implementation.

    Requires:
    - Docker container with virtual display
    - VNC for viewing agent actions
    - Proper tool implementations
    """

    def __init__(self):
        self.client = Anthropic()
        self.model = "claude-sonnet-4-20250514"  # Best for computer use
        self.screen_size = (1280, 800)

    def get_tools(self) -> list:
        """Define computer use tools."""
        return [
            BetaToolComputerUse20241022(
                type="computer_20241022",
                name="computer",
                display_width_px=self.screen_size[0],
                display_height_px=self.screen_size[1],
            ),
            BetaToolBash20241022(
                type="bash_20241022",
                name="bash",
            ),
            BetaToolTextEditor20241022(
                type="text_editor_20241022",
                name="str_replace_editor",
            ),
        ]

    def execute_tool(self, name: str, input: dict) -> dict:
        """Execute a tool and return result."""

        if name == "computer":
            return self._handle_computer_action(input)
        elif name == "bash":
            return self._handle_bash(input)
        elif name == "str_replace_editor":
            return self._handle_editor(input)
        else:
            return {"error": f"Unknown tool: {name}"}

    def _handle_computer_action(self, input: dict) -> dict:
        """Handle computer control actions."""
        action = input.get("action")

        if action == "screenshot":
            # Capture via xdotool/scrot
            subprocess.run(["scrot", "/tmp/screenshot.png"])

            with open("/tmp/screenshot.png", "rb") as f:
                img_data = f.read()


> See [references/details.md](references/details.md) for additional content.
