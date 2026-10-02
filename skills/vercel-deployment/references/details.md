# Vercel Deployment — Code Reference

## ### CI/CD Pipeline

```

## Related Skills

Works well with: `nextjs-app-router`, `supabase-backend`

## When to Use
- User mentions or implies: vercel
- User mentions or implies: deploy
- User mentions or implies: deployment
- User mentions or implies: hosting
- User mentions or implies: production
- User mentions or implies: environment variables
- User mentions or implies: edge function
- User mentions or implies: serverless function

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Or use next.config.js for all routes:
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}

### Page shows stale data after deployment

Severity: MEDIUM

Situation: Updated data not appearing after new deployment

Symptoms:
- Old content shows after deploy
- Changes not visible immediately
- Different users see different versions
- Data updates but page doesn't

Why this breaks:
Vercel caches aggressively. Static pages are cached at the edge.
Even dynamic pages may be cached if not configured properly.
Old cached versions served until cache expires or is purged.

Recommended fix:

Control caching behavior:

// Force no caching (always fresh)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ISR - revalidate every 60 seconds
export const revalidate = 60

// On-demand revalidation (after mutation)
import { revalidatePath, revalidateTag } from 'next/cache'

// In Server Action:
async function updatePost(id: string) {
  await db.post.update({ ... })
  revalidatePath(`/posts/${id}`)  // Purge this page
  revalidateTag('posts')          // Purge all with this tag
}

// Purge via API (deployment hook):
// POST https://your-site.vercel.app/api/revalidate?path=/posts

// Check caching in response headers:
// x-vercel-cache: HIT = served from cache
// x-vercel-cache: MISS = freshly generated

## Validation Checks

### Secret in NEXT_PUBLIC Variable

Severity: CRITICAL

Message: Secret exposed via NEXT_PUBLIC_ prefix. This will be visible in browser.

Fix action: Remove NEXT_PUBLIC_ prefix and access only in server-side code

### Hardcoded Vercel URL

Severity: WARNING

Message: Hardcoded Vercel URL. Use VERCEL_URL environment variable instead.

Fix action: Use process.env.VERCEL_URL or NEXT_PUBLIC_VERCEL_URL

### Node.js API in Edge Runtime

Severity: ERROR

Message: Node.js module used in Edge runtime. fs/path not available in Edge.

Fix action: Use runtime = 'nodejs' or remove Node.js dependencies

### API Route Without CORS Headers

Severity: WARNING

Message: API route without CORS headers may fail cross-origin requests.

Fix action: Add Access-Control-Allow-Origin header if API is called from other domains

### API Route Without Error Handling

Severity: WARNING

Message: API route without try/catch. Unhandled errors return 500 without details.

Fix action: Wrap in try/catch and return appropriate error responses

### Secret Read in Static Context

Severity: WARNING

Message: Server secret accessed in static generation. Value baked into build.

Fix action: Move secret access to runtime code or use NEXT_PUBLIC_ for public values

### Large Package Import

Severity: WARNING

Message: Large package imported. May cause slow cold starts. Consider alternatives.

Fix action: Use lodash-es with tree shaking, date-fns instead of moment, @aws-sdk/client-* instead of aws-sdk

### Dynamic Page Without Revalidation Config

Severity: WARNING

Message: Dynamic page without revalidation config. Consider setting revalidation strategy.

Fix action: Add export const revalidate = 60 for ISR, or 0 for no cache

## Collaboration

### Delegation Triggers

- next.js|app router|pages|server components -> nextjs-app-router (Deployment needs Next.js patterns)
- database|supabase|backend -> supabase-backend (Deployment needs database)
- auth|authentication|session -> nextjs-supabase-auth (Deployment needs auth config)
- monitoring|logs|errors|analytics -> analytics-architecture (Deployment needs monitoring)

### Production Launch

Skills: vercel-deployment, nextjs-app-router, supabase-backend, nextjs-supabase-auth

Workflow:

```
1. App configuration (nextjs-app-router)
2. Database setup (supabase-backend)
3. Auth config (nextjs-supabase-auth)
4. Deploy (vercel-deployment)
```

### CI/CD Pipeline

Skills: vercel-deployment, devops, qa-engineering

Workflow:

```
1. Test automation (qa-engineering)
2. Pipeline config (devops)
3. Deploy strategy (vercel-deployment)
> See [references/details.md](references/details.md) for full code examples.
