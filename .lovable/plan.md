

# TrueBlazer — Honest Assessment & Revitalization Plan

## What Works Well

**Strong foundations:**
- The **Mavrik Interview Engine** (dynamic-founder-interview) is genuinely sophisticated — adaptive AI conversation that builds a founder profile through natural dialogue rather than forms
- The **Venture State Machine** is well-engineered with proper transition validation, database triggers, and guard functions that enforce "one venture at a time"
- **Security** is solid after recent hardening — RLS policies, server-side JWT verification, service_role-only access for sensitive operations
- The **Next Step Butler** (`useNextStep`) is a clever progression system that always knows what the user should do next across 9 stages
- The **Landing Page** (774 lines) is a premium, highly polished conversion page with scroll-reveal animations and clear narrative

**Good architecture decisions:**
- `invokeAuthedFunction` wrapper prevents direct Supabase function calls
- Dual dashboard system (Discovery vs Execution) adapts UI to user's journey stage
- Entitlements/paywall system is cleanly separated from feature logic

## What Doesn't Work

**Critical build error right now:**
- `generate-venture-context-bundle/index.ts` imports `npm:jszip@3.10.1` which Deno can't resolve — the app can't build. This must be fixed immediately.

**Dead features still in the codebase:**
- **Niche Radar** — queries `niche_radar` table but the signals are never populated automatically. The dashboard shows "0 signals this week" for everyone.
- **Reflection Streak** on DiscoveryDashboard queries `daily_reflections` but the reflection form only exists inside the ExecutionDashboard check-in flow. Discovery users will always see "0 days."
- **Fusion Lab** — gated behind `canUseFusionLab` but the feature feels disconnected from the main journey
- **Feed system** — routes redirect to dashboard, but `generate-feed-items` edge function and `FeedCard` component still exist as dead code

**Broken UX flows:**
- User is currently on `/onboarding` which redirects to `/discover` — but if there's any delay, they see a blank screen before the redirect fires
- The DiscoveryDashboard says "Venture Command Center" even when the user has no venture — confusing branding
- "Compare Ideas" button on Discovery dashboard is visible to free users with a lock icon but clicking it opens a paywall modal with no preview of what they'd get

## What's Confusing

- **Two dashboards, one route**: `/dashboard` renders either `DiscoveryDashboard` or `ExecutionDashboard` based on venture state, but the mental model switch is jarring — different layouts, different features, no transition
- **Blueprint page lives outside MainLayout** while every other post-auth page uses it — the sidebar disappears, which feels like navigating to a different app
- **Ideas page is 1,045 lines** with multiple tab systems, filter modes, sort modes, source-type badges, fusion panel, market signal modal, and import modal all in one component — overwhelming for users and developers
- **Workspace has a Feature Builder tab** that's actually a separate page (`FeaturePlanner`) embedded inside — unclear whether it's a workspace feature or a standalone tool

## What Needs Development

**The "So What?" gap**: TrueBlazer has strong input (interview) and strong output (Implementation Kit), but the middle — the daily execution loop — lacks substance:
- Daily tasks are AI-generated but feel generic; there's no feedback loop where completed tasks inform tomorrow's tasks
- Check-in responses from Mavrik are stored but never influence the next day's plan
- The Mavrik Coaching Card exists but is disconnected from task prioritization

**Missing data visibility:**
- No analytics or progress visualization beyond XP bar and streak counter
- No "venture timeline" showing what the user has accomplished over their 30-day window
- Validation evidence is collected but the insight loop back to the user is weak

---

## The Plan: 12 Steps to Ship-Ready

### Phase 1 — Fix What's Broken (Steps 1-3)

**Step 1: Fix the JSZip build error**
Replace `npm:jszip@3.10.1` in `generate-venture-context-bundle/index.ts` with an ESM import (`https://esm.sh/jszip@3.10.1`).

**Step 2: Clean dead code**
- Remove the Niche Radar stat tile from DiscoveryDashboard (it always shows 0)
- Remove the Reflection Streak tile from DiscoveryDashboard (only works in execution mode)
- Delete dead feed components and the `generate-feed-items` edge function

**Step 3: Fix the DiscoveryDashboard header**
Change "Venture Command Center" to something appropriate for pre-venture users, like "Your Launchpad" or simply the user's name with a greeting.

### Phase 2 — Simplify the UX (Steps 4-6)

**Step 4: Wrap Blueprint in MainLayout**
Add `<MainLayout>` to the Blueprint route in `App.tsx` so the sidebar persists. Users shouldn't lose navigation context.

**Step 5: Split the Ideas mega-component**
Break `Ideas.tsx` (1,045 lines) into logical sub-components: `IdeasToolbar`, `IdeasGrid`, `IdeasLibraryTab`, reducing cognitive load for both users and developers.

**Step 6: Streamline DiscoveryDashboard**
Replace the 4-tile stat grid with a focused "Next Step" card that uses the existing `useNextStep` hook prominently — make the butler the hero, not buried in the sidebar.

### Phase 3 — Deepen Execution Intelligence (Steps 7-9)

**Step 7: Wire check-in feedback into task generation**
Pass yesterday's check-in data (`completion_status`, `reflection`, `mavrik_response.tomorrowFocus`) into the `generate-daily-execution-tasks` edge function so today's tasks actually respond to yesterday.

**Step 8: Add a Venture Timeline**
Create a simple visual timeline on the ExecutionDashboard showing completed tasks, check-ins, and evidence logged across the 30-day window. Uses existing data — no new tables.

**Step 9: Surface validation progress meaningfully**
The `validation_summaries` confidence shift (assumption → early signal → partially validated → evidence-backed) should be a prominent visual on the ExecutionDashboard, not a hidden label.

### Phase 4 — Polish & Future-Proof (Steps 10-12)

**Step 10: Standardize AI gateway usage**
Migrate `generate-personalized-ideas` from direct Anthropic SDK to the Lovable AI gateway for consistency.

**Step 11: Fix remaining security findings**
Add a SELECT RLS policy on `beta_feedback` so users can read their own submissions.

**Step 12: Add error boundaries to lazy-loaded routes**
Currently `Suspense fallback={null}` — if a chunk fails to load, users see a blank screen with no recovery path. Add a proper error boundary with retry.

---

### Technical Details

| Step | Files Modified | Risk |
|------|---------------|------|
| 1 | `supabase/functions/generate-venture-context-bundle/index.ts` | Low — import swap |
| 2 | `DiscoveryDashboard.tsx`, delete feed components | Low — removing unused code |
| 3 | `DiscoveryDashboard.tsx` | Low — copy change |
| 4 | `App.tsx` | Low — wrap in layout |
| 5 | `Ideas.tsx` → 3 new files | Medium — refactor |
| 6 | `DiscoveryDashboard.tsx` | Medium — redesign |
| 7 | `generate-daily-execution-tasks/index.ts`, `useDailyExecution.ts` | Medium — logic change |
| 8 | New `VentureTimeline` component | Medium — new feature |
| 9 | `ExecutionDashboard.tsx` | Low — surface existing data |
| 10 | `generate-personalized-ideas/index.ts` | Low — SDK swap |
| 11 | Migration SQL | Low — RLS policy |
| 12 | `App.tsx` | Low — error boundary |

I recommend starting with Phase 1 (fixing what's broken) immediately, then working through the phases sequentially.

