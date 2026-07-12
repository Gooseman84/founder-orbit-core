// Persona evidence fixtures — PRODUCTION-EVIDENCE ONLY.
// Only fields that exist in the live schema (founder_advantages + money_paths
// + buyer_conversations + revenue_events) are used. Counterfactual hypothetical
// evidence lives in a separate `counterfactual` block, clearly labeled.

import type { FounderContext } from "./types.ts";
import type { RawEvidence } from "./state_derivation.ts";

export interface Persona {
  id: string;
  name: string;
  narrative: string;
  evidence: RawEvidence;
  // Everything readContext() can currently see. Nothing more.
  context: FounderContext;
  // Extra evidence production does NOT currently store. Only used in the
  // clearly-labeled counterfactual pass.
  counterfactual?: Partial<{
    named_past_clients_count: number;
    warm_contacts_matching_buyer_segment: number;
    rejection_notes: string[];
  }>;
}

const now = new Date().toISOString();

export const PERSONAS: Persona[] = [
  {
    id: "P1",
    name: "THE POLISHER",
    narrative: "Independent marketing consultant, 8 yrs, 12 past clients. Strong warm network. $2,500 growth audit. Offer locked. Has edited assets repeatedly. Zero buyer contacts.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "founders of 5–30-person B2B companies who care about growth",
      warm_network_strength: "strong",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: true,
    },
    counterfactual: { named_past_clients_count: 12, warm_contacts_matching_buyer_segment: 8 },
  },
  {
    id: "P2",
    name: "THE LONE EXPERT",
    narrative: "Fractional ops consultant. Deep domain. No warm network. No audience. Buyer segment: 20-100-emp logistics cos. $4,000 diagnostic. Offer locked. Zero outreach.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "20–100 employee logistics companies",
      warm_network_strength: "none",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: false,
    },
  },
  {
    id: "P3",
    name: "THE AUDIENCE HOARDER",
    narrative: "HR consultant. 9,000 LinkedIn followers. Posts regularly. Never sold to audience. $499 manager-training workshop. Offer locked. Zero buyer conversations.",
    evidence: { offer_locked_at: now, conversations: [], revenue_events: [] },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "light_touch",
      offer_locked: true,
      buyer_segment: "new people managers at 50–500 employee cos",
      warm_network_strength: "none",
      existing_audience_size: 9000,
      existing_audience_channel: "linkedin",
      platform_strengths: ["linkedin"],
      existing_client_access: false,
    },
  },
  {
    id: "P4",
    name: "THE GHOSTED OUTREACHER",
    narrative: "Same offer/segment as P2. 20 targeted messages sent. Zero replies. No revenue.",
    evidence: {
      offer_locked_at: now,
      conversations: Array.from({ length: 20 }, () => ({ status: "contacted" as const })),
      revenue_events: [],
    },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "20–100 employee logistics companies",
      warm_network_strength: "none",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: false,
    },
  },
  {
    id: "P5",
    name: "THE CONVERSATION COLLECTOR",
    narrative: "8 replies (4 positive). 0 calls booked, 0 offers sent. Keeps scheduling more research calls.",
    evidence: {
      offer_locked_at: now,
      conversations: Array.from({ length: 8 }, () => ({ status: "replied" as const })),
      revenue_events: [],
    },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "seed-stage SaaS founders",
      warm_network_strength: "moderate",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: false,
    },
  },
  {
    id: "P6",
    name: "THE REJECTED SELLER",
    narrative: "5 offers sent, 0 closes. Rejection notes cite price and unclear ROI.",
    evidence: {
      offer_locked_at: now,
      conversations: Array.from({ length: 5 }, () => ({ status: "lost" as const })),
      revenue_events: [],
    },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "SMB e-commerce operators",
      warm_network_strength: "moderate",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: false,
    },
    counterfactual: {
      rejection_notes: ["too expensive", "unclear ROI", "not sure this works for us", "price", "cheaper option elsewhere"],
    },
  },
  {
    id: "P7",
    name: "FIRST REVENUE",
    narrative: "First $2,500 sale logged. Same productized service. One acquisition channel produced the sale.",
    evidence: {
      offer_locked_at: now,
      conversations: [{ status: "won" as const }],
      revenue_events: [{ amount_cents: 250_000 }],
    },
    context: {
      business_pattern: "productized_service",
      sales_complexity: "high_touch",
      offer_locked: true,
      buyer_segment: "boutique agencies (5–20 people)",
      warm_network_strength: "weak",
      existing_audience_size: 0,
      existing_audience_channel: null,
      platform_strengths: [],
      existing_client_access: false,
    },
  },
];
