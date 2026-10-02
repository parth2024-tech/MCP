# Email Systems — Code Reference

## ### Implementation:

```

### Monitor:
Track bounce rate by campaign
Alert if bounce rate exceeds 1%

### Missing or hidden unsubscribe link

Severity: CRITICAL

Situation: Users marking as spam because they cannot unsubscribe. Spam complaints
rising. CAN-SPAM violation. Email provider suspends account.

Symptoms:
- Hidden unsubscribe links
- Multi-step unsubscribe process
- No List-Unsubscribe header
- High spam complaint rate

Why this breaks:
Users who cannot unsubscribe will mark as spam. Spam complaints hurt
reputation more than unsubscribes. Also it is literally illegal.
CAN-SPAM, GDPR all require clear unsubscribe.

Recommended fix:

# Unsubscribe requirements:

### Visible:
- Above the fold in email footer
- Clear text, not hidden
- Not styled to be invisible

### One-click:
- Link directly unsubscribes
- No login required
- No "are you sure" hoops

### List-Unsubscribe header:
```


```

### Preference center:
Option to reduce frequency instead of full unsubscribe

### Sending HTML without plain text alternative

Severity: MEDIUM

Situation: Some users see blank emails. Spam filters flagging emails. Accessibility
issues for screen readers. Email clients that strip HTML show nothing.

Symptoms:
- No text/plain part in emails
- Blank emails for some users
- Lower engagement in some segments

Why this breaks:
Not everyone can render HTML. Screen readers work better with plain text.
Spam filters are suspicious of HTML-only. Multipart is the standard.

Recommended fix:

# Always send multipart:
```typescript


```

# Auto-generate text from HTML:
Use html-to-text library as fallback
But hand-crafted plain text is better

# Plain text should be readable:
Not just HTML stripped of tags
Actual formatted text content

### Sending high volume from new IP immediately

Severity: HIGH

Situation: Just switched providers. Started sending 50,000 emails/day immediately.
Massive deliverability issues. New IP has no reputation. Looks like spam.

Symptoms:
- New IP/provider
- Sending high volume immediately
- Sudden deliverability drop

Why this breaks:
New IPs have no reputation. Sending high volume immediately looks
like a spammer who just spun up. You need to gradually build trust.

Recommended fix:

# IP warm-up schedule:

Week 1: 50-100 emails/day
Week 2: 200-500 emails/day
Week 3: 500-1000 emails/day
Week 4: 1000-5000 emails/day
Continue doubling until at volume

# Best practices:
- Start with most engaged users
- Send to Gmail/Microsoft first (they set reputation)
- Maintain consistent volume
- Don't spike and drop

# During warm-up:
- Monitor deliverability closely
- Check feedback loops
- Adjust pace if issues arise

### Emailing people who did not opt in

Severity: CRITICAL

Situation: Bought an email list. Scraped emails from LinkedIn. Added conference
contacts. Spam complaints through the roof. Provider suspends account.
Maybe a lawsuit.

Symptoms:
- Purchased email lists
- Scraped contacts
- High unsubscribe rate on first send
- Spam complaints above 0.1%

Why this breaks:
Permission-based email is not optional. It is the law (CAN-SPAM, GDPR).
It is also effective - unwilling recipients hurt your metrics and
reputation more than they help.

Recommended fix:

# Permission requirements:

### Explicit opt-in:
- User actively chooses to receive email
- Not pre-checked boxes
- Clear what they are signing up for

### Double opt-in:
- Confirmation email with link
- Only add to list after confirmation
- Best practice for marketing lists

### What you cannot do:
- Buy email lists
- Scrape emails from websites
- Add conference contacts without consent
- Use partner/customer lists without consent

### Transactional exception:
Password resets, receipts, account alerts
do not need marketing opt-in

### Emails that are mostly or entirely images

Severity: MEDIUM

Situation: Beautiful designed email that is one big image. Users with images
blocked see nothing. Spam filters flag it. Mobile loading is slow.
No one can copy text.

Symptoms:
- Single image emails
- No text content visible
- Missing or generic alt text
- Low engagement when images blocked

Why this breaks:
Images are blocked by default in many clients. Spam filters are
suspicious of image-only emails. Accessibility suffers. Load times
increase.

Recommended fix:

# Balance images and text:

## 60/40 rule:
- At least 60% text content
- Images for enhancement, not content

### Always include:
- Alt text on every image
- Key message in text, not just image
- Fallback for images-off view

### Test:
- Preview with images disabled
- Should still be usable

# Example:
```html


