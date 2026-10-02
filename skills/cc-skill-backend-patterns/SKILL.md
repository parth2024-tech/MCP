---
name: cc-skill-backend-patterns
description: Backend architecture patterns, API design, database optimization, and server-side best practices for Node.js, Express, and Next.js API routes. Use when the task involves cc skill backend patterns.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Backend Development Patterns

Backend architecture patterns and best practices for scalable server-side applications.

## API Design Patterns

### RESTful API Structure

```typescript
// ✅ Resource-based URLs
GET    /api/markets                 # List resources
GET    /api/markets/:id             # Get single resource
POST   /api/markets                 # Create resource
PUT    /api/markets/:id             # Replace resource
PATCH  /api/markets/:id             # Update resource
DELETE /api/markets/:id             # Delete resource

// ✅ Query parameters for filtering, sorting, pagination
GET /api/markets?status=active&sort=volume&limit=20&offset=0
```

### Repository Pattern

> See [references/details.md](references/details.md) for full code examples.

### Service Layer Pattern

> See [references/details.md](references/details.md) for full code examples.

### Middleware Pattern

> See [references/details.md](references/details.md) for full code examples.

## Database Patterns

### Query Optimization

```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('markets')
  .select('id, name, status, volume')
  .eq('status', 'active')
  .order('volume', { ascending: false })
  .limit(10)

// ❌ BAD: Select everything
const { data } = await supabase
  .from('markets')
  .select('*')
```

### N+1 Query Prevention

```typescript
// ❌ BAD: N+1 query problem
const markets = await getMarkets()
for (const market of markets) {
  market.creator = await getUser(market.creator_id)  // N queries
}

// ✅ GOOD: Batch fetch
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds)  // 1 query
const creatorMap = new Map(creators.map(c => [c.id, c]))

markets.forEach(market => {
  market.creator = creatorMap.get(market.creator_id)
})
```

### Transaction Pattern

> See [references/details.md](references/details.md) for full code examples.

## Caching Strategies

### Redis Caching Layer

> See [references/details.md](references/details.md) for full code examples.

### Cache-Aside Pattern

```typescript
async function getMarketWithCache(id: string): Promise<Market> {
  const cacheKey = `market:${id}`

  // Try cache
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Cache miss - fetch from DB
  const market = await db.markets.findUnique({ where: { id } })

  if (!market) throw new Error('Market not found')

  // Update cache
  await redis.setex(cacheKey, 300, JSON.stringify(market))

  return market
}
```

## Error Handling Patterns

### Centralized Error Handler

> See [references/details.md](references/details.md) for full code examples.

### Retry with Exponential Backoff

> See [references/details.md](references/details.md) for full code examples.

## Authentication & Authorization

### JWT Token Validation

> See [references/details.md](references/details.md) for full code examples.

### Role-Based Access Control

> See [references/details.md](references/details.md) for full code examples.

## Rate Limiting

### Simple In-Memory Rate Limiter

> See [references/details.md](references/details.md) for full code examples.

## Background Jobs & Queues

### Simple Queue Pattern

> See [references/details.md](references/details.md) for full code examples.

## Logging & Monitoring

### Structured Logging

> See [references/details.md](references/details.md) for full code examples.

**Remember**: Backend patterns enable scalable, maintainable server-side applications. Choose patterns that fit your complexity level.

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
