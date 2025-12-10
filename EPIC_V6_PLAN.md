# EPIC v6 — Unhinged TrueBlazer AI Venture Engine

> The most powerful AI-native, "unhinged" business and money-system generator.

## 🎯 Epic Overview

Transform the existing TrueBlazer ideation system into a multi-mode venture engine that generates ideas across a spectrum from safe/traditional to unhinged/memetic, with full support for creator economies, automation plays, persona-based businesses, and money systems.

---

## 📋 TASK CHECKLIST

### 🗃️ PHASE 1: Schema Upgrades v6

#### Task 1.1: Extend `ideas` Table
**Status:** ⬜ Not Started

Add new columns to the `ideas` table:
- `category` (text) — e.g., "saas", "creator", "automation", "money_system", "memetic"
- `mode` (text) — generation mode used
- `platform` (text) — primary platform (tiktok, youtube, x, etc.)
- `shock_factor` (integer 1-10) — how edgy/unexpected
- `virality_potential` (integer 1-100) — viral score
- `leverage_score` (integer 1-100) — leverage/scalability
- `automation_density` (integer 1-100) — how automated
- `autonomy_level` (integer 1-100) — runs without founder
- `culture_tailwind` (integer 1-100) — riding cultural trends
- `chaos_factor` (integer 1-100) — unpredictability/edge
- `engine_version` (text) — "v5" | "v6"

**Impacted Files:**
- `supabase/migrations/` (new migration)
- `src/integrations/supabase/types.ts` (auto-regenerated)
- `src/types/idea.ts`
- `src/types/businessIdea.ts`

---

#### Task 1.2: Extend `founder_profiles` Table
**Status:** ⬜ Not Started

Add new columns:
- `work_personality` (text[]) — ["builder", "creator", "automation", "faceless", "dealmaker", "quiet_assassin"]
- `creator_platforms` (text[]) — ["tiktok", "instagram", "youtube", "x", "linkedin", "email", "none"]
- `edgy_mode` (text) — "safe" | "bold" | "unhinged"
- `wants_money_systems` (boolean) — preference for money systems vs businesses
- `open_to_personas` (boolean) — open to AI personas/characters
- `open_to_memetic_ideas` (boolean) — open to culture-driven/memetic ideas
- `industries_understood` (text[]) — industries they have knowledge in

**Impacted Files:**
- `supabase/migrations/` (new migration)
- `src/integrations/supabase/types.ts` (auto-regenerated)
- `src/types/founderProfile.ts`
- `src/hooks/useFounderProfile.ts`

---

#### Task 1.3: Extend `BusinessIdea` TypeScript Interface
**Status:** ⬜ Not Started

Update `src/types/businessIdea.ts` to include all new v6 fields:
```typescript
// New v6 fields
category: "saas" | "creator" | "automation" | "money_system" | "memetic" | "hybrid";
mode: IdeaGenerationMode;
platform: string | null;
shockFactor: number;
viralityPotential: number;
leverageScore: number;
automationDensity: number;
autonomyLevel: number;
cultureTailwind: number;
chaosFactor: number;
engineVersion: "v5" | "v6";
```

**Impacted Files:**
- `src/types/businessIdea.ts`
- `src/types/idea.ts`
- `src/lib/ideaScoring.ts`
- `src/lib/ideaEngine.ts`

---

### 🧭 PHASE 2: Onboarding v3 — Wildness & Modes

#### Task 2.1: Create New Onboarding Step — Work Personality
**Status:** ⬜ Not Started

Add step to collect work personality types (multi-select):
- Builder — loves building products/tools
- Creator — content-first, audience-first
- Automation — systems thinker, wants hands-off
- Faceless — no personal brand, anonymous ops
- Dealmaker — loves partnerships, sales, biz dev
- Quiet Assassin — stealth mode, low profile empire

**Impacted Files:**
- `src/components/onboarding/extended/WorkPersonalityStep.tsx` (NEW)
- `src/pages/ExtendedOnboarding.tsx`
- `src/features/onboarding/CoreOnboardingWizard.tsx`

