# Zapier Make Patterns — Extended Reference

2. Use filters to prevent bad data:
   - Only continue if email exists
   - Only continue if amount > 0
   - Filter out test/invalid entries

3. Monitor task history regularly:
   - Check for recurring errors
   - Fix issues before 95% threshold

# Recovery:

1. Check Task History for error patterns
2. Fix the root cause (auth, bad data, API changes)
3. Test with sample data
4. Re-enable the Zap manually
5. Monitor closely for next 24 hours

# Common causes:
- Expired authentication tokens
- API rate limits
- Changed field names in connected apps
- Invalid data formats

### Loops Consuming Unexpected Task Counts

Severity: HIGH

Situation: Processing arrays or multiple items

Symptoms:
Task quota depleted unexpectedly. One Zap run shows as 100+ tasks.
Monthly limit reached in days. "You've used X of Y tasks" surprise.

Why this breaks:
In Zapier, each iteration of a loop counts as separate tasks.
If a webhook delivers an order with 50 line items and you loop
through each, that's 50+ tasks for one order.

Recommended fix:

# Understand the math:

Order with 10 items, 5 actions per item:
= 1 trigger + (10 items × 5 actions) = 51 tasks

# Strategies to reduce task usage:

1. Batch operations when possible:
   - Use "Create Many Rows" instead of loop + create
   - Use bulk API endpoints

2. Aggregate before sending:
   - Collect all items
   - Send one summary message, not one per item

3. Filter before looping:
   - Only process items that need action
   - Skip unchanged/duplicate items

4. Consider Make for high-volume:
   - Make uses operations, not tasks per action
   - More cost-effective for loops

# Make approach:
[Iterator] → [Actions] → [Aggregator]
- Pay for operations (module executions)
- Not per-action like Zapier

### App Updates Breaking Existing Zaps

Severity: HIGH

Situation: App you're connected to releases updates

Symptoms:
Working Zap suddenly fails. "Field not found" errors. Different
data format in outputs. Actions that worked yesterday fail today.

Why this breaks:
When connected apps update their APIs, field names can change,
new required fields appear, or data formats shift. Zapier/Make
integrations may not immediately update to match.

Recommended fix:

# When a Zap breaks after app update:

1. Check the Task History for specific errors
2. Open the Zap editor to see field mapping issues
3. Re-select the trigger/action to refresh schema
4. Re-map any fields that show as "unknown"
5. Test with new sample data

# Prevention:

1. Subscribe to changelog for critical apps
2. Keep connection authorizations fresh
3. Test Zaps after major app updates
4. Document your field mappings
5. Use test/duplicate Zaps for experiments

# If integration is outdated:
- Check Zapier/Make status pages
- Report issue to support
- Consider webhook alternative temporarily

# Common offenders:
- CRM field restructures
- API version upgrades
- OAuth scope changes
- New required permissions

### Authentication Tokens Expiring

Severity: HIGH

Situation: Using OAuth connections to apps

Symptoms:
"Authentication failed" errors. "Please reconnect" messages.
Zaps fail after weeks of working. Multiple apps fail simultaneously.

Why this breaks:
OAuth tokens expire. Some apps require re-authentication every
60-90 days. If the user who connected the app leaves the company,
their connection may stop working.

Recommended fix:

# Immediate fix:
1. Go to Settings → Apps
2. Find the app with issues
3. Reconnect (re-authorize)
4. Test affected Zaps

# Prevention:

1. Use service accounts for connections
   - Don't connect with personal accounts
   - Use shared team email/account

2. Monitor connection health
   - Check Apps page regularly
   - Set calendar reminders for known expiration

3. Document who connected what
   - Track in spreadsheet
   - Handoff process when people leave

4. Prefer connections that don't expire
   - API keys over OAuth when available
   - Long-lived tokens

# Zapier Enterprise:
- Admin controls for managing connections
- SSO integration
- Centralized connection management

### Webhooks Missing or Duplicating Events

Severity: MEDIUM

Situation: Using webhooks as triggers

Symptoms:
Some events never trigger the Zap. Same event triggers multiple
times. Inconsistent automation behavior. "Works sometimes."

