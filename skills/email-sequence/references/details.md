# Email Sequence — Code Reference

## ### For Each Email

```

### Metrics Plan
What to measure and benchmarks

---

## Questions to Ask

If you need more context:
1. What triggers entry to this sequence?
2. What's the primary goal/conversion action?
3. Who is the audience?
4. What do they already know about you?
5. What other emails are they receiving?
6. What's your current email performance?

---

## Related Skills

- **onboarding-cro**: For in-app onboarding (email supports this)
- **copywriting**: For landing pages emails link to
- **ab-test-setup**: For testing email elements
- **popup-cro**: For email capture popups

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.




---

**Best timing**:
- Around monthly renewal date
- End of year / new year
- After 3-6 months of loyalty
- Price increase announcement (lock in old rate)

---

#### Failed Payment Recovery
**Trigger**: Payment fails
**Goal**: Recover revenue, retain customer
**Typical sequence**: 3-4 emails over 7-14 days

**Sequence structure**:
- Email 1 (Day 0): Friendly notice, update payment link
- Email 2 (Day 3): Reminder, service may be interrupted
- Email 3 (Day 7): Urgent, account will be suspended
- Email 4 (Day 10-14): Final notice, what they'll lose

**Copy approach**:
- Assume it's an accident (card expired, etc.)
- Clear, direct, no guilt
- Single CTA to update payment
- Explain what happens if not resolved

**Key metrics**: Recovery rate, time to recovery

---

#### Cancellation Survey
**Trigger**: User cancels subscription
**Goal**: Learn why, opportunity to save
**Format**: Single email (immediate)

**Options**:
- In-app survey at cancellation (better completion)
- Follow-up email if they skip in-app
- Personal outreach for high-value accounts

**Questions to ask**:
- Primary reason for cancelling
- What could we have done better
- Would anything change your mind
- Can we help with transition

**Winback opportunity**: Based on reason, offer targeted save (discount, pause, downgrade, training).

---

#### Upcoming Renewal Reminder
**Trigger**: X days before renewal (14 or 30 days typical)
**Goal**: No surprise charges, opportunity to expand
**Format**: Single email

**What to include**:
- Renewal date and amount
- What's included in renewal
- How to update payment/plan
- Changes to pricing/features (if any)
- Optional: Upsell opportunity

**Required for**: Annual subscriptions, high-value contracts

---

### Usage Emails

#### Daily/Weekly/Monthly Summary
**Trigger**: Time-based
**Goal**: Drive engagement, demonstrate value
**Format**: Single email, recurring

**Content by frequency**:
- **Daily**: Notifications, quick stats (for high-engagement products)
- **Weekly**: Activity summary, highlights, suggestions
- **Monthly**: Comprehensive report, achievements, ROI if calculable

**Structure**:
- Key metrics at a glance
- Notable achievements
- Activity breakdown
- Suggestions / what to try next
- CTA to dive deeper

**Personalization**: Must be relevant to their actual usage. Empty reports are worse than no report.

---

#### Key Event or Milestone Notifications
**Trigger**: Specific achievement or event
**Goal**: Celebrate, drive continued engagement
**Format**: Single email per event

**Milestone examples**:
- First [action] completed
- 10th/100th [thing] created
- Goal achieved
- Team collaboration milestone
- Usage streak

**Copy approach**:
- Celebration tone
- Specific achievement
- Context (compared to others, compared to before)
- What's next / next milestone

---

### Win-Back Emails

#### Expired Trials
**Trigger**: Trial ended without conversion
**Goal**: Convert or re-engage
**Typical sequence**: 3-4 emails over 30 days

**Sequence structure**:
- Email 1 (Day 1 post-expiry): Trial ended, here's what you're missing
- Email 2 (Day 7): What held you back? (gather feedback)
- Email 3 (Day 14): Incentive offer (discount, extended trial)
- Email 4 (Day 30): Final reach-out, door is open

**Segmentation**: Different approach based on trial engagement level:
- High engagement: Focus on removing friction to convert
- Low engagement: Offer fresh start, more onboarding help
- No engagement: Ask what happened, offer demo/call

---

#### Cancelled Customers
**Trigger**: Time after cancellation (30, 60, 90 days)
**Goal**: Win back churned customers
**Typical sequence**: 2-3 emails spread over 90 days

**Sequence structure**:
- Email 1 (Day 30): What's new since you left
- Email 2 (Day 60): We've addressed [common reason]
- Email 3 (Day 90): Special offer to return

**Copy approach**:
- No guilt, no desperation
- Genuine updates and improvements
- Personalize based on cancellation reason if known
- Make return easy

**Key point**: They're more likely to return if their reason was addressed.

---

### Campaign Emails

#### Monthly Roundup / Newsletter
**Trigger**: Time-based (monthly)
**Goal**: Engagement, brand presence, content distribution
**Format**: Single email, recurring

**Content mix**:
- Product updates and tips
- Customer stories
- Educational content
- Company news
- Industry insights

**Best practices**:
- Consistent send day/time
- Scannable format
- Mix of content types
- One primary CTA focus
- Unsubscribe is okay—keeps list healthy

---

#### Seasonal Promotions
**Trigger**: Calendar events (Black Friday, New Year, etc.)
**Goal**: Drive conversions with timely offer
**Format**: Campaign burst (2-4 emails)

**Common opportunities**:
- New Year (fresh start, annual planning)
- End of fiscal year (budget spending)
- Black Friday / Cyber Monday
- Industry-specific seasons
- Back to school / work

**Sequence structure**:
- Announcement: Offer reveal
- Reminder: Midway through promotion
- Last chance: Final hours

---

#### Product Updates
**Trigger**: New feature release
**Goal**: Adoption, engagement, demonstrate momentum
**Format**: Single email per major release

**What to include**:
- What's new (clear and simple)
- Why it matters (benefit, not just feature)
- How to use it (direct link)
- Who asked for it (community acknowledgment)

**Segmentation**: Consider targeting based on relevance:
- Users who would benefit most
- Users who requested feature
- Power users first (for beta feel)

---

#### Industry News Roundup
**Trigger**: Time-based (weekly or monthly)
**Goal**: Thought leadership, engagement, brand value
**Format**: Curated newsletter

**Content**:
- Curated news and links
- Your take / commentary
- What it means for readers
- How your product helps

**Best for**: B2B products where customers care about industry trends.

---

#### Pricing Update
**Trigger**: Price change announcement
**Goal**: Transparent communication, minimize churn
**Format**: Single email (or sequence for major changes)

**Timeline**:
- Announce 30-60 days before change
- Reminder 14 days before
- Final notice 7 days before

**Copy approach**:
- Clear, direct, transparent
- Explain the why (value delivered, costs increased)
- Grandfather if possible (lock in old rate)
- Give options (annual lock-in, downgrade)

**Important**: Honesty and advance notice build trust even when price increases.

---

## Email Audit Checklist

Use this to audit your current email program:

### Onboarding
- [ ] New users series
- [ ] New customers series
- [ ] Key onboarding step reminders
- [ ] New user invite sequence

### Retention
- [ ] Upgrade to paid sequence
- [ ] Upgrade to higher plan triggers
- [ ] Ask for review (timed properly)
- [ ] Proactive support outreach
- [ ] Product usage reports
- [ ] NPS survey
- [ ] Referral program emails

### Billing
- [ ] Switch to annual campaign
- [ ] Failed payment recovery sequence
- [ ] Cancellation survey
- [ ] Upcoming renewal reminders

### Usage
- [ ] Daily/weekly/monthly summaries
- [ ] Key event notifications
- [ ] Milestone celebrations

### Win-Back
- [ ] Expired trial sequence
- [ ] Cancelled customer sequence

### Campaigns
- [ ] Monthly roundup / newsletter
- [ ] Seasonal promotion calendar
- [ ] Product update announcements
- [ ] Pricing update communications

---

## Email Copy Guidelines

### Structure
1. **Hook**: First line grabs attention
2. **Context**: Why this matters to them
3. **Value**: The useful content
4. **CTA**: What to do next
5. **Sign-off**: Human, warm close

### Formatting
- Short paragraphs (1-3 sentences)
- White space between sections
- Bullet points for scanability
- Bold for emphasis (sparingly)
- Mobile-first (most read on phone)

### Tone
- Conversational, not formal
- First-person (I/we) and second-person (you)
- Active voice
- Match your brand but lean friendly
- Read it out loud—does it sound human?

### Length
- Shorter is usually better
- 50-125 words for transactional
- 150-300 words for educational
- 300-500 words for story-driven
- If it's long, it better be good

### CTA Buttons vs. Links
- Buttons: Primary actions, high-visibility
- Links: Secondary actions, in-text
- One clear primary CTA per email
- Button text: Action + outcome

---

## Personalization

### Merge Fields
- First name (fallback to "there" or "friend")
- Company name (B2B)
- Relevant data (usage, plan, etc.)

### Dynamic Content
- Based on segment
- Based on behavior
- Based on stage

### Triggered Emails
- Action-based sends
- More relevant than time-based
- Examples: Feature used, milestone hit, inactivity

---

## Segmentation Strategies

### By Behavior
- Openers vs. non-openers
- Clickers vs. non-clickers
- Active vs. inactive

### By Stage
- Trial vs. paid
- New vs. long-term
- Engaged vs. at-risk

### By Profile
- Industry/role (B2B)
- Use case / goal
- Company size

---

## Testing and Optimization

### What to Test
- Subject lines (highest impact)
- Send times
- Email length
- CTA placement and copy
- Personalization level
- Sequence timing

### How to Test
- A/B test one variable at a time
- Sufficient sample size
- Statistical significance
- Document learnings

### Metrics to Track
- Open rate (benchmark: 20-40%)
- Click rate (benchmark: 2-5%)
- Unsubscribe rate (keep under 0.5%)
- Conversion rate (specific to sequence goal)
- Revenue per email (if applicable)

---

## Output Format

### Sequence Overview
```
Sequence Name: [Name]
Trigger: [What starts the sequence]
Goal: [Primary conversion goal]
Length: [Number of emails]
Timing: [Delay between emails]
Exit Conditions: [When they leave the sequence]
```

### For Each Email
```
Email [#]: [Name/Purpose]
Send: [Timing]
Subject: [Subject line]
Preview: [Preview text]
Body: [Full copy]
CTA: [Button text] → [Link destination]
Segment/Conditions: [If applicable]
> See [references/details.md](references/details.md) for full code examples.