---

#### Task 2.2: Create New Onboarding Step — Creator Platforms
**Status:** ⬜ Not Started

Add step to collect creator platforms (multi-select):
- TikTok
- Instagram
- YouTube
- X (Twitter)
- LinkedIn
- Email/Newsletter
- None / Not a creator

**Impacted Files:**
- `src/components/onboarding/extended/CreatorPlatformsStep.tsx` (NEW)
- `src/pages/ExtendedOnboarding.tsx`

---

#### Task 2.3: Create New Onboarding Step — Edgy Mode Preference
**Status:** ⬜ Not Started

Add step with options:
- **Safe** — Traditional, professional, low-risk ideas
- **Bold** — Willing to push boundaries, unconventional
- **Unhinged** — Full chaos mode, memetic, edgy, experimental

**Impacted Files:**
- `src/components/onboarding/extended/EdgeModeStep.tsx` (NEW)
- `src/pages/ExtendedOnboarding.tsx`

---

#### Task 2.4: Create New Onboarding Step — Money Systems vs Businesses
**Status:** ⬜ Not Started

Add step asking:
- Preference for traditional "businesses" vs "money-making systems"
- Open to AI personas/characters?
- Open to memetic/culture-driven ideas?

**Impacted Files:**
- `src/components/onboarding/extended/MoneySystemsStep.tsx` (NEW)
- `src/pages/ExtendedOnboarding.tsx`

---

#### Task 2.5: Create New Onboarding Step — Industries Understood
**Status:** ⬜ Not Started

Add step to collect industries they have domain knowledge in (multi-select with custom input).

**Impacted Files:**
- `src/components/onboarding/extended/IndustriesStep.tsx` (NEW)
- `src/pages/ExtendedOnboarding.tsx`

---

#### Task 2.6: Update Profile Save Logic
**Status:** ⬜ Not Started

Update all onboarding flows to persist new v6 fields to `founder_profiles`.

**Impacted Files:**
- `src/hooks/useExtendedIntake.ts`
- `src/hooks/useFounderProfile.ts`
- `supabase/functions/finalize-founder-profile/index.ts`
- `supabase/functions/normalize-founder-profile/index.ts`

---

### ⚡ PHASE 3: Idea Engine v6 — Unhinged Modes

#### Task 3.1: Define Idea Generation Modes Type
**Status:** ⬜ Not Started

Create type definition:
```typescript
type IdeaGenerationMode = 
  | "breadth"        // Standard diverse ideas
  | "focus"          // Deep on one niche
  | "creator"        // Content/audience-first
  | "automation"     // Systems/hands-off
  | "persona"        // AI character/persona-based
  | "boundless"      // No constraints, pure possibility
  | "locker_room"    // Edgy, bold, provocative (gated)
  | "chaos"          // Maximum unpredictability
  | "money_printer"  // Pure cash generation focus
  | "memetic"        // Culture/trend riding
```

**Impacted Files:**
- `src/types/businessIdea.ts`
- `src/types/index.ts`

---

#### Task 3.2: Update `generate-founder-ideas` Edge Function
**Status:** ⬜ Not Started

Modify to accept `mode` parameter and route to appropriate system prompt.

**Impacted Files:**
- `supabase/functions/generate-founder-ideas/index.ts`
- `src/hooks/useFounderIdeas.ts`

---

#### Task 3.3: Create v6 System Prompt — Breadth Mode
**Status:** ⬜ Not Started

Update base ideation prompt for v6 schema output.

**Impacted Files:**
- `src/prompts/trueblazerIdeationEngine.ts`
- `src/prompts/v6/breadthModePrompt.ts` (NEW)

---

#### Task 3.4: Create v6 System Prompt — Creator Mode
**Status:** ⬜ Not Started

Specialized prompt for content-first, audience-driven ideas.

**Impacted Files:**
- `src/prompts/v6/creatorModePrompt.ts` (NEW)

