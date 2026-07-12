// Behavioral assertions per persona — Repair Block 1.1 tightened bar.
// Each function grades the WINNING template's semantics against the
// commercially correct behavior for that persona.

import type { ActionTemplate, BottleneckKind, MoneyPathStage } from "./types.ts";

export type Grade = "correct" | "questionable" | "wrong" | "strong" | "acceptable" | "weak";

export interface AssertionResult {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface PersonaVerdict {
  diagnosis: Grade;
  prescription: Grade;
  failure_class: Array<"A_prod_evidence" | "B_missing_context" | "C_diagnosis_rule" | "D_prescription">;
  consultant_would_pay: "yes" | "marginal" | "no";
  remediation: string;
}

const has = (t: string, patterns: (RegExp | string)[]) =>
  patterns.some((p) => (typeof p === "string" ? t.toLowerCase().includes(p.toLowerCase()) : p.test(t)));

function combined(win: ActionTemplate | null): string {
  if (!win) return "";
  return `${win.title}\n${win.why_now_template}\n${win.deliverable_prompt}\n${win.done_looks_like}`;
}

// ── P1 — Polisher ──────────────────────────────────────────────────────────
// STRONG only when the winning template creates direct external outreach to
// reachable/warm buyers THIS SESSION. Merely mentioning the warm network is
// not enough; the deliverable must produce a send-today message.
export function assertP1(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const isDirectAsk = win?.code === "ps.outreach.warm_direct_ask";
  const isWarmDm = win?.code === "ps.outreach.warm_intro_dm";
  const isReferral = win?.code === "ps.outreach.referral_ask";
  const producesExternalContact = (isDirectAsk || isWarmDm || isReferral) && win!.deliverable_kind !== "spreadsheet";
  const isListBuild = win?.code?.startsWith("ps.list.") ?? false;
  const isOfferRefine = win?.addresses_bottleneck === "B_NO_OFFER";

  const checks: AssertionResult[] = [
    { label: "leverage bypass fired (warm_direct_ask wins)", passed: isDirectAsk, detail: `winner=${win?.code ?? "—"}` },
    { label: "produces direct external outreach THIS session", passed: producesExternalContact },
    { label: "does NOT terminate at 'build a list'", passed: !isListBuild },
    { label: "does NOT re-open offer refinement", passed: !isOfferRefine },
    { label: "does NOT recommend branding / landing page", passed: !win || !has(t, ["landing page", "brand", "website"]) },
    { label: "message-form deliverable (draft/snippet), not a spreadsheet", passed: !!win && (win.deliverable_kind === "message_draft" || win.deliverable_kind === "text_snippet") },
  ];
  const allPassed = checks.every((c) => c.passed);
  const prescription: Grade = producesExternalContact && !isListBuild ? "strong" : (win ? "weak" : "weak");
  const diagnosis: Grade = bn === "B_NO_OUTREACH" ? "correct" : (bn === "B_NO_BUYER_LIST" ? "questionable" : "correct");
  return {
    checks,
    verdict: {
      diagnosis,
      prescription,
      failure_class: (isListBuild ? ["C_diagnosis_rule"] : []) as PersonaVerdict["failure_class"],
      consultant_would_pay: allPassed && prescription === "strong" ? "yes" : (producesExternalContact ? "marginal" : "no"),
      remediation:
        isListBuild
          ? "Leverage-shift not firing for this persona — verify hasSufficientLeverage() sees reachable_buyer_count>=5 AND that B_NO_BUYER_LIST → B_NO_OUTREACH shift is applied."
          : "None if warm_direct_ask wins.",
    } as PersonaVerdict,
  };
}

// ── P2 — Lone Expert ───────────────────────────────────────────────────────
export function assertP2(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "diagnoses B_NO_BUYER_LIST", passed: bn === "B_NO_BUYER_LIST" },
    { label: "acknowledges no warm network — uses buyer_segment path", passed: !!win && has(t, ["buyer", "named", "cold", "linkedin", "search"]) },
    { label: "does NOT assume warm intros", passed: !win || !has(t, ["1st-degree", "past client"]) },
    { label: "leads to a named-buyer artifact", passed: !!win && (win.code === "ps.list.build_25_named" || win.code.startsWith("ps.outreach.")) },
  ];
  const isBuild25 = win?.code === "ps.list.build_25_named";
  const prescription: Grade = isBuild25 ? "strong" : (win ? "acceptable" : "weak");
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_NO_BUYER_LIST" ? "correct" : "questionable",
      prescription,
      failure_class: [],
      consultant_would_pay: isBuild25 ? "yes" : "marginal",
      remediation: isBuild25 ? "None — ideal path for this founder." : "Verify list.build_25_named outranks other B_NO_BUYER_LIST templates when reachable_buyer_count=0 and warm=none.",
    } as PersonaVerdict,
  };
}

