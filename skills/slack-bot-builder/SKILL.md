---
name: slack-bot-builder
description: Build Slack apps using the Bolt framework across Python,. Use when the task involves slack bot builder.
  JavaScript, and Java. Covers Block Kit for rich UIs, interactive components,
  slash commands, event handling, OAuth installation flows, and Workflow Builder
  integration.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Slack Bot Builder

Build Slack apps using the Bolt framework across Python, JavaScript, and Java.
Covers Block Kit for rich UIs, interactive components, slash commands,
event handling, OAuth installation flows, and Workflow Builder integration.
Focus on best practices for production-ready Slack apps.

## Patterns

### Bolt App Foundation Pattern

The Bolt framework is Slack's recommended approach for building apps.
It handles authentication, event routing, request verification, and
HTTP request processing so you can focus on app logic.

Key benefits:
- Event handling in a few lines of code
- Security checks and payload validation built-in
- Organized, consistent patterns
- Works for experiments and production

Available in: Python, JavaScript (Node.js), Java

**When to use**: Starting any new Slack app,Migrating from legacy Slack APIs,Building production Slack integrations

# Python Bolt App
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
import os

# Initialize with tokens from environment
app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"]
)

# Handle messages containing "hello"
@app.message("hello")
def handle_hello(message, say):
    """Respond to messages containing 'hello'."""
    user = message["user"]
    say(f"Hey there <@{user}>!")

# Handle slash command
@app.command("/ticket")
def handle_ticket_command(ack, body, client):
    """Handle /ticket slash command."""
    # Acknowledge immediately (within 3 seconds)
    ack()

    # Open a modal for ticket creation
    client.views_open(
        trigger_id=body["trigger_id"],
        view={
            "type": "modal",
            "callback_id": "ticket_modal",
            "title": {"type": "plain_text", "text": "Create Ticket"},
            "submit": {"type": "plain_text", "text": "Submit"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "title_block",
                    "element": {
                        "type": "plain_text_input",
                        "action_id": "title_input"
                    },
                    "label": {"type": "plain_text", "text": "Title"}
                },
                {
                    "type": "input",
                    "block_id": "desc_block",
                    "element": {
                        "type": "plain_text_input",
                        "multiline": True,
                        "action_id": "desc_input"
                    },
                    "label": {"type": "plain_text", "text": "Description"}
                },
                {
                    "type": "input",
                    "block_id": "priority_block",
                    "element": {
                        "type": "static_select",
                        "action_id": "priority_select",
                        "options": [
                            {"text": {"type": "plain_text", "text": "Low"}, "value": "low"},
                            {"text": {"type": "plain_text", "text": "Medium"}, "value": "medium"},
                            {"text": {"type": "plain_text", "text": "High"}, "value": "high"}
                        ]
                    },
                    "label": {"type": "plain_text", "text": "Priority"}
                }
            ]
        }
    )

# Handle modal submission
@app.view("ticket_modal")
def handle_ticket_submission(ack, body, client, view):
    """Handle ticket modal submission."""
    ack()

    # Extract values from the view
    values = view["state"]["values"]
    title = values["title_block"]["title_input"]["value"]
    desc = values["desc_block"]["desc_input"]["value"]
    priority = values["priority_block"]["priority_select"]["selected_option"]["value"]
    user_id = body["user"]["id"]

    # Create ticket in your system
    ticket_id = create_ticket(title, desc, priority, user_id)

    # Notify user
    client.chat_postMessage(
        channel=user_id,
        text=f"Ticket #{ticket_id} created: {title}"
    )

# Handle button clicks
@app.action("approve_button")
def handle_approval(ack, body, client):
    """Handle approval button click."""
    ack()

    # Get context from the action
    user = body["user"]["id"]
    action_value = body["actions"][0]["value"]

    # Update the message to remove interactive elements
    # (Best practice: prevent double-clicks)
    client.chat_update(
        channel=body["channel"]["id"],
        ts=body["message"]["ts"],
        text=f"Approved by <@{user}>",
        blocks=[]  # Remove interactive blocks
    )

