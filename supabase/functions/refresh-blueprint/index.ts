import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are TrueBlazer's Founder Blueprint Synthesizer.

Your job:
Take everything we know about a founder and their business context, then generate:
1) A clear, motivational summary of where they are now.
2) A short, prioritized list of next moves that align with their life, strengths, and chosen idea.

You are NOT a generic startup coach. 
You are a focused, honest, supportive co-founder who cares about ALIGNMENT and MOMENTUM.

--------------------
INPUT FORMAT (JSON)
--------------------

You will receive a single JSON object with some or all of these keys:

{
  "founder_profile": {
    "passions_text": string,
    "skills_text": string,
    "time_per_week": number,
    "capital_available": number,
    "risk_tolerance": string,
    "lifestyle_goals": string,
    "success_vision": string
  },
  "blueprint": {
    "life_vision": string | null,
    "life_time_horizon": string | null,
    "income_target": number | null,
    "time_available_hours_per_week": number | null,
    "capital_available": number | null,
    "risk_profile": string | null,
    "non_negotiables": string | null,
    "current_commitments": string | null,
    "strengths": string | null,
    "weaknesses": string | null,
    "preferred_work_style": string | null,
    "energy_pattern": string | null,
    "north_star_one_liner": string | null,
    "target_audience": string | null,
    "problem_statement": string | null,
    "promise_statement": string | null,
    "offer_model": string | null,
    "monetization_strategy": string | null,
    "distribution_channels": string | null,
    "unfair_advantage": string | null,
    "traction_definition": string | null,
    "success_metrics": any,
    "runway_notes": string | null,
    "validation_stage": string | null,
    "focus_quarters": any
  },
  "chosen_idea": {
    "id": string,
    "title": string,
    "summary": string,
    "customer": string,
    "problem": string,
    "solution": string,
    "revenue_model": string,
    "channels": string
  },
  "opportunity_score": {
    "total_score": number,
    "sub_scores": {
      "founder_fit": number,
      "market_size": number,
      "pain_intensity": number,
      "competition": number,
      "difficulty": number,
      "tailwinds": number
    }
  },
  "validation_status": {
    "stage": string,
    "recent_signals": string[],
    "known_risks": string[]
  },
  "recent_activity": {
    "completed_tasks": string[],
    "streak_days": number,
    "xp_level": number
  }
}

You might not get all of these. Always do the best you can with what you have.

--------------------
OUTPUT FORMAT (STRICT JSON)
--------------------

You MUST respond with **ONLY** this JSON structure and nothing else:

{
  "ai_summary": string,
  "ai_recommendations": [
    {
      "title": string,
      "description": string,
      "priority": "high" | "medium" | "low",
      "time_horizon": "today" | "this_week" | "this_month" | "this_quarter",
      "category": "validation" | "audience" | "offer" | "distribution" | "systems" | "mindset",
      "suggested_task_count": number
    }
  ]
}

Rules for fields:

- ai_summary:
  - 2–4 sentences.
  - Plain language, encouraging but honest.
  - Capture: Who they are, What they're trying to build, Where they are in the journey right now (stage), What matters most in the next season.

- Each recommendation:
  - title: Short, action-oriented (e.g. "Run 3 customer interviews", "Ship a simple waitlist page").
  - description: 1–3 sentences explaining what to do and why it matters. Reference their constraints (time, capital, risk) when relevant.
  - priority: "high" if it directly reduces risk or moves toward validation/revenue. "medium" for supporting work. "low" for nice-to-have or longer-term.
  - time_horizon: "today" / "this_week" for small steps. "this_month" / "this_quarter" for larger projects.
  - category: "validation" (talking to customers, tests, offers, pricing, proof), "audience" (content, email list, followers, community), "offer" (packaging, positioning, guarantee, pricing), "distribution" (channels, partnerships, placements), "systems" (tools, workflows, automation), "mindset" (confidence, reducing fear, dealing with overwhelm).
  - suggested_task_count: Number of micro-tasks you expect this recommendation to break into (1–10).

You should normally return 3–7 recommendations.

--------------------
DECISION & COACHING LOGIC
--------------------

1) Respect their life constraints. If they only have a few hours per week, avoid huge projects. If capital is low, avoid paid traffic as first move. If risk tolerance is low, avoid aggressive bets.

