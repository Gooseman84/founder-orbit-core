// Behavioral assertions per persona. Applied to the winning template's
// deliverable_prompt + why_now_template + winner code. Each returns a list of
// pass/fail lines. Diagnosis + prescription verdicts are graded separately.

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

const has = (t: string, patterns: (RegExp|string)[]) =>
  patterns.some(p => typeof p === "string" ? t.toLowerCase().includes(p) : p.test(t));

function combined(win: ActionTemplate | null): string {
  if (!win) return "";
  return `${win.title}\n${win.why_now_template}\n${win.deliverable_prompt}\n${win.done_looks_like}`.toLowerCase();
}

export function assertP1(win: ActionTemplate | null, stage: MoneyPathStage, bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "prescribes warm-network / past-client contact", passed: !!win && has(t, ["warm", "past client", "1st-degree"]) },
    { label: "does NOT recommend branding / landing page", passed: !win || !has(t, ["landing page", "brand"]) },
    { label: "does NOT recommend further offer refinement", passed: !win || (!has(t, ["refine the offer", "reword", "rename"]) && win.addresses_bottleneck !== "B_NO_OFFER") },
    { label: "produces immediate external buyer contact this session", passed: !!win && (win.deliverable_kind === "message_draft" || has(t, ["send", "dm", "email", "message"])) },
    { label: "does NOT terminate at 'build a list' when accessible past clients exist", passed: !!win && win.code !== "ps.list.build_25_named" && win.code !== "ps.list.tap_warm_network" },
  ];
  // Diagnosis pressure test.
  const listBuild = win?.code?.startsWith("ps.list.");
  const diagnosis: Grade = bn === "B_NO_BUYER_LIST" ? "questionable" : "correct";
  const prescription: Grade = listBuild ? "acceptable" : (win ? "strong" : "weak");
  const failure_class: PersonaVerdict["failure_class"] = [];
  if (listBuild) failure_class.push("B_missing_context");
  return {
    checks,
    verdict: {
      diagnosis, prescription, failure_class,
      consultant_would_pay: listBuild ? "marginal" : (win ? "yes" : "no"),
      remediation: "Add production evidence for known accessible past-client count (e.g. founder_advantages.past_client_count or a light-weight 'accessible buyers' field). Then let the bottleneck rules skip B_NO_BUYER_LIST when the founder already has ≥5 named accessible past clients. Add a template `ps.outreach.warm_direct_ask` that skips the list-building intermediate step.",
    },
  };
}

export function assertP2(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "acknowledges no warm network (uses buyer_segment path)", passed: !!win && has(t, ["buyer_segment", "named buyer", "cold", "linkedin", "search string"]) },
    { label: "does NOT assume warm intros", passed: !win || !has(t, ["warm-network", "past clients", "1st-degree"]) },
    { label: "leads to outbound contact", passed: !!win && (win.code === "ps.list.build_25_named" || win.code.startsWith("ps.outreach.")) },
    { label: "produces named-buyer acquisition process", passed: !!win && has(t, ["25 named", "named", "list"]) },
  ];
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_NO_BUYER_LIST" ? "correct" : "questionable",
      prescription: win?.code === "ps.list.build_25_named" ? "strong" : (win ? "acceptable" : "weak"),
      failure_class: [],
      consultant_would_pay: "yes",
      remediation: "None — this is the ideal case for current library.",
    },
  };
}

export function assertP3(win: ActionTemplate | null, _s: MoneyPathStage, _bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const usesAudience = !!win && (win.code === "ps.list.audience_pull" || win.code === "ps.outreach.audience_cta" || has(t, ["audience", "linkedin", "followers"]));
  const checks: AssertionResult[] = [
    { label: "explicitly uses the existing LinkedIn audience", passed: usesAudience },
    { label: "does NOT prioritize cold outbound", passed: !!win && win.code !== "ps.outreach.cold_dm_batch" && win.code !== "ps.list.build_25_named" },
    { label: "includes a direct commercial CTA or DM path", passed: !!win && (win.code === "ps.outreach.audience_cta" || has(t, ["cta", "reply", "invites replies"])) },
  ];
  const prescription: Grade = win?.code === "ps.list.audience_pull" ? "acceptable"
    : win?.code === "ps.outreach.audience_cta" ? "strong" : (win ? "weak" : "weak");
  return {
    checks,
    verdict: {
      diagnosis: "correct",
      prescription,
      failure_class: prescription === "acceptable" ? ["D_prescription"] : [],
      consultant_would_pay: prescription === "strong" ? "yes" : "marginal",
      remediation: "Bottleneck ordering ties audience-hoarders to a list-pull step first (B_NO_BUYER_LIST) before an audience CTA (B_NO_OUTREACH). For an audience of 9k with 0 conversations logged, the commercially correct first move is the CTA post itself. Consider a rule: when existing_audience_size ≥ 250 and total_conv = 0, jump straight to audience_cta.",
    },
  };
}

