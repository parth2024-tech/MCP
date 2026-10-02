# Micro Saas Launcher — Code Reference

## ### Week 2: Launch Ready

```

### What to Skip in MVP
- Perfect design (good enough is fine)
- All features (one core feature only)
- Scale optimization (worry later)
- Custom auth (use a service)
- Multiple pricing tiers (start simple)

### Pricing Strategy

Pricing your micro-SaaS

**When to use**: When setting prices

## Pricing Strategy

### Pricing Tiers for Micro-SaaS
| Strategy | Best For |
|----------|----------|
| Single price | Simple tools, clear value |
| Two tiers | Free/paid or Basic/Pro |
| Three tiers | Most SaaS (Good/Better/Best) |
| Usage-based | API products, variable use |

### Starting Price Framework
```


```

### Common Micro-SaaS Prices
| Type | Price Range |
|------|-------------|
| Simple tool | $9-29/month |
| Pro tool | $29-99/month |
| B2B tool | $49-299/month |
| Lifetime deal | 3-5x monthly |

### Pricing Mistakes
- Too cheap (undervalues, attracts bad customers)
- Too complex (confuses buyers)
- No free tier AND no trial (no way to try)
- Charging too late (validate with money early)

### Launch Playbook

Launch strategies that work

**When to use**: When ready to launch

## Launch Playbook

### Pre-Launch (2 weeks before)
1. Build email list (landing page)
2. Engage in communities (give value first)
3. Create launch assets (demo, screenshots)
4. Line up beta testers

### Launch Day Channels
| Channel | Effort | Impact |
|---------|--------|--------|
| Product Hunt | Medium | High |
| Hacker News | Low | Variable |
| Reddit | Medium | Medium |
| Twitter/X | Low | Medium |
| Indie Hackers | Low | Medium |
| Email list | Low | High |

### Product Hunt Launch
```


```

### Post-Launch
- Follow up with every signup
- Ask for feedback constantly
- Fix critical bugs immediately
- Start SEO/content for long-term
- Don't stop marketing after launch day

## Sharp Edges

### Great product, no way to reach customers

Severity: HIGH

Situation: Built product, can't get users

Symptoms:
- Zero organic traffic
- Relying only on launches
- No email list
- No content strategy

Why this breaks:
Built first, marketing second.
No existing audience.
No SEO, no ads, no community.
"If you build it, they will come" is false.

Recommended fix:

## Distribution First

### Before Building, Answer:
- Where do my customers hang out?
- Can I reach them for free?
- Do I have an existing audience?
- Is SEO viable for this?

### Distribution Channels
| Channel | Time to Results | Cost |
|---------|-----------------|------|
| SEO | 6-12 months | Low |
| Content marketing | 3-6 months | Low |
| Paid ads | Immediate | High |
| Community | 1-3 months | Low |
| Product Hunt | One day | Free |
| Partnerships | 1-2 months | Free |

### Build Distribution Into Product
```


```

### If Stuck
1. Start content marketing NOW
2. Be active in communities (give value)
3. Partner with complementary products
4. Consider paid acquisition

### Building for market that can't/won't pay

Severity: HIGH

Situation: Lots of interest, no conversions

Symptoms:
- Lots of signups, no upgrades
- Love it, but can't afford
- Only works with freemium
- Comparisons to free alternatives

Why this breaks:
Targeting consumers vs business.
Targeting broke demographics.
Free alternatives are good enough.
Not solving urgent problem.

Recommended fix:

## Market Selection

### B2B vs B2C
| Factor | B2B | B2C |
|--------|-----|-----|
| Price tolerance | $50-500+/mo | $5-20/mo |
| Acquisition cost | Higher | Lower |
| Churn | Lower | Higher |
| Support needs | Higher | Lower |
| Solo-founder friendly | Yes | Harder |

### Good Markets for Micro-SaaS
- Small businesses
- Freelancers/agencies
- Developers
- Creators with revenue
- Professionals (lawyers, doctors, etc.)

### Red Flag Markets
- Students
- Startups with no funding
- Mass consumers
- Markets with free alternatives

### Pivot Signals
- High interest, zero payments
- Users love it but won't pay
- Competition is all free
- Target market has no budget

### New signups leaving as fast as they come

Severity: HIGH

Situation: MRR plateaued despite new customers

Symptoms:
- MRR not growing despite signups
- Users cancel after first month
- Low feature usage
- High trial abandonment

Why this breaks:
Product doesn't deliver value.
Onboarding is broken.
Wrong customers signing up.
Missing key features.

Recommended fix:

## Fixing Churn

### Understand Why
```


## ### Onboarding Checklist

```

### Pricing page confuses potential customers

Severity: MEDIUM

Situation: Visitors leave pricing page without action

Symptoms:
- High pricing page bounce
- Which plan should I choose?
- Feature comparison requests
- Long time to purchase decision

Why this breaks:
Too many tiers.
Unclear what's included.
Feature matrix confusing.
No clear recommendation.

Recommended fix:

## Simple Pricing

### Ideal Structure
```


```

### If Multiple Tiers
- Maximum 3 tiers
- Clear differentiation
- Highlight recommended tier
- Annual discount (20-30%)

### Good Pricing Page
| Element | Purpose |
|---------|---------|
| Clear prices | No calculator needed |
| Feature list | What's included |
| Recommended badge | Guide decision |
| FAQ | Handle objections |
| Guarantee | Reduce risk |

### Testing
- A/B test prices
- Try removing a tier
- Ask customers what's confusing
- Check pricing page bounce rate

## Validation Checks

### No Payment Integration

Severity: HIGH

Message: No payment integration - can't collect revenue.

Fix action: Integrate Stripe or Lemon Squeezy for payments

### No User Authentication

Severity: HIGH

Message: No proper authentication system.

Fix action: Use Supabase Auth, Clerk, or Auth0 - don't build auth yourself

### No User Onboarding

Severity: MEDIUM

Message: No user onboarding - will hurt activation.

Fix action: Add welcome flow, first-action prompt, and onboarding emails

### No Product Analytics

Severity: MEDIUM

Message: No product analytics - flying blind.

Fix action: Add Posthog, Mixpanel, or simple event tracking

### Missing Legal Pages

Severity: MEDIUM

Message: Missing legal pages - required for payments.

Fix action: Add privacy policy and terms of service (use templates)

## Collaboration

### Delegation Triggers

- landing page|conversion|pricing page -> landing-page-design (SaaS landing page)
- stripe|payments|subscription -> stripe (Payment integration)
- SEO|content|organic -> seo (Organic growth)
- backend|API|database -> backend (Backend development)
- email|newsletter|drip -> email (Email marketing)

### Weekend SaaS Launch

Skills: micro-saas-launcher, supabase-backend, nextjs-app-router, stripe

Workflow:

```


