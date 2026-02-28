// supabase/functions/generate-daily-execution-tasks/index.ts
// Phase-aware daily task generation with framework injection and stagnation detection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { fetchFrameworks } from "../_shared/fetchFrameworks.ts";
import { selectInterviewContext } from "../_shared/selectInterviewContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Phase Detection ──────────────────────────────────────────
function detectExecutionPhase(dayInCommitment: number, totalDays: number): "validate" | "build" | "launch" {
  const pct = dayInCommitment / totalDays;
  if (pct <= 0.23) return "validate";   // Days 1–7 of a 30-day window
  if (pct <= 0.70) return "build";      // Days 8–21
  return "launch";                       // Days 22–30
}

// ── Stagnation Detection ─────────────────────────────────────
function detectStagnation(recentCheckins: any[]): boolean {
  if (!recentCheckins || recentCheckins.length < 3) return false;
  const last3 = recentCheckins.slice(0, 3);
  const stagnantStatuses = ["partial", "no"];
  return last3.every((c: any) => stagnantStatuses.includes(c.completion_status));
}

// ── Day in Commitment ─────────────────────────────────────────
function calculateDayInCommitment(startAt: string | null): number {
  if (!startAt) return 1;
  const start = new Date(startAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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

    const body = await req.json();
    const { ventureId, append = false } = body;

    if (!ventureId) {
      return new Response(JSON.stringify({ error: "ventureId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Fetch Core Data ───────────────────────────────────────
    const [
      { data: venture },
      { data: blueprint },
      { data: venturePlan },
      { data: existingTasksRow },
      { data: recentReflections },
      { data: recentCheckins },
      { data: recentWorkspaceDocs },
      { data: interviewData },
    ] = await Promise.all([
      supabaseService.from("ventures").select("*").eq("id", ventureId).single(),
      supabaseService.from("founder_blueprints").select("ai_summary, ai_recommendations").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseService.from("venture_plans").select("summary").eq("venture_id", ventureId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabaseService.from("venture_daily_tasks").select("*").eq("venture_id", ventureId).eq("task_date", today).maybeSingle(),
      supabaseService.from("daily_reflections").select("reflection_date, energy_level, stress_level, mood_tags, what_did, blockers, top_priority, ai_summary").eq("user_id", user.id).order("reflection_date", { ascending: false }).limit(7),
      supabaseService.from("venture_daily_checkins").select("checkin_date, completion_status, explanation, reflection").eq("venture_id", ventureId).order("checkin_date", { ascending: false }).limit(7),
      supabaseService.from("workspace_documents").select("id, title, doc_type, updated_at, source_type").eq("user_id", user.id).eq("venture_id", ventureId).gte("updated_at", new Date(Date.now() - 7 * 86400000).toISOString()).order("updated_at", { ascending: false }).limit(10),
      supabaseService.from("founder_interviews").select("context_summary").eq("user_id", user.id).eq("status", "completed").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Return Early if Already Generated (non-append) ───────
    if (!append && existingTasksRow) {
      return new Response(
        JSON.stringify({ success: true, alreadyGenerated: true, tasks: existingTasksRow.tasks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Phase Detection ───────────────────────────────────────
    const dayInCommitment = calculateDayInCommitment(venture.commitment_start_at);
    const totalDays = venture.commitment_window_days || 30;
    const currentPhase = detectExecutionPhase(dayInCommitment, totalDays);
    const isStagnating = detectStagnation(recentCheckins || []);

    // ── Compute Founder Moment State ──────────────────────────
    let founderMomentState = "BUILDING_MOMENTUM";
    let mavrikIntent = "";
    try {
      const momentResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/compute-founder-moment-state`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ventureId }),
        }
      );
      if (momentResponse.ok) {
        const momentData = await momentResponse.json();
        founderMomentState = momentData.state || "BUILDING_MOMENTUM";
        mavrikIntent = momentData.mavrikIntent || "";
        console.log(`[generate-daily-execution-tasks] MomentState: ${founderMomentState}`);
      } else {
        console.warn(`[generate-daily-execution-tasks] Moment state call failed: ${momentResponse.status}`);
      }
    } catch (momentError) {
      console.warn("[generate-daily-execution-tasks] Moment state error (defaulting):", momentError);
    }

    console.log(`[generate-daily-execution-tasks] Phase: ${currentPhase}, Day: ${dayInCommitment}/${totalDays}, Stagnating: ${isStagnating}`);

    // ── Fetch Idea + Source Meta ──────────────────────────────
    let idea: any = null;
    let ideaSourceMeta: any = null;
    if (venture.idea_id) {
      const { data: fullIdea } = await supabaseService.from("ideas").select("*").eq("id", venture.idea_id).single();
      idea = fullIdea;
      ideaSourceMeta = fullIdea?.source_meta ?? null;
    }

    // ── Fetch Framework Rows ──────────────────────────────────
    const businessModel = idea?.business_model_type || "all";

    const [phaseFramework, modelOverlay, stagnationFramework] = await Promise.all([
      // Core phase playbook (validate / build / launch)
      fetchFrameworks(supabaseService, {
        functions: ["generate-daily-execution-tasks"],
        stage: currentPhase,
        injectionRole: "core",
        maxTokens: 600,
        limit: 1,
      }),
      // Business model overlay (SaaS / services / marketplace / content)
      fetchFrameworks(supabaseService, {
        functions: ["generate-daily-execution-tasks"],
        businessModel,
        stage: currentPhase,
        injectionRole: "conditional",
        maxTokens: 500,
        limit: 1,
      }),
      // Stagnation intervention (only fetched if needed)
      isStagnating
        ? fetchFrameworks(supabaseService, {
            functions: ["generate-daily-execution-tasks"],
            injectionRole: "conditional",
            maxTokens: 400,
            limit: 1,
          })
        : Promise.resolve(""),
    ]);

    console.log(`[generate-daily-execution-tasks] Frameworks loaded — phase: ${phaseFramework.length}c, model: ${modelOverlay.length}c, stagnation: ${stagnationFramework.length}c`);

    // ── Build Context Objects ─────────────────────────────────
    const rawInterviewContext = interviewData?.context_summary as any ?? null;
    const interviewContext = selectInterviewContext("generate-daily-execution-tasks", rawInterviewContext);

    const founderState = {
      latestEnergy: recentReflections?.[0]?.energy_level ?? null,
      latestStress: recentReflections?.[0]?.stress_level ?? null,
      latestBlockers: recentReflections?.[0]?.blockers ?? null,
      recentMoods: recentReflections?.[0]?.mood_tags ?? [],
      topPriority: recentReflections?.[0]?.top_priority ?? null,
      yesterdayCompletion: recentCheckins?.[0]?.completion_status ?? null,
      yesterdayExplanation: recentCheckins?.[0]?.explanation ?? null,
      last7DaysPattern: recentCheckins?.map((c: any) => c.completion_status).join(", ") ?? "no data",
    };

    const workspaceDocsFormatted = recentWorkspaceDocs?.length
      ? recentWorkspaceDocs.map((d: any) =>
          `- "${d.title}" (${d.doc_type || "document"}, updated ${new Date(d.updated_at).toLocaleDateString()})`
        ).join("\n")
      : "No recent workspace activity";

    // Blueprint decision points
    let blueprintDecisionPoints = "";
    if (blueprint?.ai_recommendations) {
      const recs = Array.isArray(blueprint.ai_recommendations) ? blueprint.ai_recommendations : [];
      const dps = recs.filter((r: any) => r.title?.includes("Decision Point"));
      if (dps.length > 0) {
        blueprintDecisionPoints = dps.map((dp: any) => `- ${dp.title}: ${dp.description}`).join("\n");
      }
    }

    const existingTasks = existingTasksRow?.tasks || [];
    const existingTaskTitles = Array.isArray(existingTasks)
      ? existingTasks.map((t: any) => t.title).join(", ")
      : "";

    // ── Build System Prompt ───────────────────────────────────
    const taskCount = append ? "1-2" : "1-3";
    const appendContext = append
      ? `\n\nIMPORTANT: The user already completed these tasks today: ${existingTaskTitles}. Generate DIFFERENT tasks that build on them. Do NOT repeat.`
      : "";

    const frameworksBlock = [phaseFramework, modelOverlay, stagnationFramework]
      .filter(Boolean)
      .join("\n\n---\n\n");

    const systemPrompt = `You are Mavrik, an execution-focused co-pilot for founders. Generate ${taskCount} concrete, actionable tasks for TODAY only.

${frameworksBlock ? `## EXECUTION PLAYBOOKS\nUse these frameworks to determine what kinds of tasks are appropriate right now:\n\n${frameworksBlock}\n\n---` : ""}

## FOUNDER STATE
- Energy Level: ${founderState.latestEnergy ?? "unknown"}/5
- Stress Level: ${founderState.latestStress ?? "unknown"}/5
- Yesterday's Completion: ${founderState.yesterdayCompletion ?? "unknown"}
- Yesterday's Explanation: ${founderState.yesterdayExplanation ?? "none"}
- Current Blockers: ${founderState.latestBlockers ?? "none stated"}
- Top Priority: ${founderState.topPriority ?? "not specified"}
- Last 7 Days Pattern: ${founderState.last7DaysPattern}

## FOUNDER INTELLIGENCE (from Mavrik interview)
${interviewContext ? `
- Insider Knowledge: ${JSON.stringify(interviewContext.extractedInsights?.insiderKnowledge || [])}
- Customer Intimacy: ${JSON.stringify(interviewContext.extractedInsights?.customerIntimacy || [])}
- Hard No Filters: ${JSON.stringify(interviewContext.extractedInsights?.hardNoFilters || [])}
- Founder Summary: ${interviewContext.founderSummary || "N/A"}
${interviewContext.ventureIntelligence?.verticalIdentified ? `- Vertical: ${interviewContext.ventureIntelligence.verticalIdentified}` : ""}
${interviewContext.ventureIntelligence?.industryAccess ? `- Industry Access: ${interviewContext.ventureIntelligence.industryAccess}` : ""}
` : "No interview context available"}

${ideaSourceMeta ? `## IDEA CONTEXT
- Why This Founder: ${ideaSourceMeta.whyThisFounder || ideaSourceMeta.why_it_fits || "N/A"}
- Key Risk: ${ideaSourceMeta.keyRisk || "N/A"}
- First Step: ${ideaSourceMeta.firstStep || ideaSourceMeta.first_three_steps?.[0] || "N/A"}
${ideaSourceMeta.is_pattern_transfer ? `- Cross-Industry Transfer: from ${ideaSourceMeta.transfer_from} to ${ideaSourceMeta.transfer_to}` : ""}
` : ""}

## WORKSPACE CONTEXT (avoid duplicating existing work)
${workspaceDocsFormatted}

## SMART CALIBRATION RULES
Apply these on top of the phase playbook:

1. LOW ENERGY (≤2) OR YESTERDAY INCOMPLETE:
   - Scope task to a simplified version of what was missed
   - Add one quick-win (5-10 min) for momentum before anything harder

2. HIGH STRESS (>3):
   - Include one organizational/cleanup task the founder fully controls
   - Avoid tasks with external dependencies or waiting

3. ACTIVE BLOCKER:
   - First task MUST directly address the stated blocker
   - Small and specific: "Schedule 15-min call with X" not "Resolve partnership issues"

4. HIGH ENERGY + YESTERDAY COMPLETE:
   - Push harder with a stretch goal
   - Can expand scope slightly

5. STAGNATION (3+ days of partial/incomplete):
   - Scope to smallest possible version of the most important thing
   - ONE task only if necessary

## OUTPUT FORMAT
Return a JSON array only. No preamble. No markdown fences.

[
  {
    "id": "uuid",
    "title": "Short, action-verb title (max 8 words)",
    "description": "2-3 sentences. Specific instructions. Name real tools, platforms, or people types.",
    "why_now": "1-2 sentences: why this task matters today specifically given the venture's current state and phase.",
    "category": "validation|build|marketing|ops",
    "estimatedMinutes": 30,
    "completed": false
  }
]

${mavrikIntent ? `## MAVRIK INTENT\n${mavrikIntent}\n\nFounder Moment State: ${founderMomentState}\n` : ""}
## OUTPUT CONTRACT

Each task object must contain:

{
  "id": "uuid-style string",
  "title": "verb-first, specific action — max 10 words",
  "description": "exactly 2 sentences: (1) what to do, (2) why it matters today",
  "estimatedMinutes": number between 30 and 240,
  "category": "validation" | "build" | "distribute" | "admin" | "reflect",
  "successCriteria": "one binary sentence — either you did it or you didn't",
  "completed": false
}

Tasks must be calibrated to founderMomentState if provided:
- STUCK: 1 task only, ultra-specific, removes exactly one blocker
- BUILDING_MOMENTUM: 2-3 tasks, push further on what's working
- SCOPE_CREEPING: 1-2 tasks, all from existing plan scope, nothing new
- EXECUTION_PARALYSIS: 1 task, smallest possible action, under 60 minutes
- APPROACHING_LAUNCH: 3 tasks, all launch-critical, no new features

## ANTI-PATTERNS

- Do NOT generate tasks that repeat what the founder completed yesterday (checkin history is provided)
- Do NOT generate "research" tasks unless the founder is in the Validate phase
- Do NOT generate tasks that require the founder to be online during a specific time window unless they have shared their schedule${appendContext}`;

    // ── Call AI ───────────────────────────────────────────────
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
          {
            role: "user",
            content: `Generate today's execution tasks.

Venture: ${venture.name}
Success Metric: ${venture.success_metric}
Phase: ${currentPhase.toUpperCase()} — Day ${dayInCommitment} of ${totalDays}
Founder Moment State: ${founderMomentState}
${venture.success_metric ? `Goal: ${venture.success_metric}` : ""}
${blueprint?.ai_summary ? `Blueprint Summary: ${blueprint.ai_summary}` : ""}
${venturePlan?.summary ? `Plan Summary: ${venturePlan.summary}` : ""}
${idea ? `Idea: ${idea.title} — ${idea.description}` : ""}
${blueprintDecisionPoints ? `\nUpcoming Decision Points:\n${blueprintDecisionPoints}\nIf within 3 days of a decision point, generate at least one task that gathers the needed data.` : ""}

Generate ${taskCount} focused execution tasks for today.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited", code: "RATE_LIMITED" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted", code: "PAYMENT_REQUIRED" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI request failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // ── Parse Tasks ───────────────────────────────────────────
    let newTasks: any[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) newTasks = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[generate-daily-execution-tasks] Parse error:", parseError);
    }

    newTasks = newTasks.map((task: any) => ({
      ...task,
      id: task.id || crypto.randomUUID(),
      completed: false,
      phase: currentPhase,   // Stamp phase onto each task for future analytics
    }));

    console.log(`[generate-daily-execution-tasks] Generated ${newTasks.length} tasks for phase: ${currentPhase}`);

    // ── Persist to DB ─────────────────────────────────────────
    let finalTasks: any[];
    let dbError: any;

    if (append && existingTasksRow) {
      finalTasks = [...(existingTasks as any[]), ...newTasks];
      const { error } = await supabaseService
        .from("venture_daily_tasks")
        .update({
          tasks: finalTasks,
          append_count: (existingTasksRow.append_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTasksRow.id);
      dbError = error;
    } else {
      finalTasks = newTasks;
      const { error } = await supabaseService.from("venture_daily_tasks").insert({
        user_id: user.id,
        venture_id: ventureId,
        task_date: today,
        tasks: finalTasks,
        append_count: 0,
        phase: currentPhase,   // Also stamp phase on the row
      });
      dbError = error;
    }

    if (dbError) {
      console.error("[generate-daily-execution-tasks] DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to save tasks", code: "DB_WRITE_FAILED" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alreadyGenerated: false,
        tasks: finalTasks,
        phase: currentPhase,
        founderMomentState,
        appended: append && !!existingTasksRow,
        newTasksCount: newTasks.length,
        isStagnating,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-daily-execution-tasks] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
