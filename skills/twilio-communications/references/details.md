# Twilio Communications — Code Reference

## ## Track opt-out status in your database

```python
# In your webhook handler
@app.route("/webhooks/sms/incoming", methods=["POST"])
def incoming_sms():
    from_number = request.form.get("From")
    body = request.form.get("Body", "").strip().upper()

    # Standard opt-out keywords
    if body in ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]:
        mark_user_opted_out(from_number)
        return "", 200

    # Standard opt-in keywords
    if body in ["START", "SUBSCRIBE", "YES", "UNSTOP"]:
        mark_user_opted_in(from_number)
        return "", 200

    # Process other messages...

# Before sending
def send_sms_safe(to: str, body: str):
    if is_user_opted_out(to):
        return {"success": False, "error": "User has opted out"}

    try:
        return send_sms(to, body)
    except TwilioRestException as e:
        if e.code == 21610:
            # Update database - they opted out via carrier
            mark_user_opted_out(to)
        raise
```


## ## Implement retry logic for transient failures

```python
TRANSIENT_ERRORS = [30003, 30008, 30009]  # Retriable errors

async def send_with_retry(to: str, body: str, max_retries: int = 3):
    for attempt in range(max_retries):
        result = send_sms(to, body)

        if result["success"]:
            return result

        if result.get("error_code") not in TRANSIENT_ERRORS:
            # Don't retry permanent failures
            return result

        # Exponential backoff: 5min, 15min, 45min
        delay = 300 * (3 ** attempt)
        await asyncio.sleep(delay)

    return {"success": False, "error": "Max retries exceeded"}
```


## ## Provide fallback channel

```

### Messages Blocked by Carrier Filtering

Severity: HIGH

Situation: Sending SMS to US phone numbers

Symptoms:
Messages show as "sent" but never "delivered." No error from Twilio.
Users say they never received the message. Pattern in specific carriers
or message content.

Why this breaks:
US carriers (Verizon, AT&T, T-Mobile) aggressively filter SMS for spam.
Your message might be blocked if:
- Contains URLs (especially short URLs or unknown domains)
- Looks like phishing (urgent, account, verify, click now)
- High volume from same number
- Not using registered A2P 10DLC
- Low sender reputation

Carriers don't tell Twilio why messages are filtered - they just
silently drop them.

Recommended fix:

## Register for A2P 10DLC (US requirement)

```


## ## Message content best practices

```python
def sanitize_message(text: str) -> str:
    """Make message less likely to be filtered."""
    # Avoid URL shorteners - use full domain
    # Avoid spam trigger words
    # Keep it conversational, not promotional

    # Example: Instead of this
    bad = "URGENT: Verify your account now! Click: bit.ly/abc"

    # Do this
    good = "Hi! Your order #1234 is ready. Questions? Reply here."

    return text

# Use toll-free or short code for high volume
# 10DLC is for <10K msg/day
# Toll-free: up to 10K msg/day
# Short code: 100K+ msg/day
```


## ## Monitor delivery rates

```

### Not Validating Webhook Signatures

Severity: CRITICAL

Situation: Receiving Twilio webhook callbacks

Symptoms:
Attackers send fake webhooks to your endpoint. Fraudulent transactions
processed. Spoofed incoming messages trigger actions.

Why this breaks:
Twilio signs all webhook requests with X-Twilio-Signature header.
If you don't validate this, anyone who knows your webhook URL can
send fake requests pretending to be Twilio.

This can lead to:
- Fake message delivery confirmations
- Spoofed incoming messages
- Fraudulent verification approvals

Recommended fix:

## ALWAYS validate the signature

```python


## # Use consistent URL in production

```

### WhatsApp Message Outside 24-Hour Window (Error 63016)

Severity: HIGH

Situation: Sending WhatsApp message to a user

Symptoms:
Message fails with error 63016. "Message is outside the allowed window."
Template messages work, but regular messages fail.

Why this breaks:
WhatsApp has strict rules about unsolicited messages:
- Users must message you first
- You can only reply within 24 hours of their last message
- After 24 hours, you must use pre-approved template messages

This prevents spam and maintains WhatsApp's trust as a platform.

Recommended fix:

## Track session windows per user

```python


