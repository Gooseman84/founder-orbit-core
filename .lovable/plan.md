

# Set Up Branded Auth Email Templates

## What
Scaffold and brand all 6 auth email templates (signup confirmation, password reset, magic link, invite, email change, reauthentication) to match TrueBlazer's gold-and-ink aesthetic.

## Brand Extraction
From `src/index.css`:
- **Primary (gold):** `hsl(43, 52%, 54%)` → button backgrounds
- **Primary foreground (dark):** `hsl(240, 14%, 4%)` → button text
- **Foreground:** `hsl(40, 15%, 93%)` → but emails use dark text on white, so headings will be `hsl(240, 14%, 4%)`
- **Muted foreground:** `hsl(220, 12%, 58%)` → body text color
- **Border radius:** `0rem` → sharp corners on buttons
- **Font:** Sans-serif stack
- **Email body background:** Always white (#ffffff) per email rules

## Steps

1. **Scaffold templates** — creates `auth-email-hook` edge function and 6 template files
2. **Brand all 6 templates** — apply TrueBlazer gold button color, dark headings, sharp corners, and app tone ("TrueBlazer" branding, mentor-like voice)
3. **Deploy** `auth-email-hook` edge function
4. **Confirm** — provide preview links for signup and recovery templates

## Template Styling
- Button: gold background `hsl(43, 52%, 54%)`, dark text `hsl(240, 14%, 4%)`, `borderRadius: '0px'`
- Headings: dark `hsl(240, 14%, 4%)`
- Body text: muted `hsl(220, 12%, 58%)`
- Body background: `#ffffff`
- Copy tone: confident, direct, action-oriented — matching TrueBlazer's mentor personality

## Files Created/Modified
- `supabase/functions/auth-email-hook/index.ts`
- `supabase/functions/auth-email-hook/deno.json`
- `supabase/functions/_shared/email-templates/*.tsx` (6 templates)
- `supabase/config.toml` (function config)

