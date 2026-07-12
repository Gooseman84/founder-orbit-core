// productized_service policy.
// PURE FUNCTIONS. No I/O. No LLM. No Deno/Node imports.
// The LLM never picks the action — this module does, deterministically.

import type {
  ActionTemplate,
  FounderContext,
  MoneyPathState,
  NbaHistoryEntry,
  ScoredCandidate,
  Selection,
} from "./types.ts";

/** Score one template against state+context. Higher = better. Negative = ineligible. */
export function scoreTemplate(
  tpl: ActionTemplate,
  state: MoneyPathState,
  ctx: FounderContext,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Hard filters first — return -Infinity if the template is not eligible.
  if (tpl.business_pattern !== ctx.business_pattern) {
    return { score: -Infinity, reasons: ["wrong_business_pattern"] };
  }
  if (!tpl.applicable_stages.includes(state.stage)) {
    return { score: -Infinity, reasons: ["stage_mismatch"] };
  }
  if (tpl.addresses_bottleneck !== state.bottleneck) {
    return { score: -Infinity, reasons: ["bottleneck_mismatch"] };
  }

  // Baseline: matched bottleneck.
  score += 100;
  reasons.push("matches_bottleneck");

  // Acquisition-context modifiers, only relevant for outreach-family templates.
  const isWarm = tpl.code === "ps.outreach.warm_intro_dm" || tpl.code === "ps.list.tap_warm_network";
  const isCold = tpl.code === "ps.outreach.cold_dm_batch" || tpl.code === "ps.list.build_25_named";
  const isAudience = tpl.code === "ps.outreach.audience_cta" || tpl.code === "ps.list.audience_pull";
  const isReferral = tpl.code === "ps.outreach.referral_ask";
  const isCommunity = tpl.code === "ps.outreach.community_value_post";

  // Warm network path.
  if (isWarm) {
    if (ctx.warm_network_strength === "strong") { score += 60; reasons.push("warm_network_strong"); }
    else if (ctx.warm_network_strength === "moderate") { score += 30; reasons.push("warm_network_moderate"); }
    else if (ctx.warm_network_strength === "weak") { score += 5; reasons.push("warm_network_weak"); }
    else { score -= 40; reasons.push("no_warm_network"); }
  }

  // Referral ask — also requires some warm network to be meaningful.
  if (isReferral) {
    if (ctx.warm_network_strength === "strong") score += 40;
    else if (ctx.warm_network_strength === "moderate") score += 20;
    else if (ctx.warm_network_strength === "none") { score -= 30; reasons.push("no_warm_network"); }
  }

  // Cold path — good when no warm network AND buyer_segment is identifiable.
  if (isCold) {
    if (ctx.warm_network_strength === "none") { score += 40; reasons.push("no_warm_forces_cold"); }
    else if (ctx.warm_network_strength === "weak") { score += 20; }
    else if (ctx.warm_network_strength === "strong") { score -= 20; reasons.push("warm_available_prefer_warm"); }
    if (ctx.buyer_segment && ctx.buyer_segment.trim().length > 0) {
      score += 25; reasons.push("clear_buyer_segment");
    } else {
      score -= 20; reasons.push("no_buyer_segment");
    }
  }

  // Audience activation — only meaningful with a real audience.
  const AUDIENCE_MIN = 250;
  if (isAudience) {
    if (ctx.existing_audience_size >= AUDIENCE_MIN && ctx.existing_audience_channel) {
      score += 70; reasons.push("has_audience");
    } else {
      score -= 60; reasons.push("no_audience");
    }
  }

  // Community post — sensible when neither warm nor audience is strong.
  if (isCommunity) {
    if (ctx.warm_network_strength === "none" && ctx.existing_audience_size < AUDIENCE_MIN) {
      score += 15;
    } else {
      score -= 5;
    }
  }

  // Sales complexity nudges — high_touch prefers 1:1 channels over broadcast.
  if (ctx.sales_complexity === "high_touch") {
    if (isAudience || isCommunity) score -= 10;
    if (isWarm || isCold || isReferral) score += 5;
  }
  if (ctx.sales_complexity === "self_serve") {
    if (isAudience) score += 10;
  }

  // Existing client access is a fast lane for warm outreach.
  if (ctx.existing_client_access && (isWarm || isReferral)) {
    score += 15; reasons.push("existing_clients");
  }

  return { score, reasons };
}

/** Apply history filters: cooldown, incompatibility with recent-served, exhausted detection. */
export function selectAction(
  templates: ActionTemplate[],
  state: MoneyPathState,
  ctx: FounderContext,
  history: NbaHistoryEntry[],
  now: Date = new Date(),
): Selection {
  // Score everything.
  const scored: ScoredCandidate[] = templates
    .map((tpl) => {
      const { score, reasons } = scoreTemplate(tpl, state, ctx);
      return { template: tpl, score, reasons };
    })
    .filter((c) => Number.isFinite(c.score));

  if (scored.length === 0) {
    return { primary: null, alternates: [], library_exhausted: false };
  }

  // Build cooldown + incompatibility filters from history.
  const lastServedByCode = new Map<string, Date>();
  for (const h of history) {
    const prev = lastServedByCode.get(h.template_code);
    const t = new Date(h.served_at);
    if (!prev || t > prev) lastServedByCode.set(h.template_code, t);
  }

  // Recently completed/served template codes (last 3 days) power "don't repeat".
  const RECENT_MS = 3 * 24 * 60 * 60 * 1000;
  const recentlyServed = new Set(
    history
      .filter((h) => now.getTime() - new Date(h.served_at).getTime() < RECENT_MS)
      .map((h) => h.template_code),
  );

  const eligible: ScoredCandidate[] = [];
  const cooldownBlocked: ScoredCandidate[] = [];

  for (const cand of scored) {
    const tpl = cand.template;
    const lastServed = lastServedByCode.get(tpl.code);
    const cooldownMs = tpl.cooldown_days * 24 * 60 * 60 * 1000;
    if (lastServed && now.getTime() - lastServed.getTime() < cooldownMs) {
      cooldownBlocked.push(cand);
      continue;
    }
    // Incompatibility — if any of tpl.incompatible_with was recently served, skip.
    const conflict = tpl.incompatible_with.some((c) => recentlyServed.has(c));
    if (conflict) {
      cooldownBlocked.push({ ...cand, reasons: [...cand.reasons, "incompatible_with_recent"] });
      continue;
    }
    eligible.push(cand);
  }

  eligible.sort((a, b) => b.score - a.score);

  if (eligible.length > 0) {
    const [primary, ...rest] = eligible;
    return {
      primary,
      alternates: rest.slice(0, 2),
      library_exhausted: false,
    };
  }

  // Library exhausted — everything either doesn't match or is on cooldown.
  // Return the best cooldown-blocked option so the user still sees something,
  // flagged as exhausted so the UI can surface it honestly.
  cooldownBlocked.sort((a, b) => b.score - a.score);
  return {
    primary: cooldownBlocked[0] ?? null,
    alternates: cooldownBlocked.slice(1, 3),
    library_exhausted: true,
  };
}
