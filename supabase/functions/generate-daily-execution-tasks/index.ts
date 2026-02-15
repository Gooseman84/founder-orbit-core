import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_AI_KEY = Deno.env.get("LOVABLE_API_KEY")!;

// Max append calls per day per venture to prevent abuse
const MAX_APPEND_COUNT = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { ventureId, append = false } = body;

    if (!ventureId) {
      return new Response(
        JSON.stringify({ error: "Missing ventureId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0];

    console.log("[generate-daily-execution-tasks] userId:", user.id, "ventureId:", ventureId, "date:", today, "append:", append);

    // Check if tasks already exist for today
    const { data: existingTasksRow } = await supabaseService
      .from("venture_daily_tasks")
      .select("*")
      .eq("venture_id", ventureId)
      .eq("task_date", today)
      .maybeSingle();

    // If tasks exist and NOT in append mode, return existing
    if (existingTasksRow && !append) {
      console.log("[generate-daily-execution-tasks] Tasks already exist for today, returning existing");
      return new Response(
        JSON.stringify({ success: true, alreadyGenerated: true, tasks: existingTasksRow.tasks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If append mode but no existing tasks, treat as initial generation
    if (append && !existingTasksRow) {
      console.log("[generate-daily-execution-tasks] Append mode but no existing tasks, switching to initial generation");
    }

    // Check append rate limit if appending
    if (append && existingTasksRow) {
      const currentAppendCount = existingTasksRow.append_count || 0;
      if (currentAppendCount >= MAX_APPEND_COUNT) {
        console.log("[generate-daily-execution-tasks] Append limit reached:", currentAppendCount);
        return new Response(
          JSON.stringify({ 
            error: "You've generated enough tasks for today. Execute.", 
            code: "APPEND_LIMIT_REACHED",
            appendCount: currentAppendCount,
            maxAppendCount: MAX_APPEND_COUNT
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch venture with validation
    const { data: venture, error: ventureError } = await supabaseService
      .from("ventures")
      .select("*")
      .eq("id", ventureId)
      .eq("user_id", user.id)
      .single();

    if (ventureError || !venture) {
      return new Response(
        JSON.stringify({ error: "Venture not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (venture.venture_state !== "executing") {
      return new Response(
        JSON.stringify({ error: "Venture is not in executing state", code: "INVALID_STATE" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch blueprint
    const { data: blueprint } = await supabaseService
      .from("founder_blueprints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Extract decision points from blueprint recommendations
    let blueprintDecisionPoints = "";
    if (blueprint?.ai_recommendations) {
      const recs = Array.isArray(blueprint.ai_recommendations) 
        ? blueprint.ai_recommendations 
        : [];
      const decisionPoints = recs.filter((r: any) => 
        r.title && r.title.includes("Decision Point")
      );
      if (decisionPoints.length > 0) {
        blueprintDecisionPoints = decisionPoints
          .map((dp: any) => `- ${dp.title}: ${dp.description}`)
          .join("\n");
      }
    }

    // Fetch venture plan
    const { data: venturePlan } = await supabaseService
      .from("venture_plans")
      .select("*")
      .eq("venture_id", ventureId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch idea if linked
    let idea = null;
    if (venture.idea_id) {
      const { data } = await supabaseService
        .from("ideas")
        .select("*")
        .eq("id", venture.idea_id)
        .single();
      idea = data;
    }

    // --- NEW: Fetch recent daily reflections ---
    const { data: recentReflections } = await supabaseService
      .from("daily_reflections")
      .select("reflection_date, energy_level, stress_level, mood_tags, what_did, blockers, top_priority, ai_summary")
      .eq("user_id", user.id)
      .order("reflection_date", { ascending: false })
      .limit(3);

    // --- NEW: Fetch recent venture check-ins ---
    const { data: recentCheckins } = await supabaseService
      .from("venture_daily_checkins")
      .select("checkin_date, completion_status, explanation, reflection")
      .eq("venture_id", ventureId)
      .order("checkin_date", { ascending: false })
      .limit(3);

    // --- NEW: Fetch recent workspace documents for this venture (last 7 days) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentWorkspaceDocs } = await supabaseService
      .from("workspace_documents")
      .select("id, title, doc_type, updated_at, source_type, linked_task_id")
      .eq("user_id", user.id)
      .eq("venture_id", ventureId)
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: false })
      .limit(10);

    // --- NEW: Build founder state context ---
    const founderState = {
      latestEnergy: recentReflections?.[0]?.energy_level ?? null,
      latestStress: recentReflections?.[0]?.stress_level ?? null,
      latestBlockers: recentReflections?.[0]?.blockers ?? null,
      recentMoods: recentReflections?.[0]?.mood_tags ?? [],
      topPriority: recentReflections?.[0]?.top_priority ?? null,
      yesterdayCompletion: recentCheckins?.[0]?.completion_status ?? null,
      yesterdayExplanation: recentCheckins?.[0]?.explanation ?? null,
    };

    // --- NEW: Build workspace context ---
    const workspaceContext = recentWorkspaceDocs?.map(d => ({
      title: d.title,
      docType: d.doc_type,
      updatedAt: d.updated_at,
      sourceType: d.source_type,
    })) ?? [];

    const workspaceDocsFormatted = workspaceContext.length > 0
      ? workspaceContext.map(d => 
          `- "${d.title}" (${d.docType || 'document'}, last updated ${new Date(d.updatedAt).toLocaleDateString()})`
        ).join('\n')
      : 'No recent workspace activity';

    // Get existing tasks for context in append mode
    const existingTasks = existingTasksRow?.tasks || [];
    const existingTaskTitles = Array.isArray(existingTasks) 
      ? existingTasks.map((t: any) => t.title).join(", ")
      : "";

    // Build context for AI
    const context = {
      ventureName: venture.name,
      successMetric: venture.success_metric,
      commitmentDays: venture.commitment_window_days,
      dayInCommitment: calculateDayInCommitment(venture.commitment_start_at),
      blueprintSummary: blueprint?.ai_summary || null,
      planSummary: venturePlan?.summary || null,
      ideaTitle: idea?.title || null,
      ideaDescription: idea?.description || null,
      blueprintDecisionPoints,
    };

    console.log("[generate-daily-execution-tasks] Context:", JSON.stringify(context, null, 2));
    console.log("[generate-daily-execution-tasks] Founder state:", JSON.stringify(founderState, null, 2));
    console.log("[generate-daily-execution-tasks] Workspace docs count:", workspaceContext.length);

    // Adjust task count based on append mode
    const taskCount = append ? "1-2" : "1-3";
    const appendContext = append 
      ? `\n\nIMPORTANT: The user has already completed these tasks today: ${existingTaskTitles}\nGenerate DIFFERENT tasks that build on or complement what they've done. Do NOT repeat similar tasks.`
      : "";

    // --- ENHANCED: System prompt with smart calibration + workspace awareness ---
    const systemPrompt = `You are an execution-focused task generator for founders. Generate ${taskCount} concrete, actionable tasks for TODAY only.

FOUNDER STATE (use to calibrate strategically):
- Energy Level: ${founderState.latestEnergy ?? 'unknown'}/5
- Stress Level: ${founderState.latestStress ?? 'unknown'}/5  
- Yesterday's Completion: ${founderState.yesterdayCompletion ?? 'unknown'}
- Yesterday's Explanation: ${founderState.yesterdayExplanation ?? 'none'}
- Current Blockers: ${founderState.latestBlockers ?? 'none stated'}
- Top Priority: ${founderState.topPriority ?? 'not specified'}

WORKSPACE CONTEXT (use to avoid duplicate work):
Recent Workspace Documents:
${workspaceDocsFormatted}

SMART CALIBRATION (strategic, not just "easier tasks"):

1. LOW ENERGY + YESTERDAY INCOMPLETE:
   - Suggest a simplified, smaller-scoped version of yesterday's unfinished task
   - Add one quick-win task (5-10 min) for momentum
   - Avoid introducing new complex work

2. HIGH STRESS (> 3):
   - Include one "organizational" task (cleanup, documentation, planning review)
   - Avoid tasks with external dependencies or waiting
   - Focus on tasks the founder fully controls

3. BLOCKERS MENTIONED:
   - First task MUST directly address the stated blocker
   - Keep it small and specific (unblock, not solve everything)
   - Example: "Schedule 15-min call with X to clarify Y" not "Resolve partnership issues"

4. HIGH ENERGY + YESTERDAY COMPLETE:
   - Push slightly harder with a stretch goal
   - Include one task that advances long-term positioning
   - Can suggest more ambitious scope

5. DEFAULT (no data or neutral state):
   - Balance between validation, build, and marketing
   - One quick-win, one medium task, one slightly challenging task

WORKSPACE AWARENESS RULES:
- If a workspace doc exists for yesterday's task, reference it in today's task description
  Example: "Continue work on 'Investor Email Draft v2' - finalize and send"
- Do NOT suggest tasks that duplicate recent workspace activity
  Example: If "Landing Page Copy" doc exists, don't suggest "Write landing page copy"
- Use workspace doc titles as context clues for what's already in progress
- Suggest tasks that BUILD ON existing workspace work, not restart it

WHY NOW CONTEXT:
Every task MUST include a "why_now" field that explains why this specific task matters TODAY given where the founder is in their journey.

Good why_now examples:
- "Day 3 of your commitment. You defined your target customer yesterday — today's interview script builds directly on that definition."
- "Your last check-in mentioned a blocker with customer outreach. This task directly addresses that blocker with a specific, small action."
- "You are approaching your Day 10 decision point. You need 2 more customer conversations before you can make a confident proceed/pivot decision."

Bad why_now examples:
- "This is important for your business." (generic)
- "You should do this soon." (no reasoning)
- "This task will help you succeed." (empty motivation)

STRICT RULES:
- Tasks MUST be derived from the venture's blueprint, plan, or success metric
- NO brainstorming or ideation tasks
- NO future planning tasks
- NO pivoting or "explore new directions" tasks
- Each task should be completable in one focused work session
- Tasks should directly contribute to the stated success metric

Return a JSON array of tasks with this structure:
[
  {
    "id": "uuid-string",
    "title": "Short action-oriented title",
    "description": "Specific what-to-do description. Reference existing workspace docs if relevant.",
    "why_now": "1-2 sentences: why this task matters today specifically, what it depends on, and what it enables next. Never generic — always reference the venture's current state, day in commitment, or recent progress.",
    "category": "validation|build|marketing|ops",
    "estimatedMinutes": 30-120,
    "completed": false
  }
]`;

    // Call Lovable AI to generate tasks
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Generate today's execution tasks for this venture:

Venture: ${context.ventureName}
Success Metric: ${context.successMetric}
Day ${context.dayInCommitment} of ${context.commitmentDays}-day commitment

${context.blueprintSummary ? `Blueprint Summary: ${context.blueprintSummary}` : ""}
${context.planSummary ? `Plan Summary: ${context.planSummary}` : ""}
${context.ideaTitle ? `Idea: ${context.ideaTitle} - ${context.ideaDescription}` : ""}
${context.blueprintDecisionPoints ? `
UPCOMING DECISION POINTS:
${context.blueprintDecisionPoints}
If the founder is approaching a decision point (within 3 days), generate at least one task that gathers the data needed to make that decision.
` : ""}
Generate ${taskCount} focused execution tasks for today.${appendContext}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted", code: "PAYMENT_REQUIRED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse tasks from AI response
    let newTasks = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        newTasks = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("[generate-daily-execution-tasks] Parse error:", parseError);
      newTasks = [];
    }

    // Ensure tasks have valid IDs
    newTasks = newTasks.map((task: any) => ({
      ...task,
      id: task.id || crypto.randomUUID(),
      completed: false,
    }));

    console.log("[generate-daily-execution-tasks] Generated tasks:", newTasks.length, "append:", append);

    let finalTasks;
    let dbError;

    if (append && existingTasksRow) {
      // Append mode: merge new tasks with existing
      finalTasks = [...(existingTasks as any[]), ...newTasks];
      const newAppendCount = (existingTasksRow.append_count || 0) + 1;
      
      const { error } = await supabaseService
        .from("venture_daily_tasks")
        .update({ 
          tasks: finalTasks,
          append_count: newAppendCount,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingTasksRow.id);
      
      dbError = error;
      console.log("[generate-daily-execution-tasks] Appended tasks, new append_count:", newAppendCount);
    } else {
      // Initial generation
      finalTasks = newTasks;
      const { error } = await supabaseService
        .from("venture_daily_tasks")
        .insert({
          user_id: user.id,
          venture_id: ventureId,
          task_date: today,
          tasks: finalTasks,
          append_count: 0,
        });
      dbError = error;
    }

    if (dbError) {
      console.error("[generate-daily-execution-tasks] DB error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save tasks", code: "DB_WRITE_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alreadyGenerated: false, 
        tasks: finalTasks,
        appended: append && !!existingTasksRow,
        newTasksCount: newTasks.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-daily-execution-tasks] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calculateDayInCommitment(startAt: string | null): number {
  if (!startAt) return 1;
  const start = new Date(startAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
