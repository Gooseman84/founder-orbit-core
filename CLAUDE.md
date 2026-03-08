# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start local dev server (Vite)
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite is configured.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui (Radix primitives) + Tailwind CSS
- **Backend**: Supabase (auth, Postgres database, Edge Functions)
- **Server state**: TanStack Query (`@tanstack/react-query`)
- **Client state**: Zustand (`src/store/ideaSessionStore.ts`)
- **Payments**: Stripe, managed via `supabase/functions/create-checkout-session` and `stripe-webhook`
- **AI**: Claude API, called exclusively through Supabase Edge Functions (never directly from the frontend)

## Architecture

### Calling AI / Edge Functions
All AI features and privileged operations go through `invokeAuthedFunction()` in `src/lib/invokeAuthedFunction.ts`. This wrapper:
- Attaches the user's JWT to every request
- Throws `AuthSessionMissingError` if session is missing
- Returns `SubscriptionRequiredError` on 402/403 (paywall)

Never call `supabase.functions.invoke()` directly from components — always use `invokeAuthedFunction`.

### Routing & Layout
- All routes are defined in `src/App.tsx`
- Protected routes are wrapped in `<ProtectedRoute>` then optionally `<MainLayout>` (sidebar nav)
- Some full-screen flows (Discover, Blueprint, Commit) skip `MainLayout`
- `VentureStateGuard` and `TrialExpiredGuard` are global guards rendered above the route tree

### Subscription / Entitlements
Plans: `free` | `pro` | `founder`. Logic lives in:
- `src/config/plans.ts` — plan feature definitions and limits
- `src/lib/entitlements.ts` — `canUseFeature()`, `getUserPlan()`, `clearPlanCache()`
- `src/hooks/useFeatureAccess.ts` — React hook for components
- `src/components/billing/` — Paywall modals, trial guards, upgrade buttons

### Supabase Edge Functions
Located in `supabase/functions/`. Each function is a standalone Deno module. Shared utilities are in `supabase/functions/_shared/`. Key functions:
- `dynamic-founder-interview` — AI onboarding chat (Discover flow)
- `generate-founder-ideas` / `generate-ideas` — idea generation
- `generate-blueprint` / `refresh-blueprint` — Business & Life Blueprints
- `generate-implementation-kit` — step-by-step launch kit
- `set-north-star-idea` / `unset-north-star-idea` — commits a user to a venture
- `create-checkout-session` / `stripe-webhook` / `sync-subscription` — billing

### AI Prompts
Prompt templates are in `src/prompts/` as `.txt` files. `src/prompts/index.ts` exports helpers for loading them. `src/lib/promptBuilder.ts` and `src/lib/contextBuilder.ts` assemble the full context sent to Claude (founder profile, venture state, history, etc.).

### Key Data Concepts
- **Founder Profile**: user's skills, goals, constraints — drives all personalization
- **North Star Venture**: the one idea a user has committed to (set via `set-north-star-idea`)
- **Venture State**: drives which dashboard (`DiscoveryDashboard` vs `ExecutionDashboard`) is shown
- **XP / Streaks / Badges**: gamification layer in `src/lib/xpEngine.ts`, `streakEngine.ts`, `badgeEngine.ts`

## Working with Lovable
This project is also edited in Lovable (lovable.dev), which syncs with this GitHub repo. When making changes locally:
1. Make sure you're on the latest: `git pull`
2. After changes: commit and push, then Lovable will pick them up automatically
3. Avoid force-pushing — Lovable may be mid-edit

## Path Aliases
`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`).
