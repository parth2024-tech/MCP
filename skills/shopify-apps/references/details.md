# Shopify Apps — Code Reference

## ## Respond immediately, process asynchronously

```typescript
// app/routes/webhooks.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  // Queue for async processing
  await jobQueue.add("process-webhook", {
    topic,
    shop,
    payload,
  });

  // CRITICAL: Return 200 immediately
  return new Response(null, { status: 200 });
};

// Worker process handles the actual work
// workers/webhook-processor.ts
import { Worker } from "bullmq";

const worker = new Worker("process-webhook", async (job) => {
  const { topic, shop, payload } = job.data;

  switch (topic) {
    case "ORDERS_CREATE":
      await processOrder(shop, payload);
      break;
    // ... other handlers
  }
});
```


## ## Monitor webhook performance

```

### API Rate Limits Cause 429 Errors

Severity: HIGH

Situation: Making API calls to Shopify

Symptoms:
HTTP 429 Too Many Requests errors.
"Throttled" responses.
App becomes unresponsive.
Operations fail silently or partially.

Why this breaks:
Shopify enforces strict rate limits:
- REST: 2 requests per second per store
- GraphQL: 1000 points per 60 seconds

Exceeding limits causes immediate 429 errors.
Continuous violations can result in temporary bans.

Bulk operations count against limits.

Recommended fix:

## Check rate limit headers

```typescript


## ## Implement retry with exponential backoff

```typescript
async function shopifyRequest(
  fn: () => Promise<Response>,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fn();

      if (response.status === 429) {
        // Get retry-after header or default
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "2"
        );
        await sleep(retryAfter * 1000 * Math.pow(2, attempt));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError!;
}
```


## ## Queue requests

```

### Protected Customer Data Requires Special Permission

Severity: HIGH

Situation: Accessing customer PII in webhooks or API

Symptoms:
Webhook deliveries fail for orders/customers.
Customer data fields are null or empty.
App works in development but fails in production.
"Protected customer data access" errors.

Why this breaks:
Since April 2024, accessing protected customer data (PII) requires
explicit approval from Shopify. This is separate from OAuth scopes.

Protected data includes:
- Customer names, emails, addresses
- Order customer information
- Subscription customer details

Even with read_orders scope, you won't receive customer data
in webhooks without protected data access.

Recommended fix:

## Request protected customer data access

1. Go to Partner Dashboard > App > API access
2. Under "Protected customer data access"
3. Request access for needed data types
4. Justify your use case
5. Wait for Shopify approval (can take days)

## Check your data access level

```typescript


## ## Use customer account API for direct access

```

### Duplicate Webhook Definitions Cause Conflicts

Severity: MEDIUM

Situation: Configuring webhooks in both TOML and code

Symptoms:
Duplicate webhook deliveries.
Some webhooks fire twice.
Webhook subscriptions fail to register.
Unpredictable webhook behavior.

Why this breaks:
Shopify apps can define webhooks in two places:
1. shopify.app.toml (declarative, recommended)
2. afterAuth hook in code (imperative, legacy)

If you define the same webhook in both places, you get:
- Duplicate subscriptions
- Race conditions during registration
- Conflicts during app updates

Recommended fix:

## Use TOML only (recommended)

```toml


## ## Check current subscriptions

```

### Webhook URL Trailing Slash Causes 404

Severity: MEDIUM

Situation: Setting up webhook endpoints

Symptoms:
Webhooks return 404 Not Found.
Webhook delivery fails immediately.
Works in local dev but fails in production.
Logs show request to /webhooks/ not /webhooks.

Why this breaks:
Shopify automatically adds a trailing slash to webhook URLs.
If your server doesn't handle both /webhooks and /webhooks/,
the webhook will 404.

Common with frameworks that are strict about trailing slashes.

Recommended fix:

## Handle both URL formats

```typescript


## # Test with slash

```

### REST API Required Migration to GraphQL (April 2025)

Severity: HIGH

Situation: Building new public apps or maintaining existing

Symptoms:
App store submission rejected for REST API usage.
Deprecation warnings in console.
Some REST endpoints stop working.
Missing features only in GraphQL.

Why this breaks:
As of October 2024, REST Admin API is legacy.
Starting April 2025, new public apps MUST use GraphQL.

REST endpoints will continue working for existing apps,
but new features are GraphQL-only.

Metafields, bulk operations, and many new features
require GraphQL.

Recommended fix:

## Use GraphQL for all new code

```typescript


