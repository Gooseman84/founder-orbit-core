import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the TRUEBLAZER 30-DAY PLAN ENGINE, an elite startup execution strategist and AI cofounder.

Your role:
- Design a concrete, actionable 30-day execution plan for a specific founder and their chosen venture.
- Break the plan into 4 weekly sprints, each with a theme and 5-10 micro-tasks.
- Respect the founder's constraints: time, capital, risk tolerance, energy patterns, and lifestyle.

You will receive a JSON object with:
{
  "venture": { id, name, idea_id },
  "idea": { title, description, business_model_type, target_customer, ... } | null,
  "founderProfile": { hoursPerWeek, availableCapital, riskTolerance, skillSpikes, energyGivers, energyDrainers, ... },
  "startDate": "YYYY-MM-DD"
}

PLAN DESIGN PRINCIPLES:
1) Week 1: Foundation & Validation
   - Clarify the core offer and target customer
   - Quick validation signals (conversations, landing page, etc.)
   - Set up minimal systems

2) Week 2: Build & Test
   - Create MVP or first deliverable
   - Get real feedback from potential customers
   - Iterate on positioning

3) Week 3: Launch & Learn
   - Soft launch to early adopters
   - Gather testimonials and case studies
   - Refine go-to-market

4) Week 4: Scale & Systematize
   - Double down on what's working
   - Build repeatable processes
   - Plan next 30 days

TASK DESIGN RULES:
- Each task should be completable in 15-60 minutes
- Tasks must be specific and actionable (not vague like "think about marketing")
- Categories: validation, build, marketing, systems, ops, other
- Respect hoursPerWeek constraint: if founder has 10 hrs/week, plan ~2.5 hrs/week of tasks
- Respect energy patterns: avoid high-energy tasks if they drain the founder
- Front-load validation and quick wins

OUTPUT SCHEMA (strict JSON):
{
  "summary": "2-3 sentence overview of the 30-day plan and expected outcomes",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Short theme title (e.g., 'Foundation & Validation')",
      "summary": "1-2 sentences about this week's focus",
      "tasks": [
        {
          "title": "Clear, action-oriented task title",
          "description": "1-2 sentences explaining what to do and why",
          "weekNumber": 1,
          "suggestedDueOffsetDays": 3,
          "estimatedMinutes": 30,
          "category": "validation"
        }
      ]
    }
  ]
}

CRITICAL RULES:
- Output ONLY valid JSON, no markdown, no prose.
- Exactly 4 weeks in the weeks array.
- 5-10 tasks per week.
- suggestedDueOffsetDays is days from startDate (0-30).
- estimatedMinutes should be 15-60 for most tasks.
- category must be one of: validation, build, marketing, systems, ops, other.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body - userId comes from request body (JWT validated at gateway)
    const body = await req.json();
    const { ventureId, planType = "30_day", startDate, userId } = body;

    if (!userId) {
      console.error("generate-venture-plan: missing userId");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ventureId) {
      return new Response(
        JSON.stringify({ error: "ventureId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-venture-plan: generating for user", userId, "venture", ventureId);

    // Load venture and verify ownership
    const { data: venture, error: ventureError } = await supabase
      .from("ventures")
      .select("*")
      .eq("id", ventureId)
      .eq("user_id", userId)
      .single();

    if (ventureError || !venture) {
      console.error("generate-venture-plan: venture not found", ventureError);
      return new Response(
        JSON.stringify({ error: "Venture not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load linked idea if exists
    let idea = null;
    if (venture.idea_id) {
      const { data: ideaData } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", venture.idea_id)
        .single();
      idea = ideaData;
    }

    // Load founder profile
    const { data: profileRow, error: profileError } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (profileError || !profileRow?.profile) {
      console.error("generate-venture-plan: founder profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate start date (default: today)
    const planStartDate = startDate || new Date().toISOString().split("T")[0];
    const endDateObj = new Date(planStartDate);
    endDateObj.setDate(endDateObj.getDate() + 30);
    const planEndDate = endDateObj.toISOString().split("T")[0];

    // Build AI payload
    const payload = {
      venture: {
        id: venture.id,
        name: venture.name,
        idea_id: venture.idea_id,
      },
      idea,
      founderProfile: profileRow.profile,
      startDate: planStartDate,
    };

    console.log("generate-venture-plan: calling AI with payload", JSON.stringify(payload).slice(0, 500));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("generate-venture-plan: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("generate-venture-plan: AI gateway error", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!rawContent) {
      console.error("generate-venture-plan: missing content in AI response", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let planData: {
      summary: string;
      startDate: string;
      endDate: string;
      weeks: Array<{
        weekNumber: number;
        theme: string;
        summary: string;
        tasks: Array<{
          title: string;
          description: string;
          weekNumber: number;
          suggestedDueOffsetDays: number | null;
          estimatedMinutes: number | null;
          category: string;
        }>;
      }>;
    };

    try {
      planData = JSON.parse(rawContent);
    } catch (e) {
      console.warn("generate-venture-plan: direct JSON parse failed, attempting extraction", e);
      const firstBrace = rawContent.indexOf("{");
      const lastBrace = rawContent.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        console.error("generate-venture-plan: no JSON object found", rawContent);
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const sliced = rawContent.slice(firstBrace, lastBrace + 1);
      planData = JSON.parse(sliced);
    }

    // Validate basic structure
    if (!planData.weeks || !Array.isArray(planData.weeks)) {
      console.error("generate-venture-plan: invalid plan structure", planData);
      return new Response(
        JSON.stringify({ error: "AI did not return valid plan structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert venture_plan row
    const { data: planRow, error: planInsertError } = await supabase
      .from("venture_plans")
      .insert({
        user_id: userId,
        venture_id: venture.id,
        plan_type: planType,
        start_date: planData.startDate || planStartDate,
        end_date: planData.endDate || planEndDate,
        summary: planData.summary || null,
        ai_raw: planData,
      })
      .select()
      .single();

    if (planInsertError) {
      console.error("generate-venture-plan: failed to insert plan", planInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert tasks
    const tasksToInsert: Array<{
      user_id: string;
      venture_id: string;
      title: string;
      description: string | null;
      category: string | null;
      estimated_minutes: number | null;
      xp_reward: number;
      status: string;
      week_number: number;
      source: string;
    }> = [];

    for (const week of planData.weeks) {
      for (const task of week.tasks || []) {
        tasksToInsert.push({
          user_id: userId,
          venture_id: venture.id,
          title: task.title,
          description: task.description || null,
          category: task.category || "other",
          estimated_minutes: task.estimatedMinutes || null,
          xp_reward: 15, // Default XP for 30-day plan tasks
          status: "pending",
          week_number: task.weekNumber || week.weekNumber,
          source: "30_day_plan",
        });
      }
    }

    const tasksCreated: string[] = [];
    if (tasksToInsert.length > 0) {
      const { data: insertedTasks, error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select("id");

      if (tasksError) {
        console.error("generate-venture-plan: failed to insert tasks", tasksError);
        // Don't fail the whole request, just log it
      } else if (insertedTasks) {
        for (const t of insertedTasks) {
          tasksCreated.push(t.id);
        }
      }
    }

    console.log("generate-venture-plan: success", {
      planId: planRow.id,
      tasksCreated: tasksCreated.length,
    });

    return new Response(
      JSON.stringify({
        plan: planRow,
        tasksCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-venture-plan: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
