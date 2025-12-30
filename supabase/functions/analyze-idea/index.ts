import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      console.error("analyze-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = user.id;
    console.log("analyze-idea: resolved userId", resolvedUserId);

    if (!ideaId) {
      return new Response(
        JSON.stringify({ error: "Missing ideaId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Helper: safely convert to integer 0-100
    const safeInt = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      let num: number;
      if (typeof val === "number") {
        num = val;
      } else if (typeof val === "string") {
        const cleaned = val.replace(/%/g, "").trim();
        num = parseFloat(cleaned);
      } else {
        return null;
      }
      if (isNaN(num)) return null;
      return Math.max(0, Math.min(100, Math.round(num)));
    };

    // Fetch the idea
    let { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", resolvedUserId)
      .single();

    if (ideaError || !idea) {
      console.log("analyze-idea: idea not found", ideaError);
      return new Response(
        JSON.stringify({ error: "Idea not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .single();

    if (profileError || !profile) {
      console.log("analyze-idea: profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Track computed scores for response
    let computedScores: {
      passion_fit_score: number | null;
      skill_fit_score: number | null;
      constraint_fit_score: number | null;
      lifestyle_fit_score: number | null;
      overall_fit_score: number | null;
    } | null = null;

    // ===== STEP 1: Compute fit scores if missing =====
    const scoresMissing = idea.overall_fit_score === null || idea.overall_fit_score === undefined;
    
    if (scoresMissing) {
      console.log("analyze-idea: fit scores missing, computing via AI first");

      const scoringPrompt = `You are an expert at evaluating founder-idea fit.

Given a founder profile and a business idea, score how well this idea fits this specific founder on 5 dimensions (0-100 scale):

1. passion_fit_score: How well does this idea align with the founder's passions, interests, and what excites them?
2. skill_fit_score: How well does this idea leverage the founder's existing skills and expertise?
3. constraint_fit_score: How well does this idea fit within the founder's time and capital constraints?
4. lifestyle_fit_score: How well does this idea match the founder's desired lifestyle and work preferences?
5. overall_fit_score: A weighted average considering all factors above (this should be a balanced score, not just an average).

Be realistic and honest. A score of 50 means neutral fit. Below 50 means poor fit. Above 70 means good fit. Above 85 means excellent fit.

Return ONLY the 5 scores as integers 0-100.`;

      const scoringInput = {
        idea: {
          title: idea.title,
          description: idea.description,
          business_model_type: idea.business_model_type,
          target_customer: idea.target_customer,
          time_to_first_dollar: idea.time_to_first_dollar,
          complexity: idea.complexity,
        },
        founder_profile: {
          passions_text: profile.passions_text,
          passions_tags: profile.passions_tags,
          skills_text: profile.skills_text,
          skills_tags: profile.skills_tags,
          tech_level: profile.tech_level,
          time_per_week: profile.time_per_week,
          capital_available: profile.capital_available,
          risk_tolerance: profile.risk_tolerance,
          lifestyle_goals: profile.lifestyle_goals,
          success_vision: profile.success_vision,
        },
      };

      const scoringResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: scoringPrompt },
            { role: "user", content: JSON.stringify(scoringInput) },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "score_founder_idea_fit",
                description: "Return fit scores for a founder-idea match",
                parameters: {
                  type: "object",
                  properties: {
                    passion_fit_score: { type: "number", description: "0-100" },
                    skill_fit_score: { type: "number", description: "0-100" },
                    constraint_fit_score: { type: "number", description: "0-100" },
                    lifestyle_fit_score: { type: "number", description: "0-100" },
                    overall_fit_score: { type: "number", description: "0-100" },
                  },
                  required: [
                    "passion_fit_score",
                    "skill_fit_score",
                    "constraint_fit_score",
                    "lifestyle_fit_score",
                    "overall_fit_score",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "score_founder_idea_fit" } },
        }),
      });

      if (!scoringResponse.ok) {
        const status = scoringResponse.status;
        const errorText = await scoringResponse.text();
        console.error("analyze-idea: scoring AI error", status, errorText);

        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "AI rate limit exceeded, please wait and try again.", code: "rate_limited" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted, please add funds.", code: "payment_required" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Scoring AI generation failed", code: "AI_ERROR" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const scoringData = await scoringResponse.json();
      const scoringToolCall = scoringData.choices?.[0]?.message?.tool_calls?.[0];

      if (!scoringToolCall || !scoringToolCall.function?.arguments) {
        console.error("analyze-idea: no tool call in scoring response");
        return new Response(
          JSON.stringify({ error: "Invalid AI response for scoring", code: "AI_INVALID_RESPONSE" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawScores = JSON.parse(scoringToolCall.function.arguments);
      console.log("analyze-idea: raw scores from AI", rawScores);

      computedScores = {
        passion_fit_score: safeInt(rawScores.passion_fit_score),
        skill_fit_score: safeInt(rawScores.skill_fit_score),
        constraint_fit_score: safeInt(rawScores.constraint_fit_score),
        lifestyle_fit_score: safeInt(rawScores.lifestyle_fit_score),
        overall_fit_score: safeInt(rawScores.overall_fit_score),
      };

      // Validate overall_fit_score is not null
      if (computedScores.overall_fit_score === null) {
        console.error("analyze-idea: overall_fit_score is null after parsing");
        return new Response(
          JSON.stringify({ error: "AI returned invalid overall_fit_score", code: "AI_INVALID_RESPONSE" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("analyze-idea: updating idea with computed scores", computedScores);

      // Update ideas table with scores
      const { error: updateScoresError } = await supabase
        .from("ideas")
        .update(computedScores)
        .eq("id", ideaId)
        .eq("user_id", resolvedUserId);

      if (updateScoresError) {
        console.error("analyze-idea: failed to update idea scores", updateScoresError);
        return new Response(
          JSON.stringify({ error: "Failed to save fit scores", code: "DB_WRITE_FAILED" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update local idea object with new scores for the analysis step
      idea = { ...idea, ...computedScores };
    } else {
      // Scores already exist, use them for response
      computedScores = {
        passion_fit_score: idea.passion_fit_score,
        skill_fit_score: idea.skill_fit_score,
        constraint_fit_score: idea.constraint_fit_score,
        lifestyle_fit_score: idea.lifestyle_fit_score,
        overall_fit_score: idea.overall_fit_score,
      };
    }

    // ===== STEP 2: Run business analysis =====
    console.log("analyze-idea: running business analysis");

    const analysisSystemPrompt = `You are an expert startup evaluator, market strategist, business model analyst, and product validation specialist.

Given:
1. A founder profile (passions, skills, constraints, lifestyle goals)
2. A business idea (title, description, business model type, target customer, fit scores)
3. Constraints such as time availability, capital available, and risk tolerance

Produce a JSON object ONLY with the following structure:

{
  "niche_score": number,          // 0–100 overall viability score
  "market_insight": "string",     // insight about the market
  "problem_intensity": "string",  // how painful / urgent the problem is
  "competition_snapshot": "string",
  "pricing_power": "string",
  "success_likelihood": "string",
  "biggest_risks": ["string"],
  "unfair_advantages": ["string"],
  "recommendations": ["string"],
  "ideal_customer_profile": "string",
  "elevator_pitch": "string",
  "brutal_honesty": "string"
}

Rules:
- DO NOT add extra fields
- DO NOT output commentary or disclaimers
- Respond with STRICT JSON only`;

    const analysisInputData = {
      idea: {
        title: idea.title,
        description: idea.description,
        business_model_type: idea.business_model_type,
        target_customer: idea.target_customer,
        time_to_first_dollar: idea.time_to_first_dollar,
        complexity: idea.complexity,
        passion_fit_score: idea.passion_fit_score,
        skill_fit_score: idea.skill_fit_score,
        constraint_fit_score: idea.constraint_fit_score,
        lifestyle_fit_score: idea.lifestyle_fit_score,
        overall_fit_score: idea.overall_fit_score,
      },
      founder_profile: {
        passions_text: profile.passions_text,
        passions_tags: profile.passions_tags,
        skills_text: profile.skills_text,
        skills_tags: profile.skills_tags,
        tech_level: profile.tech_level,
        time_per_week: profile.time_per_week,
        capital_available: profile.capital_available,
        risk_tolerance: profile.risk_tolerance,
        lifestyle_goals: profile.lifestyle_goals,
        success_vision: profile.success_vision,
      },
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: analysisSystemPrompt },
          { role: "user", content: JSON.stringify(analysisInputData) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_business_idea",
              description: "Analyze a business idea and return structured evaluation",
              parameters: {
                type: "object",
                properties: {
                  niche_score: { type: "number" },
                  market_insight: { type: "string" },
                  problem_intensity: { type: "string" },
                  competition_snapshot: { type: "string" },
                  pricing_power: { type: "string" },
                  success_likelihood: { type: "string" },
                  biggest_risks: { type: "array", items: { type: "string" } },
                  unfair_advantages: { type: "array", items: { type: "string" } },
                  recommendations: { type: "array", items: { type: "string" } },
                  ideal_customer_profile: { type: "string" },
                  elevator_pitch: { type: "string" },
                  brutal_honesty: { type: "string" },
                },
                required: [
                  "niche_score",
                  "market_insight",
                  "problem_intensity",
                  "competition_snapshot",
                  "pricing_power",
                  "success_likelihood",
                  "biggest_risks",
                  "unfair_advantages",
                  "recommendations",
                  "ideal_customer_profile",
                  "elevator_pitch",
                  "brutal_honesty",
                ],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_business_idea" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("analyze-idea: AI gateway error", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please wait and try again.", code: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds.", code: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "No tool call in AI response", code: "AI_INVALID_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("analyze-idea: parsed analysis", analysis);

    // ===== STEP 3: Save analysis to idea_analysis table =====
    console.log("analyze-idea: saving analysis to database");

    const { data: existingAnalysis } = await supabase
      .from("idea_analysis")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    let savedAnalysis;

    if (existingAnalysis) {
      const { data, error: updateError } = await supabase
        .from("idea_analysis")
        .update({
          niche_score: safeInt(analysis.niche_score),
          market_insight: analysis.market_insight,
          problem_intensity: analysis.problem_intensity,
          competition_snapshot: analysis.competition_snapshot,
          pricing_power: analysis.pricing_power,
          success_likelihood: analysis.success_likelihood,
          biggest_risks: analysis.biggest_risks,
          unfair_advantages: analysis.unfair_advantages,
          recommendations: analysis.recommendations,
          ideal_customer_profile: analysis.ideal_customer_profile,
          elevator_pitch: analysis.elevator_pitch,
          brutal_honesty: analysis.brutal_honesty,
        })
        .eq("id", existingAnalysis.id)
        .select()
        .single();

      if (updateError) {
        console.error("analyze-idea: failed to update analysis", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update analysis", code: "DB_WRITE_FAILED" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      savedAnalysis = data;
    } else {
      const { data, error: insertError } = await supabase
        .from("idea_analysis")
        .insert({
          idea_id: ideaId,
          user_id: resolvedUserId,
          niche_score: safeInt(analysis.niche_score),
          market_insight: analysis.market_insight,
          problem_intensity: analysis.problem_intensity,
          competition_snapshot: analysis.competition_snapshot,
          pricing_power: analysis.pricing_power,
          success_likelihood: analysis.success_likelihood,
          biggest_risks: analysis.biggest_risks,
          unfair_advantages: analysis.unfair_advantages,
          recommendations: analysis.recommendations,
          ideal_customer_profile: analysis.ideal_customer_profile,
          elevator_pitch: analysis.elevator_pitch,
          brutal_honesty: analysis.brutal_honesty,
        })
        .select()
        .single();

      if (insertError) {
        console.error("analyze-idea: failed to insert analysis", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save analysis", code: "DB_WRITE_FAILED" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      savedAnalysis = data;
    }

    console.log("analyze-idea: complete, returning response");

    return new Response(JSON.stringify({ analysis: savedAnalysis, scores: computedScores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-idea: error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
