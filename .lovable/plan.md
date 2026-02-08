
## Testing Plan: Mavrik Discovery Flow (End-to-End)

### Current State Analysis
After reviewing the code, I've identified the complete flow and potential issues:

1. **Flow Path**: `/discover` → `/discover/summary` → `/discover/results`
2. **Key Functions**: 
   - `dynamic-founder-interview` (interview + summary generation)
   - `finalize-founder-profile` (interview finalization)
   - `generate-personalized-ideas` (recommendation generation)
   - `mavrik-apply-corrections` (feedback handling)

### Testing Objectives
1. Verify the complete interview flow completes successfully
2. Confirm recommendations are generated and cached
3. Validate the "Explore This Idea" flow connects to idea library
4. Test trial gating on idea exploration
5. Verify financial viability scores display across the app

### Test Scenario: Complete Flow

**Phase 1: Interview (/discover)**
- [ ] Page loads and checks for existing interviews
- [ ] "Start a new interview" begins conversation
- [ ] Chat accepts user messages
- [ ] AI responses appear and count correctly
- [ ] Progress bar updates (5 questions estimated)
- [ ] "Finalize" button enables after 3+ questions
- [ ] Finalize triggers summary generation

**Phase 2: Summary (/discover/summary)**
- [ ] Page receives and displays insights correctly
- [ ] Founder portrait renders with extracted data
- [ ] Insight cards show with confidence badges
- [ ] "That's me — show me ideas" navigates to results
- [ ] "Not quite" opens correction interface
- [ ] Corrections re-synthesize profile and pass to results

**Phase 3: Results (/discover/results)**
- [ ] Loading state displays with animated steps
- [ ] `generate-personalized-ideas` edge function triggers
- [ ] Recommendations display in ranked order (#1-5)
- [ ] Fit scores color-coded correctly (green 80+, blue 60-79, amber 40-59, red <40)
- [ ] "Why this fits you" section displays with specific founder context
- [ ] Details grid shows all 4 fields (target customer, revenue model, timeline, capital)
- [ ] Risk and first step callouts styled appropriately
- [ ] Generation notes display if present

**Phase 4: Explore Modal**
- [ ] Clicking "Explore This Idea" opens confirmation modal
- [ ] Modal shows correct idea name
- [ ] Active venture warning shows if venture exists (or not, if none)
- [ ] Proper buttons display based on venture state

**Phase 5: Trial Gating**
- [ ] First idea explore succeeds
- [ ] Second idea explore shows upgrade prompt (trial users)
- [ ] Pro users can explore unlimited ideas

**Phase 6: Financial Viability Integration**
- [ ] FinancialViabilityScore displays in recommendation cards
- [ ] Score badge shows correct color coding
- [ ] Pro users see radar breakdown, trial users see lock icon
- [ ] Component appears in idea library and blueprint views

### Technical Checkpoints

**Edge Function Calls** (Use Network tab to verify):
1. `dynamic-founder-interview` (mode="question") × N times
2. `dynamic-founder-interview` (mode="summary") × 1
3. `finalize-founder-profile` × 1
4. `generate-personalized-ideas` × 1 (or cached)

**Database States** (Use Cloud View to verify):
1. `founder_interviews` row created with `status: "completed"`
2. `personalized_recommendations` row created with all 5 ideas
3. `financial_viability_scores` row created when idea is explored
4. `ideas` row created when "Explore This Idea" is clicked

**Data Flow Validation**:
- Interview transcript flows correctly from chat to summary
- Context summary flows from interview to results
- Recommendations persist in cache (revisit /discover/results = no regeneration)
- Mavrik metadata preserved in idea source_meta

### Potential Issues to Investigate

1. **Interview Completion Marker**: `[INTERVIEW_COMPLETE]` token must be in AI response
2. **Summary Generation**: `context_summary` must be properly structured JSON
3. **Recommendation Caching**: Ensure `personalized_recommendations` query returns all 5 ideas
4. **Trial User Detection**: Verify `useSubscription` hook correctly identifies trial vs Pro
5. **Navigation State**: Interview ID might be lost between pages—should fall back to DB query
6. **Financial Viability Async**: Scores might not generate on first idea view—may need manual trigger button

### Success Criteria
- [ ] All 5 recommendations generate and display
- [ ] Fit scores are realistic (weighted across 4 dimensions)
- [ ] At least one recommendation is "safe bet" (lower risk), one is "moonshot"
- [ ] Explore flow creates idea with source_meta containing full recommendation context
- [ ] Trial gating works (1 idea explore, then upgrade prompt)
- [ ] Financial viability scores appear in results and idea detail pages
- [ ] No console errors throughout flow
