
# Remove Trial on Explicit Upgrade

## Current Problem

When a user clicks "Upgrade to Pro" and enters payment details, the checkout creates a **new 7-day trial** before charging. This means:

- Someone on day 2 of their in-app trial who upgrades won't be charged until day 9
- They get a "double trial" experience which is confusing
- The "Upgrade" action doesn't feel like upgrading - it feels like extending their trial

## The Fix

Remove the trial from checkout sessions. When a user explicitly chooses to pay, charge them immediately and activate Pro.

---

## Implementation

### File: `supabase/functions/create-checkout-session/index.ts`

**Change lines 177-190** - Remove `trial_period_days` from checkout:

```text
Current:
subscription_data: {
  trial_period_days: 7,  ← REMOVE THIS
  metadata: { ... }
}

After:
subscription_data: {
  metadata: { ... }
}
```

This single change means:
- **Upgrade action** → Immediate charge, Pro unlocks instantly
- **Cancellation** → User keeps access until current_period_end (Stripe default)

---

## How Trial + Upgrade Will Work

| Scenario | What Happens |
|----------|--------------|
| Day 1: User signs up | Gets 7-day in-app trial (from your `user_subscriptions` table) |
| Day 3: User clicks Upgrade | Payment charged immediately, trial ends, Pro active |
| Day 8: Trial expires, no upgrade | Features locked, paywall shown |
| Pro user cancels | Keeps Pro until current billing cycle ends |

---

## Why This Is Correct

1. **Clear value exchange**: User pays → User gets Pro immediately
2. **No double-trial confusion**: The in-app trial and Stripe trial were redundant
3. **Standard SaaS behavior**: "Upgrade" means start paying now
4. **Cancellations work as expected**: Stripe automatically maintains access until period end

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-checkout-session/index.ts` | Remove `trial_period_days: 7` from subscription_data |

---

## Note on Sync Function

This change pairs well with the sync-subscription function from the previous plan. Together they ensure:

1. User clicks Upgrade → Charged immediately (this fix)
2. User returns to app → Sync function updates database (previous plan)
3. Features unlock → User sees Pro experience
