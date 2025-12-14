# TrueBlazer.AI Security Configuration

This document outlines critical security settings that must be configured in the Supabase Dashboard.

## 1. Leaked Password Protection

**What it does:** Checks user passwords against known breached password databases (like Have I Been Pwned) to prevent users from using compromised passwords.

**How to enable:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Scroll to **Email** provider settings
5. Enable **"Leaked password protection"** toggle
6. Click **Save**

**Impact:** When enabled, users attempting to sign up or change their password to a known breached password will receive an error. This significantly reduces the risk of credential stuffing attacks.

## 2. Row Level Security (RLS)

All tables in this application have RLS enabled with appropriate policies:

- **user_subscriptions**: Users can only read and update their own subscription
- **founder_profiles**: Users can only CRUD their own profile
- **ideas**: Users can only CRUD their own ideas
- **tasks**: Users can only CRUD their own tasks
- **opportunity_scores**: Users can read/insert their own scores; service role can manage all

## 3. Service Role Key Protection

The `SUPABASE_SERVICE_ROLE_KEY` is used only in edge functions (server-side) and should NEVER be exposed to the client. All client-side queries use the anon key with RLS enforcement.

## 4. Stripe ID Protection

Stripe customer and subscription IDs are stored in `user_subscriptions` but are excluded from client-facing queries via the `get_user_subscription` RPC function. This prevents exposure of payment infrastructure details.

## 5. CRON Secret Protection

Scheduled functions (check-missed-streaks, refresh-daily-feed, refresh-niche-radar) validate the `CRON_SECRET` header to prevent unauthorized invocation.

---

## Checklist Before Production

- [ ] Enable leaked password protection in Supabase Dashboard
- [ ] Verify all RLS policies are active (run security scan)
- [ ] Confirm CRON_SECRET is set in Supabase secrets
- [ ] Confirm all Stripe webhook secrets are configured
- [ ] Test subscription flow end-to-end
- [ ] Review edge function logs for any auth errors
