# Plaid Fintech — Extended Reference

  if (availableBalance < amount) {
    throw new Error('Insufficient funds');
  }

  // Get ACH numbers and initiate transfer
  const authResponse = await plaidClient.authGet({
    access_token: accessToken,
  });

  const achNumbers = authResponse.data.numbers.ach.find(
    n => n.account_id === account.account_id
  );

  // Initiate ACH transfer with your payment processor
  return await initiateACHTransfer({
    routingNumber: achNumbers.routing,
    accountNumber: achNumbers.account,
    amount,
    accountType: account.subtype,
  });
}

### Context

- ach transfers
- money movement
- account funding

### Real-Time Balance Check

Use /accounts/balance/get for real-time balance (paid endpoint).
/accounts/get returns cached data suitable for display but not
real-time decisions.

interface BalanceInfo {
  accountId: string;
  available: number | null;
  current: number;
  limit: number | null;
  isoCurrencyCode: string;
  lastUpdated: Date;
  isRealtime: boolean;
}

// Get cached balance (free, suitable for display)
async function getCachedBalances(accessToken: string): Promise<BalanceInfo[]> {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  return response.data.accounts.map(account => ({
    accountId: account.account_id,
    available: account.balances.available,
    current: account.balances.current,
    limit: account.balances.limit,
    isoCurrencyCode: account.balances.iso_currency_code || 'USD',
    lastUpdated: new Date(account.balances.last_updated_datetime || Date.now()),
    isRealtime: false,
  }));
}

// Get real-time balance (paid, for payment validation)
async function getRealTimeBalance(
  accessToken: string,
  accountIds?: string[]
): Promise<BalanceInfo[]> {
  const response = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
    options: accountIds ? { account_ids: accountIds } : undefined,
  });

  return response.data.accounts.map(account => ({
    accountId: account.account_id,
    available: account.balances.available,
    current: account.balances.current,
    limit: account.balances.limit,
    isoCurrencyCode: account.balances.iso_currency_code || 'USD',
    lastUpdated: new Date(),
    isRealtime: true,
  }));
}

// Payment validation with balance check
async function validatePayment(
  accessToken: string,
  accountId: string,
  amount: number
): Promise<PaymentValidation> {
  const balances = await getRealTimeBalance(accessToken, [accountId]);
  const account = balances.find(b => b.accountId === accountId);

  if (!account) {
    return { valid: false, reason: 'Account not found' };
  }

  const available = account.available ?? account.current;

  if (available < amount) {
    return {
      valid: false,
      reason: 'Insufficient funds',
      available,
      requested: amount,
    };
  }

  return {
    valid: true,
    available,
    requested: amount,
  };
}

### Context

- balance checking
- fund availability
- payment validation

### Webhook Verification

Verify Plaid webhooks using the verification key endpoint.
Handle duplicate webhooks idempotently and design for out-of-order
delivery.

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Cache JWKS client
const client = jwksClient({
  jwksUri: 'https://production.plaid.com/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 86400000,  // 24 hours
});

