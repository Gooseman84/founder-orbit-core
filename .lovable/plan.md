

# TrueBlazer v2.0 — Complete Rebuild Plan

## Competitive Landscape (What We're Up Against)

The market has split into two clear categories:

| Competitor | What They Do Well | What They Miss |
|---|---|---|
| **BigIdeasDB** ($49/mo) | Real complaint data (49K+), severity scoring, source links | No founder profiling, no execution support |
| **Preuve AI** ($29) | 10 AI agents, competitor mapping, financial projections, sourced data | One-shot validation, no ongoing execution |
| **RapidVenture AI** | PMF analyzer, business plan generator, revenue playbook | Generic — no founder context, no domain expertise extraction |
| **FounderFlow** | 30-minute validation pipeline | Shallow — survey-style, no insider knowledge |
| **IODeep / Found3r** | Landing page generation, branding | Surface-level — no depth on business viability |
| **IdeaProof** | Quick 120-second validation, market analysis | No personalization, no execution bridge |

**TrueBlazer's Unique Position:** No competitor does what Mavrik's interview engine does — extracting insider knowledge, authority classification, and workflow depth from the founder's actual experience. But TrueBlazer currently generates ideas from AI imagination alone, with zero connection to real market data. Every competitor above either uses real data or is moving toward it.

**The Gap:** TrueBlazer is the only tool that deeply understands the FOUNDER, but it completely ignores the MARKET. The rebuild bridges both.

---

## What to Keep (Genuinely Excellent)

1. **Mavrik Interview Engine** — The 3-goal extraction protocol (Insider Knowledge, Customer Pain, Workflow Depth) with authority tiering is best-in-class. No competitor has anything close.
2. **Founder Moment State Classifier** — Deterministic behavioral state machine (STUCK, BUILDING_MOMENTUM, etc.) with role-based coaching adaptation.
3. **Intelligence Waterfall** — The pattern of feeding interview context through all downstream functions.
4. **Venture State Machine** — One-venture-at-a-time discipline with proper transition guards.
5. **Implementation Kit** — North Star Spec, Architecture Contract, Vertical Slice Plan output is genuinely useful for builders.
6. **Landing Page** — 774 lines of polished conversion copy with scroll-reveal animations.

## What to Kill

1. **Niche Radar** — Dead feature, never populated, always shows 0 signals
2. **Feed system** — Already deleted, but `feed_items` table still exists
3. **Pulse Checks** — Duplicates daily reflection functionality
4. **Fusion Lab** — Disconnected from main flow, confusion point
5. **Opportunity Scores** — Redundant with Financial Viability Scores
6. **XP/Streaks/Badges gamification** — Founders aren't gamers; this trivializes the serious work. Replace with milestone-based progress.
7. **10 idea generation modes** (chaos, memetic, locker_room, etc.) — Cognitive overload. Keep 3: Breadth, Focus, Adjacent.
8. **`check_ins` table** — Duplicates `venture_daily_checkins`
9. **`pulse_checks` table** — Dead feature
10. **`onboarding_analytics` table** — Not used meaningfully

## What to Fix

1. **Ideas have no market data backing** — The #1 criticism of AI idea generators. TrueBlazer generates "plausible-sounding fiction" just like ChatGPT.
2. **No feedback loop** — Check-in data doesn't influence next day's tasks
3. **Two dashboards on one route** — Jarring context switch
4. **832-line ExecutionDashboard.tsx** — Mega-component
5. **No progress visualization** — Just XP bars and streak counters
6. **Workspace disconnected from milestones** — Documents don't drive venture progress

---

## The Rebuild: 20 Steps Across 5 Phases

### Phase 1 — Foundation Cleanup (Steps 1-4)
*Estimated: 8-12 messages*

**Step 1: Kill Dead Features & Tables**
- Remove Fusion Lab page, route, and components
- Remove Niche Radar page, route, components, and `niche_radar` table references
- Remove Pulse components and `pulse_checks` references
- Remove `check_ins` table references (migrate to `venture_daily_checkins`)
- Remove XP bar, streak indicator, badge system from dashboard (keep tables for data migration later)
- Remove `feed_items` table cleanup
- Clean imports across all affected files

**Step 2: Consolidate Generation Modes**
- Reduce 10 modes to 3: `breadth` (explore widely), `focus` (deep-dive a niche), `adjacent` (cross-industry pattern transfer)
- Update `generate-founder-ideas` edge function — remove chaos/memetic/locker_room/money_printer/boundless/persona mode prompts
- Update Ideas page UI to show only 3 mode buttons
- Remove `edgy_mode`, `open_to_memetic_ideas`, `open_to_personas`, `wants_money_systems` from profile queries (keep columns, stop using them)

**Step 3: Fix ESLint Config & Require Import**
- Disable `@typescript-eslint/no-explicit-any` rule in `eslint.config.js`
- Replace `require()` in `tailwind.config.ts` with ESM import
- Review and fix the 30 `exhaustive-deps` warnings (case by case — fix real bugs, add eslint-disable for intentional omissions)