// ── P3 — Audience Hoarder ──────────────────────────────────────────────────
export function assertP3(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const isCta = win?.code === "ps.outreach.audience_cta";
  const isAudiencePull = win?.code === "ps.list.audience_pull";
  const checks: AssertionResult[] = [
    { label: "leverage-aware: bottleneck shifted off B_NO_BUYER_LIST", passed: bn !== "B_NO_BUYER_LIST" || isCta, detail: `bottleneck=${bn}` },
    { label: "explicitly uses the existing audience", passed: (isCta || isAudiencePull) || (!!win && has(t, ["audience", "linkedin", "followers", "post"])) },
    { label: "does NOT prioritize cold outbound", passed: !!win && win.code !== "ps.outreach.cold_dm_batch" && win.code !== "ps.list.build_25_named" },
    { label: "includes a direct commercial CTA", passed: isCta || (!!win && has(t, ["cta", "invites replies", "ask them"])) },
  ];
  const prescription: Grade = isCta ? "strong" : (isAudiencePull ? "acceptable" : (win ? "weak" : "weak"));
  return {
    checks,
    verdict: {
      diagnosis: "correct",
      prescription,
      failure_class: prescription === "strong" ? [] : (["C_diagnosis_rule"] as PersonaVerdict["failure_class"]),
      consultant_would_pay: isCta ? "yes" : (isAudiencePull ? "marginal" : "no"),
      remediation: isCta ? "None." : "hasSufficientLeverage() should trigger on activatable_audience=true and shift B_NO_BUYER_LIST → B_NO_OUTREACH so audience_cta becomes eligible.",
    } as PersonaVerdict,
  };
}

// ── P4 — Ghosted Outreacher ────────────────────────────────────────────────
// STRONG when the winning template isolates ONE variable (hook, targeting, or
// channel), keeps the comparison structure stable, defines a measurable
// outcome, and specifies what result would change the next move.
export function assertP4(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const isHookVariant = win?.code === "ps.reply.rewrite_hook";
  const isChannelSwitch = win?.code === "ps.reply.channel_switch";
  const isFounderVideo = win?.code === "ps.reply.founder_video";
  const isolatesOneVar = isHookVariant || isChannelSwitch || isFounderVideo;
  const checks: AssertionResult[] = [
    { label: "diagnoses B_NO_REPLIES", passed: bn === "B_NO_REPLIES" },
    { label: "does NOT repeat the same outreach motion unchanged", passed: !win || !has(t, ["cold dm batch"]) },
    { label: "isolates ONE variable (hook / targeting / channel)", passed: isolatesOneVar },
    { label: "defines a cohort / sample size to test against", passed: !!win && /\b(3|5|10|25|batch|messages? sent)\b/i.test(t) },
    { label: "defines measurable evidence (reply-rate delta / new opener / channel result)", passed: !!win && has(t, ["reply", "test", "sends", "5 test", "measure", "delta", "convert"]) },
  ];
  const allCore = checks[0].passed && checks[2].passed && (checks[3].passed || checks[4].passed);
  const prescription: Grade = isolatesOneVar && allCore ? "strong" : (win ? "weak" : "weak");
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_NO_REPLIES" ? "correct" : "wrong",
      prescription,
      failure_class: prescription === "strong" ? [] : (["D_prescription"] as PersonaVerdict["failure_class"]),
      consultant_would_pay: prescription === "strong" ? "yes" : (win ? "marginal" : "no"),
      remediation:
        prescription === "strong"
          ? "None."
          : "Tighten the three B_NO_REPLIES templates to explicitly name the isolated variable, the sample size (n=10 recommended), and the observable delta.",
    } as PersonaVerdict,
  };
}

// ── P5 — Conversation Collector ────────────────────────────────────────────
export function assertP5(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const asksForCall = win?.code === "ps.call.book_conversion_line" || (!!win && has(t, ["ask for the call", "15-min", "book"]));
  const checks: AssertionResult[] = [
    { label: "diagnoses B_REPLIES_NO_CALLS", passed: bn === "B_REPLIES_NO_CALLS" },
    { label: "moves from research to ask (call / offer)", passed: asksForCall || (!!win && has(t, ["offer", "close"])) },
    { label: "does NOT recommend another discovery conversation", passed: !!win && !has(t, ["discovery", "learn more"]) },
    { label: "concrete transition script (message_draft)", passed: !!win && win.deliverable_kind === "message_draft" },
  ];
  const prescription: Grade = asksForCall ? "strong" : (win ? "acceptable" : "weak");
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_REPLIES_NO_CALLS" ? "correct" : "questionable",
      prescription,
      failure_class: [],
      consultant_would_pay: asksForCall ? "yes" : "marginal",
      remediation: asksForCall ? "None." : "Ensure book_conversion_line outranks value_first_agenda when replied_count >= 3.",
    } as PersonaVerdict,
  };
}