## ## Migrate existing REST calls

```typescript
// REST: GET /products/{id}.json
// GraphQL equivalent:
const response = await admin.graphql(`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      title
      status
      variants(first: 10) {
        edges {
          node {
            id
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`, {
  variables: { id: `gid://shopify/Product/${productId}` },
});
```


## # shopify.app.toml

```

### App Bridge Required for Built for Shopify (July 2025)

Severity: HIGH

Situation: Building embedded Shopify apps

Symptoms:
App rejected from "Built for Shopify" program.
App not appearing correctly in admin.
Navigation and chrome issues.
Warning about App Bridge version.

Why this breaks:
Effective July 2025, all apps seeking "Built for Shopify" status
must use the latest version of App Bridge and be embedded.

Apps using old App Bridge versions or not embedded will
lose built for Shopify benefits (better placement, badges).

Shopify now serves App Bridge and Polaris via unversioned
script tags that auto-update.

Recommended fix:

## Use latest App Bridge via script tag

```html


## ## Check embedded status

```

### Missing GDPR Webhooks Block App Store Approval

Severity: HIGH

Situation: Submitting app to Shopify App Store

Symptoms:
App submission rejected.
"GDPR webhooks not implemented" error.
Manual review fails for compliance.
Data request webhooks not handled.

Why this breaks:
Shopify requires all apps to handle three GDPR webhooks:
1. customers/data_request - Provide customer data
2. customers/redact - Delete customer data
3. shop/redact - Delete all shop data

These are automatically subscribed when you create an app.
You MUST implement handlers even if you don't store data.

Recommended fix:

## Implement all GDPR handlers

```typescript


## ## Even if you store nothing

```

## Validation Checks

### Hardcoded Shopify API Secret

Severity: ERROR

API secrets must never be hardcoded

Message: Hardcoded Shopify API secret. Use environment variables.

### Hardcoded Shopify API Key

Severity: ERROR

API keys should use environment variables

Message: Hardcoded Shopify API key. Use environment variables.

### Missing HMAC Verification

Severity: ERROR

Webhook endpoints must verify HMAC signature

Message: Webhook handler without HMAC verification. Use authenticate.webhook().

### Synchronous Webhook Processing

Severity: WARNING

Webhook handlers should respond quickly

Message: Multiple await calls in webhook handler. Consider async processing.

### Missing Webhook Response

Severity: ERROR

Webhooks must return 200 status

Message: Webhook handler may not return proper response.

### Duplicate Webhook Registration

Severity: WARNING

Webhooks should be defined in TOML only

Message: Code-based webhook registration. Define webhooks in shopify.app.toml.

### REST API Usage

Severity: INFO

REST API is deprecated, use GraphQL

Message: REST API usage detected. Consider migrating to GraphQL.

### Missing Rate Limit Handling

Severity: WARNING

API calls should handle 429 responses

Message: API call without rate limit handling. Implement retry logic.

### In-Memory Session Storage

Severity: WARNING

In-memory sessions don't scale

Message: In-memory session storage. Use PrismaSessionStorage or similar.

### Missing Session Validation

Severity: ERROR

Routes should validate session

Message: Loader without authentication. Use authenticate.admin(request).

## Collaboration

### Delegation Triggers

- user needs payment processing -> stripe-integration (Shopify Payments or Stripe integration)
- user needs custom authentication -> auth-specialist (Beyond Shopify OAuth)
- user needs email/SMS notifications -> twilio-communications (Customer notifications outside Shopify)
- user needs AI features -> llm-architect (Product descriptions, chatbots)
- user needs serverless deployment -> aws-serverless (Lambda or Vercel deployment)

## When to Use
- User mentions or implies: shopify app
- User mentions or implies: shopify
- User mentions or implies: embedded app
- User mentions or implies: polaris
- User mentions or implies: app bridge
- User mentions or implies: shopify webhook

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

    subscription: data.currentAppInstallation.activeSubscriptions[0],
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const planKey = formData.get("plan") as keyof typeof PLANS;
  const plan = PLANS[planKey];

  // Create subscription charge
  const response = await admin.graphql(`
    mutation CreateSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $test: Boolean) {
      appSubscriptionCreate(
        name: $name
        lineItems: $lineItems
        returnUrl: $returnUrl
        test: $test
      ) {
        appSubscription {
          id
          status
        }
        confirmationUrl
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      name: plan.name,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.amount,
                currencyCode: plan.currencyCode,
              },
              interval: plan.interval,
            },
          },
        },
      ],
      returnUrl: `https://${session.shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`,
      test: process.env.NODE_ENV !== "production",
    },
  });

  const { data } = await response.json();

  if (data.appSubscriptionCreate.userErrors.length > 0) {
    return json({
      errors: data.appSubscriptionCreate.userErrors,
    }, { status: 400 });
  }

  // Redirect merchant to approve charge
  return redirect(data.appSubscriptionCreate.confirmationUrl);
}

