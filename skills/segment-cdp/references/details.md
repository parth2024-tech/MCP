# Segment Cdp — Extended Reference


### Destinations Configuration

Route data to analytics tools, data warehouses, and marketing platforms.
Use device-mode for client-side tools, cloud-mode for server processing.

// Segment destinations are configured in the Segment UI
// but here's how to optimize your implementation

// Conditional tracking based on destination needs
// lib/segment-destinations.ts

interface DestinationConfig {
  mixpanel: boolean;
  amplitude: boolean;
  googleAnalytics: boolean;
  warehouse: boolean;
  hubspot: boolean;
}

// Only send events needed by specific destinations
export function trackWithDestinations(
  event: string,
  properties: Record<string, any>,
  options?: {
    integrations?: Partial<DestinationConfig>;
  }
) {
  analytics.track(event, properties, {
    integrations: {
      // Override specific destinations
      All: true,  // Send to all by default
      ...options?.integrations,
    },
  });
}

// Example: Track revenue event only to revenue-tracking destinations
export function trackRevenue(order: {
  orderId: string;
  total: number;
  currency: string;
}) {
  analytics.track('Order Completed', {
    order_id: order.orderId,
    revenue: order.total,
    currency: order.currency,
  }, {
    integrations: {
      // Explicitly enable revenue destinations
      'Google Analytics 4': true,
      'Mixpanel': true,
      'Amplitude': true,
      // Disable non-revenue destinations
      'Intercom': false,
      'Zendesk': false,
    },
  });
}

// Send PII only to secure destinations
export function identifyWithPII(userId: string, traits: {
  email: string;
  phone?: string;
  address?: string;
}) {
  analytics.identify(userId, traits, {
    integrations: {
      'All': false,  // Disable all by default
      // Only send PII to trusted destinations
      'HubSpot': true,
      'Salesforce': true,
      'Warehouse': true,  // Your data warehouse
      // Don't send PII to analytics tools
      'Mixpanel': false,
      'Amplitude': false,
    },
  });
}

// Context enrichment for all events
export function enrichedTrack(
  event: string,
  properties: Record<string, any>
) {
  analytics.track(event, {
    ...properties,
    // Add common context
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  }, {
    context: {
      app: {
        name: 'MyApp',
        version: process.env.NEXT_PUBLIC_APP_VERSION,
      },
    },
  });
}

### Context

- data routing
- destination setup
- tool integration

### HTTP Tracking API

Direct HTTP API for any environment. Useful for edge functions,
workers, and non-Node.js backends. Batch up to 500KB per request.

// Edge/Serverless tracking via HTTP API
// lib/segment-http.ts

const SEGMENT_WRITE_KEY = process.env.SEGMENT_WRITE_KEY!;
const SEGMENT_API = 'https://api.segment.io/v1';

// Base64 encode write key for auth
const authHeader = `Basic ${btoa(SEGMENT_WRITE_KEY + ':')}`;

interface SegmentEvent {
  userId?: string;
  anonymousId?: string;
  event?: string;
  name?: string;  // For page calls
  properties?: Record<string, any>;
  traits?: Record<string, any>;
  context?: Record<string, any>;
  timestamp?: string;
}

async function segmentRequest(
  endpoint: string,
  payload: SegmentEvent
): Promise<void> {
  const response = await fetch(`${SEGMENT_API}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    console.error('Segment API error:', await response.text());
  }
}

// HTTP API methods
export async function httpIdentify(
  userId: string,
  traits: Record<string, any>,
  context?: Record<string, any>
) {
  await segmentRequest('/identify', {
    userId,
    traits,
    context,
  });
}

export async function httpTrack(
  userId: string,
  event: string,
  properties?: Record<string, any>,
  context?: Record<string, any>
) {
  await segmentRequest('/track', {
    userId,
    event,
    properties,
    context,
  });
}

export async function httpPage(
  userId: string,
  name: string,
  properties?: Record<string, any>
) {
  await segmentRequest('/page', {
    userId,
    name,
    properties,
  });
}

// Batch API for high volume
export async function httpBatch(
  events: Array<{
    type: 'identify' | 'track' | 'page' | 'group';
    userId?: string;
    anonymousId?: string;
    event?: string;
    name?: string;
    properties?: Record<string, any>;
    traits?: Record<string, any>;
  }>
) {
  // Max 500KB per batch, 32KB per event
  await segmentRequest('/batch', {
    batch: events.map(e => ({
      ...e,
      timestamp: new Date().toISOString(),
    })),
  } as any);
}

// Cloudflare Worker example
export default {
  async fetch(request: Request): Promise<Response> {
    const { userId, action, data } = await request.json();

    // Track in edge function
    await httpTrack(userId, action, data, {
      ip: request.headers.get('cf-connecting-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return new Response('ok');
  },
};

### Context

- edge functions
- serverless
- http tracking

## Sharp Edges

### Anonymous ID Persists Until Explicit Reset

Severity: MEDIUM

### Device Mode Bypasses Protocols Blocking

Severity: HIGH

### HTTP API Has Strict Size Limits

Severity: MEDIUM

### Track Calls Without Identify Are Anonymous

Severity: HIGH

### Write Key in Client is Visible (But Intentional)

Severity: LOW

### Events May Be Lost on Page Navigation

Severity: MEDIUM

### Timestamps Without Timezone Cause Analytics Issues

Severity: MEDIUM

### Tracking Before Consent Violates GDPR

Severity: HIGH

## Validation Checks

### Dynamic Event Name

Severity: ERROR

Event names should be static, not include dynamic values

Message: Dynamic event name detected. Use static event names with dynamic properties.

### Inconsistent Event Name Casing

Severity: WARNING

Event names should follow consistent casing convention

Message: Mixed casing in event name. Use consistent convention (e.g., Title Case).

### Track Without Prior Identify

Severity: WARNING

Users should be identified before tracking critical events

Message: Revenue/conversion event without identify. Ensure user is identified.

### Missing Analytics Reset on Logout

Severity: WARNING

Analytics should be reset when user logs out

Message: Logout without analytics.reset(). Anonymous ID will persist to next user.

### Hardcoded Segment Write Key

Severity: ERROR

Write key should use environment variables

Message: Hardcoded Segment write key. Use environment variables.

### PII Sent to All Destinations

Severity: WARNING

PII should have destination controls

Message: PII in tracking without destination controls. Consider limiting destinations.

### Event Without Proper Timestamp

Severity: INFO

Explicit timestamps help with historical data

Message: Server track without explicit timestamp. Consider adding timestamp.

### Potentially Large Property Values

Severity: WARNING

Properties over 32KB will be rejected

Message: Potentially large property value. Segment has 32KB per event limit.

### Tracking Before Consent Check

Severity: ERROR

GDPR requires consent before tracking

Message: Tracking without consent check. Implement consent management for GDPR.

## Collaboration

### Delegation Triggers

- user needs A/B testing -> analytics-specialist (Segment + LaunchDarkly/Optimizely integration)
- user needs data warehouse -> data-engineer (Segment to BigQuery/Snowflake/Redshift)
- user needs customer support integration -> zendesk-integration (Identify calls syncing to support tools)
- user needs marketing automation -> hubspot-integration (Segment to HubSpot destination)
- user needs consent management -> privacy-specialist (GDPR/CCPA compliance with Segment)

## When to Use
- User mentions or implies: segment
- User mentions or implies: analytics.js
- User mentions or implies: customer data platform
- User mentions or implies: cdp
- User mentions or implies: tracking plan
- User mentions or implies: event tracking
- User mentions or implies: identify track page
- User mentions or implies: data routing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