## ## Create approved templates for common messages

```

### Exposed Account SID or Auth Token

Severity: CRITICAL

Situation: Deploying Twilio integration

Symptoms:
Unauthorized charges on Twilio account. Messages sent you didn't send.
Phone numbers purchased without authorization.

Why this breaks:
If attackers get your Account SID + Auth Token, they have FULL access
to your Twilio account. They can:
- Send messages (charging your account)
- Buy phone numbers
- Access call recordings
- Modify your configuration

Common exposure points:
- Hardcoded in source code (pushed to GitHub)
- In client-side JavaScript
- In Docker images
- In logs

Recommended fix:

## Never hardcode credentials

```python


## ## Rotate tokens immediately if exposed

```

### Verify Rate Limit Exceeded (Error 60203)

Severity: MEDIUM

Situation: Sending verification codes

Symptoms:
Verification request fails with error 60203.
"Max send attempts reached for this phone number."

Why this breaks:
Twilio Verify has built-in rate limits to prevent abuse:
- 5 verification attempts per phone number per service per 10 minutes
- Helps prevent SMS pumping fraud
- Protects against brute-force attacks

If users legitimately need more attempts, you may have UX issues.

Recommended fix:

## Implement application-level rate limiting too

```python


## # Offer alternative (voice call, email)

