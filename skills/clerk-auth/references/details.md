# Clerk Auth — Extended Reference

- user.created: New user signed up
- user.updated: User profile changed
- user.deleted: User deleted account

Uses svix for signature verification.

### Code_example

// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Verification failed', { status: 400 });
  }

  // Handle events
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await prisma.user.create({
      data: {
        clerkId: id,
        email: email_addresses[0]?.email_address,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
    });
  }

  if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;

    await prisma.user.update({
      where: { clerkId: id },
      data: {
        email: email_addresses[0]?.email_address,
        firstName: first_name,
        lastName: last_name,
        imageUrl: image_url,
      },
    });
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    await prisma.user.delete({
      where: { clerkId: id! },
    });
  }

  return new Response('Webhook processed', { status: 200 });
}

// Prisma schema
// prisma/schema.prisma
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  firstName String?
  lastName  String?
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
  @@index([clerkId])
}

### Anti_patterns

- Pattern: Not verifying webhook signature | Why: Anyone can hit your endpoint with fake data | Fix: Always verify with svix
- Pattern: Blocking middleware for webhook routes | Why: Webhooks come from Clerk, not authenticated users | Fix: Add /api/webhooks(.*)' to public routes
- Pattern: Not handling race conditions | Why: user.created might arrive after user.updated | Fix: Use upsert instead of create, handle missing records

### References

- https://clerk.com/docs/webhooks/sync-data
- https://clerk.com/articles/how-to-sync-clerk-user-data-to-your-database

### API Route Protection

Protect API routes using auth() from Clerk.

Route Handlers in App Router use auth() for authentication.
Middleware provides initial protection, auth() provides in-handler verification.

### Code_example

// app/api/projects/route.ts
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // User's personal projects or org projects
  const projects = await prisma.project.findMany({
    where: orgId
      ? { organizationId: orgId }
      : { userId, organizationId: null },
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  const project = await prisma.project.create({
    data: {
      name: body.name,
      userId,
      organizationId: orgId ?? null,
    },
  });

  return NextResponse.json(project, { status: 201 });
}

// Protected with role check
// app/api/admin/users/route.ts
export async function GET() {
  const { userId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (orgRole !== 'org:admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin-only logic
  const users = await prisma.user.findMany();
  return NextResponse.json(users);
}

// Using getAuth in older patterns (not recommended)
// For backwards compatibility only
import { getAuth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  // ...
}

### Anti_patterns

- Pattern: Trusting middleware alone | Why: Middleware can be bypassed (CVE-2025-29927) | Fix: Always verify auth in route handler too
- Pattern: Not checking orgId for multi-tenant | Why: Users might access other org's data | Fix: Always filter by orgId from auth()

### References

- https://clerk.com/docs/guides/protecting-pages

## Sharp Edges

### CVE-2025-29927 Middleware Bypass Vulnerability

Severity: CRITICAL

### Multiple Middleware Files Cause Conflicts

Severity: HIGH

### 4KB Session Token Cookie Limit

Severity: HIGH

### auth() Requires clerkMiddleware Configuration

Severity: HIGH

### Webhook Race Conditions

Severity: MEDIUM

### auth() is Async in App Router

Severity: MEDIUM

### Middleware Blocks Webhook Endpoints

Severity: MEDIUM

### Accessing Auth State Before isLoaded

Severity: MEDIUM

### Manual Redirects Cause Double Redirects

Severity: MEDIUM

### Organization Data Not Scoped by orgId

Severity: HIGH

## Validation Checks

### Clerk Secret Key in Client Code

Severity: ERROR

CLERK_SECRET_KEY must only be used server-side

Message: Clerk secret key exposed to client. Use CLERK_SECRET_KEY without NEXT_PUBLIC prefix.

### Protected Route Without Middleware

Severity: ERROR

API routes should have middleware protection

Message: API route without auth check. Add middleware protection or auth() check.

### Hardcoded Clerk API Keys

Severity: ERROR

Clerk keys should use environment variables

Message: Hardcoded Clerk keys. Use environment variables.

### Missing Await on auth()

Severity: ERROR

auth() is async in App Router and must be awaited

Message: auth() not awaited. Use 'await auth()' in App Router.

### Multiple Middleware Files

Severity: WARNING

Only one middleware.ts file should exist

Message: Multiple middleware files detected. Use single middleware.ts.

### Webhook Route Not Excluded from Protection

Severity: WARNING

Webhook routes should be public

Message: Webhook route may be blocked by middleware. Add to public routes.

### Accessing Auth Without isLoaded Check

Severity: WARNING

Check isLoaded before accessing user state in client components

Message: Accessing user without isLoaded check. Check isLoaded first.

### Clerk Hooks in Server Component

Severity: ERROR

Clerk hooks only work in Client Components

Message: Clerk hooks in Server Component. Add 'use client' or use auth().

### Multi-Tenant Query Without orgId

Severity: WARNING

Organization data should be scoped by orgId

Message: Query without organization scope. Filter by orgId for multi-tenancy.

### Webhook Without Signature Verification

Severity: ERROR

Clerk webhooks must verify svix signature

Message: Webhook without signature verification. Use svix to verify.

## Collaboration

### Delegation Triggers

- user needs database -> postgres-wizard (User table with clerkId)
- user needs payments -> stripe-integration (Customer linked to Clerk user)
- user needs search -> algolia-search (Secured API keys per user)
- user needs analytics -> segment-cdp (User identification)
- user needs email -> resend-email (Transactional emails)

## When to Use
- User mentions or implies: adding authentication
- User mentions or implies: clerk auth
- User mentions or implies: user authentication
- User mentions or implies: sign in
- User mentions or implies: sign up
- User mentions or implies: user management
- User mentions or implies: multi-tenancy
- User mentions or implies: organizations
- User mentions or implies: sso
- User mentions or implies: single sign-on

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