export default function Billing() {
  const { subscription } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <Page title="Billing">
      <Card>
        {subscription ? (
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              Current plan: {subscription.name}
            </Text>
            <Text as="p" variant="bodyMd">
              Status: {subscription.status}
            </Text>
          </BlockStack>
        ) : (
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Choose a Plan
            </Text>
            <Button onClick={() => submit({ plan: "basic" }, { method: "post" })}>
              Basic - $9.99/month
            </Button>
            <Button onClick={() => submit({ plan: "pro" }, { method: "post" })}>
              Pro - $29.99/month
            </Button>
          </BlockStack>
        )}
      </Card>
    </Page>
  );
}

### Notes

- Use test: true for development stores
- Merchant must approve subscription
- One recurring + one usage charge per app max
- 30-day billing cycle for recurring charges

### App Extension Development

Extend Shopify checkout, admin, or storefront

**When to use**: Building app extensions

### Template

# shopify.extension.toml (in extensions/my-extension/)
api_version = "2024-10"

[[extensions]]
type = "ui_extension"
name = "Product Customizer"
handle = "product-customizer"

[[extensions.targeting]]
target = "admin.product-details.block.render"
module = "./src/AdminBlock.tsx"

[extensions.capabilities]
api_access = true

[extensions.settings]
[[extensions.settings.fields]]
key = "show_preview"
type = "boolean"
name = "Show Preview"

// extensions/my-extension/src/AdminBlock.tsx
import {
  reactExtension,
  useApi,
  useSettings,
  BlockStack,
  Text,
  Button,
  InlineStack,
} from "@shopify/ui-extensions-react/admin";

export default reactExtension(
  "admin.product-details.block.render",
  () => <ProductCustomizer />
);

