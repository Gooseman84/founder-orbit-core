import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_AI_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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

    const { ventureId } = await req.json();

    if (!ventureId) {
      return new Response(
        JSON.stringify({ error: "Missing ventureId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0];

    console.log("[generate-daily-execution-tasks] userId:", user.id, "ventureId:", ventureId, "date:", today);

    // Check if tasks already exist for today
    const { data: existingTasks } = await supabaseService
      .from("venture_daily_tasks")
      .select("*")
      .eq("venture_id", ventureId)
      .eq("task_date", today)
      .maybeSingle();

    if (existingTasks) {
      console.log("[generate-daily-execution-tasks] Tasks already exist for today");
      return new Response(
        JSON.stringify({ success: true, alreadyGenerated: true, tasks: existingTasks.tasks }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
    };

    console.log("[generate-daily-execution-tasks] Context:", JSON.stringify(context, null, 2));

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
            content: `You are an execution-focused task generator for founders. Generate 1-3 concrete, actionable tasks for TODAY only.

STRICT RULES:
- Tasks MUST be derived from the venture's blueprint, plan, or success metric
- NO brainstorming or ideation tasks
- NO future planning tasks
- Each task should be completable in one focused work session
- Tasks should directly contribute to the stated success metric

Return a JSON array of tasks with this structure:
[
  {
    "id": "uuid-string",
    "title": "Short action-oriented title",
    "description": "Specific what-to-do description",
    "category": "validation|build|marketing|ops",
    "estimatedMinutes": 30-120,
    "completed": false
  }
]`
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

Generate 1-3 focused execution tasks for today.`
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
    let tasks = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("[generate-daily-execution-tasks] Parse error:", parseError);
      tasks = [];
    }

    // Ensure tasks have valid IDs
    tasks = tasks.map((task: any, index: number) => ({
      ...task,
      id: task.id || crypto.randomUUID(),
      completed: false,
    }));

    console.log("[generate-daily-execution-tasks] Generated tasks:", tasks.length);

    // Save to database
    const { error: insertError } = await supabaseService
      .from("venture_daily_tasks")
      .insert({
        user_id: user.id,
        venture_id: ventureId,
        task_date: today,
        tasks: tasks,
      });

    if (insertError) {
      console.error("[generate-daily-execution-tasks] Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save tasks", code: "DB_WRITE_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, alreadyGenerated: false, tasks }),
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
