

## Problem

After sign-up, the user goes through **Structured Onboarding** (7 questions) which then routes to the **old** `/onboarding/interview` page. That old page uses a basic card-based chat UI and, upon finalization, navigates directly to `/ideas` (the old Idea Lab). This completely bypasses the new Mavrik Discovery flow (`/discover` -> `/discover/summary` -> `/discover/results`).

There are three routing points that need to change:

1. **StructuredOnboarding transition screen** (line 413) routes to `/onboarding/interview` instead of `/discover`
2. **OnboardingInterview finalize** (line 193) routes to `/ideas` instead of through the discovery summary flow
3. **OnboardingInterview skip buttons** (lines 234, 317) also route to `/ideas`

## Plan

### 1. Update StructuredOnboarding transition screen
Change the "Continue to Mavrik" button to navigate to `/discover` instead of `/onboarding/interview`. This sends new users into the full-featured Mavrik chat interface with progress tracking, voice input, and the distraction-free layout.

### 2. Update OnboardingInterview as a fallback redirect
Since `/onboarding/interview` is the old path, update its finalize handler to navigate to `/discover/summary` (passing the interview insights) instead of `/ideas`. Also update the skip buttons to navigate to `/discover` or `/dashboard` instead of `/ideas`.

### 3. Update the onboarding guard exempt paths
Add `/discover` paths to the exempt list in `useOnboardingGuard.ts` so the guard doesn't interfere with the discovery flow.

## Technical Details

**Files to modify:**

- `src/pages/StructuredOnboarding.tsx`
  - Line 413: Change `navigate('/onboarding/interview')` to `navigate('/discover')`
  - Update transition copy to match the new discovery flow description

- `src/pages/OnboardingInterview.tsx`
  - Line 193: Change `navigate("/ideas")` to `navigate("/discover/summary", { state: { insights: summaryData?.contextSummary } })`
  - Lines 234, 317: Change `navigate('/ideas')` to `navigate('/dashboard')`

- `src/hooks/useOnboardingGuard.ts`
  - Line 17: Add `/discover` to the exempt paths array so users mid-discovery aren't redirected back to onboarding

- `src/features/onboarding/CoreOnboardingWizard.tsx`
  - Line 169: Change the "Talk to Mavrik" card to navigate to `/discover` instead of `/onboarding/interview`
  - Line 209: Keep "Skip to Ideas" as `/ideas` (this is the intentional bypass path)