function ProductCustomizer() {
  const { data, extension } = useApi<"admin.product-details.block.render">();
  const settings = useSettings();

  const productId = data?.selected?.[0]?.id;

  const handleCustomize = async () => {
    // API calls from extension
    const result = await fetch("/api/customize", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  };

  return (
    <BlockStack gap="base">
      <Text fontWeight="bold">Product Customizer</Text>
      <Text>
        Customize product: {productId}
      </Text>
      {settings.show_preview && (
        <Text size="small">Preview enabled</Text>
      )}
      <InlineStack gap="base">
        <Button onPress={handleCustomize}>
          Apply Customization
        </Button>
      </InlineStack>
    </BlockStack>
  );
}

// Checkout UI Extension
// [[extensions.targeting]]
// target = "purchase.checkout.block.render"

// extensions/checkout-ext/src/Checkout.tsx
import {
  reactExtension,
  Banner,
  useCartLines,
  useTotalAmount,
} from "@shopify/ui-extensions-react/checkout";

export default reactExtension(
  "purchase.checkout.block.render",
  () => <CheckoutBanner />
);

function CheckoutBanner() {
  const cartLines = useCartLines();
  const total = useTotalAmount();

  if (total.amount > 100) {
    return (
      <Banner status="success">
        You qualify for free shipping!
      </Banner>
    );
  }

  return null;
}

### Notes

- Extensions run in sandboxed iframe
- Use @shopify/ui-extensions-react for React
- Limited APIs compared to full app
- Deploy with 'shopify app deploy'

## Sharp Edges

### Webhook Must Respond Within 5 Seconds

Severity: HIGH

Situation: Receiving webhooks from Shopify

Symptoms:
Webhook deliveries marked as failed.
"Your app didn't respond in time" in Shopify logs.
Missing order/product updates.
Webhooks retried repeatedly then cancelled.

Why this breaks:
Shopify expects a 2xx response within 5 seconds. If your app processes
the webhook data before responding, you'll timeout.

Shopify retries failed webhooks up to 19 times over 48 hours.
After continued failures, webhooks may be cancelled entirely.

Heavy processing (API calls, database operations) must happen
after the response is sent.

Recommended fix:

## Respond immediately, process asynchronously

> See [references/details.md](references/details.md) for full code examples.

## For simple operations, be quick

```typescript
// Simple database update is OK if fast
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, payload } = await authenticate.webhook(request);

  // Quick database update (< 1 second)
  await db.product.update({
    where: { shopifyId: payload.id },
    data: { title: payload.title },
  });

  return new Response(null, { status: 200 });
};
```

## Monitor webhook performance

```typescript
// Log response times
const start = Date.now();

await handleWebhook(payload);

const duration = Date.now() - start;
console.log(`Webhook processed in ${duration}ms`);

// Alert if approaching timeout
if (duration > 3000) {
  console.warn("Webhook processing taking too long!");
}
> See [references/details.md](references/details.md) for full code examples.
// REST API
// X-Shopify-Shop-Api-Call-Limit: 39/40

// GraphQL - check response extensions
const response = await admin.graphql(`...`);
const { data, extensions } = await response.json();

const cost = extensions?.cost;
// {
//   "requestedQueryCost": 42,
//   "actualQueryCost": 42,
//   "throttleStatus": {
//     "maximumAvailable": 1000,
//     "currentlyAvailable": 958,
//     "restoreRate": 50
//   }
// }
```

## Implement retry with exponential backoff

> See [references/details.md](references/details.md) for full code examples.

## Use bulk operations for large datasets

```typescript
// Instead of 1000 individual calls, use bulk mutation
const response = await admin.graphql(`
  mutation {
    bulkOperationRunMutation(
      mutation: "mutation($input: ProductInput!) {
        productUpdate(input: $input) { product { id } }
      }",
      stagedUploadPath: "..."
    ) {
      bulkOperation { id status }
      userErrors { message }
    }
  }
`);
```

## Queue requests

```typescript
import { RateLimiter } from "limiter";

// 2 requests per second for REST
const limiter = new RateLimiter({
  tokensPerInterval: 2,
  interval: "second",
});

async function rateLimitedRequest(fn: () => Promise<any>) {
  await limiter.removeTokens(1);
  return fn();
}
> See [references/details.md](references/details.md) for full code examples.
// Query your app's data access
const response = await admin.graphql(`
  query {
    currentAppInstallation {
      accessScopes {
        handle
      }
    }
  }
`);
```

## Handle missing data gracefully

```typescript
// Webhook payload may have redacted fields
async function processOrder(payload: any) {
  const customerEmail = payload.customer?.email;

  if (!customerEmail) {
    // Customer data not available
    // Either no protected access or data redacted
    console.log("Customer data not available");
    return;
  }

  await sendOrderConfirmation(customerEmail);
}
```

## Use customer account API for direct access

```typescript
// If customer is logged in, can access their data
// through Customer Account API (different from Admin API)
> See [references/details.md](references/details.md) for full code examples.
# shopify.app.toml
[webhooks]
api_version = "2024-10"

[webhooks.subscriptions]
topics = [
  "orders/create",
  "orders/updated",
  "products/create",
  "products/update",
  "app/uninstalled"
]
uri = "/webhooks"
```

## Remove code-based registration

```typescript
// DON'T do this if using TOML
const shopify = shopifyApp({
  // ...
  hooks: {
    afterAuth: async ({ session }) => {
      // Remove webhook registration from here
      // Let TOML handle it
    },
  },
});
```

## Deploy to apply TOML changes

```bash
# Webhooks registered on deploy
shopify app deploy
```

## Check current subscriptions

```typescript
const response = await admin.graphql(`
  query {
    webhookSubscriptions(first: 50) {
      edges {
        node {
          id
          topic
          endpoint {
            ... on WebhookHttpEndpoint {
              callbackUrl
            }
          }
        }
      }
    }
  }
