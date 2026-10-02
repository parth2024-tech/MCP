# Neon Postgres — Extended Reference

Severity: HIGH

### PgBouncer Feature Limitations

Severity: MEDIUM

### Branch Storage Accumulation

Severity: MEDIUM

### Reserved Connections Reduce Available Pool

Severity: LOW

### HTTP Driver Doesn't Support Transactions

Severity: MEDIUM

### Deleting Parent Branch Affects Children

Severity: HIGH

### Schema Drift Between Branches

Severity: MEDIUM

## Validation Checks

### Direct Database URL in Client Code

Severity: ERROR

Direct database URLs should never be exposed to client

Message: Direct URL exposed to client. Only pooled URLs for server-side use.

### Hardcoded Database Connection String

Severity: ERROR

Connection strings should use environment variables

Message: Hardcoded connection string. Use environment variables.

### Missing SSL Mode in Connection String

Severity: WARNING

Neon requires SSL connections

Message: Missing sslmode=require. Add to connection string.

### Prisma Missing directUrl for Migrations

Severity: ERROR

Prisma needs directUrl for migrations through PgBouncer

Message: Using pooled URL without directUrl. Migrations will fail.

### Prisma directUrl Points to Pooler

Severity: ERROR

directUrl should be non-pooled connection

Message: directUrl points to pooler. Use non-pooled endpoint for migrations.

### High Pool Size in Serverless Function

Severity: WARNING

High pool sizes exhaust connections with many function instances

Message: Pool size too high for serverless. Use max: 5-10.

### Creating New Client Per Request

Severity: WARNING

Creating new clients per request wastes connections

Message: Creating client per request. Use connection pool or neon() driver.

### Branch Creation Without Cleanup Strategy

Severity: WARNING

Branches should have cleanup automation

Message: Creating branch without cleanup. Add delete-branch-action to PR close.

### Scale-to-Zero Enabled on Production

Severity: WARNING

Scale-to-zero adds latency in production

Message: Scale-to-zero on production. Disable for low-latency.

### HTTP Driver Used for Transactions

Severity: ERROR

neon() HTTP driver doesn't support transactions

Message: HTTP driver with transaction. Use Pool from @neondatabase/serverless.

## Collaboration

### Delegation Triggers

- user needs authentication -> clerk-auth (User table with clerkId column)
- user needs caching -> redis-specialist (Query caching, session storage)
- user needs search -> algolia-search (Full-text search beyond Postgres capabilities)
- user needs analytics -> segment-cdp (Track database events, user actions)
- user needs deployment -> vercel-deployment (Environment variables, preview databases)

## When to Use
- User mentions or implies: neon database
- User mentions or implies: serverless postgres
- User mentions or implies: database branching
- User mentions or implies: neon postgres
- User mentions or implies: postgres serverless
- User mentions or implies: connection pooling
- User mentions or implies: preview environments
- User mentions or implies: database per preview

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
