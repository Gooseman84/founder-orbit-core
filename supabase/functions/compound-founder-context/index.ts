// supabase/functions/compound-founder-context/index.ts
// Deterministic aggregation of founder signals into a compact intelligence snapshot.
// No AI call — pure computation. Called after check-ins, reflections, and evidence logging.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THROTTLE_HOURS = 4;

function computeTrend(values: number[]): "rising" | "falling" | "stable" | "unknown" {
  if (values.length < 2) return "unknown";
  const first = values[values.length - 1];
  const last = values[0];
  const diff = last - first;
  if (diff > 0.5) return "rising";
  if (diff < -0.5) return "falling";
  return "stable";
}

function avg(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n != null);
  if (valid.length === 0) return null;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { ventureId, triggerEvent } = body;

    if (!ventureId || !triggerEvent) {
      return new Response(JSON.stringify({ error: "ventureId and triggerEvent required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Throttle: skip if recent snapshot exists ──
    const throttleCutoff = new Date(Date.now() - THROTTLE_HOURS * 3600000).toISOString();
    const { data: recentSnapshot } = await supabase
      .from("founder_context_snapshots")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("venture_id", ventureId)
      .gte("created_at", throttleCutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSnapshot) {
      console.log(`[compound-founder-context] Throttled — last snapshot ${recentSnapshot.created_at}`);
      return new Response(JSON.stringify({ success: true, throttled: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch all signals in parallel ──
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

    const [
      { data: taskRows7d },
      { data: taskRows30d },
      { data: reflections },
      { data: checkins },
      { data: patterns },
      { data: marketValidations },
      { data: executionStrategy },
      { data: interviewData },
      { data: latestVersion },
    ] = await Promise.all([
      supabase.from("venture_daily_tasks").select("tasks").eq("venture_id", ventureId).gte("task_date", sevenDaysAgo.split("T")[0]),
      supabase.from("venture_daily_tasks").select("tasks").eq("venture_id", ventureId).gte("task_date", thirtyDaysAgo.split("T")[0]),
      supabase.from("daily_reflections").select("energy_level, stress_level, blockers, what_learned, mood_tags").eq("user_id", user.id).order("reflection_date", { ascending: false }).limit(7),
      supabase.from("venture_daily_checkins").select("completion_status, explanation").eq("venture_id", ventureId).order("checkin_date", { ascending: false }).limit(7),
      supabase.from("founder_patterns").select("pattern_type, severity, pattern_description").eq("venture_id", ventureId).eq("status", "active"),
      supabase.from("market_validations").select("validation_score, demand_signals, competitor_landscape, market_timing").eq("user_id", user.id).order("validated_at", { ascending: false }).limit(3),
      supabase.from("execution_strategies").select("strategy").eq("venture_id", ventureId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("founder_interviews").select("context_summary").eq("user_id", user.id).eq("status", "completed").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("founder_context_snapshots").select("version").eq("user_id", user.id).eq("venture_id", ventureId).order("version", { ascending: false }).limit(1).maybeSingle(),
    ]);

    // ── Compute execution profile ──
    function computeCompletionRate(rows: any[] | null): number {
      if (!rows || rows.length === 0) return 0;
      let total = 0, completed = 0;
      for (const row of rows) {
        const tasks = Array.isArray(row.tasks) ? row.tasks : [];
        total += tasks.length;
        completed += tasks.filter((t: any) => t.completed).length;
      }
      return total > 0 ? Math.round((completed / total) * 100) / 100 : 0;
    }

    function computeCategoryStats(rows: any[] | null): { top: string[], weak: string[] } {
      if (!rows || rows.length === 0) return { top: [], weak: [] };
      const catStats: Record<string, { total: number; completed: number }> = {};
      for (const row of rows) {
        const tasks = Array.isArray(row.tasks) ? row.tasks : [];
        for (const t of tasks) {
          const cat = t.category || "unknown";
          if (!catStats[cat]) catStats[cat] = { total: 0, completed: 0 };
          catStats[cat].total++;
          if (t.completed) catStats[cat].completed++;
        }
      }
      const entries = Object.entries(catStats).filter(([_, v]) => v.total >= 2);
      const sorted = entries.sort((a, b) => (b[1].completed / b[1].total) - (a[1].completed / a[1].total));
      return {
        top: sorted.slice(0, 2).map(([k]) => k),
        weak: sorted.slice(-2).filter(([_, v]) => v.completed / v.total < 0.5).map(([k]) => k),
      };
    }

    const energyLevels = (reflections || []).map((r: any) => r.energy_level).filter((e: any) => e != null);
    const stressLevels = (reflections || []).map((r: any) => r.stress_level).filter((s: any) => s != null);
    const categoryStats = computeCategoryStats(taskRows30d);

    const executionProfile = {
      completionRate7d: computeCompletionRate(taskRows7d),
      completionRate30d: computeCompletionRate(taskRows30d),
      avgEnergyLevel: avg(energyLevels),
      avgStressLevel: avg(stressLevels),
      energyTrend: computeTrend(energyLevels),
      topCategories: categoryStats.top,
      weakCategories: categoryStats.weak,
    };

    // ── Extract validated learnings ──
    const validatedLearnings: string[] = [];
    const recentLearnings = (reflections || []).filter((r: any) => r.what_learned?.trim()).map((r: any) => r.what_learned.trim());
    validatedLearnings.push(...recentLearnings.slice(0, 3));

    // ── Active blockers ──
    const activeBlockers = (reflections || [])
      .filter((r: any) => r.blockers?.trim())
      .map((r: any) => r.blockers.trim())
      .slice(0, 2);

    // ── Behavioral flags ──
    const behavioralFlags = (patterns || []).map((p: any) => `${p.pattern_type} (${p.severity})`);

    // ── Market intelligence ──
    const marketIntel: any = { strongDemandSignals: [], competitorCount: 0, timingAssessment: "unknown" };
    if (marketValidations && marketValidations.length > 0) {
      const latest = marketValidations[0] as any;
      const demandSignals = Array.isArray(latest.demand_signals) ? latest.demand_signals : [];
      marketIntel.strongDemandSignals = demandSignals
        .filter((s: any) => typeof s === "object" && s.strength === "strong")
        .map((s: any) => s.signal || s.description || JSON.stringify(s))
        .slice(0, 3);
      if (marketIntel.strongDemandSignals.length === 0 && demandSignals.length > 0) {
        marketIntel.strongDemandSignals = demandSignals.slice(0, 2).map((s: any) => typeof s === "string" ? s : (s.signal || JSON.stringify(s)));
      }
      const competitors = Array.isArray(latest.competitor_landscape) ? latest.competitor_landscape : [];
      marketIntel.competitorCount = competitors.length;
      marketIntel.timingAssessment = latest.market_timing || "unknown";
    }

    // ── Founder strengths + routing signal from interview ──
    const interviewContext = interviewData?.context_summary as any ?? null;
    const founderStrengths: string[] = [];
    let routingSignal: any = null;
    if (interviewContext) {
      if (interviewContext.founderSummary) founderStrengths.push(interviewContext.founderSummary);
      if (interviewContext.extractedInsights?.insiderKnowledge) {
        founderStrengths.push(...interviewContext.extractedInsights.insiderKnowledge.slice(0, 2));
      }
      if (interviewContext.routingSignal) routingSignal = interviewContext.routingSignal;
    }

    // ── Build summary ──
    const completionPct = Math.round(executionProfile.completionRate7d * 100);
    const energyStr = executionProfile.avgEnergyLevel ? `Energy ${executionProfile.energyTrend}` : "Energy unknown";
    const patternStr = behavioralFlags.length > 0 ? `${behavioralFlags.length} active pattern(s)` : "No patterns";
    const marketStr = marketIntel.strongDemandSignals.length > 0 ? `${marketIntel.strongDemandSignals.length} demand signal(s)` : "No market data";

    const snapshotSummary = `${completionPct}% task completion (7d). ${energyStr}. ${patternStr}. ${marketStr}. Timing: ${marketIntel.timingAssessment}.`;

    // ── Assemble snapshot ──
    const snapshot = {
      executionProfile,
      validatedLearnings,
      activeBlockers,
      behavioralFlags,
      marketIntelligence: marketIntel,
      founderStrengths: founderStrengths.slice(0, 3),
      routingSignal,
      snapshotSummary,
    };

    const newVersion = (latestVersion?.version ?? 0) + 1;

    // ── Persist ──
    const { error: insertError } = await supabase
      .from("founder_context_snapshots")
      .insert({
        user_id: user.id,
        venture_id: ventureId,
        version: newVersion,
        snapshot,
        trigger_event: triggerEvent,
      });

    if (insertError) {
      console.error("[compound-founder-context] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save snapshot" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[compound-founder-context] Snapshot v${newVersion} created for venture ${ventureId} (trigger: ${triggerEvent})`);

    return new Response(JSON.stringify({ success: true, version: newVersion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[compound-founder-context] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