# Listen for app_home_opened events
@app.event("app_home_opened")
def update_home_tab(client, event):
    """Update the Home tab when user opens it."""
    client.views_publish(
        user_id=event["user"],
        view={
            "type": "home",
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "*Welcome to the Ticket Bot!*"
                    }
                },
                {
                    "type": "actions",
                    "elements": [
                        {
                            "type": "button",
                            "text": {"type": "plain_text", "text": "Create Ticket"},
                            "action_id": "create_ticket_button"
                        }
                    ]
                }
            ]
        }
    )

# Socket Mode for development (no public URL needed)
if __name__ == "__main__":
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()

# For production, use HTTP mode with a web server
# from flask import Flask, request
# from slack_bolt.adapter.flask import SlackRequestHandler
#
# flask_app = Flask(__name__)
# handler = SlackRequestHandler(app)
#
# @flask_app.route("/slack/events", methods=["POST"])
# def slack_events():
#     return handler.handle(request)

### Anti_patterns

- Not acknowledging requests within 3 seconds
- Blocking operations in the ack handler
- Hardcoding tokens in source code
- Not using Socket Mode for development

### Block Kit UI Pattern

Block Kit is Slack's UI framework for building rich, interactive messages.
Compose messages using blocks (sections, actions, inputs) and elements
(buttons, menus, text inputs).

Limits:
- Up to 50 blocks per message
- Up to 100 blocks in modals/Home tabs
- Block text limited to 3000 characters

Use Block Kit Builder to prototype: https://app.slack.com/block-kit-builder

**When to use**: Building rich message layouts,Adding interactive components to messages,Creating forms in modals,Building Home tab experiences

from slack_bolt import App
import os

app = App(token=os.environ["SLACK_BOT_TOKEN"])

def build_notification_blocks(incident: dict) -> list:
    """Build Block Kit blocks for incident notification."""
    severity_emoji = {
        "critical": ":red_circle:",
        "high": ":large_orange_circle:",
        "medium": ":large_yellow_circle:",
        "low": ":white_circle:"
    }

    return [
        # Header
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{severity_emoji.get(incident['severity'], '')} Incident Alert"
            }
        },
        # Details section
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Incident:*/n{incident['title']}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Severity:*/n{incident['severity'].upper()}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Service:*/n{incident['service']}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Reported:*/n<!date^{incident['timestamp']}^{date_short} {time}|{incident['timestamp']}>"
                }
            ]
        },
        # Description
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Description:*/n{incident['description'][:2000]}"
            }
        },
        # Divider
        {"type": "divider"},
        # Action buttons
        {
            "type": "actions",
            "block_id": f"incident_actions_{incident['id']}",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Acknowledge"},
                    "style": "primary",
                    "action_id": "acknowledge_incident",
                    "value": incident['id']
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "Resolve"},
                    "style": "danger",
                    "action_id": "resolve_incident",
                    "value": incident['id'],
                    "confirm": {
                        "title": {"type": "plain_text", "text": "Resolve Incident?"},
                        "text": {"type": "mrkdwn", "text": "Are you sure this incident is resolved?"},
                        "confirm": {"type": "plain_text", "text": "Yes, Resolve"},
                        "deny": {"type": "plain_text", "text": "Cancel"}
                    }
                },
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "View Details"},
                    "action_id": "view_incident",
                    "value": incident['id'],
                    "url": f"https://incidents.example.com/{incident['id']}"
                }
            ]
        },
        # Context footer
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Incident ID: {incident['id']} | <https://runbook.example.com/{incident['service']}|View Runbook>"
                }
            ]
        }
    ]

def send_incident_notification(channel: str, incident: dict):
    """Send incident notification with Block Kit."""
    blocks = build_notification_blocks(incident)

    app.client.chat_postMessage(
        channel=channel,
        text=f"Incident: {incident['title']}",  # Fallback for notifications
        blocks=blocks
    )

# Handle button actions
@app.action("acknowledge_incident")
def handle_acknowledge(ack, body, client):
    """Handle incident acknowledgment."""
    ack()

    incident_id = body["actions"][0]["value"]
    user = body["user"]["id"]

    # Update your system
    acknowledge_incident(incident_id, user)

    # Update message to show acknowledgment
    original_blocks = body["message"]["blocks"]

    # Add acknowledgment to context
    original_blocks[-1]["elements"].append({
        "type": "mrkdwn",
        "text": f":white_check_mark: Acknowledged by <@{user}>"
    })

    # Remove acknowledge button (prevent double-click)
    action_block = next(b for b in original_blocks if b.get("block_id", "").startswith("incident_actions"))
    action_block["elements"] = [e for e in action_block["elements"] if e["action_id"] != "acknowledge_incident"]

    client.chat_update(
        channel=body["channel"]["id"],
        ts=body["message"]["ts"],
        blocks=original_blocks
    )

