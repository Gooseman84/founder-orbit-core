

# Edge Function Context Audit — Post-Compounding Update

## Current State

After the previous two rounds of enrichment (context gap closure + context compounding), **5 functions** now consume the compounded snapshot. However, **6 functions still operate without it**, and some have additional gaps.

## Updated Gap Matrix

```text
Function                       | Snapshot | Interview | Reflect | Patterns | Market | Strategy | Blueprint
-------------------------------|----------|-----------|---------|----------|--------|----------|----------
generate-checkin-response      | ✅       | ✅        | ✅      | ✅       | ✗      | ✅       | ✅
generate-daily-execution-tasks | ✅       | ✅        | ✅      | ✅ (via) | ✅ (via)| ✅       | ✅
venture-debugger               | ✅       | ✅        | ✅ (via)| ✅       | ✅      | ✅       | ✗
generate-blueprint             | ✅       | ✅        | ✅      | ✅       | ✅      | ✗       | n/a
generate-founder-ideas         | ✗ GAP    | ✅        | ✗       | ✗        | ✅      | ✗        | ✗
adapt-execution-strategy       | ✗ GAP    | ✅        | ✅      | ✅       | ✅      | n/a      | ✅
generate-venture-plan          | ✗ GAP    | ✅        | ✗       | ✗ GAP    | ✗ GAP  | ✗        | ✗
generate-implementation-kit    | ✗ GAP    | ✅        | ✗       | ✗        | ✗ GAP  | ✗        | ✅
generate-validation-plan       | ✗ GAP    | ✅        | ✗       | ✗        | ✗      | ✗        | ✗
calculate-financial-viability  | ✗ GAP    | ✅        | ✗       | ✗ GAP    | ✅      | ✗        | ✗
generate-revenue-stack-brief   | ✗ GAP    | ✅        | ✗       | ✗        | ✗ GAP  | ✗        | ✗
refresh-blueprint              | ✗ GAP    | ✅        | ✗       | ✗        | ✗      | ✗        | n/a
```

`✅ (via)` = available through the compounded snapshot's pre-computed data.

## Remaining Gaps — Ranked by Impact

### Tier 1: HIGH IMPACT (daily/weekly usage, directly shapes founder experience)

**1. `adapt-execution-strategy` — Missing snapshot**
This function already fetches 7 raw data sources but doesn't consume the compounded snapshot. Adding it would provide pre-computed trends (energy trend, completion rates) that complement its raw fetches.

**2. `generate-venture-plan` — Missing snapshot, patterns, market validation**
The 30-day plan generator only sees interview + profile + idea. It has no awareness of behavioral patterns (a founder with "scope creep" needs tighter weekly scopes) or market validation (validated demand signals should inform which tasks to prioritize).

**3. `generate-founder-ideas` — Missing snapshot**
Already has market validation from the previous enrichment, but lacks the snapshot. The snapshot's `founderStrengths`, `weakCategories`, and `behavioralFlags` would help generate ideas aligned with what the founder actually executes well on.

### Tier 2: MEDIUM IMPACT (used at key decision points)

**4. `calculate-financial-viability` — Missing snapshot, patterns**
FVS scoring doesn't know if the founder has active behavioral patterns that affect viability (e.g., "execution paralysis" should lower the execution dimension score).

**5. `generate-implementation-kit` — Missing snapshot, market validation**
The kit generator doesn't know about validated demand signals that could inform feature prioritization in the spec.

**6. `refresh-blueprint` — Missing snapshot**
Blueprint refreshes don't consume the compounded context, meaning refreshed blueprints miss execution trends and validated learnings.

### Tier 3: LOWER IMPACT (less frequent, already reasonably scoped)

**7. `generate-validation-plan` — Missing snapshot**
Would benefit from knowing what's already been validated (snapshot's `validatedLearnings`) to avoid redundant missions.

**8. `generate-revenue-stack-brief` — Missing snapshot, market validation**
Revenue model recommendations could be sharper with market demand signals and execution patterns.

## Implementation Plan

The simplest, highest-leverage fix: wire `getCompoundedContext` into the 6 remaining functions. The snapshot already contains pre-aggregated data from all sources, so each function only needs one additional fetch (not 5+ individual table queries).

### Step 1: Wire snapshot into `adapt-execution-strategy`
Add `getCompoundedContext` import and fetch. Inject `formatSnapshotForPrompt()` into the system prompt alongside existing raw data.

### Step 2: Wire snapshot into `generate-venture-plan`
Add snapshot fetch. Inject behavioral flags and market intelligence into the plan generation prompt so weekly scopes respect patterns and validated signals.

### Step 3: Wire snapshot into `generate-founder-ideas`
Add snapshot fetch. Inject `founderStrengths` and `weakCategories` to bias idea generation toward executable concepts.

### Step 4: Wire snapshot into `calculate-financial-viability`
Add snapshot fetch. Inject `behavioralFlags` and `executionProfile` as additional scoring context.

### Step 5: Wire snapshot into `generate-implementation-kit`
Add snapshot fetch. Inject market intelligence for feature prioritization.

### Step 6: Wire snapshot into `refresh-blueprint` and remaining functions
Add snapshot to `refresh-blueprint`, `generate-validation-plan`, and `generate-revenue-stack-brief`.

## Files Modified

- `supabase/functions/adapt-execution-strategy/index.ts`
- `supabase/functions/generate-venture-plan/index.ts`
- `supabase/functions/generate-founder-ideas/index.ts`
- `supabase/functions/calculate-financial-viability/index.ts`
- `supabase/functions/generate-implementation-kit/index.ts`
- `supabase/functions/refresh-blueprint/index.ts`
- `supabase/functions/generate-validation-plan/index.ts`
- `supabase/functions/generate-revenue-stack-brief/index.ts`

## Token Budget

Each function gains ~300-500 tokens from the snapshot injection. No new table queries needed — just one `getCompoundedContext()` call per function. Net cost is minimal since the snapshot is a compact pre-aggregation of data many functions were already fetching individually.

