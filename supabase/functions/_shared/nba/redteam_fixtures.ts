// Persona evidence fixtures — PRODUCTION-EVIDENCE ONLY.
// Every field maps to a real column now that Repair Block 1.1 added the
// leverage snapshot (founder_advantages.reachable_buyer_count /
// activatable_audience / has_prior_paid_proof) and structured loss reasons
// (buyer_conversations.loss_reason). There are no more counterfactual blocks.

import type { FounderContext } from "./types.ts";
import type { RawEvidence } from "./state_derivation.ts";

export interface Persona {
  id: string;
  name: string;
  narrative: string;
  evidence: RawEvidence;
  context: FounderContext;
  /** Expected commercial behavior — used in the report, not enforced. */
  expected: string;
}

const now = new Date().toISOString();

function baseCtx(over: Partial<FounderContext>): FounderContext {
  return {
    business_pattern: "productized_service",
    sales_complexity: "high_touch",
    offer_locked: true,
    buyer_segment: null,
    offer_title: null,
    offer_description: null,
    price_cents: null,
    delivery_format: null,
    warm_network_strength: "none",
    existing_audience_size: 0,
    existing_audience_channel: null,
    platform_strengths: [],
    existing_client_access: false,
    reachable_buyer_count: 0,
    activatable_audience: false,
    has_prior_paid_proof: false,
    triggering_conversation: null,
    ...over,
  };
}

export const PERSONAS: Persona[] = [
  {
    id: "P1",
    name: "THE POLISHER",
    narrative:
      "Independent marketing consultant, 8 yrs, 12 past clients, strong warm network. $2,500 growth audit. Offer locked. Zero buyer conversations.",
    expected:
      "Direct warm outreach TODAY to strongest-fit reachable contacts — not list-building.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: baseCtx({
      buyer_segment: "founders of 5–30-person B2B companies who care about growth",
      warm_network_strength: "strong",
      existing_client_access: true,
      reachable_buyer_count: 8,
      activatable_audience: false,
      has_prior_paid_proof: true,
    }),
  },
  {
    id: "P2",
    name: "THE LONE EXPERT",
    narrative:
      "Fractional ops consultant. Deep domain. No warm network. No audience. Buyer segment: 20-100-emp logistics cos. $4,000 diagnostic. Offer locked. Zero outreach.",
    expected: "Build a named buyer list; then cold outreach.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: baseCtx({
      buyer_segment: "20–100 employee logistics companies",
      warm_network_strength: "none",
      reachable_buyer_count: 0,
    }),
  },
  {
    id: "P3",
    name: "THE AUDIENCE HOARDER",
    narrative:
      "HR consultant. 9,000 LinkedIn followers. Posts regularly. Never sold to audience. $499 workshop. Offer locked. Zero conversations.",
    expected: "Audience CTA — direct commercial activation of the 9k audience.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: baseCtx({
      sales_complexity: "light_touch",
      buyer_segment: "new people managers at 50–500 employee cos",
      existing_audience_size: 9000,
      existing_audience_channel: "linkedin",
      platform_strengths: ["linkedin"],
      activatable_audience: true,
      reachable_buyer_count: 0,
    }),
  },
  {
    id: "P4",
    name: "THE GHOSTED OUTREACHER",
    narrative:
      "Same offer/segment as P2. 20 targeted messages sent. Zero replies. No revenue.",
    expected:
      "Reply-rate intervention that isolates ONE variable (hook, targeting, or channel) with a measurable comparison.",
    evidence: {
      offer_locked_at: now,
      conversations: Array.from({ length: 20 }, () => ({ status: "contacted" as const })),
      revenue_events: [],
    },
    context: baseCtx({
      buyer_segment: "20–100 employee logistics companies",
    }),
  },
  {
    id: "P5",
    name: "THE CONVERSATION COLLECTOR",
    narrative:
      "8 replies (4 positive). 0 calls booked, 0 offers sent. Keeps scheduling more research calls.",
    expected: "Ask for the 15-min call directly — stop discovery, start converting.",
    evidence: {
      offer_locked_at: now,
      conversations: Array.from({ length: 8 }, () => ({ status: "replied" as const })),
      revenue_events: [],
    },
    context: baseCtx({
      buyer_segment: "seed-stage SaaS founders",
      warm_network_strength: "moderate",
    }),
  },
  {
    id: "P6",
    name: "THE REJECTED SELLER",
    narrative:
      "5 offers sent, 0 closes. 3 lost = roi_unclear, 1 lost = price, 1 lost = unknown. All within 30 days.",
    expected:
      "ROI/value clarification (one-pager anchored on buyer economics). Not a discount. Not a generic objection kit.",
    evidence: {
      offer_locked_at: now,
      conversations: [
        { status: "lost" as const, loss_reason: "roi_unclear", lost_within_30d: true },
        { status: "lost" as const, loss_reason: "roi_unclear", lost_within_30d: true },
        { status: "lost" as const, loss_reason: "roi_unclear", lost_within_30d: true },
        { status: "lost" as const, loss_reason: "price",       lost_within_30d: true },
        { status: "lost" as const, loss_reason: null,          lost_within_30d: true },
      ],
      revenue_events: [],
    },
    context: baseCtx({
      buyer_segment: "SMB e-commerce operators",
      warm_network_strength: "moderate",
    }),
  },
  {
    id: "P7",
    name: "FIRST REVENUE",
    narrative:
      "First $2,500 sale logged via linkedin_dm. Same productized service. B_NOT_YET_REPEATABLE.",
    expected:
      "Reproduce the sale — win teardown FIRST, then lookalike list, then run winning motion on winning channel again. Do NOT redesign the offer.",
    evidence: {
      offer_locked_at: now,
      conversations: [{ status: "won" as const }],
      revenue_events: [{ amount_cents: 250_000, source_channel: "linkedin_dm" }],
    },
    context: baseCtx({
      buyer_segment: "boutique agencies (5–20 people)",
      warm_network_strength: "weak",
      has_prior_paid_proof: true,
    }),
  },
];
