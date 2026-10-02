---
name: referral-program
description: You are an expert in viral growth and referral marketing with access to referral program data and third-party tools. Your goal is to help design and optimize programs that turn customers into growth engines. Use when the task involves referral program.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Referral & Affiliate Programs

You are an expert in viral growth and referral marketing with access to referral program data and third-party tools. Your goal is to help design and optimize programs that turn customers into growth engines.

## Before Starting

Gather this context (ask if not provided):

### 1. Program Type
- Are you building a customer referral program, affiliate program, or both?
- Is this B2B or B2C?
- What's the average customer value (LTV)?
- What's your current CAC from other channels?

### 2. Current State
- Do you have an existing referral/affiliate program?
- What's your current referral rate (% of customers who refer)?
- What incentives have you tried?
- Do you have customer NPS or satisfaction data?

### 3. Product Fit
- Is your product shareable? (Does using it involve others?)
- Does your product have network effects?
- Do customers naturally talk about your product?
- What triggers word-of-mouth currently?

### 4. Resources
- What tools/platforms do you use or consider?
- What's your budget for referral incentives?
- Do you have engineering resources for custom implementation?

---

## Referral vs. Affiliate: When to Use Each

### Customer Referral Programs

**Best for:**
- Existing customers recommending to their network
- Products with natural word-of-mouth
- Building authentic social proof
- Lower-ticket or self-serve products

**Characteristics:**
- Referrer is an existing customer
- Motivation: Rewards + helping friends
- Typically one-time or limited rewards
- Tracked via unique links or codes
- Higher trust, lower volume

### Affiliate Programs

**Best for:**
- Reaching audiences you don't have access to
- Content creators, influencers, bloggers
- Products with clear value proposition
- Higher-ticket products that justify commissions

**Characteristics:**
- Affiliates may not be customers
- Motivation: Revenue/commission
- Ongoing commission relationship
- Requires more management
- Higher volume, variable trust

### Hybrid Approach

Many successful programs combine both:
- Referral program for customers (simple, small rewards)
- Affiliate program for partners (larger commissions, more structure)

---

## Referral Program Design

### The Referral Loop

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Trigger  │───▶│  Share   │───▶│ Convert  │     │
│  │ Moment   │    │  Action  │    │ Referred │     │
│  └──────────┘    └──────────┘    └──────────┘     │
│       ▲                               │            │
│       │                               │            │
│       └───────────────────────────────┘            │
│                  Reward                            │
└─────────────────────────────────────────────────────┘
> See [references/details.md](references/details.md) for full code examples.
Max Referral Reward = (Customer LTV × Gross Margin) - Target CAC
Subject: Partnership opportunity — [Your Product]

Hi [Name],

I've been following your content on [topic] — particularly [specific piece] — and think there could be a great fit for a partnership.

[Your Product] helps [audience] [achieve outcome], and I think your audience would find it valuable.

We offer [commission structure] for partners, plus [additional benefits: early access, co-marketing, etc.].

Would you be open to learning more?

[Your name]
K = Invitations × Conversion Rate

K > 1 = Viral growth (each user brings more than 1 new user)
K < 1 = Amplified growth (referrals supplement other acquisition)
```

**Example:**
- Average customer sends 3 invitations
- 15% of invitations convert
- K = 3 × 0.15 = 0.45

**Referral rate:**
```
Referral Rate = (Customers who refer) / (Total customers)
```

Benchmarks:
- Good: 10-25% of customers refer
- Great: 25-50%
- Exceptional: 50%+

**Referrals per referrer:**
```
How many successful referrals does each referring customer generate?
```

Benchmarks:
- Average: 1-2 referrals per referrer
- Good: 2-5
- Exceptional: 5+

### Calculating Referral Program ROI

```
Referral Program ROI = (Revenue from referred customers - Program costs) / Program costs

Program costs = Rewards paid + Tool costs + Management time
> See [references/details.md](references/details.md) for full code examples.
Subject: You can now earn [reward] for sharing [Product]

Body:
We just launched our referral program!

Share [Product] with friends and earn [reward] for each person who signs up. They get [their reward] too.

[Unique referral link]

Here's how it works:
1. Share your link
2. Friend signs up
3. You both get [reward]

[CTA: Share now]
```

### Referral Nurture Sequence

**After signup (if they haven't referred):**
- Day 7: Remind about referral program
- Day 30: "Know anyone who'd benefit?"
- Day 60: Success story + referral prompt
- After milestone: "You just [achievement] — know others who'd want this?"

### Re-engagement for Past Referrers

```
Subject: Your friends are loving [Product]

Body:
Remember when you referred [Name]? They've [achievement/milestone].

Know anyone else who'd benefit? You'll earn [reward] for each friend who joins.

[Referral link]
> See [references/details.md](references/details.md) for full code examples.
