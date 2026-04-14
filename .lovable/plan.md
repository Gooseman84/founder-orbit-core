

# Context Compounding: Persistent Founder Intelligence Snapshots

## What This Does

Creates an automated system that periodically synthesizes a founder's completed tasks, validation evidence, reflections, and behavioral patterns into a compact, versioned "intelligence snapshot." Core edge functions then consume the latest snapshot instead of re-aggregating raw data on every call — making Mavrik's responses faster, more contextually aware, and progressively sharper as evidence accumulates.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  Triggers (any of these fire compounding)       │
│  • Daily check-in submitted                     │
│  • Validation evidence logged                   │
│  • Reflection saved                             │
│  • Strategy adapted                             │
└──────────────────┬──────────────────────────────┘
                   ▼
        ┌──────────────────────┐
        │ compound-founder-    │
        │ context (edge fn)    │
        │                      │
        │ Fetches:             │
        │ • Task completion %  │
        │ • Energy/stress avg  │
        │ • Top blockers       │
        │ • Validated learnings│
        │ • Active patterns    │
        │ • Market evidence    │
        │ • Routing signal     │
        │                      │
        │ Outputs: compact     │
        │ JSON snapshot        │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ founder_context_     │
        │ snapshots (table)    │
        │                      │
        │ • venture_id         │
        │ • snapshot (jsonb)   │
        │ • version (int)      │
        │ • trigger_event      │
        │ • created_at         │
        └──────────┬───────────┘
                   ▼
        ┌──────────────────────┐
        │ Consumer functions   │
        │ • generate-checkin   │
        │ • generate-tasks     │
        │ • venture-debugger   │
        │ • generate-blueprint │
        │                      │
        │ getCompoundedContext()│
        │ → latest snapshot    │
        └──────────────────────┘
```

## Database Change

**New table: `founder_context_snapshots`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid NOT NULL | RLS scoped |
| venture_id | uuid NOT NULL | |
| version | integer NOT NULL DEFAULT 1 | Auto-incremented per venture |
| snapshot | jsonb NOT NULL | The compounded intelligence |
| trigger_event | text NOT NULL | e.g. "checkin", "reflection", "validation_evidence" |
| created_at | timestamptz DEFAULT now() | |

RLS: Users can SELECT/INSERT their own rows. Service role has full access (edge functions write via service client).

## Snapshot Schema (jsonb)

```json
{
  "executionProfile": {
    "completionRate7d": 0.71,
    "completionRate30d": 0.65,
    "avgEnergyLevel": 3.8,
    "avgStressLevel": 2.1,
    "energyTrend": "rising",
    "topCategories": ["validation", "build"],
    "weakCategories": ["marketing"]
  },
  "validatedLearnings": [
    "Target users prefer async communication",
    "Pricing above $49/mo met resistance in 3 interviews"
  ],
  "activeBlockers": ["Need to find technical co-founder"],
  "behavioralFlags": ["scope_creep (medium)"],
  "marketIntelligence": {
    "strongDemandSignals": ["remote team tooling"],
    "competitorCount": 4,
    "timingAssessment": "favorable"
  },
  "founderStrengths": ["domain expertise in healthcare IT", "strong network in target market"],
  "routingSignal": { "suggestedArchetype": "vertical_saas", "confidence": "high" },
  "snapshotSummary": "Founder is 12 days into a 30-day sprint with 71% task completion. Energy rising. One active pattern (scope creep). Market timing is favorable with 2 strong demand signals."
}
```

## New Edge Function: `compound-founder-context`

**Purpose:** Aggregates raw signals into a compact snapshot. Called after key events (not on every request).

**Data sources fetched:**
1. `venture_daily_tasks` — completion rates (7d and 30d)
2. `daily_reflections` — energy/stress averages and trends (last 7)
3. `founder_patterns` — active behavioral flags
4. `market_validations` — demand signals, competitor count, timing
5. `validation_evidence` + `validation_summaries` — validated learnings
6. `execution_strategies` — current strategic focus
7. `founder_interviews` — routing signal, founder strengths
8. `venture_daily_checkins` — recent blockers from explanations

**Logic:** Pure aggregation — no AI call needed. Deterministic computation of averages, trends, and compact summaries. Fast and cheap.

**Versioning:** Each call inserts a new row (append-only). Old snapshots are preserved for trend analysis. A cleanup policy can prune snapshots older than 90 days later.

**Throttling:** If the latest snapshot is less than 4 hours old, skip recomputation and return the existing one. This prevents spam from rapid successive events.

## Shared Utility: `_shared/getCompoundedContext.ts`

```typescript
export async function getCompoundedContext(
  supabase: SupabaseClient,
  userId: string,
  ventureId: string
): Promise<any | null> {
  const { data } = await supabase
    .from("founder_context_snapshots")
    .select("snapshot")
    .eq("user_id", userId)
    .eq("venture_id", ventureId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.snapshot ?? null;
}
```

## Consumer Integration

Wire `getCompoundedContext()` into 4 high-impact functions. The snapshot gets injected as a `## Founder Intelligence Snapshot` block in the system prompt — replacing the current multi-fetch approach where feasible, or supplementing it with pre-computed trends that can't be derived inline.

| Function | How it uses snapshot |
|----------|-------------------|
| `generate-checkin-response` | Energy trend, active blockers, completion rate → calibrate tone |
| `generate-daily-execution-tasks` | Weak categories, validated learnings → task selection bias |
| `venture-debugger` | Full snapshot → diagnostic baseline |
| `generate-blueprint` | Market intelligence, validated learnings → grounded recommendations |

## Trigger Points (client-side)

Fire-and-forget calls to `compound-founder-context` after:
1. Daily check-in submission (in `useDailyExecution` hook)
2. Validation evidence logged (in `LogEvidenceModal`)
3. Daily reflection saved (in `DailyReflectionForm`)

These are non-blocking — the user never waits for compounding.

## Files Modified/Created

| File | Action |
|------|--------|
| Migration SQL | Create `founder_context_snapshots` table + RLS |
| `supabase/functions/compound-founder-context/index.ts` | New edge function |
| `supabase/functions/_shared/getCompoundedContext.ts` | New shared utility |
| `supabase/functions/generate-checkin-response/index.ts` | Add snapshot consumption |
| `supabase/functions/generate-daily-execution-tasks/index.ts` | Add snapshot consumption |
| `supabase/functions/venture-debugger/index.ts` | Add snapshot consumption |
| `supabase/functions/generate-blueprint/index.ts` | Add snapshot consumption |
| `src/hooks/useDailyExecution.ts` | Fire compounding after check-in |
| `src/components/reflection/DailyReflectionForm.tsx` | Fire compounding after reflection |
| `src/components/validation/LogEvidenceModal.tsx` | Fire compounding after evidence |

## Token Budget

The snapshot adds ~300-500 tokens to each consumer prompt — less than the current multi-source approach because it's pre-aggregated. Net effect is a token reduction for functions that currently do 4+ parallel fetches for raw data.

## What This Does NOT Do

- No AI call in the compounding step (pure computation)
- No UI changes (snapshots are invisible infrastructure)
- No breaking changes to existing function signatures
- No removal of existing data fetches (snapshot supplements, doesn't replace — functions can still fetch real-time data for freshness-critical fields)