```

### Missing or default preview text

Severity: MEDIUM

Situation: Inbox shows "View this email in browser" or random HTML as preview.
Lower open rates. First impression wasted on boilerplate.

Symptoms:
- View in browser as preview
- HTML code visible in preview
- No preview component in template

Why this breaks:
Preview text is prime real estate - appears right after subject line.
Default or missing preview text wastes this space. Good preview text
increases open rates 10-30%.

Recommended fix:

# Add explicit preview text:

### In HTML:
```html


## ### With React Email:

```

### Best practices:
- Complement the subject line
- 40-100 characters optimal
- Create curiosity or value
- Different from first line of email

### Not handling partial send failures

Severity: HIGH

Situation: Sending to 10,000 users. API fails at 3,000. No tracking of what sent.
Either double-send or lose 7,000. No way to know who got the email.

Symptoms:
- No per-recipient send logging
- Cannot tell who received email
- Double-sending issues
- No retry mechanism

Why this breaks:
Bulk sends fail partially. APIs timeout. Rate limits hit. Without
tracking individual send status, you cannot recover gracefully.

Recommended fix:

# Track each send individually:

```typescript


```

# Best practices:
- Log every send attempt
- Include message ID for tracking
- Build retry queue for failures
- Monitor success rate per campaign

## Validation Checks

### Missing plain text email part

Severity: WARNING

Emails should always include a plain text alternative

Message: Email being sent with HTML but no plain text part. Add 'text:' property for accessibility and deliverability.

### Hardcoded from email address

Severity: WARNING

From addresses should come from environment variables

Message: From email appears hardcoded. Use environment variable for flexibility.

### Missing bounce webhook handler

Severity: WARNING

Email bounces should be handled to maintain list hygiene

Message: Email provider used but no bounce handling detected. Implement webhook handler for bounces.

### Missing List-Unsubscribe header

Severity: INFO

Marketing emails should include List-Unsubscribe header

Message: Marketing email detected without List-Unsubscribe header. Add header for better deliverability.

### Synchronous email send in request handler

Severity: WARNING

Email sends should be queued, not blocking

Message: Email sent synchronously in request handler. Consider queuing for better reliability.

### Email send without retry logic

Severity: INFO

Email sends should have retry mechanism for failures

Message: Email send without apparent retry logic. Add retry for transient failures.

### Email API key in code

Severity: ERROR

API keys should come from environment variables

Message: Email API key appears hardcoded in source code. Use environment variable.

### Bulk email without rate limiting

Severity: WARNING

Bulk sends should respect provider rate limits

Message: Bulk email sending without apparent rate limiting. Add throttling to avoid hitting limits.

### Email without preview text

Severity: INFO

Emails should include preview/preheader text

Message: Email template without preview text. Add hidden preheader for inbox preview.

### Email send without logging

Severity: WARNING

Email sends should be logged for debugging and auditing

Message: Email being sent without apparent logging. Log sends for debugging and compliance.

## Collaboration

### Delegation Triggers

- copy|subject|messaging|content -> copywriting (Email needs copy)
- design|template|visual|layout -> ui-design (Email needs design)
- track|analytics|measure|metrics -> analytics-architecture (Email needs tracking)
- infrastructure|deploy|server|queue -> devops (Email needs infrastructure)

### Email Marketing Stack

Skills: email-systems, copywriting, marketing, analytics-architecture

Workflow:

```