```

## Validation Checks

### Hardcoded Twilio Credentials

Severity: ERROR

Twilio credentials must never be hardcoded

Message: Hardcoded Twilio SID detected. Use environment variables.

### Auth Token in Source Code

Severity: ERROR

Auth tokens should be in environment variables

Message: Hardcoded auth token. Use os.environ['TWILIO_AUTH_TOKEN'].

### Webhook Without Signature Validation

Severity: ERROR

Twilio webhooks must validate X-Twilio-Signature

Message: Webhook without signature validation. Add RequestValidator check.

### Twilio Credentials in Client-Side Code

Severity: ERROR

Never expose Twilio credentials to browsers

Message: Twilio credentials exposed client-side. Only use server-side.

### No E.164 Phone Number Validation

Severity: WARNING

Phone numbers should be validated before sending

Message: Sending to phone without E.164 validation.

### Hardcoded Phone Numbers

Severity: WARNING

Phone numbers should come from config or database

Message: Hardcoded phone number. Use config or environment variable.

### No Twilio Exception Handling

Severity: WARNING

Twilio calls should handle TwilioRestException

Message: Twilio API call without error handling. Catch TwilioRestException.

### Not Handling Specific Error Codes

Severity: INFO

Handle common Twilio error codes specifically

Message: Consider handling specific error codes (21610, 30003, etc.).

### No Opt-Out Keyword Handling

Severity: WARNING

SMS systems must handle STOP/UNSUBSCRIBE keywords

Message: No opt-out handling. Check for STOP/UNSUBSCRIBE keywords.

### Not Checking Opt-Out Before Sending

Severity: WARNING

Check if user has opted out before sending SMS

Message: Consider checking opt-out status before sending.

## Collaboration

### Delegation Triggers

- user needs AI voice assistant -> voice-agents (Twilio provides telephony, voice-agents skill for AI conversation)
- user needs Slack notifications -> slack-bot-builder (Integrate SMS alerts with Slack notifications)
- user needs full auth system -> auth-specialist (Twilio Verify is one component of broader auth)
- user needs workflow automation -> workflow-automation (Trigger SMS/calls from automated workflows)
- user needs high-volume messaging -> devops (Scale webhooks, monitor delivery rates)

## When to Use
- User mentions or implies: twilio
- User mentions or implies: send SMS
- User mentions or implies: text message
- User mentions or implies: voice call
- User mentions or implies: phone verification
- User mentions or implies: 2FA SMS
- User mentions or implies: WhatsApp API
- User mentions or implies: programmable messaging
- User mentions or implies: IVR system
- User mentions or implies: TwiML
- User mentions or implies: phone number verification

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

        )
        # WhatsApp number format: whatsapp:+14155551234
        self.from_number = os.environ["TWILIO_WHATSAPP_NUMBER"]

    def send_message(
        self,
        to: str,
        body: str,
        media_url: Optional[str] = None
    ) -> dict:
        """
        Send WhatsApp message within 24-hour session.

        Args:
            to: Recipient number (E.164, without whatsapp: prefix)
            body: Message text (max 1024 chars for non-template)
            media_url: Optional image/document URL

        Returns:
            Message result
        """
        # Format for WhatsApp
        to_whatsapp = f"whatsapp:{to}"
        from_whatsapp = f"whatsapp:{self.from_number}"

        try:
            message_params = {
                "to": to_whatsapp,
                "from_": from_whatsapp,
                "body": body
            }

            if media_url:
                message_params["media_url"] = [media_url]

            message = self.client.messages.create(**message_params)

            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status
            }

        except TwilioRestException as e:
            return self._handle_whatsapp_error(e)

    def send_template_message(
        self,
        to: str,
        content_sid: str,
        content_variables: dict
    ) -> dict:
        """
        Send pre-approved template message.
        Use this for messages outside 24-hour window.

        Content templates must be approved by WhatsApp first.
        Create them in Twilio Console > Content Template Builder.
        """
        to_whatsapp = f"whatsapp:{to}"
        from_whatsapp = f"whatsapp:{self.from_number}"

        try:
            message = self.client.messages.create(
                to=to_whatsapp,
                from_=from_whatsapp,
                content_sid=content_sid,
                content_variables=content_variables
            )

            return {
                "success": True,
                "message_sid": message.sid,
                "template": True
            }

        except TwilioRestException as e:
            return self._handle_whatsapp_error(e)

    def _handle_whatsapp_error(self, error: TwilioRestException) -> dict:
        """Handle WhatsApp-specific errors."""
        error_handlers = {
            63016: "Outside 24-hour window. Use template message.",
            63018: "Template not approved or doesn't exist.",
            63025: "Too many template messages sent to this user.",
            63038: "Rate limit exceeded for WhatsApp.",
        }

        return {
            "success": False,
            "error_code": error.code,
            "error": error_handlers.get(error.code, error.msg)
        }

# Flask webhook for incoming WhatsApp messages
from flask import Flask, request

app = Flask(__name__)

@app.route("/webhooks/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """Handle incoming WhatsApp messages."""
    from_number = request.form.get("From", "").replace("whatsapp:", "")
    body = request.form.get("Body", "")
    media_url = request.form.get("MediaUrl0")  # First attachment

    # Track session start (24-hour window begins now)
    session_start = datetime.now()
    session_expires = session_start + timedelta(hours=24)

    # Store in database for session tracking
    # user_sessions[from_number] = session_expires

    # Process message and respond
    response = process_whatsapp_message(from_number, body, media_url)

    # Reply within session
    whatsapp = TwilioWhatsApp()
    whatsapp.send_message(from_number, response)

    return "", 200

def process_whatsapp_message(phone: str, text: str, media: str) -> str:
    """Process incoming message and generate response."""
    text_lower = text.lower()

    if "order status" in text_lower:
        return "Your order #1234 is out for delivery!"
    elif "support" in text_lower:
        return "A support agent will contact you shortly."
    else:
        return "Thanks for your message! Reply with 'order status' or 'support'."

# Send typing indicator (2025 feature)
def send_typing_indicator(to: str):
    """Let user know you're typing."""
    # Requires Senders API setup
    pass

### Anti_patterns

- Sending non-template messages outside 24-hour window
- Not tracking session windows per user
- Exceeding 1024 char limit for session messages
- Not handling template rejection errors

### Webhook Handler Pattern

Handle Twilio webhooks for delivery status, incoming messages,
and call events. Critical: always validate X-Twilio-Signature.

Twilio sends webhooks for:
- Message status updates (queued → sent → delivered/failed)
- Incoming SMS/WhatsApp messages
- Call events (initiated, ringing, answered, completed)
- Recording/transcription ready

**When to use**: Tracking message delivery status,Receiving incoming messages,Call analytics and logging,Voicemail transcription processing

from flask import Flask, request, abort
from twilio.request_validator import RequestValidator
from functools import wraps
import os
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

def validate_twilio_signature(f):
    """
    Validate that request came from Twilio.
    CRITICAL: Always use this for webhook endpoints.
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        validator = RequestValidator(os.environ["TWILIO_AUTH_TOKEN"])

        # Build full URL (including query params)
        url = request.url

        # Get POST body as dict
        params = request.form.to_dict()

        # Get signature from header
        signature = request.headers.get("X-Twilio-Signature", "")

        if not validator.validate(url, params, signature):
            logger.warning(f"Invalid Twilio signature from {request.remote_addr}")
            abort(403)

        return f(*args, **kwargs)
    return wrapper

@app.route("/webhooks/twilio/sms/status", methods=["POST"])
@validate_twilio_signature
def sms_status_callback():
    """
    Handle SMS delivery status updates.

    Status progression: queued → sending → sent → delivered
    Or: queued → sending → undelivered/failed
    """
    message_sid = request.form.get("MessageSid")
    status = request.form.get("MessageStatus")
    error_code = request.form.get("ErrorCode")
    error_message = request.form.get("ErrorMessage")

    logger.info(f"SMS {message_sid}: {status}")

    if status == "delivered":
        # Message successfully delivered
        update_message_status(message_sid, "delivered")

    elif status == "undelivered":
        # Carrier rejected or other failure
        logger.error(f"SMS failed: {error_code} - {error_message}")
        handle_failed_message(message_sid, error_code, error_message)

    elif status == "failed":
        # Twilio couldn't send
        logger.error(f"SMS send failed: {error_code}")
        handle_failed_message(message_sid, error_code, error_message)

    return "", 200

@app.route("/webhooks/twilio/sms/incoming", methods=["POST"])
@validate_twilio_signature
def incoming_sms():
    """
    Handle incoming SMS messages.
    """
    from_number = request.form.get("From")
    to_number = request.form.get("To")
    body = request.form.get("Body")
    num_media = int(request.form.get("NumMedia", 0))

    # Handle media attachments
    media_urls = []
    for i in range(num_media):
        media_urls.append(request.form.get(f"MediaUrl{i}"))

    # Check for opt-out keywords
    if body.strip().upper() in ["STOP", "UNSUBSCRIBE", "CANCEL"]:
        handle_opt_out(from_number)
        return "", 200

    # Check for opt-in keywords
    if body.strip().upper() in ["START", "SUBSCRIBE"]:
        handle_opt_in(from_number)
        return "", 200

    # Process message
    process_incoming_sms(from_number, body, media_urls)

    return "", 200

@app.route("/webhooks/twilio/voice/status", methods=["POST"])
@validate_twilio_signature
def voice_status_callback():
    """Handle call status updates."""
    call_sid = request.form.get("CallSid")
    status = request.form.get("CallStatus")
    duration = request.form.get("CallDuration")
    direction = request.form.get("Direction")

    # Call statuses: initiated, ringing, in-progress, completed, busy, no-answer, canceled, failed

    logger.info(f"Call {call_sid}: {status} ({duration}s)")

    if status == "completed":
        # Call ended normally
        log_call_completion(call_sid, duration)

    elif status in ["busy", "no-answer", "canceled", "failed"]:
        # Call didn't connect
        handle_failed_call(call_sid, status)

    return "", 200

# Helper functions
def update_message_status(message_sid: str, status: str):
    """Update message status in database."""
    pass

def handle_failed_message(message_sid: str, error_code: str, error_msg: str):
    """Handle failed message delivery."""
    # Notify team, retry logic, etc.
    pass

def handle_opt_out(phone: str):
    """Handle user opting out of messages."""
    # Mark user as opted out in database
    # IMPORTANT: Must respect this!
    pass

def handle_opt_in(phone: str):
    """Handle user opting back in."""
    pass

def process_incoming_sms(from_phone: str, body: str, media: list):
    """Process incoming SMS message."""
    pass

def log_call_completion(call_sid: str, duration: str):
    """Log completed call."""
    pass

def handle_failed_call(call_sid: str, status: str):
    """Handle call that didn't connect."""
    pass

### Anti_patterns

- Not validating X-Twilio-Signature
- Exposing webhook URLs without authentication
- Not handling opt-out keywords (STOP)
- Blocking webhook response (should be fast)

### Rate Limit and Retry Pattern

Handle Twilio rate limits and implement proper retry logic.

Default limits:
- SMS: 80 messages per second (MPS)
- Voice: Varies by number type and region
- API calls: 100 requests per second

Error codes:
- 20429: Voice API rate limit
- 30429: Messaging API rate limit

**When to use**: High-volume messaging applications,Bulk SMS campaigns,Automated calling systems

import time
import random
from functools import wraps
from twilio.base.exceptions import TwilioRestException
import logging

logger = logging.getLogger(__name__)

def exponential_backoff_retry(
    max_retries: int = 5,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    rate_limit_codes: list = [20429, 30429]
):
    """
    Decorator for exponential backoff retry on rate limits.

    Uses jitter to prevent thundering herd.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)

                except TwilioRestException as e:
                    last_exception = e

                    # Only retry on rate limit errors
                    if e.code not in rate_limit_codes:
                        raise

                    if attempt == max_retries:
                        logger.error(f"Max retries exceeded: {e}")
                        raise

                    # Calculate delay with jitter
                    delay = min(
                        base_delay * (2 ** attempt) + random.uniform(0, 1),
                        max_delay
                    )

                    logger.warning(
                        f"Rate limited (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {delay:.1f}s"
                    )
                    time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator

# Usage
from twilio.rest import Client

client = Client(account_sid, auth_token)

@exponential_backoff_retry(max_retries=5)
def send_sms(to: str, body: str):
    return client.messages.create(
        to=to,
        from_=from_number,
        body=body
    )

# Bulk sending with rate limiting
import asyncio
from asyncio import Semaphore

class RateLimitedSender:
    """
    Send messages with built-in rate limiting.
    Stays under Twilio's 80 MPS limit.
    """

    def __init__(self, client, from_number: str, mps: int = 50):
        self.client = client
        self.from_number = from_number
        self.mps = mps
        self.semaphore = Semaphore(mps)

    async def send_bulk(self, messages: list[dict]) -> list[dict]:
        """
        Send messages with rate limiting.

        Args:
            messages: List of {"to": "+1...", "body": "..."}

        Returns:
            Results for each message
        """
        tasks = [
            self._send_with_limit(msg["to"], msg["body"])
            for msg in messages
        ]

        return await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_with_limit(self, to: str, body: str):
        """Send single message with semaphore-based rate limit."""
        async with self.semaphore:
            try:
                # Use sync client in thread pool
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: self.client.messages.create(
                        to=to,
                        from_=self.from_number,
                        body=body
                    )
                )
                return {"success": True, "sid": result.sid, "to": to}

            except TwilioRestException as e:
                return {"success": False, "error": str(e), "to": to}

            finally:
                # Delay to maintain rate limit
                await asyncio.sleep(1 / self.mps)

# Usage
async def send_campaign():
    sender = RateLimitedSender(client, from_number, mps=50)

    messages = [
        {"to": "+14155551234", "body": "Hello!"},
        {"to": "+14155555678", "body": "Hello!"},
        # ... thousands of messages
    ]

    results = await sender.send_bulk(messages)

    successful = sum(1 for r in results if r.get("success"))
    print(f"Sent {successful}/{len(messages)} messages")

### Anti_patterns

- Retrying immediately without backoff
- No jitter causing thundering herd
- Retrying non-rate-limit errors
- Exceeding Twilio's MPS limit

## Sharp Edges

### Sending to Users Who Opted Out (Error 21610)

Severity: HIGH

Situation: Sending SMS to a phone number

Symptoms:
Message fails with error code 21610. Twilio rejects the message.
User never receives the SMS. Same number worked before.

Why this breaks:
The recipient replied "STOP" (or UNSUBSCRIBE, CANCEL, etc.) to a previous
message from your number. Twilio automatically honors opt-outs and blocks
further messages to that number from your account.

This is legally required for US messaging (TCPA, CTIA guidelines).
You cannot override this - the user must reply "START" to opt back in.

Recommended fix:

## Track opt-out status in your database

> See [references/details.md](references/details.md) for full code examples.

## Include opt-out instructions
Add "Reply STOP to unsubscribe" to marketing messages.

### Phone Unreachable But Valid (Error 30003)

Severity: MEDIUM

Situation: Sending SMS to a mobile number

Symptoms:
Message fails with error 30003. Number was valid and worked before.
Intermittent - sometimes works, sometimes fails.

Why this breaks:
Error 30003 means "Unreachable destination handset." The phone exists but
can't receive messages right now. Common causes:
- Phone powered off
- Airplane mode
- Out of signal range
- Carrier network issues
- Phone storage full

Unlike 30006 (permanent unreachable), 30003 is usually temporary.

Recommended fix:

## Implement retry logic for transient failures

> See [references/details.md](references/details.md) for full code examples.

## Provide fallback channel

```python
async def notify_user(user, message):
    # Try SMS first
    result = await send_sms(user.phone, message)

    if result.get("error_code") == 30003:
        # Phone unreachable - try email
        await send_email(user.email, message)
        return {"channel": "email", "status": "sent"}

    return {"channel": "sms", "status": result["status"]}
