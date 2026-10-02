---
name: segment-cdp
description: Expert patterns for Segment Customer Data Platform including. Use when the task involves segment cdp.
  Analytics.js, server-side tracking, tracking plans with Protocols, identity
  resolution, destinations configuration, and data governance best practices.
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Segment CDP

Expert patterns for Segment Customer Data Platform including Analytics.js,
server-side tracking, tracking plans with Protocols, identity resolution,
destinations configuration, and data governance best practices.

## Patterns

### Analytics.js Browser Integration

Client-side tracking with Analytics.js. Include track, identify, page,
and group calls. Anonymous ID persists until identify merges with user.

// Next.js - Analytics provider component
// lib/segment.ts
import { AnalyticsBrowser } from '@segment/analytics-next';

export const analytics = AnalyticsBrowser.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY!,
});

// Typed event helpers
export interface UserTraits {
  email?: string;
  name?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt?: string;
  company?: {
    id: string;
    name: string;
  };
}

export function identify(userId: string, traits?: UserTraits) {
  analytics.identify(userId, traits);
}

export function track<T extends Record<string, any>>(
  event: string,
  properties?: T
) {
  analytics.track(event, properties);
}

export function page(name?: string, properties?: Record<string, any>) {
  analytics.page(name, properties);
}

export function group(groupId: string, traits?: Record<string, any>) {
  analytics.group(groupId, traits);
}

// React hook for analytics
// hooks/useAnalytics.ts
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analytics, page } from '@/lib/segment';

export function usePageTracking() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view on route change
    page(pathname, {
      path: pathname,
      search: searchParams.toString(),
      url: window.location.href,
      title: document.title,
    });
  }, [pathname, searchParams]);
}

// Usage in _app.tsx or layout.tsx
function RootLayout({ children }) {
  usePageTracking();

  return <html>{children}</html>;
}

// Event tracking in components
function PricingButton({ plan }: { plan: string }) {
  const handleClick = () => {
    track('Plan Selected', {
      plan_name: plan,
      page: 'pricing',
      source: 'pricing_page',
    });
  };

  return <button onClick={handleClick}>Select {plan}</button>;
}

// Identify on auth
function onUserLogin(user: User) {
  identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.plan,
    createdAt: user.createdAt,
  });

  track('User Signed In', {
    method: 'email',
  });
}

### Context

- browser tracking
- website analytics
- client-side events

### Server-Side Tracking with Node.js

High-performance server-side tracking using @segment/analytics-node.
Non-blocking with internal batching. Essential for backend events,
webhooks, and sensitive data.

// lib/segment-server.ts
import { Analytics } from '@segment/analytics-node';

// Initialize once
const analytics = new Analytics({
  writeKey: process.env.SEGMENT_WRITE_KEY!,
  flushAt: 20,      // Batch size before flush
  flushInterval: 10000,  // Flush every 10 seconds
});

// Typed server-side tracking
export interface ServerContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
}

export function serverIdentify(
  userId: string,
  traits: Record<string, any>,
  context?: ServerContext
) {
  analytics.identify({
    userId,
    traits,
    context: {
      ip: context?.ip,
      userAgent: context?.userAgent,
      locale: context?.locale,
    },
  });
}

export function serverTrack(
  userId: string,
  event: string,
  properties?: Record<string, any>,
  context?: ServerContext
) {
  analytics.track({
    userId,
    event,
    properties,
    timestamp: new Date(),
    context: {
      ip: context?.ip,
      userAgent: context?.userAgent,
    },
  });
}

// Flush on shutdown
export async function closeAnalytics() {
  await analytics.closeAndFlush();
}

// Usage in API routes
// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const event = await req.json();

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;

      serverTrack(
        session.client_reference_id,
        'Order Completed',
        {
          order_id: session.id,
          total: session.amount_total / 100,
          currency: session.currency,
          payment_method: session.payment_method_types[0],
        },
        { ip: req.headers.get('x-forwarded-for') || undefined }
      );

      // Also update user traits
      serverIdentify(session.client_reference_id, {
        total_spent: session.amount_total / 100,
        last_purchase_date: new Date().toISOString(),
      });
      break;

    case 'customer.subscription.created':
      serverTrack(
        event.data.object.metadata.user_id,
        'Subscription Started',
        {
          plan: event.data.object.items.data[0].price.nickname,
          amount: event.data.object.items.data[0].price.unit_amount / 100,
          interval: event.data.object.items.data[0].price.recurring.interval,
        }
      );
      break;
  }

  return new Response('ok');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeAnalytics();
  process.exit(0);
});

### Context

- server-side tracking
- backend events
- webhook processing

### Tracking Plan Design

