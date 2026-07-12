// Pure TS mirror of the two SQL views (v_money_path_stage, v_active_bottleneck).
// Parity is pinned by state_derivation_test.ts; if the SQL views drift, the pinned
// hashes in redteam_test.ts become stale and require an intentional refresh.

import type { BottleneckKind, MoneyPathStage } from "./types.ts";

export type ConvStatus =
  | "identified" | "contacted" | "replied" | "call_booked"
  | "offer_sent" | "won" | "lost" | "ghosted";

export interface RawEvidence {
  offer_locked_at: string | null;
  conversations: Array<{ status: ConvStatus }>;
  revenue_events: Array<{ amount_cents: number }>;
}

export interface DerivedCounts {
  total_conv: number;
  contacted_count: number;
  replied_count: number;
  call_booked_count: number;
  offer_sent_count: number;
  won_count: number;
  lost_count: number;
  revenue_cents: number;
  revenue_count: number;
}

export function deriveCounts(e: RawEvidence): DerivedCounts {
  const c = e.conversations;
  const inSet = (s: ConvStatus, arr: ConvStatus[]) => arr.includes(s);
  return {
    total_conv: c.length,
    contacted_count: c.filter(x => inSet(x.status, ["contacted","replied","call_booked","offer_sent","won","lost","ghosted"])).length,
    replied_count:   c.filter(x => inSet(x.status, ["replied","call_booked","offer_sent","won","lost"])).length,
    call_booked_count: c.filter(x => inSet(x.status, ["call_booked","offer_sent","won","lost"])).length,
    offer_sent_count:  c.filter(x => inSet(x.status, ["offer_sent","won","lost"])).length,
    won_count:  c.filter(x => x.status === "won").length,
    lost_count: c.filter(x => x.status === "lost").length,
    revenue_cents: e.revenue_events.reduce((a,r)=>a+r.amount_cents,0),
    revenue_count: e.revenue_events.length,
  };
}

export function deriveStage(e: RawEvidence): MoneyPathStage {
  const d = deriveCounts(e);
  if (d.revenue_cents >= 1_000_000) return "S7_SCALE";
  if (d.revenue_count >= 3) return "S6_REPEATABLE";
  if (d.revenue_count >= 1) return "S5_FIRST_REVENUE";
  if (d.offer_sent_count >= 1) return "S4_OFFERS_OUT";
  if (d.replied_count >= 1) return "S3_CONVERSATIONS";
  if (e.offer_locked_at) return "S2_OUTREACH";
  return "S1_OFFER_SHAPING";
}

export function deriveBottleneck(e: RawEvidence): BottleneckKind {
  const d = deriveCounts(e);
  if (!e.offer_locked_at) return "B_NO_OFFER";
  if (d.total_conv === 0) return "B_NO_BUYER_LIST";
  if (d.contacted_count === 0) return "B_NO_OUTREACH";
  if (d.replied_count === 0) return "B_NO_REPLIES";
  if (d.call_booked_count === 0) return "B_REPLIES_NO_CALLS";
  if (d.offer_sent_count === 0) return "B_CALLS_NO_OFFERS";
  return "B_OFFERS_NO_CLOSE"; // won=0 or fallthrough
}
