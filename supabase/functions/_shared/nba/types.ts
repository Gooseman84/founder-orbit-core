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
  | "B_DELIVERY_STUCK";

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
}

/** Founder-side context — advantages + offer characteristics. */
export interface FounderContext {
  business_pattern: BusinessPattern;
  sales_complexity: SalesComplexity | null;
  offer_locked: boolean;
  buyer_segment: string | null;
  warm_network_strength: WarmNetworkStrength;
  existing_audience_size: number; // 0 when unknown
  existing_audience_channel: string | null;
  platform_strengths: string[];
  existing_client_access: boolean;
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