async function getSigningKey(kid: string): Promise<string> {
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

async function verifyPlaidWebhook(req: Request): Promise<boolean> {
  const signedJwt = req.headers['plaid-verification'];

  if (!signedJwt) {
    return false;
  }

  try {
    // Decode to get kid
    const decoded = jwt.decode(signedJwt, { complete: true });
    if (!decoded?.header?.kid) {
      return false;
    }

    // Get signing key
    const key = await getSigningKey(decoded.header.kid);

    // Verify JWT
    const claims = jwt.verify(signedJwt, key, {
      algorithms: ['ES256'],
    }) as any;

    // Verify body hash
    const bodyHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (claims.request_body_sha256 !== bodyHash) {
      return false;
    }

    // Check timestamp (within 5 minutes)
    const issuedAt = new Date(claims.iat * 1000);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (issuedAt < fiveMinutesAgo) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Webhook verification failed:', error);
    return false;
  }
}

// Idempotent webhook handler
app.post('/api/plaid/webhooks', async (req, res) => {
  // Verify webhook signature
  if (!await verifyPlaidWebhook(req)) {
    return res.status(401).send('Invalid signature');
  }

  const { webhook_type, webhook_code, item_id } = req.body;

  // Create idempotency key
  const idempotencyKey = `${webhook_type}:${webhook_code}:${item_id}:${JSON.stringify(req.body)}`;
  const idempotencyHash = crypto.createHash('sha256').update(idempotencyKey).digest('hex');

  // Check if already processed
  const existing = await db.webhookLog.findUnique({
    where: { idempotencyHash },
  });

  if (existing) {
    console.log('Duplicate webhook, skipping:', idempotencyHash);
    return res.sendStatus(200);
  }

  // Record webhook before processing
  await db.webhookLog.create({
    data: {
      idempotencyHash,
      webhookType: webhook_type,
      webhookCode: webhook_code,
      itemId: item_id,
      payload: req.body,
      processedAt: new Date(),
    },
  });

  // Process webhook (async for quick response)
  processWebhookAsync(req.body).catch(console.error);

  res.sendStatus(200);
});

### Context

- webhook security
- event processing
- production deployment

## Sharp Edges

### Access Tokens Never Expire But Are Highly Sensitive

Severity: CRITICAL

### accounts/get Returns Cached Balances, Not Real-Time

Severity: HIGH

### Webhooks May Arrive Out of Order or Duplicated

Severity: HIGH

### Items Enter Error States That Require User Action

Severity: HIGH

### Sandbox Does Not Reflect Production Complexity

Severity: MEDIUM

### TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION Requires Restart

Severity: MEDIUM

### Link Tokens Are Short-Lived and Single-Use

Severity: MEDIUM

### Recurring Transactions Need 180+ Days of History

Severity: MEDIUM

## Validation Checks

### Access Token Stored in Plain Text

Severity: ERROR

Plaid access tokens must be encrypted at rest

Message: Plaid access token appears to be stored unencrypted. Encrypt at rest.

### Plaid Secret in Client Code

Severity: ERROR

Plaid secret must never be exposed to clients

Message: Plaid secret may be exposed. Keep server-side only.

### Hardcoded Plaid Credentials

Severity: ERROR

Credentials must use environment variables

Message: Hardcoded Plaid credentials. Use environment variables.

### Missing Webhook Signature Verification

Severity: ERROR

Plaid webhooks must verify JWT signature

Message: Webhook handler without signature verification. Verify Plaid-Verification header.

### Using Cached Balance for Payment Decision

Severity: ERROR

Use real-time balance for payment validation

Message: Using accountsGet (cached) for payment. Use accountsBalanceGet for real-time balance.

### Missing Item Error State Handling

Severity: WARNING

API calls should handle ITEM_LOGIN_REQUIRED

Message: API call without ITEM_LOGIN_REQUIRED handling. Handle item error states.

### Polling for Transactions Instead of Webhooks

Severity: WARNING

Use webhooks for transaction updates

Message: Polling for transactions. Configure webhooks for SYNC_UPDATES_AVAILABLE.

### Link Token Cached or Reused

Severity: WARNING

Link tokens are single-use and expire in 4 hours

Message: Link tokens should not be cached. Create fresh token for each session.

### Using Deprecated Public Key

Severity: ERROR

Public key integration ended January 2025

Message: Public key is deprecated. Use Link tokens instead.

### Transaction Sync Without Cursor Storage

Severity: WARNING

Store cursor for incremental syncs

Message: Transaction sync without cursor persistence. Store cursor for incremental sync.

## Collaboration

### Delegation Triggers

- user needs payment processing -> stripe-integration (Stripe for actual payment, Plaid for account linking)
- user needs budgeting features -> analytics-specialist (Transaction categorization and analysis)
- user needs investment tracking -> data-engineer (Portfolio analysis and reporting)
- user needs compliance/audit -> security-specialist (SOC 2, PCI compliance)
- user needs mobile app -> mobile-developer (React Native Plaid SDK)

## When to Use
- User mentions or implies: plaid
- User mentions or implies: bank account linking
- User mentions or implies: bank connection
- User mentions or implies: ach
- User mentions or implies: account aggregation
- User mentions or implies: bank transactions
- User mentions or implies: open banking
- User mentions or implies: fintech
- User mentions or implies: identity verification banking

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