Why this breaks:
Webhooks are fire-and-forget. If Zapier's receiving endpoint is
slow or unavailable, the webhook may fail. Some systems retry
webhooks, causing duplicates. Network issues lose events.

Recommended fix:

# Handle duplicates:

1. Add deduplication logic:
   - Filter: Only continue if ID not in Airtable
   - First action: Check if already processed

2. Use idempotency:
   - Store processed IDs
   - Skip if ID exists

### Zapier example:
[Webhook Trigger]
   ↓
[Airtable: Find Records] - search by event_id
   ↓
[Filter: Only continue if not found]
   ↓
[Process Event]
   ↓
[Airtable: Create Record] - store event_id

# Handle missed events:

1. Use polling triggers for critical data
   - Less real-time but more reliable
   - Catches events during downtime

2. Implement reconciliation:
   - Scheduled Zap to check for gaps
   - Compare source data to processed data

3. Check source system retry settings:
   - Some systems retry on failure
   - Configure retry count/timing

### Make Operations Consumed by Error Retries

Severity: MEDIUM

Situation: Scenarios with failing modules

Symptoms:
Operations quota depleted quickly. Scenario runs "succeeded" but
used many operations. Same scenario running more than expected.

Why this breaks:
Make counts operations per module execution, including failed
attempts and retries. Error handler modules consume operations.
Scenarios that fail and retry can use 3-5x expected operations.

Recommended fix:

# Understand operation counting:

Successful run: Each module = 1 operation
Failed + retry (3x): 3 operations for that module
Error handler: Additional operation per handler module

# Reduce operation waste:

1. Add error handlers that break early:
   [Module] → Error → [Break] (1 additional op)
   vs
   [Module] → Error → [Log] → [Alert] → [Update] (3+ ops)

2. Use ignore instead of retry when appropriate:
   - If failure is expected (record exists)
   - If retrying won't help (bad data)

3. Pre-validate before expensive operations:
   [Check Data] → Filter → [API Call]
   - Fail fast before consuming operations

4. Optimize scenario scheduling:
   - Don't run every minute if hourly is enough
   - Use webhooks for real-time when possible

# Monitor usage:
- Check Operations dashboard
- Set up usage alerts
- Review high-consumption scenarios

### Timezone Mismatches in Scheduled Triggers

Severity: MEDIUM

Situation: Setting up scheduled automations

Symptoms:
Zap runs at wrong time. "9 AM" trigger fires at 2 PM. Different
behavior on different days. DST causes hour shifts.

Why this breaks:
Zapier shows times in your local timezone but may store in UTC.
If you change timezones or DST occurs, scheduled times shift.
Team members in different zones see different times.

Recommended fix:

# Best practices:

1. Explicitly set timezone in schedule:
   - Don't rely on browser detection
   - Use business timezone, not personal

2. Document in Zap name:
   - "Daily Report 9AM EST"
   - Include timezone in description

3. Test around DST transitions:
   - Schedule changes at DST boundaries
   - Verify times before/after change

4. For global teams:
   - Use UTC as standard
   - Convert to local in descriptions

5. Consider buffer times:
   - Don't schedule at exactly midnight
   - Avoid on-the-hour (busy periods)

### Make timezone handling:
- Scenarios use account timezone setting
- formatDate() function respects timezone
- Use parseDate() with explicit timezone

## Collaboration

### Delegation Triggers

- automation requires custom code -> workflow-automation (Code-based solutions like Inngest, Temporal)
- need browser automation in workflow -> browser-automation (Playwright/Puppeteer integration)
- building custom API integration -> api-designer (API design and implementation)
- automation needs AI capabilities -> agent-tool-builder (AI agent tools and Zapier MCP)
- high-volume data processing -> backend (Custom backend processing)
- need self-hosted automation -> devops (n8n or custom workflow deployment)

## Related Skills

Works well with: `workflow-automation`, `agent-tool-builder`, `backend`, `api-designer`

## When to Use
- User mentions or implies: zapier
- User mentions or implies: make
- User mentions or implies: integromat
- User mentions or implies: zap
- User mentions or implies: scenario
- User mentions or implies: no-code automation
- User mentions or implies: trigger action
- User mentions or implies: workflow automation
- User mentions or implies: connect apps
- User mentions or implies: automate

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