`);
> See [references/details.md](references/details.md) for full code examples.
// Remix/React Router - both work by default
// app/routes/webhooks.tsx handles /webhooks

// Express - add middleware
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safePath = req.path.slice(0, -1);
    res.redirect(301, safePath + query);
  }
  next();
});
```

## Configure web server

```nginx
# Nginx - strip trailing slashes
location ~ ^(.+)/$ {
  return 301 $1;
}

# Or rewrite to handler
location /webhooks {
  try_files $uri $uri/ @webhooks;
}
location @webhooks {
  proxy_pass http://app:3000/webhooks;
}
```

## Test both formats

```bash
# Test without slash
curl -X POST https://your-app.com/webhooks

# Test with slash
curl -X POST https://your-app.com/webhooks/
> See [references/details.md](references/details.md) for full code examples.
// REST (legacy)
const response = await fetch(
  `https://${shop}/admin/api/2024-10/products.json`,
  {
    headers: { "X-Shopify-Access-Token": token },
  }
);

// GraphQL (recommended)
const response = await admin.graphql(`
  query {
    products(first: 10) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`);
```

## Migrate existing REST calls

> See [references/details.md](references/details.md) for full code examples.

## Use GraphQL for webhooks too

```toml
# shopify.app.toml
[webhooks]
api_version = "2024-10"  # Use latest GraphQL version
> See [references/details.md](references/details.md) for full code examples.
<!-- Automatically stays up to date -->
<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
```

## Use AppProvider in React

```typescript
// app/routes/app.tsx
import { AppProvider } from "@shopify/shopify-app-remix/react";

export default function App() {
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <Outlet />
    </AppProvider>
  );
}
```

## Enable embedded auth strategy

```typescript
// shopify.server.ts
const shopify = shopifyApp({
  // ...
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});
```

## Check embedded status

```typescript
import { useAppBridge } from "@shopify/app-bridge-react";

function MyComponent() {
  const app = useAppBridge();
  const isEmbedded = app.hostOrigin !== window.location.origin;
}
> See [references/details.md](references/details.md) for full code examples.
// app/routes/webhooks.tsx
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, payload, shop } = await authenticate.webhook(request);

  switch (topic) {
    case "CUSTOMERS_DATA_REQUEST":
      await handleDataRequest(shop, payload);
      break;

    case "CUSTOMERS_REDACT":
      await handleCustomerRedact(shop, payload);
      break;

    case "SHOP_REDACT":
      await handleShopRedact(shop, payload);
      break;
  }

  return new Response(null, { status: 200 });
};

async function handleDataRequest(shop: string, payload: any) {
  const customerId = payload.customer.id;

  // Return customer data within 30 days
  // Usually send to data_request.destination_url
  const customerData = await db.customer.findUnique({
    where: { shopifyId: customerId, shop },
  });

  if (customerData) {
    // Send to provided URL or email
    await sendDataToMerchant(payload.data_request, customerData);
  }
}

async function handleCustomerRedact(shop: string, payload: any) {
  const customerId = payload.customer.id;

  // Delete customer's personal data
  await db.customer.deleteMany({
    where: { shopifyId: customerId, shop },
  });

  await db.order.updateMany({
    where: { customerId, shop },
    data: { customerEmail: null, customerName: null },
  });
}

async function handleShopRedact(shop: string, payload: any) {
  // Shop uninstalled 48+ hours ago
  // Delete ALL data for this shop
  await db.session.deleteMany({ where: { shop } });
  await db.customer.deleteMany({ where: { shop } });
  await db.order.deleteMany({ where: { shop } });
  await db.settings.deleteMany({ where: { shop } });
}
```

## Even if you store nothing

```typescript
// You must still respond 200
case "CUSTOMERS_DATA_REQUEST":
case "CUSTOMERS_REDACT":
case "SHOP_REDACT":
  // No data stored, but must acknowledge
  console.log(`GDPR ${topic} for ${shop} - no data stored`);
  break;
> See [references/details.md](references/details.md) for full code examples.


---
## Additional Content


  const { data } = await response.json();
  return json({


> Extended reference material: [references/details.md](references/details.md)
