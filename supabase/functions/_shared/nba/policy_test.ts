// Deno test: run with `deno test --allow-read supabase/functions/_shared/nba/policy_test.ts`
// Proves the closed-loop scoring behavior required by Founder Mode Block 1.

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { selectAction } from "./policy.ts";
import type { ActionTemplate, FounderContext, MoneyPathState, NbaHistoryEntry } from "./types.ts";

// ── Fixtures ────────────────────────────────────────────────────────────────

const templates: ActionTemplate[] = [
  // OUTREACH family
  mkTpl("ps.outreach.warm_intro_dm", "B_NO_OUTREACH", "S2_OUTREACH", 2, ["ps.outreach.cold_dm_batch"]),
  mkTpl("ps.outreach.cold_dm_batch", "B_NO_OUTREACH", "S2_OUTREACH", 2, ["ps.outreach.warm_intro_dm"]),
  mkTpl("ps.outreach.audience_cta", "B_NO_OUTREACH", "S2_OUTREACH", 5, []),
  mkTpl("ps.outreach.referral_ask", "B_NO_OUTREACH", "S2_OUTREACH", 5, []),
  mkTpl("ps.outreach.community_value_post", "B_NO_OUTREACH", "S2_OUTREACH", 3, []),
  // REPLY family (used to prove D — action loop advances)
  mkTpl("ps.reply.rewrite_hook", "B_NO_REPLIES", "S3_CONVERSATIONS", 2, []),
  mkTpl("ps.reply.founder_video", "B_NO_REPLIES", "S3_CONVERSATIONS", 4, []),
];

function mkTpl(
  code: string,
  bn: ActionTemplate["addresses_bottleneck"],
  stage: ActionTemplate["applicable_stages"][number],
  cooldown_days: number,
  incompatible_with: string[],
): ActionTemplate {
  return {
    code,
    business_pattern: "productized_service",
    applicable_stages: [stage],
    addresses_bottleneck: bn,
    title: code,
    why_now_template: "",
    done_looks_like: "",
    deliverable_kind: "message_draft",
    deliverable_prompt: "",
    estimated_minutes: 30,
    cooldown_days,
    incompatible_with,
  };
}

const baseState: MoneyPathState = {
  money_path_id: "mp1",
  stage: "S2_OUTREACH",
  bottleneck: "B_NO_OUTREACH",
  evidence: { revenue_cents: 0, revenue_count: 0, contacted_count: 0, replied_count: 0, offer_sent_count: 0, total_conv: 0 },
};

function ctx(overrides: Partial<FounderContext>): FounderContext {
  return {
    business_pattern: "productized_service",
    sales_complexity: "high_touch",
    offer_locked: true,
    buyer_segment: null,
    warm_network_strength: "none",
    existing_audience_size: 0,
    existing_audience_channel: null,
    platform_strengths: [],
    existing_client_access: false,
    ...overrides,
  };
}

// ── Scenarios ───────────────────────────────────────────────────────────────

Deno.test("A: strong warm network beats cold prospecting", () => {
  const sel = selectAction(templates, baseState, ctx({ warm_network_strength: "strong" }), []);
  assertEquals(sel.primary?.template.code, "ps.outreach.warm_intro_dm");
});

Deno.test("B: no network + clear B2B buyer → cold outreach wins over warm", () => {
  const sel = selectAction(
    templates,
    baseState,
    ctx({ warm_network_strength: "none", buyer_segment: "Series A HR leaders" }),
    [],
  );
  assertEquals(sel.primary?.template.code, "ps.outreach.cold_dm_batch");
});

Deno.test("C: meaningful existing audience → audience activation wins", () => {
  const sel = selectAction(
    templates,
    baseState,
    ctx({ existing_audience_size: 4000, existing_audience_channel: "linkedin" }),
    [],
  );
  assertEquals(sel.primary?.template.code, "ps.outreach.audience_cta");
});

Deno.test("D: loop advances — bottleneck moves to B_NO_REPLIES, prior outreach not repeated", () => {
  // Simulate serving warm outreach yesterday.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const history: NbaHistoryEntry[] = [
    { template_code: "ps.outreach.warm_intro_dm", served_at: yesterday, outcome: "done" },
  ];
  // State advances: buyer was contacted, so bottleneck is now B_NO_REPLIES / S3.
  const nextState: MoneyPathState = {
    ...baseState,
    stage: "S3_CONVERSATIONS",
    bottleneck: "B_NO_REPLIES",
    evidence: { ...baseState.evidence, total_conv: 5, contacted_count: 5 },
  };
  const sel = selectAction(templates, nextState, ctx({ warm_network_strength: "strong" }), history);
  assert(sel.primary, "must return a primary action");
  assertEquals(sel.primary!.template.addresses_bottleneck, "B_NO_REPLIES");
  assert(sel.primary!.template.code !== "ps.outreach.warm_intro_dm");
});

Deno.test("E: cooldown — same template not re-served within cooldown window", () => {
  const today = new Date().toISOString();
  const history: NbaHistoryEntry[] = [
    { template_code: "ps.outreach.warm_intro_dm", served_at: today, outcome: "done" },
  ];
  const sel = selectAction(templates, baseState, ctx({ warm_network_strength: "strong" }), history);
  // Warm template is on cooldown (2d) AND cold is incompatible_with warm (recent). Referral or community should surface.
  assert(sel.primary, "must still return something");
  assert(sel.primary!.template.code !== "ps.outreach.warm_intro_dm");
});

Deno.test("E2: exhausted library flag set when all matching templates on cooldown", () => {
  const now = new Date().toISOString();
  const history: NbaHistoryEntry[] = templates
    .filter((t) => t.addresses_bottleneck === "B_NO_OUTREACH")
    .map((t) => ({ template_code: t.code, served_at: now, outcome: "done" as const }));
  const sel = selectAction(templates, baseState, ctx({ warm_network_strength: "strong" }), history);
  assertEquals(sel.library_exhausted, true);
  assert(sel.primary !== null, "still returns best cooldown-blocked option so user is never stuck");
});
