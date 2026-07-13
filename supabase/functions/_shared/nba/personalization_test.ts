// PERSONALIZATION RED TEAM — runs the REAL fillDeliverable() path from
// compute-next-best-action for each of the 7 personas and prints the actual
// personalized deliverable so it can be graded by hand.
//
// Deterministic selection is preserved unchanged; only the LLM-personalized
// deliverable text is captured here.
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

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_TIMEOUT_MS = 20000;

// ── Verbatim mirror of compute-next-best-action/index.ts fillDeliverable ──
async function fillDeliverable(
  tpl: ActionTemplate,
  ctx: FounderContext,
  state: MoneyPathState,
): Promise<{ deliverable: string; personalized: boolean; error?: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallback = tpl.deliverable_prompt || tpl.done_looks_like || tpl.title;
  if (!key || !tpl.deliverable_prompt) return { deliverable: fallback, personalized: false, error: !key ? "no LOVABLE_API_KEY in test env" : "no deliverable_prompt" };

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
          { role: "system", content: "You are Mavrik. Direct, financially literate, 2-4 sentences. No 'leverage', no 'great job'." },
          { role: "user", content: `Founder context:\n- buyer_segment: ${ctx.buyer_segment ?? "unknown"}\n- warm_network: ${ctx.warm_network_strength}\n- audience: ${ctx.existing_audience_size} on ${ctx.existing_audience_channel ?? "none"}\n- stage: ${state.stage}\n- bottleneck: ${state.bottleneck}\n\nTemplate prompt:\n${tpl.deliverable_prompt}\n\nProduce the deliverable text now. No preamble.` },
        ],
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return { deliverable: fallback, personalized: false, error: `gateway ${res.status}: ${(await res.text()).slice(0, 200)}` };
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text ? { deliverable: text, personalized: true } : { deliverable: fallback, personalized: false, error: "empty gateway response" };
  } catch (e) {
    return { deliverable: fallback, personalized: false, error: (e as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

// Same helpers as the deterministic red team runner.
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

Deno.test("PERSONALIZATION RED TEAM — 7 personas, live fillDeliverable path", async () => {
  const templates = await loadTemplates();
  const outputs: Array<{ id: string; name: string; winner: string; deliverable: string; personalized: boolean; error?: string }> = [];

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
      outputs.push({ id: p.id, name: p.name, winner: "—", deliverable: "(no template selected)", personalized: false, error: "no winner" });
      continue;
    }
    const filled = await fillDeliverable(winner, p.context, state);
    outputs.push({ id: p.id, name: p.name, winner: winner.code, deliverable: filled.deliverable, personalized: filled.personalized, error: filled.error });
  }

  const lines: string[] = [];
  lines.push("");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push("  TRUEBLAZER PERSONALIZATION RED TEAM — fillDeliverable() live");
  lines.push("═════════════════════════════════════════════════════════════════════");
  lines.push(`  Model: ${AI_MODEL}`);
  lines.push(`  Personalized OK: ${outputs.filter(o => o.personalized).length} / ${outputs.length}`);
  lines.push("");
  for (const o of outputs) {
    lines.push(`─── ${o.id} — ${o.name} ─────────────────────────────────────`);
    lines.push(`  Winning template : ${o.winner}`);
    lines.push(`  Personalized     : ${o.personalized}${o.error ? "  (error: " + o.error + ")" : ""}`);
    lines.push(`  ── DELIVERABLE (verbatim) ──`);
    for (const line of o.deliverable.split("\n")) lines.push(`  | ${line}`);
    lines.push("");
  }
  console.log(lines.join("\n"));
  try { await Deno.writeTextFile(new URL("./personalization_report.txt", import.meta.url), lines.join("\n")); } catch { /* no write perm */ }
});