Design event schemas using Object + Action naming convention.
Define required properties, types, and validation rules.
Connect to Protocols for enforcement.

// Tracking plan definition (conceptual YAML structure)
// This maps to Segment Protocols configuration
/*
tracking_plan:
  display_name: "MyApp Tracking Plan"
  rules:
    events:
      - name: "User Signed Up"
        description: "User completed registration"
        rules:
          required:
            - signup_method
          properties:
            signup_method:
              type: string
              enum: [email, google, github]
            referral_code:
              type: string
            utm_source:
              type: string

      - name: "Product Viewed"
        description: "User viewed a product page"
        rules:
          required:
            - product_id
            - product_name
          properties:
            product_id:
              type: string
            product_name:
              type: string
            category:
              type: string
            price:
              type: number
            currency:
              type: string
              default: USD

      - name: "Order Completed"
        description: "User completed a purchase"
        rules:
          required:
            - order_id
            - total
            - products
          properties:
            order_id:
              type: string
            total:
              type: number
            currency:
              type: string
            products:
              type: array
              items:
                type: object
                properties:
                  product_id: { type: string }
                  name: { type: string }
                  price: { type: number }
                  quantity: { type: integer }

    identify:
      traits:
        - name: email
          type: string
          required: true
        - name: name
          type: string
        - name: plan
          type: string
          enum: [free, pro, enterprise]
        - name: company
          type: object
          properties:
            id: { type: string }
            name: { type: string }
*/

// TypeScript implementation with type safety
// types/segment-events.ts
export interface TrackingEvents {
  'User Signed Up': {
    signup_method: 'email' | 'google' | 'github';
    referral_code?: string;
    utm_source?: string;
  };

  'Product Viewed': {
    product_id: string;
    product_name: string;
    category?: string;
    price?: number;
    currency?: string;
  };

  'Order Completed': {
    order_id: string;
    total: number;
    currency?: string;
    products: Array<{
      product_id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  };

  'Feature Used': {
    feature_name: string;
    usage_count?: number;
  };
}

// Type-safe track function
export function trackEvent<T extends keyof TrackingEvents>(
  event: T,
  properties: TrackingEvents[T]
) {
  analytics.track(event, properties);
}

// Usage - compile-time type checking
trackEvent('Order Completed', {
  order_id: 'ord_123',
  total: 99.99,
  products: [
    { product_id: 'prod_1', name: 'Widget', price: 49.99, quantity: 2 },
  ],
});

// This would be a TypeScript error:
// trackEvent('Order Completed', { total: 99.99 });  // Missing order_id

### Context

- tracking plan
- data governance
- event schema

### Identity Resolution

Track anonymous users, then merge with identified users via identify().
Use alias() for identity merging between systems. Group users into
companies/organizations.

// Identity flow implementation
// lib/identity.ts

// Anonymous user tracking
export function trackAnonymousAction(event: string, properties?: object) {
  // Analytics.js automatically generates anonymousId
  analytics.track(event, properties);
}

// When user signs up or logs in
export async function identifyUser(user: {
  id: string;
  email: string;
  name?: string;
  plan?: string;
}) {
  // This merges anonymous history with user profile
  await analytics.identify(user.id, {
    email: user.email,
    name: user.name,
    plan: user.plan,
    created_at: new Date().toISOString(),
  });

  // Track the identification event
  analytics.track('User Identified', {
    method: 'signup',
  });
}

// B2B: Associate user with company
export function associateWithCompany(company: {
  id: string;
  name: string;
  plan?: string;
  employees?: number;
  industry?: string;
}) {
  analytics.group(company.id, {
    name: company.name,
    plan: company.plan,
    employees: company.employees,
    industry: company.industry,
  });
}

// Alias: Link identities (e.g., pre-signup email to user ID)
export function linkIdentities(previousId: string, newUserId: string) {
  // Use when you identified someone with a temporary ID
  // and now have their permanent user ID
  analytics.alias(newUserId, previousId);
}

// Full signup flow
export async function handleSignup(
  email: string,
  password: string,
  company?: { name: string; size: string }
) {
  // 1. Create user in your system
  const user = await createUser(email, password);

  // 2. Identify with Segment (merges anonymous history)
  await identifyUser({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: 'free',
  });

  // 3. Track signup event
  analytics.track('User Signed Up', {
    signup_method: 'email',
    plan: 'free',
  });

  // 4. If B2B, associate with company
  if (company) {
    const companyRecord = await createCompany(company, user.id);

    associateWithCompany({
      id: companyRecord.id,
      name: company.name,
      employees: parseInt(company.size),
    });
  }
}

### Context

- user identification
- anonymous tracking
- b2b tracking


> See [references/details.md](references/details.md) for extended content.
