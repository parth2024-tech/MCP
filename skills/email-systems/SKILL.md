---
name: email-systems
description: Email has the highest ROI of any marketing channel. $36 for every. Use when the task involves email systems.
  $1 spent. Yet most startups treat it as an afterthought - bulk blasts, no
  personalization, landing in spam folders.
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Email Systems

Email has the highest ROI of any marketing channel. $36 for every $1 spent.
Yet most startups treat it as an afterthought - bulk blasts, no personalization,
landing in spam folders.

This skill covers transactional email that works, marketing automation that
converts, deliverability that reaches inboxes, and the infrastructure decisions
that scale.

## Principles

- Transactional vs Marketing separation | Description: Transactional emails (password reset, receipts) need 100% delivery.
Marketing emails (newsletters, promos) have lower priority. Use separate
IP addresses and providers to protect transactional deliverability. | Examples: Good: Password resets via Postmark, marketing via ConvertKit | Bad: All emails through one SendGrid account
- Permission is everything | Description: Only email people who asked to hear from you. Double opt-in for marketing.
Easy unsubscribe. Clean your list ruthlessly. Bad lists destroy deliverability. | Examples: Good: Confirmed subscription + one-click unsubscribe | Bad: Scraped email list, hidden unsubscribe, bought contacts
- Deliverability is infrastructure | Description: SPF, DKIM, DMARC are not optional. Warm up new IPs. Monitor bounce rates.
Deliverability is earned through technical setup and good behavior. | Examples: Good: All DNS records configured, dedicated IP warmed for 4 weeks | Bad: Using free tier shared IP, no authentication records
- One email, one goal | Description: Each email should have exactly one purpose and one CTA. Multiple asks
means nothing gets clicked. Clear single action. | Examples: Good: "Click here to verify your email" (one button) | Bad: "Verify email, check out our blog, follow us on Twitter, refer a friend..."
- Timing and frequency matter | Description: Wrong time = low open rates. Too frequent = unsubscribes. Let users
set preferences. Test send times. Respect inbox fatigue. | Examples: Good: Weekly digest on Tuesday 10am user's timezone, preference center | Bad: Daily emails at random times, no way to reduce frequency

## Patterns

### Transactional Email Queue

Queue all transactional emails with retry logic and monitoring

**When to use**: Sending any critical email (password reset, receipts, confirmations)

// Don't block request on email send
await queue.add('email', {
  template: 'password-reset',
  to: user.email,
  data: { resetToken, expiresAt }
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});

### Email Event Tracking

Track delivery, opens, clicks, bounces, and complaints

**When to use**: Any email campaign or transactional flow

# Track lifecycle:
- Queued: Email entered system
- Sent: Handed to provider
- Delivered: Reached inbox
- Opened: Recipient viewed
- Clicked: Recipient engaged
- Bounced: Permanent failure
- Complained: Marked as spam

### Template Versioning

Version email templates for rollback and A/B testing

**When to use**: Changing production email templates

templates/
  password-reset/
    v1.tsx (current)
    v2.tsx (testing 10%)
    v1-deprecated.tsx (archived)

# Deploy new version gradually
# Monitor metrics before full rollout

### Bounce Handling State Machine

Automatically handle bounces to protect sender reputation

**When to use**: Processing bounce and complaint webhooks

switch (bounceType) {
  case 'hard':
    await markEmailInvalid(email);
    break;
  case 'soft':
    await incrementBounceCount(email);
    if (count >= 3) await markEmailInvalid(email);
    break;
  case 'complaint':
    await unsubscribeImmediately(email);
    break;
}

### React Email Components

Build emails with reusable React components

**When to use**: Creating email templates

import { Button, Html } from '@react-email/components';

export default function WelcomeEmail({ userName }) {
  return (
    <Html>
      <h1>Welcome {userName}!</h1>
      <Button href="https://app.com/start">
        Get Started
      </Button>
    </Html>
  );
}

### Preference Center

Let users control email frequency and topics

**When to use**: Building marketing or notification systems

Preferences:
☑ Product updates (weekly)
☑ New features (monthly)
☐ Marketing promotions
☑ Account notifications (always)

# Respect preferences in all sends
# Required for GDPR compliance

## Sharp Edges

### Missing SPF, DKIM, or DMARC records

Severity: CRITICAL

Situation: Sending emails without authentication. Emails going to spam folder.
Low open rates. No idea why. Turns out DNS records were never set up.

