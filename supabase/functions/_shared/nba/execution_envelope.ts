// PERSONALIZATION REPAIR BLOCK 1.2 — Execution Envelope
//
// The deterministic policy owns the STRATEGY. The LLM personalizes CONTENT
// inside the envelope. The envelope makes the strategy explicit, enumerates
// allowed evidence, forbids fabrication, and pins the output artifact type.
//
// The LLM may not:
//   • invent facts not in ALLOWED EVIDENCE
//   • change the FIXED STRATEGY (channel, cohort, cadence, price move, etc.)
//   • select a strategic variable the envelope leaves as ⟨FOUNDER: …⟩
//   • produce an artifact of a different type than OUTPUT_ARTIFACT
//   • mutate the offer category (workshop→tool, service→software, etc.)

import type { ActionTemplate, FounderContext, MoneyPathState } from "./types.ts";

export type ArtifactType =
  | "SENDABLE_MESSAGE"
  | "SENDABLE_EMAIL"
  | "SOCIAL_POST"
  | "CALL_SCRIPT"
  | "TEST_PLAN"
  | "BUYER_LIST_PROCESS"
  | "ONE_PAGER"
  | "STRUCTURED_WORKSHEET"
  | "ANALYSIS";

export interface ExecutionEnvelope {
  action_code: string;
  action_objective: string;
  fixed_strategy: string[];
  allowed_evidence: string[];   // human-readable "field: value" lines
  forbidden_inferences: string[];
  output_artifact: ArtifactType;
  missing_evidence_behavior: string;
}

// Default forbidden list applied to EVERY envelope.
const UNIVERSAL_FORBIDDEN: string[] = [
  "recipient names",
  "company names",
  "prior conversation content or relationship history",
  "buyer behavior, work habits, or operational facts not supplied as evidence",
  "product features or offer benefits not present in offer evidence",
  "testimonials, case studies, or performance claims",
  "ROI figures, payback windows, or market benchmarks (e.g. '90-day ROI', 'industry average X%')",
  "channel or send-time optimization not fixed by this envelope",
  "any strategic variable outside the FIXED STRATEGY above",
];

const ARTIFACT_CONTRACT: Record<ArtifactType, string> = {
  SENDABLE_MESSAGE: "Write the exact words to send. Not advice about writing one.",
  SENDABLE_EMAIL: "Write a subject line + body. Not advice about writing one.",
  SOCIAL_POST: "Write the post text ready to publish. No meta-commentary.",
  CALL_SCRIPT: "Write the words the founder speaks. Not advice about scripts.",
  TEST_PLAN: "Produce: fixed variable, changed variable, cohort, observation, decision threshold.",
  BUYER_LIST_PROCESS: "Produce a numbered process the founder executes to build the list.",
  ONE_PAGER: "Produce the actual one-pager sections and copy. Not advice about writing one.",
  STRUCTURED_WORKSHEET: "Produce the worksheet with labeled fields and ⟨FOUNDER: …⟩ markers. Do NOT invent answers.",
  ANALYSIS: "Produce the analysis. State assumptions as assumptions.",
};

function offerLines(ctx: FounderContext): string[] {
  const lines: string[] = [];
  lines.push(`buyer_segment: ${ctx.buyer_segment ?? "⟨FOUNDER: describe your target buyer⟩"}`);
  lines.push(`business_pattern: ${ctx.business_pattern}`);
  lines.push(`sales_complexity: ${ctx.sales_complexity ?? "unknown"}`);
  lines.push(`offer_title: ${ctx.offer_title ?? "⟨FOUNDER: name of the offer⟩"}`);
  lines.push(`offer_description: ${ctx.offer_description ?? "⟨FOUNDER: 1-2 sentence description of what the buyer gets⟩"}`);
  lines.push(`price_cents: ${ctx.price_cents ?? "⟨FOUNDER: price⟩"}`);
  lines.push(`delivery_format: ${ctx.delivery_format ?? "⟨FOUNDER: how it is delivered⟩"}`);
  return lines;
}

