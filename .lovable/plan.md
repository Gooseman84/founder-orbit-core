

# Audit: Edge Function Context Consumption Gaps

## Summary

After reviewing all 12 core edge functions, I found that most functions only consume **interview context** and miss 3-5 other available data sources. The richest function is `generate-daily-execution-tasks` (7 sources); the poorest is `generate-founder-ideas` (2 sources). Here's the full gap map.

## Data Sources Available

| Source | Table | Signal Value |
|--------|-------|-------------|
| Interview Context | `founder_interviews.context_summary` | Expertise, pain, routing |
| Reflections | `daily_reflections` | Energy, stress, blockers, learnings |
| Check-ins | `venture_daily_checkins` | Completion patterns, explanations |
| Founder Patterns | `founder_patterns` | Detected behavioral warnings |
| Market Validation | `market_validations` | Demand signals, competitors, timing |
| Execution Strategy | `execution_strategies` | Calibrated focus + directives |
| FVS Scores | `financial_viability_scores` | Dimension scores, risks, opportunities |
| Validation Evidence | `validation_evidence` + `validation_summaries` | Real-world proof points |
| Blueprint | `founder_blueprints` | AI summary, focus quarters |
| Task History | `venture_daily_tasks` | Completion rates by category |

## Gap Matrix

```text
Function                       | Interview | Reflect | Checkin | Patterns | Market | FVS | Strategy | Blueprint | Tasks
-------------------------------|-----------|---------|--------|----------|--------|-----|----------|-----------|------
generate-daily-execution-tasks | ✅        | ✅      | ✅     | ✗ GAP    | ✗ GAP  | ✗   | ✅       | ✅        | ✅
adapt-execution-strategy       | ✗ GAP     | ✅      | ✅     | ✅       | ✅     | ✗   | n/a      | ✅        | ✅
generate-checkin-response      | ✅        | ✗ GAP   | ✅     | ✗ GAP    | ✗      | ✗   | ✗ GAP    | ✗ GAP     | ✗
generate-blueprint             | ✅        | ✗ GAP   | ✗      | ✗ GAP    | ✗ GAP  | ✗   | ✗        | n/a       | ✗
generate-founder-ideas         | ✅        | ✗       | ✗      | ✗        | ✗ GAP  | ✗   | ✗        | ✗         | ✗
calculate-financial-viability  | ✅        | ✗       | ✗      | ✗ GAP    | ✅     | n/a | ✗        | ✗         | ✗
generate-implementation-kit    | ✅        | ✗       | ✗      | ✗        | ✗ GAP  | ✅  | ✗        | ✅        | ✗
generate-validation-plan       | ✅        | ✗       | ✗      | ✗        | ✗      | ✅  | ✗        | ✗         | ✗
venture-debugger               | ✅        | ✗ GAP   | ✗ GAP  | ✅       | ✗ GAP  | ✗   | ✗ GAP    | ✗         | ✗ GAP
generate-venture-plan          | ✅        | ✗       | ✗      | ✗ GAP    | ✗ GAP  | ✗   | ✗        | ✅        | ✗
generate-revenue-stack-brief   | ✅        | ✗       | ✗      | ✗        | ✗ GAP  | ✅  | ✗        | ✗         | ✗
```

`✗ GAP` = data exists and would meaningfully improve output quality.
`✗` = data exists but marginal value for this function's purpose.

## Top 5 Highest-Impact Gaps

### 1. `generate-checkin-response` — Missing reflections, patterns, strategy, blueprint
**Impact: HIGH.** This is the daily Mavrik coaching response. It currently sees only check-in history and raw interview context. It has no idea about:
- The founder's energy/stress trend (reflections)
- Active behavioral patterns ("scope creep", "perfectionism")
- The execution strategy's calibrated focus
- The blueprint's quarterly priorities

**Fix:** Add 4 parallel fetches for `daily_reflections` (last 3), `founder_patterns` (active), `execution_strategies`, and `founder_blueprints`. Inject as structured context into the prompt.

### 2. `adapt-execution-strategy` — Missing interview context
**Impact: HIGH.** The strategy optimizer doesn't know the founder's expertise, constraints, or routing signal. It calibrates task focus without knowing what the founder is actually good at.

**Fix:** Add `founder_interviews.context_summary` fetch + `selectInterviewContext("adapt-execution-strategy", ...)`. Add entry to `FUNCTION_FIELD_MAP`.

### 3. `venture-debugger` — Missing reflections, check-ins, tasks, market validation, strategy
**Impact: HIGH.** The debugger diagnoses venture problems but only sees interview context and patterns. It can't see actual execution data (completion rates, energy trends, market evidence).

**Fix:** Add fetches for `daily_reflections`, `venture_daily_checkins`, `venture_daily_tasks`, `market_validations`, and `execution_strategies`. This makes the debugger a true diagnostic tool.

### 4. `generate-blueprint` — Missing market validation, patterns, reflections
**Impact: MEDIUM.** Blueprints are generated without real market evidence or behavioral pattern awareness. A blueprint for a founder with a "scope creep" pattern should proactively address that.

**Fix:** Add `market_validations`, `founder_patterns` (active), and `daily_reflections` (last 5) to the context.

### 5. `generate-founder-ideas` — Missing market validation data
**Impact: MEDIUM.** Ideas are generated without knowing what's already been validated in the market. If Perplexity found strong demand signals for a niche, that should bias idea generation.

**Fix:** Fetch `market_validations` for the user's previously validated ideas and inject as "market intelligence" context.

## Implementation Plan

### Step 1: Enrich `generate-checkin-response`
Add 4 data sources (reflections, patterns, strategy, blueprint) to the parallel fetch. Update the system prompt to reference this context.

### Step 2: Add interview context to `adapt-execution-strategy`
Add `founder_interviews` fetch and `selectInterviewContext` call. Add `"adapt-execution-strategy"` to `FUNCTION_FIELD_MAP` with fields: `["founderSummary", "constraints", "energyDrainers", "transferablePatterns", "routingSignal"]`.

### Step 3: Enrich `venture-debugger`
Add 5 data sources. This is the biggest single-function change but also the highest-leverage — founders use the debugger when something feels wrong.

### Step 4: Add market validation + patterns to `generate-blueprint`
Add `market_validations` and `founder_patterns` fetches. Update the prompt to include validated demand signals and pattern warnings.

### Step 5: Add market intelligence to `generate-founder-ideas`
Fetch the user's existing `market_validations` rows and inject as "previously validated market signals" context.

### Step 6: Update `selectInterviewContext` FUNCTION_FIELD_MAP
Add `adapt-execution-strategy` entry.

## Files Modified

- `supabase/functions/generate-checkin-response/index.ts`
- `supabase/functions/adapt-execution-strategy/index.ts`
- `supabase/functions/venture-debugger/index.ts`
- `supabase/functions/generate-blueprint/index.ts`
- `supabase/functions/generate-founder-ideas/index.ts`
- `supabase/functions/_shared/selectInterviewContext.ts`

## Token Budget Consideration

Each additional data source adds ~200-500 tokens. The functions using Gemini Flash have generous context windows. I'll keep injections compact — structured summaries, not raw dumps. Estimated total token increase per function: 300-800 tokens, well within budget.