# Interactive select menus
def build_user_selector_blocks():
    """Build blocks with user selector."""
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": "Assign this task:"},
            "accessory": {
                "type": "users_select",
                "action_id": "assign_user",
                "placeholder": {"type": "plain_text", "text": "Select assignee"}
            }
        }
    ]

# Overflow menu for more options
def build_task_blocks(task: dict):
    """Build task blocks with overflow menu."""
    return [
        {
            "type": "section",
            "text": {"type": "mrkdwn", "text": f"*{task['title']}*"},
            "accessory": {
                "type": "overflow",
                "action_id": "task_overflow",
                "options": [
                    {
                        "text": {"type": "plain_text", "text": "Edit"},
                        "value": f"edit_{task['id']}"
                    },
                    {
                        "text": {"type": "plain_text", "text": "Delete"},
                        "value": f"delete_{task['id']}"
                    },
                    {
                        "text": {"type": "plain_text", "text": "Share"},
                        "value": f"share_{task['id']}"
                    }
                ]
            }
        }
    ]

### Anti_patterns

- Exceeding 50 blocks per message
- Not providing fallback text for accessibility
- Hardcoding action_ids (use dynamic IDs when needed)
- Not handling button clicks idempotently

### OAuth Installation Pattern

Enable users to install your app in their workspaces via OAuth 2.0.
Bolt handles most of the OAuth flow, but you need to configure it
and store tokens securely.

Key OAuth concepts:
- Scopes define permissions (request minimum needed)
- Tokens are workspace-specific
- Installation data must be stored persistently
- Users can add scopes later (additive)

70% of users abandon installation when confronted with excessive
permission requests - request only what you need!

**When to use**: Distributing app to multiple workspaces,Building public Slack apps,Enterprise-grade integrations

from slack_bolt import App
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_sdk.oauth.installation_store import FileInstallationStore
from slack_sdk.oauth.state_store import FileOAuthStateStore
import os

# For production, use database-backed stores
# For example: PostgreSQL, MongoDB, Redis

class DatabaseInstallationStore:
    """Store installation data in your database."""

    async def save(self, installation):
        """Save installation when user completes OAuth."""
        await db.installations.upsert({
            "team_id": installation.team_id,
            "enterprise_id": installation.enterprise_id,
            "bot_token": encrypt(installation.bot_token),
            "bot_user_id": installation.bot_user_id,
            "bot_scopes": installation.bot_scopes,
            "user_id": installation.user_id,
            "installed_at": installation.installed_at
        })

    async def find_installation(self, *, enterprise_id, team_id, user_id=None, is_enterprise_install=False):
        """Find installation for a workspace."""
        record = await db.installations.find_one({
            "team_id": team_id,
            "enterprise_id": enterprise_id
        })

        if record:
            return Installation(
                bot_token=decrypt(record["bot_token"]),
                # ... other fields
            )
        return None

# Initialize OAuth-enabled app
app = App(
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
    oauth_settings=OAuthSettings(
        client_id=os.environ["SLACK_CLIENT_ID"],
        client_secret=os.environ["SLACK_CLIENT_SECRET"],
        scopes=[
            "channels:history",
            "channels:read",
            "chat:write",
            "commands",
            "users:read"
        ],
        user_scopes=[],  # User token scopes if needed
        installation_store=DatabaseInstallationStore(),
        state_store=FileOAuthStateStore(expiration_seconds=600)
    )
)

# OAuth routes are handled automatically by Bolt
# /slack/install - Initiates OAuth flow
# /slack/oauth_redirect - Handles callback

# Flask integration
from flask import Flask, request
from slack_bolt.adapter.flask import SlackRequestHandler

flask_app = Flask(__name__)
handler = SlackRequestHandler(app)

@flask_app.route("/slack/install", methods=["GET"])
def install():

> See [references/details.md](references/details.md) for additional content.
