
## Goal
Fix the “paid in Stripe but still gated in-app” issue by making the **Sync‑After‑Checkout** path reliable. Right now the `sync-subscription` backend function is failing with `Invalid time value`, so the database never updates to `plan: pro` / `status: trialing|active`.

## What I found (from your backend logs + DB)
- `create-checkout-session` is running and creating a Checkout Session successfully.
- Your `user_subscriptions` row gets created and stores a valid `stripe_customer_id` (e.g. `cus_TvCSi8owl42Zr4`), but:
  - `plan` stays `trial`
  - `stripe_subscription_id` stays `null`
- `sync-subscription` is being called, but it errors:
  - `[SYNC-SUBSCRIPTION] ERROR - {"message":"Invalid time value"}`
- That error happens when we call `.toISOString()` on an invalid `Date`, which almost always means Stripe returned a missing/undefined timestamp (or an unexpected type), causing `new Date(NaN)`.

## Why you’re not getting Pro access
Your app gates features based on the **local database** (`user_subscriptions` via `get_user_subscription`). Since `sync-subscription` is crashing, the database never gets updated, so the frontend keeps seeing you as `trial`.

You do **not** need to start over from scratch with Stripe. This is a fixable integration robustness issue.

---

## Fix Strategy (make sync-subscription “never fail” + better diagnostics)
We’ll harden `sync-subscription` so it:
1) Never throws on missing Stripe fields
2) Always logs the raw values needed to debug
3) Can still update plan/status even if some dates are missing
4) Uses a consistent Stripe SDK version (align with the rest of your Stripe functions)

---

## Step-by-step implementation plan

### 1) Patch `sync-subscription` to safely handle timestamps (primary fix)
**File:** `supabase/functions/sync-subscription/index.ts`

**Changes:**
- Add a small helper like:
  - `toIsoOrNull(unixSeconds: unknown): string | null`
  - It should:
    - accept `number | null | undefined`
    - if not a finite number, return `null` (and log it)
    - otherwise convert to ISO safely
- Replace direct calls like:
  - `new Date(activeSub.current_period_end * 1000).toISOString()`
  with:
  - `toIsoOrNull(activeSub.current_period_end)`
- Do the same for `cancel_at`.

**Result:**
- No more `Invalid time value` crashes.
- Even if a date is missing, the function can still update:
  - `plan: "pro"`
  - `status: "trialing" | "active"`
  - `stripe_subscription_id: activeSub.id`
  - and set `current_period_end` only if available.

### 2) Align Stripe SDK version to reduce type/field mismatches
**File:** `supabase/functions/sync-subscription/index.ts`

Right now:
- `sync-subscription` uses `stripe@14.21.0`
- other functions (like `create-checkout-session` and `stripe-webhook`) use `stripe@18.5.0`

**Change:**
- Update `sync-subscription` to use `Stripe from "https://esm.sh/stripe@18.5.0";`

**Why:**
- Reduces chances of subtle “field shape” mismatches and improves consistency across the codebase.

### 3) Improve logging to pinpoint the failing Stripe payload quickly
**File:** `supabase/functions/sync-subscription/index.ts`

Add logs right before conversion/upsert, e.g.:
- subscription id, status
- `typeof current_period_end` and its raw value
- `typeof cancel_at` and its raw value
- number of subscription items + interval info

This ensures if Stripe returns something unexpected again, the next failure is diagnosable in one pass.

### 4) Make the Billing success flow show the true outcome of the sync
**File:** `src/pages/Billing.tsx`

Current behavior:
- On `?status=success`, it calls sync, but the `.then()` branch doesn’t inspect `data.synced`, and the `.catch()` always toasts “Subscription activated” even if it didn’t actually sync.

**Change:**
- Update the success handler to:
  - await the function call (or inspect the returned `{ data, error }`)
  - if `data?.synced !== true`, show a “We received payment, but couldn’t confirm access yet — click Refresh” message (non-destructive)
  - keep the “Refresh subscription status” button visible and emphasized in this state

**Result:**
- Users get truthful feedback instead of a misleading “Welcome to Pro” toast when the database wasn’t updated.

### 5) Verification (end-to-end)
After the patch:
1) Go to `/billing` and press **Refresh subscription status**
2) Confirm `user_subscriptions` updates:
   - `plan` becomes `pro`
   - `status` becomes `trialing` or `active` (depending on your Stripe subscription)
   - `stripe_subscription_id` becomes non-null
   - `current_period_end` is set if Stripe provided it
3) Confirm Pro features unlock immediately (paywalls should stop triggering)

---

## Notes on your Stripe status being `trialing`
Even though earlier we removed “trial_period_days” from your checkout session, a subscription can still be `trialing` if:
- the **Price** in Stripe has a trial configured, or
- the subscription was created earlier under trial settings

That’s okay for access: your app already treats `trialing` as eligible for Pro, as long as `plan` is set to `pro` in your database. The sync fix above ensures that.

---

## Scope (only what’s needed)
We will **not** restart Stripe.
We will **not** rely on webhooks for immediate unlock.
We will fix the sync path so it’s bulletproof and gives you immediate access after checkout.

---

## Files that will be modified
- `supabase/functions/sync-subscription/index.ts` (primary fix: safe timestamps + Stripe SDK alignment + better logs)
- `src/pages/Billing.tsx` (secondary fix: handle “synced: false” correctly and guide user to manual refresh)

