---
name: convex
description: "Convex reactive backend expert: schema design, TypeScript functions, real-time subscriptions, auth, file storage, scheduling, and deployment. Use when the task involves convex."
risk: safe
source: "https://docs.convex.dev"
date_added: "2026-02-27"
---

# Convex

You are an expert in Convex — the open-source, reactive backend platform where queries are TypeScript code. You have deep knowledge of schema design, function authoring (queries, mutations, actions), real-time data subscriptions, authentication, file storage, scheduling, and deployment workflows across React, Next.js, Angular, Vue, Svelte, React Native, and server-side environments.

## When to Use
- Use when building a new project with Convex as the backend
- Use when adding Convex to an existing React, Next.js, Angular, Vue, Svelte, or React Native app
- Use when designing schemas for a Convex document-relational database
- Use when writing or debugging Convex functions (queries, mutations, actions)
- Use when implementing real-time/reactive data patterns
- Use when setting up authentication with Convex Auth or third-party providers (Clerk, Auth0, etc.)
- Use when working with Convex file storage, scheduled functions, or cron jobs
- Use when deploying or managing Convex projects

## Core Concepts

Convex is a **document-relational** database with a fully managed backend. Key differentiators:

- **Reactive by default**: Queries automatically re-run and push updates to all connected clients when underlying data changes
- **TypeScript-first**: All backend logic — queries, mutations, actions, schemas — is written in TypeScript
- **ACID transactions**: Serializable isolation with optimistic concurrency control
- **No infrastructure to manage**: Serverless, scales automatically, zero config
- **End-to-end type safety**: Types flow from schema → backend functions → client hooks

### Function Types

| Type            | Purpose                   | Can Read DB    | Can Write DB      | Can Call External APIs | Cached/Reactive |
| :-------------- | :------------------------ | :------------- | :---------------- | :--------------------- | :-------------- |
| **Query**       | Read data                 | ✅             | ❌                | ❌                     | ✅              |
| **Mutation**    | Write data                | ✅             | ✅                | ❌                     | ❌              |
| **Action**      | Side effects              | via `runQuery` | via `runMutation` | ✅                     | ❌              |
| **HTTP Action** | Webhooks/custom endpoints | via `runQuery` | via `runMutation` | ✅                     | ❌              |

## Project Setup

### New Project (Next.js)

```bash
npx create-next-app@latest my-app
cd my-app && npm install convex
npx convex dev
```

### Add to Existing Project

```bash
npm install convex
npx convex dev
```

The `npx convex dev` command:

1. Prompts you to log in (GitHub)
2. Creates a project and deployment
3. Generates `convex/` folder for backend functions
4. Syncs functions to your dev deployment in real-time
5. Creates `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

### Folder Structure

```
my-app/
├── convex/
│   ├── _generated/        ← Auto-generated (DO NOT EDIT)
│   │   ├── api.d.ts
│   │   ├── dataModel.d.ts
│   │   └── server.d.ts
│   ├── schema.ts          ← Database schema definition
│   ├── tasks.ts           ← Query/mutation functions
│   └── http.ts            ← HTTP actions (optional)
├── .env.local             ← CONVEX_DEPLOYMENT, NEXT_PUBLIC_CONVEX_URL
└── convex.json            ← Project config (optional)
```

## Schema Design

Define your schema in `convex/schema.ts` using the validator library:

> See [references/details.md](references/details.md) for full code examples.

### Validator Types

> See [references/details.md](references/details.md) for full code examples.

### Indexes

> See [references/details.md](references/details.md) for full code examples.

## Writing Functions

### Queries (Read Data)

Queries are reactive — clients automatically get updates when data changes.

> See [references/details.md](references/details.md) for full code examples.
import { query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

### Mutations (Write Data)

Mutations run as ACID transactions with serializable isolation.

> See [references/details.md](references/details.md) for full code examples.

### Actions (External APIs & Side Effects)

Actions can call third-party services but cannot directly access the database — they must use `ctx.runQuery` and `ctx.runMutation`.

> See [references/details.md](references/details.md) for full code examples.

### HTTP Actions (Webhooks)

> See [references/details.md](references/details.md) for full code examples.

## Client-Side Integration

### React / Next.js

```typescript
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

```typescript
// app/layout.tsx — wrap children
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

> See [references/details.md](references/details.md) for full code examples.


### With Auth (First-Party Convex Auth)

Convex provides a robust, native authentication library (`@convex-dev/auth`) featuring Magic Links, Passwords, and 80+ OAuth providers without needing a third-party service.

```typescript
// app/ConvexClientProvider.tsx
"use client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
```

```typescript
// Client-side sign in
import { useAuthActions } from "@convex-dev/auth/react";

export function Login() {
  const { signIn } = useAuthActions();
  return <button onClick={() => signIn("github")}>Sign in with GitHub</button>;
}
```

### With Auth (Third-Party Clerk Example)

If you prefer a hosted third-party solution like Clerk:

```typescript
// app/ConvexClientProvider.tsx
"use client";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### With Auth (Better Auth Component)

Convex also has a community component (`@convex-dev/better-auth`) that integrates the Better Auth library directly into the Convex backend. This is currently in **early alpha**.

```bash
npm install better-auth @convex-dev/better-auth
npx convex env set BETTER_AUTH_SECRET your-secret-here
npx convex env set SITE_URL http://localhost:3000
```

Better Auth provides email/password, social logins, two-factor authentication, and session management — all running inside Convex functions rather than an external auth server.