**Step 4: Unify Dashboard Architecture**
- Create a single `Dashboard.tsx` that renders contextually based on venture state but with a shared header/structure
- Extract ExecutionDashboard into smaller components: `DailyTaskPanel`, `CheckInPanel`, `VentureProgressBar`, `MavrikInsightCard`
- Smooth transition: Discovery → Execution uses the same layout shell with different content panels

### Phase 2 — Market Intelligence Layer (Steps 5-8)
*Estimated: 12-16 messages — THIS IS THE DIFFERENTIATOR*

**Step 5: Build Real-Time Market Validation Edge Function**
Create `validate-market-signal` edge function that:
- Takes an idea title + description + target customer
- Uses Perplexity API (`sonar-pro` model) to search for:
  - Real complaints on Reddit, G2, Capterra about the problem
  - Existing competitors and their weaknesses
  - Market size signals from search volume trends
  - Recent news/discussions about the problem space
- Returns structured JSON:
```json
{
  "demand_signals": [{ "source": "r/smallbusiness", "quote": "...", "upvotes": 142 }],
  "competitor_landscape": [{ "name": "...", "weakness": "...", "pricing": "..." }],
  "market_timing": "growing" | "stable" | "declining",
  "validation_score": 0-100,
  "reality_check": "string"
}
```
- This is what BigIdeasDB and Preuve do, but TrueBlazer does it AFTER understanding the founder — so results are contextually relevant.

**Step 6: Integrate Market Data Into Idea Generation**
- Update `generate-founder-ideas` Pass B (refinement) to receive market validation data
- After Pass A generates raw ideas, run `validate-market-signal` on each idea in parallel (batch of 6)
- Pass B now scores ideas against REAL demand signals, not just AI confidence
- Add `market_validation` field to idea output: demand score, source count, competitor count
- Display market validation badges on idea cards: "3 Reddit threads confirm this pain" or "⚠️ 4 competitors already exist"

**Step 7: Build Competitor Intelligence Card**
- New component `CompetitorIntelligenceCard` on IdeaDetail page
- Shows: competitor names, pricing, G2/Capterra ratings, identified weaknesses
- Powered by `validate-market-signal` data stored in `idea_analysis` table
- "Where You Win" section: maps founder's insider knowledge against competitor blind spots

**Step 8: Add "Problem Discovery" Mode**
- New edge function `discover-validated-problems` that:
  - Takes founder's domain expertise from interview context
  - Uses Perplexity to search for complaints in that specific industry
  - Returns 10-15 real, sourced problems with severity + frequency data
  - Founder can select problems, and THEN TrueBlazer generates ideas around real problems
- This flips the script: instead of "generate ideas, hope they're real" → "find real problems, build ideas around them"
- New UI section on Ideas page: "Problems in Your Industry" tab

### Phase 3 — Execution Intelligence (Steps 9-13)
*Estimated: 10-14 messages*

**Step 9: Wire Check-in Feedback Loop**
- Update `generate-daily-execution-tasks` to include:
  - Yesterday's `completion_status` and `reflection` from `venture_daily_checkins`
  - Yesterday's `mavrik_response.tomorrowFocus` as a priority directive
  - Last 3 days of energy levels from `daily_reflections`
- Add to the task generation prompt: "Yesterday's check-in said: [data]. Calibrate today's tasks accordingly."
- This creates the closed loop that's currently broken

**Step 10: Build Venture Timeline Component**
- New `VentureTimeline` component on ExecutionDashboard
- Queries existing tables (no schema changes):
  - `venture_daily_checkins` — completion dots
  - `venture_daily_tasks` — task counts per day
  - `validation_evidence` — evidence logged dates
  - `workspace_documents` — documents created/updated
- Renders a 30-day horizontal timeline with activity dots
- Each day is clickable to show what happened
- Shows current day marker and % progress through commitment window

**Step 11: Proactive Mavrik Coaching Card**
- New `MavrikStateCard` on ExecutionDashboard
- Calls `compute-founder-moment-state` on mount
- Only shows for non-default states (STUCK, EXECUTION_PARALYSIS, SCOPE_CREEPING, APPROACHING_LAUNCH)
- Displays: state label, rationale, one concrete action link
- Collapsible and dismissible (saves dismiss state in localStorage for the day)
- Uses founder-friendly language, never judgmental

**Step 12: Milestone-Driven Progress System**
Replace XP/badges with venture milestones:
- Define 8 milestones per venture:
  1. Interview Complete
  2. Ideas Generated
  3. Idea Scored (FVS)
  4. Venture Committed
  5. Blueprint Generated
  6. First Task Completed
  7. First Validation Evidence Logged
  8. Implementation Kit Generated
- New `VentureMilestoneTracker` component — visual progress bar with milestone markers
- Milestone completion is determined by querying existing tables (no new tracking needed)
- Replace the XP progress bar in both dashboards

