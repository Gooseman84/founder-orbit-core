

# Add Welcome Email (Transactional) After Signup

## What
Send a branded welcome email when a new user signs up and confirms their email. This uses Lovable's built-in app email infrastructure on the already-verified `notify.trueblazer.ai` domain.

## Steps

1. **Scaffold transactional email infrastructure** — creates `send-transactional-email`, `handle-email-unsubscribe`, and `handle-email-suppression` edge functions, plus a template registry and sample template
2. **Create welcome email template** — a branded React Email component (`welcome.tsx`) in `_shared/transactional-email-templates/` matching TrueBlazer's gold-and-ink aesthetic (gold CTA button, Playfair Display headings, DM Sans body, sharp corners)
3. **Register template** in the registry as `welcome`
4. **Create unsubscribe page** — a new route in the app for handling email unsubscribe links (required by the email system)
5. **Wire the trigger** — in `src/pages/Auth.tsx`, after successful signup confirmation and first sign-in, invoke `send-transactional-email` with `templateName: 'welcome'` and an idempotency key of `welcome-${user.id}`
6. **Deploy edge functions** — deploy `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`

## Welcome Email Content
- **Subject:** "Welcome to TrueBlazer — let's build something real"
- **Heading:** "You're in."
- **Body:** Brief, mentor-like copy about what to expect: Mavrik interview, market-validated ideas, execution coaching
- **CTA button:** "Start Your Interview" → links to `/discover`
- **Footer:** TrueBlazer branding, muted text

## Technical Details
- Uses `email_domain--scaffold_transactional_email` tool to create the base infrastructure
- Template styled to match existing auth email templates (same color palette, typography, button style)
- Welcome email fires once per user via idempotency key `welcome-${user.id}`
- Trigger point: `Auth.tsx` `handleSignIn` after detecting a new user (no founder profile yet)
- Unsubscribe page path determined by scaffold tool output

## Files Created/Modified
- `supabase/functions/send-transactional-email/index.ts` (scaffolded)
- `supabase/functions/handle-email-unsubscribe/index.ts` (scaffolded)
- `supabase/functions/handle-email-suppression/index.ts` (scaffolded)
- `supabase/functions/_shared/transactional-email-templates/welcome.tsx` (new)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (updated)
- `src/pages/Auth.tsx` (add welcome email trigger)
- `src/pages/Unsubscribe.tsx` (new)
- `src/App.tsx` (add unsubscribe route)

