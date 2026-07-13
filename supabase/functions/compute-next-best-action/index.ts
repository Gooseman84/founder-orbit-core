// compute-next-best-action
// Selector = deterministic policy. LLM = enhancement only.
// Never let an LLM outage erase TrueBlazer's opinion.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { selectAction } from "../_shared/nba/policy.ts";
import type {
  ActionTemplate,
  ActiveSignals,
  FounderContext,
  LossDistribution,
  MoneyPathState,
  NbaHistoryEntry,
  SelectExtras,
} from "../_shared/nba/types.ts";
import { buildEnvelope, renderEnvelopePrompt, SYSTEM_PROMPT_ENVELOPE } from "../_shared/nba/execution_envelope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL = "google/gemini-3-flash-preview";
const AI_TIMEOUT_MS = 8000;

// ── readState: derived stage, bottleneck, evidence from SQL views ──
async function readState(
  supabase: ReturnType<typeof createClient>,
  moneyPathId: string,
): Promise<MoneyPathState | null> {
  const [stageRes, bnRes, chanRes] = await Promise.all([
    supabase.from("v_money_path_stage").select("*").eq("money_path_id", moneyPathId).maybeSingle(),
    supabase.from("v_active_bottleneck").select("*").eq("money_path_id", moneyPathId).maybeSingle(),
    // Winning channel = source_channel of the most recent revenue event.
    // Path-scoped by design; never persisted on the founder.
    supabase.from("revenue_events").select("source_channel, occurred_at").eq("money_path_id", moneyPathId).order("occurred_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!stageRes.data || !bnRes.data) return null;
  const s = stageRes.data as any;
  return {
    money_path_id: moneyPathId,
    stage: s.stage,
    bottleneck: (bnRes.data as any).bottleneck,
    evidence: {
      revenue_cents: Number(s.revenue_cents ?? 0),
      revenue_count: Number(s.revenue_count ?? 0),
      contacted_count: Number(s.contacted_count ?? 0),
      replied_count: Number(s.replied_count ?? 0),
      offer_sent_count: Number(s.offer_sent_count ?? 0),
      total_conv: Number(s.contacted_count ?? 0),
    },
    winning_channel: (chanRes.data as any)?.source_channel ?? null,
  };
}

// ── readContext: founder advantage + offer characteristics ──
async function readContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  moneyPathId: string,
): Promise<FounderContext | null> {
  const [mpRes, advRes] = await Promise.all([
    supabase.from("money_paths").select("business_pattern, sales_complexity, offer_locked_at, buyer_segment").eq("id", moneyPathId).maybeSingle(),
    supabase.from("founder_advantages").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!mpRes.data) return null;
  const mp = mpRes.data as any;
  const adv = (advRes.data ?? {}) as any;
  return {
    business_pattern: mp.business_pattern,
    sales_complexity: mp.sales_complexity ?? null,
    offer_locked: !!mp.offer_locked_at,
    buyer_segment: mp.buyer_segment ?? null,
    warm_network_strength: adv.warm_network_strength ?? "none",
    existing_audience_size: adv.existing_audience_size ?? 0,
    existing_audience_channel: adv.existing_audience_channel ?? null,
    platform_strengths: adv.platform_strengths ?? [],
    existing_client_access: !!adv.existing_client_access,
    // ── Economic leverage snapshot (Repair Block 1.1) ──
    reachable_buyer_count: Number(adv.reachable_buyer_count ?? 0),
    activatable_audience: !!adv.activatable_audience,
    has_prior_paid_proof: !!adv.has_prior_paid_proof,
  };
}

// ── readLossDistribution: recent-30d loss reason buckets for this path ──
async function readLossDistribution(
  supabase: ReturnType<typeof createClient>,
  moneyPathId: string,
): Promise<LossDistribution> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("buyer_conversations")
    .select("loss_reason, updated_at, status")
    .eq("money_path_id", moneyPathId)
    .eq("status", "lost")
    .gte("updated_at", cutoff);

  const rows = (data ?? []) as Array<{ loss_reason: string | null }>;
  const counts = new Map<string, number>();
  let recent_unknown = 0;
  for (const r of rows) {
    if (r.loss_reason == null) { recent_unknown++; continue; }
    counts.set(r.loss_reason, (counts.get(r.loss_reason) ?? 0) + 1);
  }
  const buckets = Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
  return { buckets, recent_total: rows.length, recent_unknown };
}

// ── readSignals: unresolved founder_signals rows for this path ──
async function readSignals(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  moneyPathId: string,
): Promise<ActiveSignals> {
  const { data } = await supabase
    .from("founder_signals")
    .select("kind, resolved_at")
    .eq("user_id", userId)
    .eq("money_path_id", moneyPathId)
    .is("resolved_at", null);
  const rows = (data ?? []) as Array<{ kind: string }>;
  return { avoids_ask: rows.some((r) => r.kind === "SIG_AVOIDS_ASK") };
}



// ── fillDeliverable: single LLM call, safe fallback on failure ──
async function fillDeliverable(
  tpl: ActionTemplate,
  ctx: FounderContext,
  state: MoneyPathState,
): Promise<{ deliverable: string; personalized: boolean }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallback = tpl.deliverable_prompt || tpl.done_looks_like || tpl.title;
  if (!key || !tpl.deliverable_prompt) return { deliverable: fallback, personalized: false };

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
    if (!res.ok) return { deliverable: fallback, personalized: false };
    const j = await res.json();
    const text = j?.choices?.[0]?.message?.content?.trim();
    return text ? { deliverable: text, personalized: true } : { deliverable: fallback, personalized: false };
  } catch {
    return { deliverable: fallback, personalized: false };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { ventureId } = await req.json();
    if (!ventureId) return json({ error: "ventureId required" }, 400);

    // Verify ownership + ensure money path exists.
    const { data: mpId, error: rpcErr } = await supabase.rpc("ensure_money_path", { p_venture_id: ventureId });
    if (rpcErr || !mpId) return json({ error: "money path unavailable" }, 404);

    // Read state + context + templates + history + loss dist + signals in parallel.
    const [state, ctx, tplRes, histRes, lossDist, signals] = await Promise.all([
      readState(supabase, mpId as string),
      readContext(supabase, user.id, mpId as string),
      supabase.from("action_templates").select("*").eq("active", true).eq("business_pattern", "productized_service"),
      supabase.from("nba_history").select("template_code, served_at, outcome").eq("user_id", user.id).eq("money_path_id", mpId).order("served_at", { ascending: false }).limit(50),
      readLossDistribution(supabase, mpId as string),
      readSignals(supabase, user.id, mpId as string),
    ]);

    if (!state || !ctx) return json({ error: "state or context missing" }, 500);

    const templates: ActionTemplate[] = (tplRes.data ?? []).map((r: any) => ({
      code: r.code,
      business_pattern: r.business_pattern,
      applicable_stages: r.applicable_stages ?? [],
      addresses_bottleneck: r.addresses_bottleneck,
      title: r.title,
      why_now_template: r.why_now_template ?? "",
      done_looks_like: r.done_looks_like ?? "",
      deliverable_kind: r.deliverable_kind ?? "text_snippet",
      deliverable_prompt: r.deliverable_prompt ?? "",
      estimated_minutes: r.estimated_minutes ?? 30,
      cooldown_days: r.cooldown_days ?? 0,
      incompatible_with: r.incompatible_with ?? [],
    }));
    const history: NbaHistoryEntry[] = (histRes.data ?? []) as any;

    const extras: SelectExtras = { loss_distribution: lossDist, signals };
    const selection = selectAction(templates, state, ctx, history, new Date(), extras);
    if (!selection.primary) {
      return json({ state, context: ctx, selection: null, message: "No matching action templates." });
    }


    // Personalize the primary deliverable — safe fallback on failure.
    const { deliverable, personalized } = await fillDeliverable(selection.primary.template, ctx, state);

    // Log to nba_history as pending (fire and forget errors don't block response).
    const primary = selection.primary.template;
    const snapshot = {
      title: primary.title,
      why_now: primary.why_now_template,
      done_looks_like: primary.done_looks_like,
      deliverable,
      personalized,
      score: selection.primary.score,
      reasons: selection.primary.reasons,
      alternates: selection.alternates.map((a) => ({ code: a.template.code, title: a.template.title, score: a.score })),
    };
    await supabase.from("nba_history").insert({
      user_id: user.id,
      money_path_id: mpId,
      template_code: primary.code,
      stage_at_serve: state.stage,
      bottleneck_at_serve: state.bottleneck,
      deliverable_snapshot: snapshot,
      outcome: "pending",
    });

    return json({
      state,
      context: ctx,
      selection: {
        primary: { ...snapshot, code: primary.code, estimated_minutes: primary.estimated_minutes, deliverable_kind: primary.deliverable_kind },
        alternates: selection.alternates.map((a) => ({
          code: a.template.code, title: a.template.title, why_now: a.template.why_now_template,
          done_looks_like: a.template.done_looks_like, estimated_minutes: a.template.estimated_minutes,
        })),
        library_exhausted: selection.library_exhausted,
      },
    });
  } catch (e) {
    console.error("[compute-next-best-action]", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