> See [references/details.md](references/details.md) for full code examples.
1. Go to Twilio Console > Messaging > Trust Hub
2. Register your business brand
3. Create a messaging campaign (describes use case)
4. Wait for approval (can take days)
5. Associate phone numbers with campaign
```

## Message content best practices

> See [references/details.md](references/details.md) for full code examples.

## Monitor delivery rates

```python
def track_delivery_rate():
    sent = get_messages_with_status("sent")
    delivered = get_messages_with_status("delivered")

    rate = len(delivered) / len(sent) * 100

    if rate < 95:
        alert_team(f"Delivery rate dropped to {rate}%")
> See [references/details.md](references/details.md) for full code examples.
from twilio.request_validator import RequestValidator
from flask import Flask, request, abort
from functools import wraps
import os

def require_twilio_signature(f):
    """Decorator to validate Twilio webhook requests."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        validator = RequestValidator(os.environ["TWILIO_AUTH_TOKEN"])

        # Full URL including query string
        url = request.url

        # POST body as dict
        params = request.form.to_dict()

        # Signature header
        signature = request.headers.get("X-Twilio-Signature", "")

        if not validator.validate(url, params, signature):
            abort(403)

        return f(*args, **kwargs)
    return wrapper

@app.route("/webhooks/twilio", methods=["POST"])
@require_twilio_signature  # ALWAYS use this
def twilio_webhook():
    # Safe to process
    pass
```

## Common validation gotchas

```python
# URL must match EXACTLY what Twilio called
# If behind proxy, you might need:
url = request.headers.get("X-Forwarded-Proto", "http") + "://" + \
      request.headers.get("X-Forwarded-Host", request.host) + \
      request.path

# If using ngrok, URL changes each restart
# Use consistent URL in production
> See [references/details.md](references/details.md) for full code examples.
from datetime import datetime, timedelta

class WhatsAppSession:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.window_hours = 24

    def start_session(self, phone: str):
        """Start/refresh 24-hour session on incoming message."""
        key = f"wa_session:{phone}"
        expires = datetime.now() + timedelta(hours=self.window_hours)
        self.redis.set(key, expires.isoformat(), ex=self.window_hours * 3600)

    def can_send_freeform(self, phone: str) -> bool:
        """Check if we can send non-template message."""
        key = f"wa_session:{phone}"
        expires_str = self.redis.get(key)

        if not expires_str:
            return False

        expires = datetime.fromisoformat(expires_str)
        return datetime.now() < expires

    def send_message(self, phone: str, body: str, template_sid: str = None):
        """Send message, using template if outside window."""
        if self.can_send_freeform(phone):
            return send_whatsapp_message(phone, body)
        elif template_sid:
            return send_whatsapp_template(phone, template_sid)
        else:
            return {
                "success": False,
                "error": "Outside session window, template required"
            }
```

## Incoming message webhook

```python
@app.route("/webhooks/whatsapp", methods=["POST"])
def whatsapp_incoming():
    from_phone = request.form.get("From").replace("whatsapp:", "")

    # Start/refresh session
    session.start_session(from_phone)

    # Process message...
```

## Create approved templates for common messages

```
1. Twilio Console > Content Template Builder
2. Create template with {{1}} placeholders
3. Submit for WhatsApp approval (takes 24-48 hours)
4. Use content_sid to send
> See [references/details.md](references/details.md) for full code examples.
# BAD - never do this
client = Client("AC1234...", "abc123...")

# GOOD - environment variables
client = Client(
    os.environ["TWILIO_ACCOUNT_SID"],
    os.environ["TWILIO_AUTH_TOKEN"]
)

# GOOD - secrets manager
from aws_secretsmanager import get_secret
creds = get_secret("twilio-credentials")
client = Client(creds["sid"], creds["token"])
```

## Use API Key instead of Auth Token

```python
# Auth Token has full account access
# API Keys can be scoped and revoked

# Create API Key in Twilio Console
client = Client(
    os.environ["TWILIO_API_KEY_SID"],
    os.environ["TWILIO_API_KEY_SECRET"],
    os.environ["TWILIO_ACCOUNT_SID"]
)

# If compromised, revoke just that key
```

## Rotate tokens immediately if exposed

```
1. Twilio Console > Account > API credentials
2. Rotate Auth Token
3. Update all deployments with new token
4. Review account activity for unauthorized use
> See [references/details.md](references/details.md) for full code examples.
from datetime import datetime, timedelta
import redis

class VerifyRateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client
        # Stricter than Twilio's limit
        self.max_attempts = 3
        self.window_minutes = 10

    def can_request(self, phone: str) -> bool:
        key = f"verify_rate:{phone}"
        attempts = self.redis.get(key)

        if attempts and int(attempts) >= self.max_attempts:
            return False

        return True

    def record_attempt(self, phone: str):
        key = f"verify_rate:{phone}"
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, self.window_minutes * 60)
        pipe.execute()

    def get_wait_time(self, phone: str) -> int:
        """Return seconds until user can request again."""
        key = f"verify_rate:{phone}"
        ttl = self.redis.ttl(key)
        return max(0, ttl)

# Usage
limiter = VerifyRateLimiter(redis_client)

@app.route("/verify/send", methods=["POST"])
def send_verification():
    phone = request.json["phone"]

    if not limiter.can_request(phone):
        wait = limiter.get_wait_time(phone)
        return {
            "error": f"Too many attempts. Try again in {wait} seconds."
        }, 429

    result = twilio_verify.send_verification(phone)

    if result["success"]:
        limiter.record_attempt(phone)

    return result
```

## Provide clear user feedback

```python
# Show remaining attempts
# Show countdown timer
# Offer alternative (voice call, email)
> See [references/details.md](references/details.md) for full code examples.


---
## Additional Content

    def __init__(self):
        self.client = Client(
            os.environ["TWILIO_ACCOUNT_SID"],
            os.environ["TWILIO_AUTH_TOKEN"]


> Extended reference material: [references/details.md](references/details.md)