export function assertP4(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "does NOT repeat the same outreach motion unchanged", passed: !win || !has(t, ["send 10", "cold dm"]) },
    { label: "isolates one variable (targeting / message / channel / offer)", passed: !!win && has(t, ["test", "variant", "targeting", "channel", "message"]) },
    { label: "defines measurable evidence of whether the test worked", passed: !!win && has(t, ["reply rate", "measure", "signal", "%"]) },
  ];
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_NO_REPLIES" ? "correct" : "wrong",
      prescription: win ? "weak" : "weak",
      failure_class: win ? ["D_prescription"] : ["D_prescription"],
      consultant_would_pay: "no",
      remediation: "Library gap at B_NO_REPLIES. Add at least two templates: `ps.outreach.reply_diagnostic_ab` (rewrite hook + send to 10 new prospects, measure reply-rate delta) and `ps.outreach.channel_switch` (same message different channel). Both must define the measurable delta.",
    },
  };
}

export function assertP5(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const asksForCall = !!win && (win.code === "ps.call.book_conversion_line" || has(t, ["ask for the call", "book", "15-min"]));
  const checks: AssertionResult[] = [
    { label: "moves from research to ask (call or offer)", passed: asksForCall || (!!win && has(t, ["offer", "close"])) },
    { label: "does NOT recommend another discovery conversation", passed: !!win && !has(t, ["discovery", "learn more"]) },
    { label: "contains a concrete transition line / script", passed: !!win && win.deliverable_kind === "message_draft" },
  ];
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_REPLIES_NO_CALLS" ? "correct" : "questionable",
      prescription: asksForCall ? "strong" : (win ? "acceptable" : "weak"),
      failure_class: [],
      consultant_would_pay: asksForCall ? "yes" : "marginal",
      remediation: "None if book_conversion_line wins. Missing: the collector-avoidance signal is not modeled (founder keeps booking research calls without an ask) — a founder_signals row like 'AVOIDS_ASK' would let policy add urgency.",
    },
  };
}

export function assertP6(win: ActionTemplate | null, _s: MoneyPathStage, bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "uses rejection evidence explicitly", passed: !!win && has(t, ["objection", "rejection", "reason"]) },
    { label: "does NOT reflexively lower price", passed: !win || !has(t, ["lower the price", "drop the price", "discount"]) },
    { label: "tests one variable at a time", passed: !!win && has(t, ["one", "single", "each"]) },
    { label: "distinguishes price objection from unclear ROI when possible", passed: !!win && has(t, ["roi", "value"]) },
  ];
  return {
    checks,
    verdict: {
      diagnosis: bn === "B_OFFERS_NO_CLOSE" ? "correct" : "questionable",
      prescription: win?.code === "ps.close.objection_response_kit" ? "acceptable" : (win ? "weak" : "weak"),
      failure_class: ["B_missing_context"],
      consultant_would_pay: "marginal",
      remediation: "No production evidence path exists for rejection notes / loss reasons. Add buyer_conversations.loss_reason (enum: price, roi_unclear, timing, fit, other) + free-text notes. Then split B_OFFERS_NO_CLOSE into B_PRICE_OBJECTION vs B_ROI_UNCLEAR and add targeted templates for each. Current single objection kit is a generic prompt — same output the founder would get from ChatGPT.",
    },
  };
}

export function assertP7(win: ActionTemplate | null, s: MoneyPathStage, _bn: BottleneckKind): { checks: AssertionResult[]; verdict: PersonaVerdict } {
  const t = combined(win);
  const checks: AssertionResult[] = [
    { label: "acknowledges milestone and shifts to repeatability", passed: !!win && has(t, ["repeat", "again", "same", "reproduce"]) },
    { label: "preserves winning offer / buyer / channel", passed: !!win && !has(t, ["redesign", "pivot", "new offer"]) },
    { label: "does NOT return to ideation or offer redesign", passed: !!win && win.addresses_bottleneck !== "B_NO_OFFER" },
  ];
  return {
    checks,
    verdict: {
      diagnosis: s === "S5_FIRST_REVENUE" ? "correct" : "wrong",
      prescription: win ? "weak" : "weak",
      failure_class: ["D_prescription"],
      consultant_would_pay: "no",
      remediation: "Library gap: no S5_FIRST_REVENUE templates. Bottleneck view also falls through to B_OFFERS_NO_CLOSE for a won sale (won_count>=1 hits ELSE branch). Add explicit stage-5 templates (`ps.repeat.channel_double_down`, `ps.repeat.lookalike_10`, `ps.repeat.win_teardown`) and a distinct bottleneck like B_NOT_YET_REPEATABLE.",
    },
  };
}

export const ASSERTIONS = { P1: assertP1, P2: assertP2, P3: assertP3, P4: assertP4, P5: assertP5, P6: assertP6, P7: assertP7 } as const;
