

## Problem Analysis

There are **two critical bugs** in `supabase/functions/generate-blueprint/index.ts` causing the empty business sections:

### Bug 1: Variable used before declaration (build error)
The interview enrichment fallback block (lines 718-750) uses `interviewContext` **before** it's declared at line 784. This means:
- The enrichment of `ideaAnalysis` from interview data **never executes**
- The AI receives a sparse `idea_analysis` payload with no offer/monetization/distribution data
- TypeScript correctly flags this as `TS2448: Block-scoped variable used before declaration`

### Bug 2: `InterviewContextSlice` type missing fields
The `selectInterviewContext` shared utility strips the context down to only fields in its type (`InterviewContextSlice`). But lines 835-839 reference `domainExpertise`, `customerPain`, and `interviewSignalQuality` — fields that don't exist on `InterviewContextSlice`. The slice for `generate-blueprint` only includes: `ventureIntelligence`, `constraints`, `energyDrainers`, `founderSummary`.

So even if the interview has rich data, it gets stripped before the payload is built.

---

## Fix Plan

### 1. Move the interview context fetch ABOVE the enrichment block
Move the interview fetch (lines 774-785) to **before** line 718, so `interviewContext` is declared and available when the enrichment fallback runs.

### 2. Add missing fields to `InterviewContextSlice` type
Update `selectInterviewContext.ts` to include `domainExpertise`, `customerPain`, and `interviewSignalQuality` in the type definition.

### 3. Update the field map for `generate-blueprint`
Add `extractedInsights`, `domainExpertise`, `customerPain`, and `interviewSignalQuality` (or a broader alias) to the `generate-blueprint` entry in `FUNCTION_FIELD_MAP` so the slice actually passes these fields through.

### 4. Cast `interviewContext` properly in the enrichment block
Since we're accessing raw interview fields (`domainExpertise`, `customerPain`) for enrichment, use the full `rawInterviewContext` (pre-slicing) for the enrichment block, or access via the now-typed slice.

### Technical Summary of Changes

**File: `supabase/functions/generate-blueprint/index.ts`**
- Reorder: Move the interview data fetch block (lines 774-785) to just after line 713 (after source_meta fallback)
- The enrichment block (lines 718-750) then works correctly with the declared variable

**File: `supabase/functions/_shared/selectInterviewContext.ts`**
- Add `domainExpertise`, `customerPain`, `interviewSignalQuality` to the `InterviewContextSlice` type
- Add these fields to the `generate-blueprint` entry in `FUNCTION_FIELD_MAP`

These changes fix both the build errors and the root cause of empty business sections.