---

#### Task 3.5: Create v6 System Prompt — Automation Mode
**Status:** ⬜ Not Started

Specialized prompt for hands-off, systems-based ideas.

**Impacted Files:**
- `src/prompts/v6/automationModePrompt.ts` (NEW)

---

#### Task 3.6: Create v6 System Prompt — Persona Mode
**Status:** ⬜ Not Started

Specialized prompt for AI persona/character-based businesses.

**Impacted Files:**
- `src/prompts/v6/personaModePrompt.ts` (NEW)

---

#### Task 3.7: Create v6 System Prompt — Boundless Mode
**Status:** ⬜ Not Started

Specialized prompt with no constraints, pure possibility.

**Impacted Files:**
- `src/prompts/v6/boundlessModePrompt.ts` (NEW)

---

#### Task 3.8: Create v6 System Prompt — Chaos Mode
**Status:** ⬜ Not Started

Specialized prompt for maximum unpredictability and edge.

**Impacted Files:**
- `src/prompts/v6/chaosModePrompt.ts` (NEW)

---

#### Task 3.9: Create v6 System Prompt — Money Printer Mode
**Status:** ⬜ Not Started

Specialized prompt for pure cash generation focus.

**Impacted Files:**
- `src/prompts/v6/moneyPrinterModePrompt.ts` (NEW)

---

#### Task 3.10: Create v6 System Prompt — Memetic Mode
**Status:** ⬜ Not Started

Specialized prompt for culture/trend riding ideas.

**Impacted Files:**
- `src/prompts/v6/memeticModePrompt.ts` (NEW)

---

#### Task 3.11: Create v6 System Prompt — Locker Room Mode
**Status:** ⬜ Not Started

Specialized prompt for bold/provocative ideas (gated by edgy_mode).

**Impacted Files:**
- `src/prompts/v6/lockerRoomModePrompt.ts` (NEW)

---

### 📊 PHASE 4: Scoring & Vetting v6

#### Task 4.1: Update Opportunity Score Prompt
**Status:** ⬜ Not Started

Add new scoring dimensions:
- `virality` (0-100)
- `leverage` (0-100)
- `automation_density` (0-100)
- `autonomy_level` (0-100)
- `culture_tailwinds` (0-100)
- `chaos_factor` (0-100)

**Impacted Files:**
- `src/prompts/opportunityScorePrompt.txt`
- `supabase/functions/generate-opportunity-score/index.ts`
- `src/lib/opportunityScoreEngine.ts`

---

#### Task 4.2: Update `IdeaScoring` Library
**Status:** ⬜ Not Started

Extend `scoreIdeaForFounder()` to include v6 dimensions.

**Impacted Files:**
- `src/lib/ideaScoring.ts`
- `src/hooks/useScoredFounderIdeas.ts`

---

#### Task 4.3: Update `IdeaVettingCard` Component
**Status:** ⬜ Not Started

Display new v6 scores in the vetting UI.

**Impacted Files:**
- `src/components/ideas/IdeaVettingCard.tsx`

---

#### Task 4.4: Update `CompareIdeas` Page
**Status:** ⬜ Not Started

Add v6 score comparisons to side-by-side view.

**Impacted Files:**
- `src/pages/CompareIdeas.tsx`
- `src/components/opportunity/OpportunityScoreCard.tsx`
- `src/components/opportunity/ScoreGauge.tsx`

---

#### Task 4.5: Update `IdeaScoredCard` Component
**Status:** ⬜ Not Started

Show v6 badges/indicators (virality, leverage, chaos, etc.)

**Impacted Files:**
- `src/components/ideas/IdeaScoredCard.tsx`

---

### 🎛️ PHASE 5: UI Controls for Modes

#### Task 5.1: Create Mode Selector Component
**Status:** ⬜ Not Started

Create reusable mode selector with icons and descriptions.

**Impacted Files:**
- `src/components/ideas/ModeSelector.tsx` (NEW)

---

