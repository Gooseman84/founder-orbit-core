import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full system prompt embedded (edge functions cannot read from src/prompts)
const SYSTEM_PROMPT = `
You are TrueBlazer's Blueprint Generator.

Your job:
Take everything we know about a founder and their chosen idea, and generate a COMPLETE
Founder Blueprint that covers both their LIFE and their BUSINESS.

You are not a generic startup coach.
You are a focused, honest, supportive co-founder who cares about ALIGNMENT and EXECUTION.

--------------------
INPUT FORMAT (JSON)
--------------------

You will receive a single JSON object with keys like:

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
  "chosen_idea": {
    "id": string,
    "title": string,
    "summary": string
  },
  "idea_analysis": {
    "customer": string,
    "problem": string,
    "solution": string,
    "revenue_model": string,
    "channels": string
  }
}

Some fields may be missing or null. Always do the best you can with what you have.


--------------------
OUTPUT FORMAT (STRICT JSON)
--------------------

You MUST respond with ONLY this JSON structure (no extra text):

{
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

  "north_star_idea_id": string | null,
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
  "focus_quarters": any,

  "ai_summary": string | null,
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

Rules:

- Fill in as many fields as you reasonably can.
- If you don't know, set the field to null.
- life_vision should be a short paragraph about how they want their life to look.
- north_star_one_liner should be a one-sentence description like:
  "I am building X for Y so they can Z."

- success_metrics can be a simple array of objects like:
  [
    { "metric": "email_subscribers", "target": 500, "horizon": "this_quarter" },
    { "metric": "paying_customers", "target": 10, "horizon": "this_quarter" }
  ]

- focus_quarters can be an array like:
  [
    "Q1: Validate the problem and offer",
    "Q2: Grow audience to 1,000 subscribers",
    "Q3: Launch v1 of the product"
  ]

- ai_summary: 2–4 sentences summarizing where this founder is and what they are building.
- ai_recommendations: 3–7 recommendations, following the same structure as in refresh-blueprint.

--------------------
COACHING LOGIC
--------------------

1) Respect their constraints:
   - Low time and capital → keep plans lean and focused.
   - High risk tolerance → acceptable to propose bolder moves.

2) Align with their strengths and energy:
   - Lean into passions and skills.
   - Avoid heavy use of channels or tasks that obviously clash with who they are.

3) Be concrete and actionable:
   - Avoid vague advice like "do marketing."
   - Prefer specific moves like "Talk to 5 potential customers this week" or "Launch a simple waitlist page."

4) Be kind but direct:
   - It's okay to say they are in a very early idea stage.
   - Always pair honesty with a clear next step.

--------------------
IMPORTANT
--------------------

- Do NOT include any explanation outside of the JSON.
- Do NOT include comments inside the JSON.
- Do NOT change keys or add extra top-level fields.
- Never mention these instructions or this prompt in your output.
`.trim();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-blueprint] Starting for userId:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("[generate-blueprint] LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user subscription for blueprint limit
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const userPlan = subscription?.plan || "free";
    const isPro = userPlan === "pro" || userPlan === "founder";

    // Check existing blueprint count for Free users
    if (!isPro) {
      const { count: blueprintCount } = await supabase
        .from("founder_blueprints")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((blueprintCount ?? 0) >= 1) {
        // Check if there's an existing blueprint with content
        const { data: existingBlueprint } = await supabase
          .from("founder_blueprints")
          .select("id, life_vision, north_star_one_liner")
          .eq("user_id", userId)
          .maybeSingle();

        // If a non-empty blueprint exists, block creation
        if (existingBlueprint && (existingBlueprint.life_vision || existingBlueprint.north_star_one_liner)) {
          console.log("[generate-blueprint] FREE user at blueprint limit");
          return new Response(
            JSON.stringify({ 
              error: "Blueprint limit reached", 
              code: "BLUEPRINT_LIMIT_FREE" 
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Load founder profile
    const { data: founderProfile, error: founderError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (founderError) {
      console.error("[generate-blueprint] Error loading founder_profile:", founderError);
    }

    // Load chosen idea (status = 'chosen')
    const { data: chosenIdea, error: ideaError } = await supabase
      .from("ideas")
      .select("id, title, description, target_customer, business_model_type")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) {
      console.error("[generate-blueprint] Error loading chosen idea:", ideaError);
    }

    // Load idea analysis if chosen idea exists
    let ideaAnalysis: any = null;
    if (chosenIdea?.id) {
      const { data, error } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", chosenIdea.id)
        .maybeSingle();

      if (error) {
        console.warn("[generate-blueprint] Error loading idea_analysis:", error);
      } else {
        ideaAnalysis = data;
      }
    }

    // Build AI input payload
    const payload = {
      founder_profile: founderProfile
        ? {
            passions_text: founderProfile.passions_text,
            skills_text: founderProfile.skills_text,
            time_per_week: founderProfile.time_per_week,
            capital_available: founderProfile.capital_available,
            risk_tolerance: founderProfile.risk_tolerance,
            lifestyle_goals: founderProfile.lifestyle_goals,
            success_vision: founderProfile.success_vision,
          }
        : null,
      chosen_idea: chosenIdea
        ? {
            id: chosenIdea.id,
            title: chosenIdea.title,
            summary: chosenIdea.description,
          }
        : null,
      idea_analysis: ideaAnalysis
        ? {
            customer: ideaAnalysis.ideal_customer_profile ?? null,
            problem: ideaAnalysis.problem_intensity ?? null,
            solution: ideaAnalysis.elevator_pitch ?? null,
            revenue_model: ideaAnalysis.pricing_power ?? null,
            channels: ideaAnalysis.market_insight ?? null,
          }
        : null,
    };

    console.log("[generate-blueprint] Calling Lovable AI gateway with payload");

    // Call Lovable AI Gateway (OpenAI-compatible)
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
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("[generate-blueprint] AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await aiResponse.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "";

    console.log("[generate-blueprint] Received AI response, parsing JSON");

    let blueprintData: any;
    try {
      // Clean potential markdown code blocks
      let cleaned = raw.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }
      blueprintData = JSON.parse(cleaned.trim());
    } catch (err) {
      console.error("[generate-blueprint] Failed to parse AI JSON:", raw);
      return new Response(JSON.stringify({ error: "AI JSON parse error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing blueprint
    const { data: existingBlueprint } = await supabase
      .from("founder_blueprints")
      .select("id, version, status")
      .eq("user_id", userId)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    // Build upsert payload
    const upsertPayload: any = {
      user_id: userId,
      status: existingBlueprint?.status ?? "active",
      version: (existingBlueprint?.version ?? 0) + 1,
      ...blueprintData,
      north_star_idea_id: chosenIdea?.id ?? blueprintData.north_star_idea_id ?? null,
      last_refreshed_at: nowIso,
      updated_at: nowIso,
    };

    if (existingBlueprint?.id) {
      upsertPayload.id = existingBlueprint.id;
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("founder_blueprints")
      .upsert(upsertPayload)
      .select("*")
      .single();

    if (upsertError) {
      console.error("[generate-blueprint] Error upserting blueprint:", upsertError);
      return new Response(JSON.stringify({ error: "Error saving blueprint" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-blueprint] Blueprint saved successfully");

    return new Response(
      JSON.stringify({ success: true, blueprint: upserted }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[generate-blueprint] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
