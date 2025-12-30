import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Safe integer conversion: accepts numbers/strings, strips %, rounds, clamps to 0-100
function safeInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  
  let numValue: number;
  if (typeof value === "string") {
    const cleaned = value.replace(/%/g, "").trim();
    numValue = parseFloat(cleaned);
  } else if (typeof value === "number") {
    numValue = value;
  } else {
    return null;
  }
  
  if (isNaN(numValue)) return null;
  
  // Round and clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(numValue)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestJson = await req.json().catch(() => ({} as any));
    const { ideaId } = requestJson as { ideaId?: string };

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("score-idea-fit: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = user.id;
    console.log("score-idea-fit: resolved userId", resolvedUserId);

    if (!ideaId) {
      return new Response(
        JSON.stringify({ error: "Missing ideaId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", resolvedUserId)
      .single();

    if (ideaError || !idea) {
      console.error("score-idea-fit: idea not found", ideaError);
      return new Response(
        JSON.stringify({ error: "Idea not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If scores already exist, return them without re-scoring
    if (idea.overall_fit_score !== null) {
      console.log("score-idea-fit: scores already exist for idea", ideaId);
      return new Response(
        JSON.stringify({
          success: true,
          alreadyScored: true,
          scores: {
            passion_fit_score: idea.passion_fit_score,
            skill_fit_score: idea.skill_fit_score,
            constraint_fit_score: idea.constraint_fit_score,
            lifestyle_fit_score: idea.lifestyle_fit_score,
            overall_fit_score: idea.overall_fit_score,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .single();

    if (profileError || !profile) {
      console.error("score-idea-fit: profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first.", code: "PROFILE_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: calling AI to score idea", idea.title);

    // AI prompt for scoring
    const systemPrompt = `You are an expert at evaluating business idea fit for individual founders.

Given a founder's profile (skills, passions, constraints, lifestyle goals) and a business idea, 
calculate fit scores from 0-100 for each dimension:

1. passion_fit_score: How well does this idea align with the founder's interests and passions?
2. skill_fit_score: How well does this idea leverage the founder's existing skills?
3. constraint_fit_score: How well does this idea fit within the founder's constraints (time, capital, risk)?
4. lifestyle_fit_score: How well does this idea support the founder's desired lifestyle?
5. overall_fit_score: Weighted average considering all factors.

Return ONLY a JSON object with these 5 scores as integers 0-100. No commentary.`;

    const inputData = {
      idea: {
        title: idea.title,
        description: idea.description,
        business_model_type: idea.business_model_type,
        target_customer: idea.target_customer,
        category: idea.category,
        complexity: idea.complexity,
        time_to_first_dollar: idea.time_to_first_dollar,
        platform: idea.platform,
        mode: idea.mode,
      },
      founder_profile: {
        passions_text: profile.passions_text,
        passions_tags: profile.passions_tags,
        skills_text: profile.skills_text,
        skills_tags: profile.skills_tags,
        tech_level: profile.tech_level,
        time_per_week: profile.time_per_week,
        hours_per_week: profile.hours_per_week,
        capital_available: profile.capital_available,
        risk_tolerance: profile.risk_tolerance,
        lifestyle_goals: profile.lifestyle_goals,
        success_vision: profile.success_vision,
        work_personality: profile.work_personality,
      },
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(inputData) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_idea_fit",
              description: "Return fit scores for the business idea",
              parameters: {
                type: "object",
                properties: {
                  passion_fit_score: { type: "number", description: "0-100 score for passion alignment" },
                  skill_fit_score: { type: "number", description: "0-100 score for skill match" },
                  constraint_fit_score: { type: "number", description: "0-100 score for constraint fit" },
                  lifestyle_fit_score: { type: "number", description: "0-100 score for lifestyle alignment" },
                  overall_fit_score: { type: "number", description: "0-100 overall weighted score" },
                },
                required: ["passion_fit_score", "skill_fit_score", "constraint_fit_score", "lifestyle_fit_score", "overall_fit_score"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_idea_fit" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("score-idea-fit: AI gateway error", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again.", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted.", code: "PAYMENT_REQUIRED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI scoring failed", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("score-idea-fit: No tool call in AI response", aiData);
      throw new Error("No tool call in AI response");
    }

    const rawScores = JSON.parse(toolCall.function.arguments);
    console.log("score-idea-fit: raw AI scores", rawScores);

    // Process scores using safeInt
    const processedScores = {
      passion_fit_score: safeInt(rawScores.passion_fit_score),
      skill_fit_score: safeInt(rawScores.skill_fit_score),
      constraint_fit_score: safeInt(rawScores.constraint_fit_score),
      lifestyle_fit_score: safeInt(rawScores.lifestyle_fit_score),
      overall_fit_score: safeInt(rawScores.overall_fit_score),
    };

    // Validate overall_fit_score is present
    if (processedScores.overall_fit_score === null) {
      console.error("score-idea-fit: AI returned invalid overall_fit_score");
      return new Response(
        JSON.stringify({ error: "AI returned invalid scores", code: "AI_INVALID_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: processed scores", processedScores);

    // Update the idea with scores
    const { data: updatedIdea, error: updateError } = await supabase
      .from("ideas")
      .update(processedScores)
      .eq("id", ideaId)
      .eq("user_id", resolvedUserId)
      .select()
      .single();

    if (updateError) {
      console.error("score-idea-fit: DB update error", {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      return new Response(
        JSON.stringify({ error: "Failed to save scores", code: "DB_WRITE_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: successfully updated idea", ideaId);

    return new Response(
      JSON.stringify({
        success: true,
        alreadyScored: false,
        scores: processedScores,
        idea: updatedIdea,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("score-idea-fit: error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
