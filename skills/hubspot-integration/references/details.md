# Hubspot Integration — Extended Reference

    .update(requestBody)
    .digest("hex");

  return signature === expectedSignature;
}

// Express webhook handler
app.post("/webhooks/hubspot", async (req, res) => {
  const signature = req.headers["x-hubspot-signature-v3"] as string;
  const timestamp = req.headers["x-hubspot-request-timestamp"] as string;
  const requestBody = JSON.stringify(req.body);

  // Validate signature
  const isValid = validateWebhookSignature(
    requestBody,
    signature,
    process.env.HUBSPOT_CLIENT_SECRET
  );

  if (!isValid) {
    console.error("Invalid webhook signature");
    return res.status(401).send("Unauthorized");
  }

  // Check timestamp (prevent replay attacks)
  const timestampAge = Date.now() - parseInt(timestamp);
  if (timestampAge > 300000) {  // 5 minutes
    console.error("Webhook timestamp too old");
    return res.status(401).send("Timestamp expired");
  }

  // Process events - respond quickly!
  const events = req.body;

  // Queue for async processing
  for (const event of events) {
    await queue.add("hubspot-webhook", event);
  }

  // Respond immediately
  res.status(200).send("OK");
});

// Async processor
async function processWebhookEvent(event: any) {
  const { subscriptionType, objectId, propertyName, propertyValue } = event;

  switch (subscriptionType) {
    case "contact.creation":
      await handleContactCreated(objectId);
      break;

    case "contact.propertyChange":
      await handleContactPropertyChange(objectId, propertyName, propertyValue);
      break;

    case "deal.creation":
      await handleDealCreated(objectId);
      break;

    case "contact.deletion":
      await handleContactDeleted(objectId);
      break;

    default:
      console.log(`Unhandled event: ${subscriptionType}`);
  }
}

// Webhook subscription types:
// contact.creation, contact.deletion, contact.propertyChange
// company.creation, company.deletion, company.propertyChange
// deal.creation, deal.deletion, deal.propertyChange

### Notes

- Validate signature before processing
- Respond within 5 seconds
- Queue heavy processing for async
- Max 1000 webhook subscriptions per app

### Custom Objects

Create and manage custom object types

**When to use**: Standard objects don't fit your data model

### Template

import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_TOKEN,
});

// CREATE custom object schema
async function createCustomObjectSchema() {
  const schema = {
    name: "projects",
    labels: {
      singular: "Project",
      plural: "Projects",
    },
    primaryDisplayProperty: "project_name",
    requiredProperties: ["project_name"],
    properties: [
      {
        name: "project_name",
        label: "Project Name",
        type: "string",
        fieldType: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "enumeration",
        fieldType: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Completed", value: "completed" },
          { label: "On Hold", value: "on_hold" },
        ],
      },
      {
        name: "budget",
        label: "Budget",
        type: "number",
        fieldType: "number",
      },
      {
        name: "start_date",
        label: "Start Date",
        type: "date",
        fieldType: "date",
      },
    ],
    associatedObjects: ["CONTACT", "COMPANY"],
  };

  const response = await hubspotClient.crm.schemas.coreApi.create(schema);
  return response;
}

// CREATE custom object record
async function createProject(data: {
  project_name: string;
  status: string;
  budget: number;
}) {
  const response = await hubspotClient.crm.objects.basicApi.create(
    "projects",  // Custom object name
    { properties: data }
  );

  return response;
}

// READ custom object by ID
async function getProject(projectId: string) {
  const response = await hubspotClient.crm.objects.basicApi.getById(
    "projects",
    projectId,
    ["project_name", "status", "budget", "start_date"]
  );

  return response;
}

// UPDATE custom object
async function updateProject(projectId: string, properties: object) {
  const response = await hubspotClient.crm.objects.basicApi.update(
    "projects",
    projectId,
    { properties }
  );

  return response;
}

// SEARCH custom objects
async function searchProjects(status: string) {
  const response = await hubspotClient.crm.objects.searchApi.doSearch(
    "projects",
    {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "status",
              operator: "EQ",
              value: status,
            },
          ],
        },
      ],
      properties: ["project_name", "status", "budget"],
      limit: 100,
    }
  );

  return response.results;
}

### Notes

- Custom objects require Enterprise tier
- Max 10 custom objects per account
- Use crm.objects API with object name as parameter
- Can associate with standard and other custom objects

## Sharp Edges

### Rate Limits Vary by App Type and Hub Tier

Severity: HIGH

### 5% Error Rate Threshold for Marketplace Apps

Severity: HIGH

### API Keys Deprecated - Use OAuth or Private App Tokens

Severity: CRITICAL

### OAuth Access Tokens Expire in 30 Minutes

Severity: HIGH

### Webhook Requests Must Be Validated

Severity: CRITICAL

### All List Endpoints Require Pagination

Severity: MEDIUM

### Associations v4 API Has Breaking Changes

Severity: HIGH

### Polling Limited to 100,000 Requests Per Day

Severity: MEDIUM

## Validation Checks

### Hardcoded HubSpot API Key

Severity: ERROR

API keys must never be hardcoded

Message: Hardcoded HubSpot API key detected. Use environment variables. Note: API keys are deprecated - use Private App tokens.

### Hardcoded HubSpot Access Token

Severity: ERROR

Access tokens must use environment variables

Message: Hardcoded HubSpot access token. Use environment variables.

### Hardcoded Client Secret

Severity: ERROR

OAuth client secrets must be secured

Message: Hardcoded client secret. Use environment variables.

### Missing Webhook Signature Validation

Severity: ERROR

Webhook endpoints must validate HubSpot signatures

Message: Webhook endpoint without signature validation. Validate X-HubSpot-Signature-v3.

### Missing Rate Limit Handling

Severity: WARNING

API calls should handle 429 responses

Message: HubSpot API calls without rate limit handling. Implement retry logic with backoff.

### Unthrottled Parallel API Calls

Severity: WARNING

Parallel calls can exceed rate limits

Message: Parallel HubSpot API calls without throttling. Use rate limiter.

### Missing Pagination for List Calls

Severity: WARNING

List endpoints return paginated results

Message: API call without pagination handling. Implement cursor-based pagination.

### Individual Operations in Loop

Severity: INFO

Use batch operations for multiple items

Message: Individual API calls in loop. Consider batch operations for better performance.

### Token Storage Without Expiry

Severity: WARNING

OAuth tokens expire and need refresh logic

Message: Token storage without expiry tracking. Store expiresAt for refresh logic.

### Deprecated API Key Usage

Severity: ERROR

API keys are deprecated

Message: Using deprecated API key. Migrate to Private App token or OAuth 2.0.

## Collaboration

### Delegation Triggers

- user needs email marketing automation -> email-marketing (Beyond HubSpot's built-in email tools)
- user needs custom CRM UI -> frontend (Building portal or dashboard)
- user needs data pipeline -> data-engineer (ETL from HubSpot to warehouse)
- user needs Salesforce integration -> salesforce-development (HubSpot + Salesforce sync)
- user needs payment processing -> stripe-integration (Payments beyond HubSpot quotes)
- user needs analytics dashboard -> analytics-specialist (Custom reporting beyond HubSpot)

## When to Use
- User mentions or implies: hubspot
- User mentions or implies: hubspot api
- User mentions or implies: hubspot crm
- User mentions or implies: hubspot integration
- User mentions or implies: contacts api

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
