// Pure types shared between the policy module, the edge function, and tests.
// No Deno- or Node-specific imports here.

export type MoneyPathStage =
  | "S1_OFFER_SHAPING"
  | "S2_OUTREACH"
  | "S3_CONVERSATIONS"
  | "S4_OFFERS_OUT"
  | "S5_FIRST_REVENUE"
  | "S6_REPEATABLE"
  | "S7_SCALE";

export type BottleneckKind =
  | "B_NO_OFFER"
  | "B_NO_BUYER_LIST"
  | "B_NO_OUTREACH"
  | "B_NO_REPLIES"
  | "B_REPLIES_NO_CALLS"
  | "B_CALLS_NO_OFFERS"
  | "B_OFFERS_NO_CLOSE"
  | "B_PRICE_OBJECTION"
  | "B_CHANNEL_EXHAUSTED"
  | "B_DELIVERY_STUCK"
  | "B_NOT_YET_REPEATABLE"     // NEW — post-first-revenue, pre-3-wins
  | "B_LOSS_REASON_UNKNOWN";   // NEW — losses without recorded reasons

export type WarmNetworkStrength = "none" | "weak" | "moderate" | "strong";
export type SalesComplexity = "self_serve" | "light_touch" | "high_touch";
export type BusinessPattern =
  | "productized_service"
  | "advisory"
  | "cohort"
  | "digital_product"
  | "licensing"
  | "micro_saas";

/** Derived state — what stage/bottleneck/evidence say. Read from SQL views. */
export interface MoneyPathState {
  money_path_id: string;
  stage: MoneyPathStage;
  bottleneck: BottleneckKind;
  evidence: {
    revenue_cents: number;
    revenue_count: number;
    contacted_count: number;
    replied_count: number;
    offer_sent_count: number;
    total_conv: number;
  };
  /** Channel that produced revenue, if any. Path-scoped, never founder-scoped. */
  winning_channel?: string | null;
}

/** Founder-side context — advantages + offer characteristics.
 *  Extended with the ECONOMIC LEVERAGE SNAPSHOT (Repair Block 1.1). */
export interface FounderContext {
  business_pattern: BusinessPattern;
  sales_complexity: SalesComplexity | null;
  offer_locked: boolean;
  buyer_segment: string | null;
  // ── Committed offer evidence (Repair Block 1.3) ────────────────────────
  offer_title: string | null;
  offer_description: string | null;
  price_cents: number | null;
  delivery_format: string | null;
  warm_network_strength: WarmNetworkStrength;
  existing_audience_size: number;
  existing_audience_channel: string | null;
  platform_strengths: string[];
  existing_client_access: boolean;
  // ── Leverage snapshot (additive) ────────────────────────────────────────
  reachable_buyer_count: number;
  activatable_audience: boolean;
  has_prior_paid_proof: boolean;
  // ── Triggering buyer conversation (Repair Block 1.3) ───────────────────
  /** Deterministically selected buyer_conversation relevant to this action.
   *  Never fabricated — only present when actual identity evidence exists. */
  triggering_conversation?: TriggeringConversation | null;
}

/** Narrowly scoped known-buyer context for actions that operate on an
 *  existing buyer interaction. Only actual stored evidence is exposed. */
export interface TriggeringConversation {
  handle: string;
  channel: string | null;
  status: string;
  loss_reason: string | null;
  loss_note: string | null;
  outcome: string | null;
  last_activity_at: string;
}

/** Content-only template row (from action_templates table). */
export interface ActionTemplate {
  code: string;
  business_pattern: BusinessPattern;
  applicable_stages: MoneyPathStage[];
  addresses_bottleneck: BottleneckKind;
  title: string;
  why_now_template: string;
  done_looks_like: string;
  deliverable_kind: string;
  deliverable_prompt: string;
  estimated_minutes: number;
  cooldown_days: number;
  incompatible_with: string[];
}

/** History row for cooldown + repetition filtering. */
export interface NbaHistoryEntry {
  template_code: string;
  served_at: string; // ISO
  outcome: "pending" | "done" | "skipped" | "overridden" | "expired";
}

/** Scored candidate returned by policy. */
export interface ScoredCandidate {
  template: ActionTemplate;
  score: number;
  reasons: string[];
}

/** Final selector output. */
export interface Selection {
  primary: ScoredCandidate | null;
  alternates: ScoredCandidate[]; // up to 2
  library_exhausted: boolean;    // true when only cooldown-blocked options remain
}

// ── Extras passed to selectAction — kept optional so existing callers work. ──

export interface LossReasonBucket { reason: string; count: number; }

export interface LossDistribution {
  /** Recent 30-day loss reason counts, most-frequent first. */
  buckets: LossReasonBucket[];
  recent_total: number;
  recent_unknown: number;
}

export interface ActiveSignals {
  /** Founder replies but does not ask for the call/offer. Additive urgency,
   *  never overrides deterministic stage/bottleneck. */
  avoids_ask: boolean;
}

export interface SelectExtras {
  loss_distribution?: LossDistribution;
  signals?: ActiveSignals;
}

// ── Economic leverage principle ────────────────────────────────────────────
/**
 * hasSufficientLeverage(ctx) — true when the founder already has enough
 * economic asset that jumping straight to external buyer contact today is the
 * commercially correct next move, and preparation steps (list-building,
 * offer-refinement) should be demoted.
 *
 * SPECIFICITY-VS-EVIDENCE RULE: templates chosen under this predicate must
 * NEVER claim to name specific contacts, companies, or prior conversations.
 * The predicate proves that reachable, relevant buyers exist — not who they
 * are. Recipient-specific personalization is only allowed when named-contact
 * evidence exists in production (not in Block 1.1).
 */
export function hasSufficientLeverage(ctx: FounderContext): boolean {
  return (
    ctx.reachable_buyer_count >= 5 ||
    ctx.activatable_audience === true ||
    (ctx.warm_network_strength === "strong" && ctx.existing_client_access === true)
  );
}
