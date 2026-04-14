// supabase/functions/adapt-execution-strategy/index.ts
// Closes the feedback loop: analyzes recent check-ins, reflections, patterns,
// and market validation data to produce an "execution strategy" that
// generate-daily-execution-tasks reads the next day.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { selectInterviewContext } from "../_shared/selectInterviewContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecutionStrategy {
  generated_at: string;
  // What should tomorrow focus on?
  primary_focus: string;
  // Calibration adjustments
  task_count_recommendation: number;
  max_task_minutes: number;
  // Categories to prioritize/avoid
  prioritize_categories: string[];
  avoid_categories: string[];
  // Specific directives for the task generator
  directives: string[];
  // Pattern-informed adjustments
  active_pattern_warnings: string[];
  // Market validation gaps to address
  market_gaps: string[];
  // Energy calibration
  energy_calibration: "low" | "normal" | "high";
  // Confidence score in this strategy (0-100)
  confidence: number;
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
    const LOVABLE_AI_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ventureId } = await req.json();
    if (!ventureId) {
      return new Response(JSON.stringify({ error: "ventureId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch All Context ─────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: venture },
      { data: recentCheckins },
      { data: recentReflections },
      { data: recentTaskRows },
      { data: activePatterns },
      { data: blueprint },
      { data: interviewData },
    ] = await Promise.all([
      supabaseService.from("ventures").select("name, idea_id, venture_state, commitment_start_at, commitment_window_days, success_metric").eq("id", ventureId).single(),
      supabaseService.from("venture_daily_checkins").select("checkin_date, completion_status, explanation, reflection, mavrik_response").eq("venture_id", ventureId).order("checkin_date", { ascending: false }).limit(7),
      supabaseService.from("daily_reflections").select("reflection_date, energy_level, stress_level, mood_tags, blockers, top_priority, what_did, what_learned").eq("user_id", user.id).order("reflection_date", { ascending: false }).limit(7),
      supabaseService.from("venture_daily_tasks").select("tasks, task_date, phase").eq("venture_id", ventureId).gte("task_date", sevenDaysAgo).order("task_date", { ascending: false }).limit(7),
      supabaseService.from("founder_patterns").select("pattern_type, pattern_description, advisor_note, severity").eq("venture_id", ventureId).eq("status", "active"),
      supabaseService.from("founder_blueprints").select("ai_summary, focus_quarters").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseService.from("founder_interviews").select("context_summary").eq("user_id", user.id).eq("status", "completed").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch market validation separately (needs venture.idea_id)
    let marketValidations: any = null;
    if (venture.idea_id) {
      const { data } = await supabaseService.from("market_validations").select("validation_score, demand_signals, competitor_landscape, market_timing, validated_at").eq("idea_id", venture.idea_id).order("validated_at", { ascending: false }).limit(1).maybeSingle();
      marketValidations = data;
    }

    // Build interview context slice
    const rawInterviewContext = interviewData?.context_summary || {};
    const interviewContext = selectInterviewContext("adapt-execution-strategy", rawInterviewContext);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Compute Behavioral Signals ────────────────────────────
    const checkins = recentCheckins || [];
    const reflections = recentReflections || [];
    const taskRows = recentTaskRows || [];
    const patterns = activePatterns || [];

    // Completion analysis
    let totalTasks = 0, completedTasks = 0, skippedCategories: Record<string, number> = {};
    let completedCategories: Record<string, number> = {};
    
    for (const row of taskRows) {
      const tasks = Array.isArray(row.tasks) ? row.tasks : [];
      for (const t of tasks as any[]) {
        totalTasks++;
        if (t.completed) {
          completedTasks++;
          completedCategories[t.category] = (completedCategories[t.category] || 0) + 1;
        } else {
          skippedCategories[t.category] = (skippedCategories[t.category] || 0) + 1;
        }
      }
    }

    const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

    // Energy trend
    const energyLevels = reflections.map((r: any) => r.energy_level).filter((e: any) => e != null);
    const avgEnergy = energyLevels.length > 0 ? energyLevels.reduce((a: number, b: number) => a + b, 0) / energyLevels.length : 3;

    // Stress trend
    const stressLevels = reflections.map((r: any) => r.stress_level).filter((s: any) => s != null);
    const avgStress = stressLevels.length > 0 ? stressLevels.reduce((a: number, b: number) => a + b, 0) / stressLevels.length : 2;

    // Most skipped categories
    const topSkipped = Object.entries(skippedCategories).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cat]) => cat);
    // Most completed categories
    const topCompleted = Object.entries(completedCategories).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cat]) => cat);

    // Blockers mentioned
    const recentBlockers = reflections.filter((r: any) => r.blockers?.trim()).map((r: any) => r.blockers).slice(0, 3);

    // What they learned (for feedback loop)
    const recentLearnings = reflections.filter((r: any) => r.what_learned?.trim()).map((r: any) => r.what_learned).slice(0, 3);

    // ── Build Strategy with AI ────────────────────────────────
    const systemPrompt = `You are an execution strategy optimizer for founders. Based on behavioral data, produce a calibrated strategy for tomorrow's task generation.

You are NOT generating tasks. You are generating STRATEGY PARAMETERS that another AI will use to generate tasks.

Return STRICT JSON only:
{
  "primary_focus": "One sentence: what should tomorrow's tasks center around",
  "task_count_recommendation": 1-3,
  "max_task_minutes": 30-240,
  "prioritize_categories": ["category1"],
  "avoid_categories": ["category1"],
  "directives": ["Specific instruction for task generator"],
  "active_pattern_warnings": ["Warning from detected patterns"],
  "market_gaps": ["Gap from market validation to address"],
  "energy_calibration": "low|normal|high",
  "confidence": 0-100
}`;

    const userPrompt = `## BEHAVIORAL DATA (Last 7 Days)

Completion Rate: ${(completionRate * 100).toFixed(0)}%
Average Energy: ${avgEnergy.toFixed(1)}/5
Average Stress: ${avgStress.toFixed(1)}/5
Tasks Completed: ${completedTasks}/${totalTasks}

Most Completed Categories: ${topCompleted.join(", ") || "none"}
Most Skipped Categories: ${topSkipped.join(", ") || "none"}

Recent Check-in Pattern: ${checkins.map((c: any) => `${c.checkin_date}: ${c.completion_status}`).join(", ") || "no data"}

Recent Blockers: ${recentBlockers.join(" | ") || "none reported"}
Recent Learnings: ${recentLearnings.join(" | ") || "none recorded"}

## ACTIVE FOUNDER PATTERNS
${patterns.length > 0 ? patterns.map((p: any) => `- ${p.pattern_type} (${p.severity}): ${p.pattern_description}`).join("\n") : "No patterns detected"}

## MARKET VALIDATION DATA
${marketValidations ? `Score: ${(marketValidations as any).validation_score}/100, Market Timing: ${(marketValidations as any).market_timing}` : "No market validation run yet — consider recommending it"}

## VENTURE CONTEXT
Name: ${venture.name}
Success Metric: ${venture.success_metric || "not set"}
${blueprint?.ai_summary ? `Blueprint: ${blueprint.ai_summary}` : "No blueprint yet"}

## FOUNDER INTELLIGENCE
${interviewContext ? `Founder Summary: ${(interviewContext as any).founderSummary || "none"}\nConstraints: ${JSON.stringify((interviewContext as any).constraints || {})}\nEnergy Drainers: ${((interviewContext as any).energyDrainers || []).join(", ") || "none"}\nTransferable Patterns: ${JSON.stringify((interviewContext as any).transferablePatterns || [])}\nRouting Signal: ${JSON.stringify((interviewContext as any).routingSignal || null)}` : "No interview context available — strategy based on behavioral data only."}

Generate the execution strategy for tomorrow.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // Parse strategy
    let strategy: ExecutionStrategy = {
      generated_at: new Date().toISOString(),
      primary_focus: "Continue executing on current priorities",
      task_count_recommendation: 2,
      max_task_minutes: 120,
      prioritize_categories: [],
      avoid_categories: [],
      directives: [],
      active_pattern_warnings: [],
      market_gaps: [],
      energy_calibration: "normal",
      confidence: 50,
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        strategy = { ...strategy, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.warn("[adapt-execution-strategy] Parse fallback used");
    }

    strategy.generated_at = new Date().toISOString();

    // ── Persist Strategy ──────────────────────────────────────
    const { error: upsertError } = await supabaseService
      .from("execution_strategies")
      .upsert({
        user_id: user.id,
        venture_id: ventureId,
        strategy,
        behavioral_signals: {
          completion_rate: completionRate,
          avg_energy: avgEnergy,
          avg_stress: avgStress,
          top_completed: topCompleted,
          top_skipped: topSkipped,
          active_patterns: patterns.map((p: any) => p.pattern_type),
          has_market_validation: !!marketValidations,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "venture_id",
      });

    if (upsertError) {
      console.error("[adapt-execution-strategy] DB error:", upsertError);
      // Don't fail — return strategy anyway
    }

    console.log(`[adapt-execution-strategy] Strategy generated: focus="${strategy.primary_focus}", tasks=${strategy.task_count_recommendation}, energy=${strategy.energy_calibration}`);

    return new Response(
      JSON.stringify({ success: true, strategy }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[adapt-execution-strategy] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