#### Task 5.2: Update Ideas Page with Mode Controls
**Status:** ⬜ Not Started

Add mode buttons/toggles to idea generation screen:
- Standard (breadth)
- Creator Mode
- Automation Mode
- Persona Mode
- Boundless Mode
- Chaos Mode
- Money Printer Mode
- Memetic Mode
- Locker Room Mode (conditional on edgy_mode)

**Impacted Files:**
- `src/pages/Ideas.tsx`
- `src/hooks/useFounderIdeas.ts`

---

#### Task 5.3: Gate Locker Room Mode
**Status:** ⬜ Not Started

Only show Locker Room Mode if founder's `edgy_mode` is "bold" or "unhinged".

**Impacted Files:**
- `src/pages/Ideas.tsx`
- `src/components/ideas/ModeSelector.tsx`

---

### 📡 PHASE 6: Feed, Micro Tasks, Niche Radar Upgrades

#### Task 6.1: Update `generateFeedItems` Prompt
**Status:** ⬜ Not Started

Add awareness of:
- idea category
- platform
- virality potential
- leverage
- chaos_factor

Add new item types:
- `viral_experiment`
- `money_system_upgrade`
- `memetic_play`
- `chaos_variant`

**Impacted Files:**
- `src/prompts/generateFeedItems.txt`
- `supabase/functions/generate-feed-items/index.ts`
- `src/types/feed.ts`

---

#### Task 6.2: Update `generateMicroTasks` Prompt
**Status:** ⬜ Not Started

Make tasks aware of v6 idea attributes.

**Impacted Files:**
- `src/prompts/generateMicroTasks.txt`
- `supabase/functions/generate-micro-tasks/index.ts`
- `src/lib/tasksEngine.ts`

---

#### Task 6.3: Update `generateNicheRadar` Prompt
**Status:** ⬜ Not Started

Add v6 signal types and awareness.

**Impacted Files:**
- `src/prompts/generateNicheRadar.txt`
- `supabase/functions/generate-niche-radar/index.ts`
- `src/lib/radarEngine.ts`

---

#### Task 6.4: Update Feed Card UI
**Status:** ⬜ Not Started

Display new item types with appropriate styling.

**Impacted Files:**
- `src/components/feed/FeedCard.tsx`

---

#### Task 6.5: Update Radar Card UI
**Status:** ⬜ Not Started

Display new signal types.

**Impacted Files:**
- `src/components/radar/RadarCard.tsx`

---

### 🚀 PHASE 7: Venture Mode v6

#### Task 7.1: Add Variant Generation Buttons
**Status:** ⬜ Not Started

In idea detail/venture view, add buttons to generate:
- Chaos Variant
- Money Printer Variant
- Memetic Variant
- Creator Variant
- Automation Variant
- Persona Variant

**Impacted Files:**
- `src/pages/IdeaDetail.tsx`
- `src/pages/NorthStar.tsx`

---

#### Task 7.2: Create Variant Generation Edge Function
**Status:** ⬜ Not Started

Create `generate-idea-variant` that takes an existing idea + mode and generates a variant.

**Impacted Files:**
- `supabase/functions/generate-idea-variant/index.ts` (NEW)
- `src/hooks/useGenerateVariant.ts` (NEW)

---

#### Task 7.3: Add "Fuse Ideas" Action
**Status:** ⬜ Not Started

Add button to combine 2-3 ideas into a hybrid.

**Impacted Files:**
- `src/pages/CompareIdeas.tsx`
- `src/pages/Ideas.tsx`

---

### 🔥 PHASE 8: Fusion Engine

#### Task 8.1: Create `fuse-ideas` Edge Function
**Status:** ⬜ Not Started

Create edge function that:
- Accepts 2-3 idea objects
- Calls AI fusion prompt
- Returns single new idea using v6 schema

**Impacted Files:**
- `supabase/functions/fuse-ideas/index.ts` (NEW)

---

#### Task 8.2: Create Fusion System Prompt
**Status:** ⬜ Not Started

