// PERSONALIZATION RED TEAM v1.2 — Execution Envelope + hard-failure grading.
//
// Runs the SAME deterministic selector for each persona, then calls the LLM
// through the execution-envelope prompt. Automated hard-failure detectors
// enforce the anti-fabrication contract; manual scoring still applies for the
// 5-dimension rubric.
//
// Run: supabase--test_edge_functions pattern:"PERSONALIZATION"

import { selectAction } from "./policy.ts";
import type {
  ActionTemplate, ActiveSignals, FounderContext, LossDistribution,
  MoneyPathState, SelectExtras,
} from "./types.ts";
import { deriveCounts, deriveStage, deriveBottleneck, deriveWinningChannel } from "./state_derivation.ts";
import type { RawEvidence } from "./state_derivation.ts";
import { PERSONAS } from "./redteam_fixtures.ts";
import { buildEnvelope, renderEnvelopePrompt, SYSTEM_PROMPT_ENVELOPE, type ExecutionEnvelope } from "./execution_envelope.ts";

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_TIMEOUT_MS = 25000;

async function fillDeliverable(
  tpl: ActionTemplate,
  ctx: FounderContext,
  state: MoneyPathState,
): Promise<{ deliverable: string; personalized: boolean; envelope: ExecutionEnvelope; error?: string }> {
  const envelope = buildEnvelope(tpl, ctx, state);
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallback = tpl.deliverable_prompt || tpl.done_looks_like || tpl.title;
  if (!key) return { deliverable: fallback, personalized: false, envelope, error: "no LOVABLE_API_KEY" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT_ENVELOPE },
          { role: "user", content: renderEnvelopePrompt(envelope, tpl) },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return { deliverable: fallback, personalized: false, envelope, error: `gateway ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text ? { deliverable: text, personalized: true, envelope } : { deliverable: fallback, personalized: false, envelope, error: "empty response" };
  } catch (e) {
    return { deliverable: fallback, personalized: false, envelope, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

// ── Hard-failure detectors ──────────────────────────────────────────────────
// Each returns a list of concrete violations found in the deliverable text.

// Regex helpers: word-boundaried, case-insensitive.
const RX = (pat: string) => new RegExp(pat, "i");

function check_roi_or_timeToResult_claims(text: string): string[] {
  const hits: string[] = [];
  const pats: Array<[RegExp, string]> = [
    [/\b(\d{1,3})\s*[-–]?\s*day\s+(roi|payback|return)/i, "invented time-to-ROI window"],
    [/\bwithin\s+(the\s+)?(first\s+)?\d+\s+(day|week|month)/i, "invented time-to-result claim"],
    [/\bpays?\s+for\s+itself\s+in\b/i, "invented payback claim"],
    [/\b\d+\s*x\s+(roi|return)/i, "invented ROI multiple"],
    [/\btypical(ly)?\s+(sees|show|delivers|returns)/i, "'typically' benchmark generalization"],
    [/\bindustry\s+(average|benchmark|standard)/i, "invented industry benchmark"],
    [/\bmost\s+(clients|buyers|customers)\s+(see|report|achieve)/i, "invented customer-outcome benchmark"],
  ];
  for (const [rx, why] of pats) if (rx.test(text)) hits.push(why);
  return hits;
}

function check_market_generalizations(text: string): string[] {
  const hits: string[] = [];
  const pats: Array<[RegExp, string]> = [
    [/\b(are|is)\s+rarely\s+at\s+their\s+(desks?|computers?|phones?)/i, "invented buyer work-habit"],
    [/\b(primary|main)\s+(operational|business)\s+(tool|device|channel)/i, "invented buyer operational fact"],
    [/\b(fleet|route|inventory|payroll)\s+(size|density|structure|characteristics?)/i, "invented operational specifics"],
    [/\bmost\s+\w+\s+(owners|founders|managers|operators)\s+(prefer|check|use|open)/i, "invented buyer-population habit"],
    [/\b(7|8|9)\s*(am|:00\s*am)\b/i, "invented send-time optimization"],
    [/\bbest\s+time\s+to\s+(send|post|reach|contact)/i, "invented send-time optimization"],
  ];
  for (const [rx, why] of pats) if (rx.test(text)) hits.push(why);
  return hits;
}

function check_strategy_drift(text: string, env: ExecutionEnvelope): string[] {
  const hits: string[] = [];
  // If envelope forbids selecting the alternate channel, catch a concrete pick.
  const fixedJoined = env.fixed_strategy.join(" ").toLowerCase();
  if (fixedJoined.includes("do not select the alternate channel")) {
    const channelPicks = /\b(switch|move|shift|pivot)\s+to\s+(sms|whatsapp|email|linkedin|instagram|tiktok|phone|call|dm)\b/i;
    const declarative = /\b(use|try|send\s+via|send\s+on|send\s+through)\s+(sms|whatsapp|instagram|tiktok)\b/i;
    if (channelPicks.test(text) || declarative.test(text)) {
      // Only a violation if there is NO founder-input marker for the channel.
      const marker = /⟨FOUNDER:[^⟩]*channel/i;
      if (!marker.test(text)) hits.push("LLM selected the alternate channel; envelope required a ⟨FOUNDER: channel⟩ marker");
    }
  }
  return hits;
}

function check_artifact_type(text: string, env: ExecutionEnvelope): string[] {
  const hits: string[] = [];
  const t = text.trim();
  const wordCount = t.split(/\s+/).length;
  const startsWithAdvice = /^(here('?s| is)|to\s+(write|build|craft|create)|when\s+(writing|crafting)|the\s+(one[- ]pager|call\s+script)\s+(should|needs?|must))/i;
  const hasFounderQuestion = /⟨FOUNDER:/i.test(t);

  switch (env.output_artifact) {
    case "ONE_PAGER":
      // Must contain multiple sections; must NOT be generic advice.
      if (startsWithAdvice.test(t)) hits.push("ONE_PAGER: output is advice about writing a one-pager, not the one-pager itself");
      if (wordCount < 120) hits.push("ONE_PAGER: too short to be a real one-pager");
      break;
    case "CALL_SCRIPT":
      if (startsWithAdvice.test(t)) hits.push("CALL_SCRIPT: output is advice, not spoken words");
      break;
    case "SENDABLE_MESSAGE":
      if (wordCount > 300) hits.push("SENDABLE_MESSAGE: too long to be a sendable message");
      break;
    case "SOCIAL_POST":
      if (wordCount > 350) hits.push("SOCIAL_POST: too long for a social post");
      break;
    case "TEST_PLAN":
      // Must include the 5 structural elements.
      const required = ["fixed", "changed", "cohort", "observ", "threshold"];
      const missing = required.filter((r) => !new RegExp(r, "i").test(t));
      if (missing.length >= 2) hits.push(`TEST_PLAN: missing structural elements: ${missing.join(", ")}`);
      break;
    case "STRUCTURED_WORKSHEET":
      if (!hasFounderQuestion) hits.push("STRUCTURED_WORKSHEET: no ⟨FOUNDER: …⟩ markers — worksheet must be fillable, not pre-answered");
      break;
    default:
      break;
  }
  return hits;
}

function check_offer_category_mutation(text: string, ctx: FounderContext, env: ExecutionEnvelope): string[] {
  const hits: string[] = [];
  if (ctx.business_pattern === "productized_service") {
    // "cohort" is a legitimate statistics term inside a TEST_PLAN; only flag it
    // when it appears as an offer noun ("cohort program", "program members",
    // "our course/curriculum"). Same for "our software/platform/app/saas".
    const swaps: Array<[RegExp, string]> = [
      [/\b(our|the|this)\s+(software|platform|saas)\b/i, "productized_service → software/platform mutation"],
      [/\b(our|the|this)\s+(app|tool)\b(?!\s*(is|will|would)\s+not)/i, "productized_service → app/tool mutation"],
      [/\b(course|curriculum)\b(?!\s+(vitae|vitæ))/i, "productized_service → course/curriculum mutation"],
      [/\bprogram\s+members\b/i, "productized_service → program mutation"],
      [/\bcohort\s+(program|members|students|participants)\b/i, "productized_service → cohort program mutation"],
    ];
    for (const [rx, why] of swaps) if (rx.test(text)) hits.push(why);
  }
  return hits;
}

function detectHardFailures(text: string, env: ExecutionEnvelope, ctx: FounderContext): string[] {
  return [
    ...check_roi_or_timeToResult_claims(text),
    ...check_market_generalizations(text),
    ...check_strategy_drift(text, env),
    ...check_artifact_type(text, env),
    ...check_offer_category_mutation(text, ctx),
  ];
}

// ── State-derivation helpers (same as red-team runner) ─────────────────────
function deriveLossDistribution(e: RawEvidence): LossDistribution {
  const buckets = new Map<string, number>();
  let recent_total = 0, recent_unknown = 0;
  for (const c of e.conversations) {
    if (c.status !== "lost") continue;
    if (c.lost_within_30d === false) continue;
    recent_total++;
    if (c.loss_reason) buckets.set(c.loss_reason, (buckets.get(c.loss_reason) ?? 0) + 1);
    else recent_unknown++;
  }
  return {
    buckets: Array.from(buckets.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    recent_total, recent_unknown,
  };
}
function deriveSignals(e: RawEvidence): ActiveSignals {
  const replied = e.conversations.filter((c) => ["replied", "call_booked", "offer_sent", "won", "lost"].includes(c.status)).length;
  const offer_sent = e.conversations.filter((c) => ["offer_sent", "won", "lost"].includes(c.status)).length;
  return { avoids_ask: replied >= 3 && offer_sent === 0 };
}

async function loadTemplates(): Promise<ActionTemplate[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url && srk) {
    const res = await fetch(
      `${url}/rest/v1/action_templates?business_pattern=eq.productized_service&select=code,business_pattern,applicable_stages,addresses_bottleneck,title,why_now_template,done_looks_like,deliverable_kind,deliverable_prompt,estimated_minutes,cooldown_days,incompatible_with&order=code`,
      { headers: { apikey: srk, Authorization: `Bearer ${srk}` } },
    );
    if (res.ok) return (await res.json()) as ActionTemplate[];
  }
  const snapUrl = new URL("./redteam_templates.snapshot.json", import.meta.url);
  return JSON.parse(await Deno.readTextFile(snapUrl)) as ActionTemplate[];
}

Deno.test("PERSONALIZATION RED TEAM v1.2 — envelope + hard-failure grading", async () => {
  const templates = await loadTemplates();
  const outputs: Array<{
    id: string; name: string; winner: string;
    artifact: string; deliverable: string; personalized: boolean;
    hardFailures: string[]; error?: string;
  }> = [];

  for (const p of PERSONAS) {
    const counts = deriveCounts(p.evidence);
    const state: MoneyPathState = {
      money_path_id: "test",
      stage: deriveStage(p.evidence),
      bottleneck: deriveBottleneck(p.evidence),
      evidence: {
        revenue_cents: counts.revenue_cents,
        revenue_count: counts.revenue_count,
        contacted_count: counts.contacted_count,
        replied_count: counts.replied_count,
        offer_sent_count: counts.offer_sent_count,
        total_conv: counts.total_conv,
      },
      winning_channel: deriveWinningChannel(p.evidence),
    };
    const extras: SelectExtras = {
      loss_distribution: deriveLossDistribution(p.evidence),
      signals: deriveSignals(p.evidence),
    };
    const sel = selectAction(templates, state, p.context, [], new Date(), extras);
    const winner = sel.primary?.template;
    if (!winner) {
      outputs.push({ id: p.id, name: p.name, winner: "—", artifact: "—", deliverable: "(no template)", personalized: false, hardFailures: ["no template selected"] });
      continue;
    }
    const filled = await fillDeliverable(winner, p.context, state);
    const hardFailures = filled.personalized
      ? detectHardFailures(filled.deliverable, filled.envelope, p.context)
      : [];
    outputs.push({
      id: p.id, name: p.name, winner: winner.code,
      artifact: filled.envelope.output_artifact,
      deliverable: filled.deliverable,
      personalized: filled.personalized,
      hardFailures,
      error: filled.error,
    });
  }

  const totalFailures = outputs.reduce((n, o) => n + o.hardFailures.length, 0);
  const cleanPersonas = outputs.filter((o) => o.personalized && o.hardFailures.length === 0).length;

  const lines: string[] = [];
  lines.push("");
  lines.push("═════════════════════════════════════════════════════════════════════════");
  lines.push("  TRUEBLAZER PERSONALIZATION RED TEAM v1.2 — Envelope + Hard-Failure Grading");
  lines.push("═════════════════════════════════════════════════════════════════════════");
  lines.push(`  Model               : ${AI_MODEL}`);
  lines.push(`  Personalized OK     : ${outputs.filter(o => o.personalized).length}/${outputs.length}`);
  lines.push(`  Clean (0 hard fail) : ${cleanPersonas}/${outputs.length}`);
  lines.push(`  Total hard failures : ${totalFailures}`);
  lines.push("");
  lines.push("── COMPACT MATRIX ──────────────────────────────────────────────────────");
  lines.push("  ID  | winning template               | artifact             | hard-fails");
  for (const o of outputs) {
    lines.push(`  ${o.id.padEnd(3)} | ${o.winner.padEnd(30)} | ${o.artifact.padEnd(20)} | ${o.hardFailures.length}`);
  }
  lines.push("");
  for (const o of outputs) {
    lines.push(`─── ${o.id} — ${o.name} ────────────────────────────────`);
    lines.push(`  Winner   : ${o.winner}`);
    lines.push(`  Artifact : ${o.artifact}`);
    lines.push(`  LLM OK   : ${o.personalized}${o.error ? "  (error: " + o.error + ")" : ""}`);
    if (o.hardFailures.length) {
      lines.push(`  HARD FAILURES (${o.hardFailures.length}):`);
      for (const f of o.hardFailures) lines.push(`    ✗ ${f}`);
    } else {
      lines.push("  HARD FAILURES : none");
    }
    lines.push("  ── DELIVERABLE (verbatim) ──");
    for (const line of o.deliverable.split("\n")) lines.push(`  | ${line}`);
    lines.push("");
  }
  console.log(lines.join("\n"));
  try { await Deno.writeTextFile(new URL("./personalization_report.txt", import.meta.url), lines.join("\n")); } catch { /* no write perm */ }
});
