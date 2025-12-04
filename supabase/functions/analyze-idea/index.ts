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
    const { ideaId, userId: bodyUserId } = requestJson as { ideaId?: string; userId?: string };

    // Resolve userId: prefer body, fallback to auth
    let resolvedUserId = bodyUserId;
    
    if (!resolvedUserId) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseAuth.auth.getUser();
        resolvedUserId = user?.id;
      }
    }

    if (!resolvedUserId) {
      return new Response(
        JSON.stringify({ error: "Missing user id. Make sure you are logged in." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
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

    // AI prompt template (embedded)
    const systemPrompt = `You are an expert startup evaluator, market strategist, business model analyst, and product validation specialist.

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

    // Prepare input data for AI
    const inputData = {
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

    console.log("analyze-idea: calling AI model");

    // Call Lovable AI
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
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    console.log("analyze-idea: inserting analysis into database");

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from("idea_analysis")
      .select("id")
      .eq("idea_id", ideaId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    let savedAnalysis;

    if (existingAnalysis) {
      // Update existing analysis
      const { data, error: updateError } = await supabase
        .from("idea_analysis")
        .update({
          niche_score: analysis.niche_score,
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

      if (updateError) throw updateError;
      savedAnalysis = data;
    } else {
      // Insert new analysis
      const { data, error: insertError } = await supabase
        .from("idea_analysis")
        .insert({
          idea_id: ideaId,
          user_id: resolvedUserId,
          niche_score: analysis.niche_score,
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

      if (insertError) throw insertError;
      savedAnalysis = data;
    }

    return new Response(JSON.stringify({ analysis: savedAnalysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-idea: error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