Create prompt that intelligently merges ideas.

**Impacted Files:**
- `src/prompts/v6/fusionPrompt.ts` (NEW)

---

#### Task 8.3: Create `useFuseIdeas` Hook
**Status:** ⬜ Not Started

React hook to invoke fusion.

**Impacted Files:**
- `src/hooks/useFuseIdeas.ts` (NEW)

---

#### Task 8.4: Create Fusion UI
**Status:** ⬜ Not Started

Modal/drawer for selecting ideas to fuse and viewing result.

**Impacted Files:**
- `src/components/ideas/FusionModal.tsx` (NEW)
- `src/pages/Ideas.tsx`
- `src/pages/CompareIdeas.tsx`

---

### 🧹 PHASE 9: Cleanup & Polish

#### Task 9.1: Update Context Inspector
**Status:** ⬜ Not Started

Display new v6 fields in context cards.

**Impacted Files:**
- `src/components/context-inspector/FounderProfileCard.tsx`
- `src/components/context-inspector/ChosenIdeaCard.tsx`
- `src/hooks/useUserContext.ts`

---

#### Task 9.2: Update Blueprint Engine
**Status:** ⬜ Not Started

Make blueprint aware of v6 idea attributes.

**Impacted Files:**
- `src/prompts/generateBlueprint.txt`
- `supabase/functions/generate-blueprint/index.ts`
- `supabase/functions/refresh-blueprint/index.ts`

---

#### Task 9.3: Update Master Prompt Generator
**Status:** ⬜ Not Started

Include v6 context in master prompt output.

**Impacted Files:**
- `src/prompts/generateMasterPrompt.txt`
- `supabase/functions/generate-master-prompt/index.ts`

---

#### Task 9.4: Update AI Contracts Documentation
**Status:** ⬜ Not Started

Document all v6 API contracts.

**Impacted Files:**
- `AI_CONTRACTS.md`

---

#### Task 9.5: Add Engine Version Migration
**Status:** ⬜ Not Started

Mark existing ideas as `engine_version: "v5"` and new ideas as `"v6"`.

**Impacted Files:**
- `supabase/migrations/` (new migration)

---

## 📁 FILES IMPACTED SUMMARY

### Database / Migrations
- `supabase/migrations/` — 2-3 new migrations

### Types (Must Update)
- `src/types/businessIdea.ts` ⭐
- `src/types/founderProfile.ts` ⭐
- `src/types/idea.ts`
- `src/types/feed.ts`
- `src/types/index.ts`

### Hooks (Must Update)
- `src/hooks/useFounderIdeas.ts` ⭐
- `src/hooks/useScoredFounderIdeas.ts`
- `src/hooks/useFounderProfile.ts`
- `src/hooks/useExtendedIntake.ts`
- `src/hooks/useUserContext.ts`

### Hooks (New)
- `src/hooks/useGenerateVariant.ts` 🆕
- `src/hooks/useFuseIdeas.ts` 🆕

### Library Engines (Must Update)
- `src/lib/ideaScoring.ts` ⭐
- `src/lib/ideaEngine.ts`
- `src/lib/opportunityScoreEngine.ts`
- `src/lib/tasksEngine.ts`
- `src/lib/radarEngine.ts`
- `src/lib/feedEngine.ts`
- `src/lib/contextBuilder.ts`

### Prompts (Must Update)
- `src/prompts/trueblazerIdeationEngine.ts` ⭐
- `src/prompts/opportunityScorePrompt.txt`
- `src/prompts/generateFeedItems.txt`
- `src/prompts/generateMicroTasks.txt`
- `src/prompts/generateNicheRadar.txt`
- `src/prompts/generateBlueprint.txt`
- `src/prompts/generateMasterPrompt.txt`