**Step 13: Surface Validation Progress**
- New `ValidationProgressCard` on ExecutionDashboard
- Shows confidence shift from `validation_summaries`: assumption → early signal → partially validated → evidence-backed
- Shows evidence count per FVS dimension with visual indicators
- Shows active validation missions and their status
- Links directly to "Log Evidence" modal

### Phase 4 — AI Reliability & UX Polish (Steps 14-17)
*Estimated: 8-12 messages*

**Step 14: Migrate All Edge Functions to Lovable AI Gateway**
- `generate-personalized-ideas` — currently uses Anthropic SDK directly
- Any other functions still using direct API calls
- Standardize on `google/gemini-2.5-flash` for generation, `google/gemini-3-flash-preview` for analysis
- Update all `callModel` patterns to use the gateway URL

**Step 15: Structured Output via Tool Calling**
Convert critical edge functions from "return JSON" prompts to formal tool calling:
- `generate-founder-ideas` — use tool calling for Pass A and Pass B output
- `generate-blueprint` — use tool calling for blueprint JSON
- `analyze-idea` — use tool calling for analysis JSON
- This eliminates the 300+ lines of JSON repair/salvage code in `generate-founder-ideas`

**Step 16: Streamline the Ideas Page**
- Already partially refactored (GeneratedTab, LibraryTab extracted)
- Add "Problems in Your Industry" tab (from Step 8)
- Replace mode selector with 3 clean buttons (Breadth / Focus / Adjacent)
- Add market validation badges to idea cards
- Remove IdeaFusionPanel, IdeaVariantGenerator, MarketSignalModal (dead/confusing features)

**Step 17: Mobile-First Responsive Pass**
- Audit all post-auth pages on 375px viewport
- Fix ExecutionDashboard card stacking on mobile
- Ensure timeline component works on small screens
- Fix sidebar collapse behavior on mobile
- Test interview flow on mobile (critical for first-time users)

### Phase 5 — Security & Production Readiness (Steps 18-20)
*Estimated: 4-6 messages*

**Step 18: Security Hardening**
- Add SELECT RLS policy on `beta_feedback` for users to read their own submissions
- Audit all edge functions for consistent JWT verification pattern
- Remove any remaining `user_id` acceptance from request bodies (always use JWT)
- Add rate limiting on generation endpoints (prevent abuse)

**Step 19: Clean Database Schema**
- Drop unused tables: `feed_items`, `pulse_checks`, `check_ins` (after confirming no active references)
- Add proper indexes on frequently queried columns
- Add database comments documenting table purposes

**Step 20: Perplexity Connector Setup**
- Connect Perplexity API via `standard_connectors--connect`
- Configure API key as a secret
- Test `validate-market-signal` function end-to-end
- Set up error handling for rate limits and credit exhaustion

---

## Implementation Order (Optimized for 341 Credits)

```text
Priority 1 (Critical Path):
  Step 1  → Kill dead features           (~4 messages)
  Step 5  → Market validation function    (~4 messages)
  Step 6  → Integrate into idea gen       (~4 messages)
  Step 9  → Check-in feedback loop        (~3 messages)
  Step 15 → Structured output             (~4 messages)

Priority 2 (High Value):
  Step 2  → Consolidate modes             (~2 messages)
  Step 4  → Unified dashboard             (~4 messages)
  Step 8  → Problem discovery mode        (~4 messages)
  Step 10 → Venture timeline              (~3 messages)
  Step 11 → Mavrik coaching card          (~2 messages)

Priority 3 (Polish):
  Step 3  → ESLint cleanup                (~2 messages)
  Step 7  → Competitor intel card         (~3 messages)
  Step 12 → Milestone system              (~3 messages)
  Step 13 → Validation progress           (~2 messages)
  Step 14 → Gateway migration             (~2 messages)

Priority 4 (Finish):
  Step 16 → Ideas page streamline         (~3 messages)
  Step 17 → Mobile pass                   (~3 messages)
  Step 18 → Security                      (~2 messages)
  Step 19 → DB cleanup                    (~2 messages)
  Step 20 → Perplexity setup              (~2 messages)
```

**Estimated total: ~58 messages across plan + build mode ≈ ~250-340 credits**

---

## What This Gets You

**Before:** TrueBlazer generates AI-imagined ideas based on founder profile. Same category as ChatGPT with a better interview.

**After:** TrueBlazer is the only tool that:
1. Deeply understands the FOUNDER (Mavrik interview — already built)
2. Validates ideas against REAL MARKET DATA (Perplexity integration — new)
3. Bridges to EXECUTION with adaptive daily coaching (feedback loop fix — new)
4. Produces MACHINE-READABLE build specs for coding agents (Implementation Kit — already built)

No competitor does all four. BigIdeasDB does #2. Preuve does #2 partially. RapidVenture does #3 weakly. None do #1 or #4.

This is the moat: **Founder Intelligence × Market Reality × Execution Bridge × Agent-Ready Output.**