Symptoms:
- Emails going to spam
- Low deliverability rates
- mail-tester.com score below 8
- No DMARC reports received

Why this breaks:
Email authentication (SPF, DKIM, DMARC) tells receiving servers you're
legit. Without them, you look like a spammer. Modern email providers
increasingly require all three.

Recommended fix:

# Required DNS records:

## SPF (Sender Policy Framework)
TXT record: v=spf1 include:_spf.google.com include:sendgrid.net ~all

## DKIM (DomainKeys Identified Mail)
TXT record provided by your email provider
Adds cryptographic signature to emails

## DMARC (Domain-based Message Authentication)
TXT record: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com

# Verify setup:
- Send test email to mail-tester.com
- Check MXToolbox for record validation
- Monitor DMARC reports

### Using shared IP for transactional email

Severity: HIGH

Situation: Password resets going to spam. Using free tier of email provider.
Some other customer on your shared IP got flagged for spam.
Your reputation is ruined by association.

Symptoms:
- Transactional emails in spam
- Inconsistent delivery
- Using same provider for marketing and transactional

Why this breaks:
Shared IPs share reputation. One bad actor affects everyone. For
critical transactional email, you need your own IP or a provider
with strict shared IP policies.

Recommended fix:

# Transactional email strategy:

## Option 1: Dedicated IP (high volume)
- Get dedicated IP from your provider
- Warm it up slowly (start with 100/day)
- Maintain consistent volume

## Option 2: Transactional-only provider
- Postmark (very strict, great reputation)
- Includes shared pool with high standards

### Separate concerns:
- Transactional: Postmark or Resend
- Marketing: ConvertKit or Customer.io
- Never mix marketing and transactional

### Not processing bounce notifications

Severity: HIGH

Situation: Emailing same dead addresses over and over. Bounce rate climbing.
Email provider threatening to suspend account. List is 40% dead.

Symptoms:
- Bounce rate above 2%
- No webhook handlers for bounces
- Same emails failing repeatedly

Why this breaks:
Bounces damage sender reputation. Email providers track bounce rates.
Above 2% and you start looking like a spammer. Dead addresses must
be removed immediately.

Recommended fix:

# Bounce handling requirements:

### Hard bounces:
Remove immediately on first occurrence
Invalid address, domain doesn't exist

### Soft bounces:
Retry 3 times over 72 hours
After 3 failures, treat as hard bounce

### Implementation:
```typescript
// Webhook handler for bounces
app.post('/webhooks/email', (req, res) => {
  const event = req.body;
  if (event.type === 'bounce') {
    await markEmailInvalid(event.email);
    await removeFromAllLists(event.email);
  }
});
> See [references/details.md](references/details.md) for full code examples.
List-Unsubscribe: <mailto:unsubscribe@example.com>,
  <https://example.com/unsubscribe?token=xxx>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
await resend.emails.send({
  from: 'you@example.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  text: 'Welcome!/n/nThanks for signing up.',
});
<img
  src="hero.jpg"
  alt="Save 50% this week - use code SAVE50"
  style="max-width: 100%"
/>
<p>Use code <strong>SAVE50</strong> to save 50% this week.</p>
<div style="display:none;max-height:0;overflow:hidden;">
  Your preview text here. This appears in inbox preview.
  <!-- Add whitespace to push footer text out -->
  &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
</div>
```

### With React Email:
```tsx
<Preview>
  Your preview text here. This appears in inbox preview.
</Preview>
> See [references/details.md](references/details.md) for full code examples.
async function sendCampaign(emails: string[]) {
  const results = await Promise.allSettled(
    emails.map(async (email) => {
      try {
        const result = await resend.emails.send({ to: email, ... });
        await db.emailLog.create({
          email,
          status: 'sent',
          messageId: result.id,
        });
        return result;
      } catch (error) {
        await db.emailLog.create({
          email,
          status: 'failed',
          error: error.message,
        });
        throw error;
      }
    })
  );

  const failed = results.filter(r => r.status === 'rejected');
  // Retry failed sends or alert
}
1. Infrastructure setup (email-systems)
2. Template creation (email-systems)
3. Copy writing (copywriting)
4. Campaign launch (marketing)
5. Performance tracking (analytics-architecture)
```

### Transactional Email

Skills: email-systems, backend, devops

Workflow:

```
1. Provider setup (email-systems)
2. Template coding (email-systems)
3. Queue integration (backend)
4. Monitoring (devops)
```

## When to Use
Use this skill when the request clearly matches the capabilities and patterns described above.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