// ── P6 — Rejected Seller ───────────────────────────────────────────────────
// STRONG only when the winner uses the dominant ROI/value evidence AND does
// not lower price AND does not treat all objections equivalently.
export function assertP6(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const isRoi = win?.code === "ps.close.roi_case_one_pager";
  const isGenericKit = win?.code === "ps.close.objection_response_kit";
  const isDiscount = !!win && has(t, ["lower the price", "drop the price", "discount", "cut the price"]);
  const checks: AssertionResult[] = [
    { label: "diagnoses B_OFFERS_NO_CLOSE (dominant reason recognized)", passed: bn === "B_OFFERS_NO_CLOSE" },
    { label: "winning template uses ROI/value evidence explicitly", passed: isRoi },
    { label: "does NOT lower price", passed: !isDiscount },
    { label: "does NOT recommend generic objection brainstorming as primary", passed: !isGenericKit },
    { label: "treats loss reasons non-uniformly (specialized template)", passed: isRoi || win?.code === "ps.close.pilot_scope_reduction" || win?.code === "ps.close.timing_nurture" },
  ];
  const prescription: Grade = isRoi ? "strong" : (isGenericKit ? "weak" : (win ? "acceptable" : "weak"));
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_OFFERS_NO_CLOSE" ? "correct" : "wrong",
      prescription,
      failure_class: isRoi ? [] : (["D_prescription"] as PersonaVerdict["failure_class"]),
      consultant_would_pay: isRoi ? "yes" : (isGenericKit ? "no" : "marginal"),
      remediation: isRoi ? "None." : "Loss-reason bias must promote roi_case_one_pager when roi_unclear is dominant (>=50% of recent 30d losses).",
    } as PersonaVerdict,
  };
}

// ── P7 — First Revenue ─────────────────────────────────────────────────────
// STRONG when the winning offer is preserved, the winning buyer/channel is
// used, the action focuses on reproducing the sale, and it does NOT return
// to ideation or offer redesign.
export function assertP7(win: ActionTemplate | null, s: MoneyPathStage, bn: BottleneckKind) {
  const t = combined(win);
  const isTeardown = win?.code === "ps.repeat.win_teardown";
  const isLookalike = win?.code === "ps.repeat.lookalike_10";
  const isChannelDoubleDown = win?.code === "ps.repeat.channel_double_down";
  const isRepeat = isTeardown || isLookalike || isChannelDoubleDown;
  const returnsToIdeation = !!win && (win.addresses_bottleneck === "B_NO_OFFER" || has(t, ["redesign", "pivot", "new offer"]));
  const checks: AssertionResult[] = [
    { label: "stage = S5_FIRST_REVENUE", passed: s === "S5_FIRST_REVENUE" },
    { label: "bottleneck = B_NOT_YET_REPEATABLE", passed: bn === "B_NOT_YET_REPEATABLE" },
    { label: "prescribes a repeat.* template", passed: isRepeat },
    { label: "sequence starts with teardown", passed: isTeardown },
    { label: "preserves winning offer (no redesign / pivot)", passed: !returnsToIdeation },
    { label: "references winning buyer or channel evidence", passed: !!win && has(t, ["winning", "same", "source_channel", "lookalike", "channel"]) },
  ];
  const prescription: Grade = isTeardown ? "strong" : (isRepeat ? "acceptable" : "weak");
  return {
    checks,
    verdict: {
      diagnosis: s === "S5_FIRST_REVENUE" && bn === "B_NOT_YET_REPEATABLE" ? "correct" : "wrong",
      prescription,
      failure_class: prescription === "strong" ? [] : (["D_prescription"] as PersonaVerdict["failure_class"]),
      consultant_would_pay: isTeardown ? "yes" : (isRepeat ? "marginal" : "no"),
      remediation: isTeardown ? "None." : "Ensure post-first-revenue ordering promotes win_teardown first, then lookalike_10, then channel_double_down.",
    } as PersonaVerdict,
  };
}

export const ASSERTIONS = {
  P1: assertP1, P2: assertP2, P3: assertP3, P4: assertP4,
  P5: assertP5, P6: assertP6, P7: assertP7,
} as const;