function triggeringLines(ctx: FounderContext): string[] {
  const t = ctx.triggering_conversation;
  if (!t) return [];
  const lines = [
    `triggering_conversation.handle: ${t.handle}`,
    `triggering_conversation.channel: ${t.channel ?? "unknown"}`,
    `triggering_conversation.status: ${t.status}`,
    `triggering_conversation.last_activity_at: ${t.last_activity_at}`,
  ];
  if (t.loss_reason) lines.push(`triggering_conversation.loss_reason: ${t.loss_reason}`);
  if (t.loss_note) lines.push(`triggering_conversation.loss_note: ${t.loss_note}`);
  if (t.outcome) lines.push(`triggering_conversation.outcome: ${t.outcome}`);
  return lines;
}

function evidenceLines(state: MoneyPathState): string[] {
  const e = state.evidence;
  return [
    `stage: ${state.stage}`,
    `bottleneck: ${state.bottleneck}`,
    `contacted_count: ${e.contacted_count}`,
    `replied_count: ${e.replied_count}`,
    `offer_sent_count: ${e.offer_sent_count}`,
    `revenue_count: ${e.revenue_count}`,
    `revenue_cents: ${e.revenue_cents}`,
    `winning_channel: ${state.winning_channel ?? "unknown"}`,
  ];
}

/** Build the per-template execution envelope. */
export function buildEnvelope(
  tpl: ActionTemplate,
  ctx: FounderContext,
  state: MoneyPathState,
): ExecutionEnvelope {
  const base = {
    action_code: tpl.code,
    allowed_evidence: [...offerLines(ctx), ...triggeringLines(ctx), ...evidenceLines(state)],
    forbidden_inferences: [...UNIVERSAL_FORBIDDEN],
    missing_evidence_behavior:
      "When a required specific fact is unknown, insert a concise ⟨FOUNDER: …⟩ marker. Do NOT invent a plausible substitute. Use markers sparingly (max ~4). When triggering_conversation.handle is present, address that person by their handle instead of a marker.",
  };

  switch (tpl.code) {
    case "ps.reply.channel_switch":
      return {
        ...base,
        action_objective: "Test whether the current outreach channel is suppressing reply rate.",
        fixed_strategy: [
          "Preserve buyer segment, offer, and core message.",
          "Change exactly one variable: the channel.",
          "Do NOT select the alternate channel yourself — surface a ⟨FOUNDER: …⟩ marker listing available options.",
          "Do NOT invent send-time windows, compliance rules, or buyer work-habits.",
        ],
        output_artifact: "TEST_PLAN",
      };

    case "ps.close.roi_case_one_pager":
      return {
        ...base,
        action_objective: "Produce a buyer-shaped economic one-pager the founder sends with the next proposal.",
        fixed_strategy: [
          "Anchor on the buyer segment and the offer already in evidence.",
          "State every number as an ASSUMPTION the founder can defend.",
          "No industry benchmarks, no '90-day payback', no invented case studies.",
        ],
        output_artifact: "ONE_PAGER",
      };

    case "ps.repeat.win_teardown":
      return {
        ...base,
        action_objective: "Capture the 5 facts required to reproduce the first sale.",
        fixed_strategy: [
          "Produce a fillable worksheet, NOT a completed teardown.",
          "Use ⟨FOUNDER: …⟩ markers for every field the system does not already have evidence for.",
          "Do NOT invent buyer identity, quotes, or motivations.",
        ],
        output_artifact: "STRUCTURED_WORKSHEET",
      };

    case "ps.outreach.warm_direct_ask":
    case "ps.outreach.warm_intro_dm":
    case "ps.outreach.referral_ask":
      return {
        ...base,
        action_objective: "Move a warm-network contact to a first commercial conversation.",
        fixed_strategy: [
          "One clear ask (15-min call OR yes/no on the offer).",
          "Reference only what the founder can plausibly recall — do NOT name recipients or companies.",
        ],
        output_artifact: "SENDABLE_MESSAGE",
      };

    case "ps.outreach.audience_cta":
      return {
        ...base,
        action_objective: "Convert existing audience attention into a commercial reply.",
        fixed_strategy: [
          "One post. One ask. One reply instruction.",
          "Do NOT invent audience testimonials or engagement stats.",
        ],
        output_artifact: "SOCIAL_POST",
      };

    case "ps.call.book_conversion_line":
    case "ps.call.value_first_agenda":
      return {
        ...base,
        action_objective: "Convert a text reply into a booked 15-minute call.",
        fixed_strategy: [
          "Two specific time windows.",
          "Do NOT invent the recipient's calendar constraints or prior message content.",
        ],
        output_artifact: "SENDABLE_MESSAGE",
      };

    case "ps.list.build_25_named":
    case "ps.list.tap_warm_network":
    case "ps.list.audience_pull":
    case "ps.repeat.lookalike_10":
      return {
        ...base,
        action_objective: "Produce a repeatable process to build the required named-buyer list.",
        fixed_strategy: [
          "Give a numbered process the founder can run themselves.",
          "Do NOT invent specific company or contact names.",
        ],
        output_artifact: "BUYER_LIST_PROCESS",
      };

    default:
      // Sensible default — infer artifact from deliverable_kind.
      const kind = tpl.deliverable_kind;
      const artifact: ArtifactType =
        kind === "message_draft" ? "SENDABLE_MESSAGE"
        : kind === "social_post" ? "SOCIAL_POST"
        : kind === "document" ? "ONE_PAGER"
        : kind === "spreadsheet" ? "BUYER_LIST_PROCESS"
        : kind === "plan" ? "TEST_PLAN"
        : "ANALYSIS";
      return {
        ...base,
        action_objective: tpl.title,
        fixed_strategy: [
          "Follow the template's strategic intent exactly.",
          "Do NOT introduce new strategic variables (channel, cohort, price, cadence, segmentation).",
        ],
        output_artifact: artifact,
      };
  }
}