### Prompts (New v6 Directory)
- `src/prompts/v6/breadthModePrompt.ts` 🆕
- `src/prompts/v6/creatorModePrompt.ts` 🆕
- `src/prompts/v6/automationModePrompt.ts` 🆕
- `src/prompts/v6/personaModePrompt.ts` 🆕
- `src/prompts/v6/boundlessModePrompt.ts` 🆕
- `src/prompts/v6/chaosModePrompt.ts` 🆕
- `src/prompts/v6/moneyPrinterModePrompt.ts` 🆕
- `src/prompts/v6/memeticModePrompt.ts` 🆕
- `src/prompts/v6/lockerRoomModePrompt.ts` 🆕
- `src/prompts/v6/fusionPrompt.ts` 🆕

### Components (Must Update)
- `src/components/ideas/IdeaScoredCard.tsx`
- `src/components/ideas/IdeaVettingCard.tsx`
- `src/components/ideas/IdeaFilters.tsx`
- `src/components/opportunity/OpportunityScoreCard.tsx`
- `src/components/opportunity/ScoreGauge.tsx`
- `src/components/feed/FeedCard.tsx`
- `src/components/radar/RadarCard.tsx`
- `src/components/context-inspector/FounderProfileCard.tsx`
- `src/components/context-inspector/ChosenIdeaCard.tsx`

### Components (New)
- `src/components/ideas/ModeSelector.tsx` 🆕
- `src/components/ideas/FusionModal.tsx` 🆕
- `src/components/onboarding/extended/WorkPersonalityStep.tsx` 🆕
- `src/components/onboarding/extended/CreatorPlatformsStep.tsx` 🆕
- `src/components/onboarding/extended/EdgeModeStep.tsx` 🆕
- `src/components/onboarding/extended/MoneySystemsStep.tsx` 🆕
- `src/components/onboarding/extended/IndustriesStep.tsx` 🆕

### Pages (Must Update)
- `src/pages/Ideas.tsx` ⭐
- `src/pages/IdeaDetail.tsx`
- `src/pages/CompareIdeas.tsx`
- `src/pages/ExtendedOnboarding.tsx`
- `src/pages/NorthStar.tsx`

### Edge Functions (Must Update)
- `supabase/functions/generate-founder-ideas/index.ts` ⭐
- `supabase/functions/generate-opportunity-score/index.ts`
- `supabase/functions/generate-feed-items/index.ts`
- `supabase/functions/generate-micro-tasks/index.ts`
- `supabase/functions/generate-niche-radar/index.ts`
- `supabase/functions/generate-blueprint/index.ts`
- `supabase/functions/refresh-blueprint/index.ts`
- `supabase/functions/generate-master-prompt/index.ts`
- `supabase/functions/finalize-founder-profile/index.ts`
- `supabase/functions/normalize-founder-profile/index.ts`

### Edge Functions (New)
- `supabase/functions/generate-idea-variant/index.ts` 🆕
- `supabase/functions/fuse-ideas/index.ts` 🆕

---

## 🔢 TASK COUNT

| Phase | Tasks |
|-------|-------|
| Phase 1: Schema Upgrades | 3 |
| Phase 2: Onboarding v3 | 6 |
| Phase 3: Idea Engine v6 | 11 |
| Phase 4: Scoring & Vetting | 5 |
| Phase 5: UI Controls | 3 |
| Phase 6: Feed/Tasks/Radar | 5 |
| Phase 7: Venture Mode v6 | 3 |
| Phase 8: Fusion Engine | 4 |
| Phase 9: Cleanup & Polish | 5 |
| **TOTAL** | **45 tasks** |

---

## 🚦 IMPLEMENTATION ORDER

1. **Phase 1** — Schema first (migrations)
2. **Phase 3.1** — Mode types
3. **Phase 3.2-3.11** — Prompts and edge function
4. **Phase 4** — Scoring updates
5. **Phase 5** — UI controls
6. **Phase 2** — Onboarding v3
7. **Phase 6** — Feed/Tasks/Radar
8. **Phase 7-8** — Venture variants + Fusion
9. **Phase 9** — Polish

---

*Created: 2025-12-10*
*Status: PLANNING — DO NOT IMPLEMENT YET*
