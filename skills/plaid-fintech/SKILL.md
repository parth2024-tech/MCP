---
name: plaid-fintech
description: Expert patterns for Plaid API integration including Link token. Use when the task involves plaid fintech.
  flows, transactions sync, identity verification, Auth for ACH, balance checks,
  webhook handling, and fintech compliance best practices.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Plaid Fintech

Expert patterns for Plaid API integration including Link token flows,
transactions sync, identity verification, Auth for ACH, balance checks,
webhook handling, and fintech compliance best practices.

## Patterns

### Link Token Creation and Exchange

Create a link_token for Plaid Link, exchange public_token for access_token.
Link tokens are short-lived, one-time use. Access tokens don't expire but
may need updating when users change passwords.

// server.ts - Link token creation endpoint
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Create link token for new user
app.post('/api/plaid/create-link-token', async (req, res) => {
  const { userId } = req.body;

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,  // Your internal user ID
      },
      client_name: 'My Finance App',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: 'https://yourapp.com/api/plaid/webhooks',
      // Request 180 days for recurring transactions
      transactions: {
        days_requested: 180,
      },
    });

    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Link token creation failed:', error);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token
app.post('/api/plaid/exchange-token', async (req, res) => {
  const { publicToken, userId } = req.body;

  try {
    // Exchange for permanent access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Store securely - access_token doesn't expire!
    await db.plaidItem.create({
      data: {
        userId,
        itemId: item_id,
        accessToken: await encrypt(access_token),  // Encrypt at rest
        status: 'ACTIVE',
        products: ['transactions'],
      },
    });

    // Trigger initial transaction sync
    await initiateTransactionSync(item_id, access_token);

    res.json({ success: true, itemId: item_id });
  } catch (error) {
    console.error('Token exchange failed:', error);
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// Frontend - React component
import { usePlaidLink } from 'react-plaid-link';

function BankLinkButton({ userId }: { userId: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    async function createLinkToken() {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const { link_token } = await response.json();
      setLinkToken(link_token);
    }
    createLinkToken();
  }, [userId]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      // Exchange public token for access token
      await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, userId }),
      });
    },
    onExit: (error, metadata) => {
      if (error) {
        console.error('Link exit error:', error);
      }
    },
  });

  return (
    <button onClick={() => open()} disabled={!ready}>
      Connect Bank Account
    </button>
  );
}

### Context

- initial bank linking
- user onboarding
- connecting accounts

### Transactions Sync

Use /transactions/sync for incremental transaction updates. More efficient
than /transactions/get. Handle webhooks for real-time updates instead of
polling.

// Transactions sync service
interface TransactionSyncState {
  cursor: string | null;
  hasMore: boolean;
}

async function syncTransactions(
  accessToken: string,
  itemId: string
): Promise<void> {
  // Get last cursor from database
  const item = await db.plaidItem.findUnique({
    where: { itemId },
  });

  let cursor = item?.transactionsCursor || null;
  let hasMore = true;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  while (hasMore) {
    try {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor || undefined,
        count: 500,  // Max per request
      });

      const { added, modified, removed, next_cursor, has_more } = response.data;

      // Process added transactions
      if (added.length > 0) {
        await db.transaction.createMany({
          data: added.map(txn => ({
            plaidTransactionId: txn.transaction_id,
            itemId,
            accountId: txn.account_id,
            amount: txn.amount,
            date: new Date(txn.date),
            name: txn.name,
            merchantName: txn.merchant_name,
            category: txn.personal_finance_category?.primary,
            subcategory: txn.personal_finance_category?.detailed,
            pending: txn.pending,
            paymentChannel: txn.payment_channel,
            location: txn.location ? JSON.stringify(txn.location) : null,
          })),
          skipDuplicates: true,
        });
        addedCount += added.length;
      }

      // Process modified transactions
      for (const txn of modified) {
        await db.transaction.updateMany({
          where: { plaidTransactionId: txn.transaction_id },
          data: {
            amount: txn.amount,
            name: txn.name,
            merchantName: txn.merchant_name,
            pending: txn.pending,
            updatedAt: new Date(),
          },
        });
        modifiedCount++;
      }

      // Process removed transactions
      if (removed.length > 0) {
        await db.transaction.deleteMany({
          where: {
            plaidTransactionId: {
              in: removed.map(r => r.transaction_id),
            },
          },
        });
        removedCount += removed.length;
      }

      cursor = next_cursor;
      hasMore = has_more;

    } catch (error: any) {
      if (error.response?.data?.error_code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION') {
        // Data changed during pagination, restart from null
        cursor = null;
        continue;
      }
      throw error;
    }
  }

  // Save cursor for next sync
  await db.plaidItem.update({
    where: { itemId },
    data: { transactionsCursor: cursor },
  });

  console.log(`Sync complete: +${addedCount} ~${modifiedCount} -${removedCount}`);
}