### Angular Integration

Convex does not have an official Angular client library, but Angular apps can use the core `convex` package directly with Angular's Dependency Injection and Signals.

> See [references/details.md](references/details.md) for full code examples.


> **Note:** The community library `@robmanganelly/ngx-convex` provides a more Angular-native experience with React-like hooks adapted for Angular DI and Signals.

## Scheduling & Cron Jobs

### One-off Scheduled Functions

```typescript
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const sendReminder = mutation({
  args: { userId: v.id("users"), message: v.string(), delayMs: v.number() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(args.delayMs, api.notifications.send, {
      userId: args.userId,
      message: args.message,
    });
  },
});
```

### Cron Jobs

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval("clear old logs", { hours: 24 }, api.logs.clearOld);

crons.cron(
  "weekly digest",
  "0 9 * * 1", // Every Monday at 9 AM
  api.emails.sendWeeklyDigest,
);

export default crons;
```

## File Storage

> See [references/details.md](references/details.md) for full code examples.

## Environment Variables

```bash
# Set environment variables for your deployment
npx convex env set OPENAI_API_KEY sk-...
npx convex env set SENDGRID_API_KEY SG...

# List current env vars
npx convex env list

# Remove an env var
npx convex env unset OPENAI_API_KEY
```

Access in actions (NOT in queries or mutations):

```typescript
// Only available in actions
const apiKey = process.env.OPENAI_API_KEY;
```

## Deployment & CLI

> See [references/details.md](references/details.md) for full code examples.

## Best Practices

- ✅ Define schemas — adds type safety across your entire stack
- ✅ Use indexes for queries — avoids full table scans
- ✅ Use compound indexes with equality filters first, range filter last
- ✅ Rely on native determinism — `Date.now()` and `Math.random()` are 100% safe to use in queries and mutations because Convex freezes time at the start of every function execution!
- ✅ Use `v.id("tableName")` for document references instead of plain strings
- ✅ Use actions for external API calls (never call external APIs from queries or mutations)
- ✅ Use `ctx.runQuery` / `ctx.runMutation` from actions — never access `ctx.db` directly in actions
- ✅ Add argument validators to all functions — they enforce runtime type safety
- ✅ Return `null` when a document isn't found instead of throwing an error unless missing is exceptional
- ✅ Prefer `withIndex` over `.filter()` for query performance

## Anti-Patterns to Avoid

1. **❌ External API calls in queries/mutations**: Only actions can call external services. Queries and mutations run in the Convex transaction engine.
2. **❌ Doing slow CPU-bound work in mutations**: Mutations block database commits; offload heavy processing to actions.
3. **❌ Using `.collect()` on large tables without limits**: Fetches all documents into memory. Use `.take(N)` or `.paginate()`.
4. **❌ Skipping schema definition**: Without a schema you lose end-to-end type safety, the main Convex advantage.
5. **❌ Using `.filter()` instead of indexes**: `.filter()` does a full table scan. Define an index and use `.withIndex()`.
6. **❌ Storing large blobs in documents**: Use Convex file storage (`_storage`) for files; keep documents lean.
7. **❌ Circular `runQuery`/`runMutation` chains**: Actions calling mutations that schedule actions can create infinite loops.

## Common Pitfalls

- **Problem:** "Query returns `undefined` on first render"
  **Solution:** This is expected — Convex queries are async. Check for `undefined` before rendering (this means loading, not empty).

- **Problem:** "Mutation throws `Document not found`"
  **Solution:** Documents may have been deleted between your read and write due to optimistic concurrency. Re-read inside the mutation.

- **Problem:** "`process.env` is undefined in query/mutation"
  **Solution:** Environment variables are only accessible in **actions** (not queries or mutations) because queries/mutations run in the deterministic transaction engine.

- **Problem:** "Function handler is too slow"
  **Solution:** Add indexes for your query patterns. Use `withIndex()` instead of `.filter()`. For complex operations, break into smaller mutations.

- **Problem:** "Schema push fails with existing data"
  **Solution:** Convex validates existing data against new schemas. Either migrate existing documents first, or use `v.optional()` for new fields.

## Limitations

- Queries and mutations cannot call external HTTP APIs (use actions instead)
- No raw SQL — you work with the Convex query builder API
- Environment variables only available in actions, not in queries or mutations
- Document size limit of 1MB
- Maximum function execution time limits apply
- No server-side rendering of Convex data without specific SSR patterns (use preloading)
- Schemas are enforced at write-time; changing schemas requires data migration for existing documents

## Related Skills

- `@firebase` — Alternative BaaS with Firestore (compare: Convex is TypeScript-first with ACID transactions)
- `@supabase-automation` — Alternative with PostgreSQL backend (compare: Convex is document-relational with built-in reactivity)
- `@prisma-expert` — ORM for traditional databases (Convex replaces both ORM and database)
- `@react-patterns` — Frontend patterns that pair well with Convex React hooks
- `@nextjs-app-router` — Next.js App Router integration patterns
- `@authentication-oauth` — Auth patterns (Convex supports Clerk, Auth0, Convex Auth)
- `@stripe` — Payment integration via Convex actions and HTTP webhooks

## Resources

- [Official Docs](https://docs.convex.dev)
- [Convex Stack (Blog)](https://stack.convex.dev)
- [GitHub](https://github.com/get-convex/convex-backend)
- [Discord Community](https://convex.dev/community)
- [Convex Chef (AI Starter)](https://chef.convex.dev)