/** Render the envelope as the user-message payload to the LLM. */
export function renderEnvelopePrompt(
  env: ExecutionEnvelope,
  tpl: ActionTemplate,
): string {
  return [
    "=== EXECUTION ENVELOPE ===",
    "",
    `ACTION_CODE: ${env.action_code}`,
    "",
    "ACTION_OBJECTIVE:",
    `  ${env.action_objective}`,
    "",
    "FIXED_STRATEGY (do NOT alter):",
    ...env.fixed_strategy.map((s) => `  • ${s}`),
    "",
    "ALLOWED_EVIDENCE (the ONLY facts you may treat as true):",
    ...env.allowed_evidence.map((s) => `  • ${s}`),
    "",
    "FORBIDDEN_INFERENCES (never invent these; plausible is NOT evidence):",
    ...env.forbidden_inferences.map((s) => `  • ${s}`),
    "",
    `OUTPUT_ARTIFACT: ${env.output_artifact}`,
    `  ${ARTIFACT_CONTRACT[env.output_artifact]}`,
    "",
    "MISSING_EVIDENCE_BEHAVIOR:",
    `  ${env.missing_evidence_behavior}`,
    "",
    "=== TEMPLATE INTENT (context only — envelope wins on conflict) ===",
    tpl.deliverable_prompt || tpl.done_looks_like || tpl.title,
    "",
    "=== PRODUCE THE OUTPUT_ARTIFACT NOW ===",
    "No preamble. No meta-commentary. No 'here is'. Produce the artifact.",
  ].join("\n");
}

export const SYSTEM_PROMPT_ENVELOPE = [
  "You are Mavrik. Direct, financially literate, 2–6 sentences unless the artifact demands more structure.",
  "You are executing INSIDE an execution envelope defined by a deterministic commercial-intelligence system.",
  "You may personalize CONTENT. You may NOT change strategy.",
  "You may state ALLOWED EVIDENCE as fact. Everything else is UNKNOWN.",
  "UNKNOWN is never converted into plausible detail — insert a concise ⟨FOUNDER: …⟩ marker instead.",
  "Never use the word 'leverage'. Never say 'great job'.",
  "Produce the OUTPUT_ARTIFACT exactly. Do not explain how to produce it.",
].join(" ");
