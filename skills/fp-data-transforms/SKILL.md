---
name: fp-data-transforms
description: Everyday data transformations using functional patterns - arrays, objects, grouping, aggregation, and null-safe access. Use when the task involves fp data transforms.
risk: unknown
source: community
version: 1.0.0
author: Claude
tags:
  - functional-programming
  - typescript
  - data-transformation
  - fp-ts
  - arrays
  - objects
  - grouping
  - aggregation
  - null-safety
---

# Practical Data Transformations

This skill covers the data transformations you do every day: working with arrays, reshaping objects, normalizing API responses, grouping data, and safely accessing nested values. Each section shows the imperative approach first, then the functional equivalent, with honest assessments of when each approach shines.

## When to Use
- You need to transform arrays, objects, grouped data, or nested values in TypeScript.
- The task involves reshaping API responses, null-safe access, aggregation, or normalization.
- You want practical functional patterns for everyday data work instead of low-level loops.

---

## Table of Contents

1. [Array Operations](#1-array-operations)
2. [Object Transformations](#2-object-transformations)
3. [Data Normalization](#3-data-normalization)
4. [Grouping and Aggregation](#4-grouping-and-aggregation)
5. [Null-Safe Access](#5-null-safe-access)
6. [Real-World Examples](#6-real-world-examples)
7. [When to Use What](#7-when-to-use-what)

---

## 1. Array Operations

Array operations are the bread and butter of data transformation. Let's replace verbose loops with expressive, chainable operations.

### Map: Transform Every Element

**The Task**: Convert an array of prices from cents to dollars.

#### Imperative Approach

```typescript
const pricesInCents = [999, 1499, 2999, 4999];

function convertToDollars(prices: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    result.push(prices[i] / 100);
  }
  return result;
}

const dollars = convertToDollars(pricesInCents);
// [9.99, 14.99, 29.99, 49.99]
```

#### Functional Approach

```typescript
const pricesInCents = [999, 1499, 2999, 4999];

const toDollars = (cents: number): number => cents / 100;

const dollars = pricesInCents.map(toDollars);
// [9.99, 14.99, 29.99, 49.99]
```

**Why functional is better here**: The intent is immediately clear. `map` says "transform each element." The transformation logic (`toDollars`) is named and reusable. No index management, no manual array building.

### Filter: Keep What Matches

**The Task**: Get all active users from a list.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  isActive: boolean;
}

function getActiveUsers(users: User[]): User[] {
  const result: User[] = [];
  for (const user of users) {
    if (user.isActive) {
      result.push(user);
    }
  }
  return result;
}
```

#### Functional Approach

```typescript
const isActive = (user: User): boolean => user.isActive;

const activeUsers = users.filter(isActive);

// Or inline for simple predicates
const activeUsers = users.filter(user => user.isActive);
```

**Why functional is better here**: The predicate (`isActive`) is separated from the iteration logic. You can reuse, test, and compose predicates independently.

### Reduce: Accumulate Into Something New

**The Task**: Calculate the total price of items in a cart.

#### Imperative Approach

```typescript
interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

function calculateTotal(items: CartItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
```

#### Functional Approach

```typescript
const calculateTotal = (items: CartItem[]): number =>
  items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

// Or break out the line total calculation
const lineTotal = (item: CartItem): number => item.price * item.quantity;

const calculateTotal = (items: CartItem[]): number =>
  items.map(lineTotal).reduce((a, b) => a + b, 0);
```

**Honest assessment**: For simple sums, the imperative loop is actually quite readable. The functional version shines when you need to compose the accumulation with other transformations, or when the reduction logic is complex enough to benefit from being named.

### Chaining: Combine Operations

**The Task**: Get the names of all active premium users, sorted alphabetically.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  isActive: boolean;
  tier: 'free' | 'premium';
}

function getActivePremiumNames(users: User[]): string[] {
  const result: string[] = [];
  for (const user of users) {
    if (user.isActive && user.tier === 'premium') {
      result.push(user.name);
    }
  }
  result.sort((a, b) => a.localeCompare(b));
  return result;
}
```

#### Functional Approach

> See [references/details.md](references/details.md) for full code examples.

**Why functional is better here**: Each step in the chain has a single responsibility. You can read the transformation as a series of steps: "filter active, filter premium, get names, sort." Adding or removing a step is trivial.

### Using fp-ts Array Module

fp-ts provides additional array utilities with better composition support:

> See [references/details.md](references/details.md) for full code examples.

---

## 2. Object Transformations

Objects need reshaping constantly: picking fields, omitting sensitive data, merging settings, and updating nested values.

### Pick: Select Specific Fields

**The Task**: Extract only the public fields from a user object.

#### Imperative Approach

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  internalNotes: string;
}

function getPublicUser(user: User): { id: string; name: string; email: string } {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}
```

#### Functional Approach

```typescript
// Generic pick utility
const pick = <T extends object, K extends keyof T>(
  keys: K[]
) => (obj: T): Pick<T, K> =>
  keys.reduce(
    (result, key) => {
      result[key] = obj[key];
      return result;
    },
    {} as Pick<T, K>
  );

const getPublicUser = pick<User, 'id' | 'name' | 'email'>(['id', 'name', 'email']);

const publicUser = getPublicUser(user);
```

**Why functional is better here**: The `pick` utility is reusable across your codebase. Type safety ensures you can only pick keys that exist.

### Omit: Remove Specific Fields

**The Task**: Remove sensitive fields before logging.

#### Imperative Approach

```typescript
function sanitizeForLogging(user: User): Omit<User, 'passwordHash' | 'internalNotes'> {
  const { passwordHash, internalNotes, ...safe } = user;
  return safe;
}
```

#### Functional Approach

```typescript
// Generic omit utility
const omit = <T extends object, K extends keyof T>(
  keys: K[]
) => (obj: T): Omit<T, K> => {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
};

const sanitizeForLogging = omit<User, 'passwordHash' | 'internalNotes'>([
  'passwordHash',
  'internalNotes',
]);
```

**Honest assessment**: For one-off omits, destructuring (the imperative approach) is perfectly fine and very readable. The functional `omit` utility pays off when you have many such transformations or need to compose them.

### Merge: Combine Objects

**The Task**: Merge user settings with defaults.

#### Imperative Approach

> See [references/details.md](references/details.md) for full code examples.

#### Functional Approach


**Why functional is better here**: Spread syntax is concise and handles any number of keys. Later spreads override earlier ones, giving you natural "defaults with overrides" behavior.

### Deep Merge: Nested Object Combination

**The Task**: Merge nested configuration objects.

#### Imperative Approach


#### Functional Approach


### Immutable Updates: Change Nested Values

**The Task**: Update a deeply nested value without mutation.

#### Imperative (Mutating) Approach

```typescript
interface State {
  user: {
    profile: {
      settings: {
        theme: string;
      };
    };
  };
}

function updateTheme(state: State, newTheme: string): void {
  state.user.profile.settings.theme = newTheme; // Mutation!
}
```

#### Functional (Immutable) Approach

> See [references/details.md](references/details.md) for full code examples.

**Honest assessment**: The spread nesting is verbose but explicit. For deeply nested updates, consider using a library like `immer` or fp-ts lenses. The verbosity of the functional approach is the price of immutability.

---

## 3. Data Normalization

API responses rarely match the shape your app needs. Normalization transforms nested, denormalized data into flat, indexed structures.

### API Response to App State

**The Task**: Transform a nested API response into a normalized state.

#### API Response (What You Get)

```typescript
interface ApiResponse {
  orders: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    status: string;
  }>;
}
```

#### App State (What You Need)

> See [references/details.md](references/details.md) for full code examples.

#### Imperative Approach


#### Functional Approach


**Why functional is better here**: Each extraction is independent and testable. The `createNormalizedCollection` helper is reusable. Adding a new entity type means adding one new extraction function.

### Transform API Response to UI-Ready Data

**The Task**: Convert API data to what your components need.

> See [references/details.md](references/details.md) for full code examples.

#### Functional Approach


---

## 4. Grouping and Aggregation

Grouping and aggregating data is essential for reports, dashboards, and analytics.

### GroupBy: Organize by Key

**The Task**: Group orders by customer.

#### Imperative Approach


#### Functional Approach


**Using fp-ts NonEmptyArray.groupBy**:

```typescript
import * as NEA from 'fp-ts/NonEmptyArray';
import { pipe } from 'fp-ts/function';

// NEA.groupBy guarantees non-empty arrays in result
const ordersByCustomer = pipe(
  orders as NEA.NonEmptyArray<Order>, // Must be non-empty
  NEA.groupBy(order => order.customerId)
); // Record<string, NonEmptyArray<Order>>
```

### CountBy: Count Occurrences

**The Task**: Count orders by status.

#### Imperative Approach

```typescript
function countByStatus(orders: Order[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const order of orders) {
    counts[order.status] = (counts[order.status] || 0) + 1;
  }

  return counts;
}
```

#### Functional Approach


### SumBy: Aggregate Numeric Values

**The Task**: Calculate total revenue per product category.

#### Imperative Approach

```typescript
interface Sale {
  productId: string;
  category: string;
  amount: number;
}

function sumByCategory(sales: Sale[]): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const sale of sales) {
    totals[sale.category] = (totals[sale.category] || 0) + sale.amount;
  }

  return totals;
}
```

#### Functional Approach


### Complex Aggregation Example

**The Task**: Calculate totals from line items with quantity and unit price.

```typescript
interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  id: string;
  lineItems: LineItem[];
  taxRate: number;
}
```

#### Functional Approach


---

## 5. Null-Safe Access

Stop writing `if (x && x.y && x.y.z)`. Safely navigate nested structures without runtime errors.

### The Problem

```typescript
interface Config {
  database?: {