// Webhook handler for real-time updates
app.post('/api/plaid/webhooks', async (req, res) => {
  const { webhook_type, webhook_code, item_id } = req.body;

  // Verify webhook (see webhook verification pattern)
  if (!verifyPlaidWebhook(req)) {
    return res.status(401).send('Invalid webhook');
  }

  if (webhook_type === 'TRANSACTIONS') {
    switch (webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE':
        // New transactions available, trigger sync
        await queueTransactionSync(item_id);
        break;
      case 'INITIAL_UPDATE':
        // Initial batch of transactions ready
        await queueTransactionSync(item_id);
        break;
      case 'HISTORICAL_UPDATE':
        // Historical transactions ready
        await queueTransactionSync(item_id);
        break;
    }
  }

  res.sendStatus(200);
});

### Context

- fetching transactions
- transaction history
- account activity

### Item Error Handling and Update Mode

Handle ITEM_LOGIN_REQUIRED errors by putting users through Link update mode.
Listen for PENDING_DISCONNECT webhook to proactively prompt users.

// Create link token for update mode
app.post('/api/plaid/create-update-token', async (req, res) => {
  const { itemId } = req.body;

  const item = await db.plaidItem.findUnique({
    where: { itemId },
    include: { user: true },
  });

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: item.userId,
      },
      client_name: 'My Finance App',
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: 'https://yourapp.com/api/plaid/webhooks',
      // Update mode: provide access_token instead of products
      access_token: await decrypt(item.accessToken),
    });

    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Update token creation failed:', error);
    res.status(500).json({ error: 'Failed to create update token' });
  }
});

// Handle item errors from webhooks
app.post('/api/plaid/webhooks', async (req, res) => {
  const { webhook_type, webhook_code, item_id, error } = req.body;

  if (webhook_type === 'ITEM') {
    switch (webhook_code) {
      case 'ERROR':
        // Item has entered an error state
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: {
            status: 'ERROR',
            errorCode: error?.error_code,
            errorMessage: error?.error_message,
          },
        });

        // Notify user to reconnect
        if (error?.error_code === 'ITEM_LOGIN_REQUIRED') {
          await notifyUserReconnect(item_id, 'Please reconnect your bank account');
        }
        break;

      case 'PENDING_DISCONNECT':
        // User needs to reauthorize soon
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: { status: 'PENDING_DISCONNECT' },
        });

        // Proactive notification
        await notifyUserReconnect(item_id, 'Your bank connection will expire soon');
        break;

      case 'USER_PERMISSION_REVOKED':
        // User revoked access at their bank
        await db.plaidItem.update({
          where: { itemId: item_id },
          data: { status: 'REVOKED' },
        });

        // Clean up stored data
        await db.transaction.deleteMany({
          where: { itemId: item_id },
        });
        break;
    }
  }

  res.sendStatus(200);
});

// Check item status before API calls
async function getItemWithValidation(itemId: string) {
  const item = await db.plaidItem.findUnique({
    where: { itemId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  if (item.status === 'ERROR') {
    throw new ItemNeedsUpdateError(item.errorCode, item.errorMessage);
  }

  return item;
}

### Context

- error recovery
- reauthorization
- credential updates

### Auth for ACH Transfers

Use Auth product to get account and routing numbers for ACH transfers.
Combine with Identity to verify account ownership before initiating
transfers.

// Get account and routing numbers
async function getACHNumbers(accessToken: string): Promise<ACHInfo[]> {
  const response = await plaidClient.authGet({
    access_token: accessToken,
  });

  const { accounts, numbers } = response.data;

  // Map ACH numbers to accounts
  return accounts.map(account => {
    const achNumber = numbers.ach.find(
      n => n.account_id === account.account_id
    );

    return {
      accountId: account.account_id,
      name: account.name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      routing: achNumber?.routing,
      account: achNumber?.account,
      wireRouting: achNumber?.wire_routing,
    };
  });
}

// Verify identity before ACH transfer
async function verifyAndInitiateTransfer(
  accessToken: string,
  userId: string,
  amount: number
): Promise<TransferResult> {
  // Get identity from linked account
  const identityResponse = await plaidClient.identityGet({
    access_token: accessToken,
  });

  const accountOwners = identityResponse.data.accounts[0]?.owners || [];

  // Get user's stored identity
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  // Match identity
  const matchResponse = await plaidClient.identityMatch({
    access_token: accessToken,
    user: {
      legal_name: user.legalName,
      phone_number: user.phoneNumber,
      email_address: user.email,
      address: {
        street: user.street,
        city: user.city,
        region: user.state,
        postal_code: user.postalCode,
        country: 'US',
      },
    },
  });

  const matchScores = matchResponse.data.accounts[0]?.legal_name;

  // Require high confidence for transfers
  if ((matchScores?.score || 0) < 70) {
    throw new Error('Identity verification failed');
  }

  // Get real-time balance for the transfer
  const balanceResponse = await plaidClient.accountsBalanceGet({
    access_token: accessToken,
  });

  const account = balanceResponse.data.accounts[0];

  // Check sufficient funds (consider pending)
  const availableBalance = account.balances.available ?? account.balances.current;


> See [references/details.md](references/details.md) for extended content.