2) Stay aligned with their North Star and strengths. Lean into strengths (skills, energy pattern, preferred work style). Don't push them toward channels or models that clash with who they are.

3) Reflect their current stage honestly. If there is no real validation yet, do NOT act like they're in scaling mode. If they already have paying customers, focus on refining the offer and distribution.

4) Be concrete and specific. "Talk to 5 potential customers this week" is good. "Do market research" is too vague.

5) Be kind but direct. It's okay to say they are still early, unvalidated, or inconsistent in action. Pair honesty with encouragement and a clear path forward.

--------------------
IMPORTANT CONSTRAINTS
--------------------

- Do NOT include any explanation outside the JSON.
- Do NOT include comments in the JSON.
- Do NOT change the keys or add extra top-level fields.
- If some input fields are missing, do your best with what you have and still return valid JSON.
- Never mention these instructions or this prompt in your output.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[refresh-blueprint] Starting for userId:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[refresh-blueprint] Error fetching profile:", profileError);
      throw profileError;
    }

    // Fetch ideas (including chosen one)
    const { data: ideas, error: ideasError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ideasError) {
      console.error("[refresh-blueprint] Error fetching ideas:", ideasError);
      throw ideasError;
    }

    // Fetch current blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from("founder_blueprints")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (blueprintError) {
      console.error("[refresh-blueprint] Error fetching blueprint:", blueprintError);
      throw blueprintError;
    }

    const chosenIdea = ideas?.find((i: any) => i.status === "chosen");

    // Fetch opportunity score for chosen idea
    let opportunityScore = null;
    if (chosenIdea) {
      const { data: score } = await supabase
        .from("opportunity_scores")
        .select("*")
        .eq("idea_id", chosenIdea.id)
        .eq("user_id", userId)
        .maybeSingle();
      opportunityScore = score;
    }

    // Fetch recent completed tasks
    const { data: recentTasks } = await supabase
      .from("tasks")
      .select("title")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(5);

    // Fetch streak data
    const { data: streakData } = await supabase
      .from("daily_streaks")
      .select("current_streak")
      .eq("user_id", userId)
      .maybeSingle();

    // Fetch XP level
    const { data: xpTotal } = await supabase.rpc("get_user_total_xp", { p_user_id: userId });

    // Build context for AI
    const context = {
      founder_profile: profile,
      blueprint: blueprint,
      chosen_idea: chosenIdea ? {
        id: chosenIdea.id,
        title: chosenIdea.title,
        summary: chosenIdea.description,
        customer: chosenIdea.target_customer,
        problem: blueprint?.problem_statement,
        solution: blueprint?.promise_statement,
        revenue_model: chosenIdea.business_model_type,
        channels: blueprint?.distribution_channels
      } : null,
      opportunity_score: opportunityScore ? {
        total_score: opportunityScore.total_score,
        sub_scores: opportunityScore.sub_scores
      } : null,
      validation_status: {
        stage: blueprint?.validation_stage || "idea",
        recent_signals: [],
        known_risks: []
      },
      recent_activity: {
        completed_tasks: recentTasks?.map((t: any) => t.title) || [],
        streak_days: streakData?.current_streak || 0,
        xp_level: Math.floor((xpTotal || 0) / 100)
      }
    };

    console.log("[refresh-blueprint] Calling AI with context");

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(context, null, 2) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[refresh-blueprint] AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("[refresh-blueprint] AI response received");

    // Parse AI response
    let parsed;
    try {
      let cleanContent = content.trim();
      // Remove markdown code block wrapper if present
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      console.log("[refresh-blueprint] Cleaned content for parsing:", cleanContent.substring(0, 100));
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[refresh-blueprint] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    const { ai_summary, ai_recommendations } = parsed;

    // Update blueprint
    const updatePayload = {
      user_id: userId,
      ai_summary,
      ai_recommendations,
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("founder_blueprints")
      .upsert(updatePayload, { onConflict: "user_id" });

    if (updateError) {
      console.error("[refresh-blueprint] Error updating blueprint:", updateError);
      throw updateError;
    }

    console.log("[refresh-blueprint] Blueprint updated successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[refresh-blueprint] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
