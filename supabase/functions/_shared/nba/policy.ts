// productized_service policy.
// PURE FUNCTIONS. No I/O. No LLM. No Deno/Node imports.
// The LLM never picks the action — this module does, deterministically.
//
// Repair Block 1.1 additions:
//   • hasSufficientLeverage() shifts B_NO_BUYER_LIST → B_NO_OUTREACH when the
//     founder already has an economic asset (5+ reachable buyers, activatable
//     audience, or strong warm-network + existing_client_access).
//   • Loss-reason distribution biases B_OFFERS_NO_CLOSE toward the specialized
//     close template that matches the dominant loss reason, per the
//     "≥50% of recent 30-day losses share one reason" threshold.
//   • SIG_AVOIDS_ASK boosts urgency of "ask for the call / send the offer"
//     templates without ever overriding stage or bottleneck.
//   • Post-first-revenue (B_NOT_YET_REPEATABLE) orders repeat.* templates as
//     teardown → lookalike → channel_double_down.
//
// SPECIFICITY-VS-EVIDENCE INVARIANT: policy never claims to know identities,
// company names, or prior conversation content that the raw evidence does not
// support. This is enforced by the templates' deliverable_prompts.

import {
  hasSufficientLeverage,
} from "./types.ts";
import type {
  ActionTemplate,
  BottleneckKind,
  FounderContext,
  MoneyPathState,
  NbaHistoryEntry,
  ScoredCandidate,
  SelectExtras,
  Selection,
} from "./types.ts";

/** Score one template against state+context. Higher = better. Negative = ineligible. */
export function scoreTemplate(
  tpl: ActionTemplate,
  state: MoneyPathState,
  ctx: FounderContext,
  extras: SelectExtras = {},
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
  const isDirectAsk = tpl.code === "ps.outreach.warm_direct_ask";

  // Direct ask — the leverage-bypass template. Wins when reachable buyers exist.
  if (isDirectAsk) {
    if (ctx.reachable_buyer_count >= 5) { score += 70; reasons.push("reachable_buyers_exist"); }
    else if (ctx.existing_client_access) { score += 20; reasons.push("existing_client_access"); }
    else { score -= 30; reasons.push("no_reachable_buyers"); }
  }

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

  // Audience activation — activatable audience is the strongest signal; the
  // legacy size threshold remains as a fallback for pre-Block-1.1 rows.
  const AUDIENCE_MIN = 250;
  if (isAudience) {
    if (ctx.activatable_audience) {
      score += 80; reasons.push("activatable_audience");
    } else if (ctx.existing_audience_size >= AUDIENCE_MIN && ctx.existing_audience_channel) {
      score += 60; reasons.push("has_audience");
    } else {
      score -= 60; reasons.push("no_audience");
    }
  }

  // Community post — sensible when neither warm nor audience is strong.
  if (isCommunity) {
    if (ctx.warm_network_strength === "none" && ctx.existing_audience_size < AUDIENCE_MIN && !ctx.activatable_audience) {
      score += 15;
    } else {
      score -= 5;
    }
  }

  // Sales complexity nudges — high_touch prefers 1:1 channels over broadcast.
  if (ctx.sales_complexity === "high_touch") {
    if (isAudience || isCommunity) score -= 10;
    if (isWarm || isCold || isReferral || isDirectAsk) score += 5;
  }
  if (ctx.sales_complexity === "self_serve") {
    if (isAudience) score += 10;
  }

  // Existing client access is a fast lane for warm outreach.
  if (ctx.existing_client_access && (isWarm || isReferral || isDirectAsk)) {
    score += 15; reasons.push("existing_clients");
  }

  // ── Post-first-revenue ordering (B_NOT_YET_REPEATABLE) ──
  if (tpl.addresses_bottleneck === "B_NOT_YET_REPEATABLE") {
    // Teardown first, then lookalike list, then repeat motion. Deterministic
    // sequence — no LLM in this decision.
    if (tpl.code === "ps.repeat.win_teardown") { score += 40; reasons.push("first_step_teardown"); }
    if (tpl.code === "ps.repeat.lookalike_10") { score += 20; reasons.push("second_step_lookalike"); }
    if (tpl.code === "ps.repeat.channel_double_down") {
      score += 10;
      if (state.winning_channel) { score += 10; reasons.push("winning_channel_known"); }
    }
  }

  // ── Loss-intelligence bias (B_OFFERS_NO_CLOSE) ──
  // Threshold: dominant reason must be >50% of recent-30d losses AND count >= 2.
  if (tpl.addresses_bottleneck === "B_OFFERS_NO_CLOSE" && extras.loss_distribution) {
    const dist = extras.loss_distribution;
    const top = dist.buckets[0];
    const dominant =
      top && top.count >= 2 && dist.recent_total > 0 && top.count * 2 > dist.recent_total
        ? top.reason
        : null;
    if (dominant === "roi_unclear" && tpl.code === "ps.close.roi_case_one_pager") {
      score += 80; reasons.push("dominant_loss_roi_unclear");
    } else if (dominant === "price" && tpl.code === "ps.close.pilot_scope_reduction") {
      score += 80; reasons.push("dominant_loss_price_test_scope");
    } else if (dominant === "timing" && tpl.code === "ps.close.timing_nurture") {
      score += 80; reasons.push("dominant_loss_timing");
    } else if (!dominant && tpl.code === "ps.close.objection_response_kit") {
      score += 10; reasons.push("mixed_losses_generic_kit");
    } else if (dominant && tpl.code === "ps.close.objection_response_kit") {
      // A dominant reason exists — the specialized template should win.
      score -= 30; reasons.push("specialized_available");
    }
  }

  // ── SIG_AVOIDS_ASK boost (behavioral urgency) ──
  if (extras.signals?.avoids_ask) {
    if (tpl.code === "ps.call.book_conversion_line") { score += 40; reasons.push("avoids_ask_boost"); }
    if (tpl.code === "ps.offer.send_written_proposal") { score += 30; reasons.push("avoids_ask_boost"); }
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
  extras: SelectExtras = {},
): Selection {
  // ── Leverage-aware bottleneck shift ──
  // When the founder has sufficient economic leverage, treat B_NO_BUYER_LIST
  // as B_NO_OUTREACH so preparation templates are demoted and the founder is
  // directed to make external contact today. This is the "USE EXISTING
  // LEVERAGE → ACT EXTERNALLY → COLLECT EVIDENCE" principle in code form.
  let effectiveState: MoneyPathState = state;
  const leverageShifted =
    state.bottleneck === "B_NO_BUYER_LIST" && hasSufficientLeverage(ctx);
  if (leverageShifted) {
    effectiveState = { ...state, bottleneck: "B_NO_OUTREACH" as BottleneckKind };
  }

  // Score everything against the effective state.
  const scored: ScoredCandidate[] = templates
    .map((tpl) => {
      const { score, reasons } = scoreTemplate(tpl, effectiveState, ctx, extras);
      const withLeverage = leverageShifted
        ? { score, reasons: [...reasons, "leverage_bypass_active"] }
        : { score, reasons };
      return { template: tpl, score: withLeverage.score, reasons: withLeverage.reasons };
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
  cooldownBlocked.sort((a, b) => b.score - a.score);
  return {
    primary: cooldownBlocked[0] ?? null,
    alternates: cooldownBlocked.slice(1, 3),
    library_exhausted: true,
  };
}
