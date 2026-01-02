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

═══════════════════════════════════════════════════════════════════
INTERNAL REASONING (do NOT output, just follow)
═══════════════════════════════════════════════════════════════════

Before scoring, mentally evaluate:
1) PASSION: Does this idea touch what they genuinely care about?
2) SKILLS: Can they execute with current abilities, or is there a gap?
3) CONSTRAINTS: Does time/capital/risk match realistic requirements?
4) LIFESTYLE: Will building this support or fight their desired life?
5) OVERALL: Weight passion highest (40%), then skills (25%), constraints (20%), lifestyle (15%).

═══════════════════════════════════════════════════════════════════
SCORING GUIDE
═══════════════════════════════════════════════════════════════════

• 0-30: Poor fit — significant misalignment, avoid
• 31-50: Weak fit — some alignment but major gaps
• 51-70: Moderate fit — workable with adjustments
• 71-85: Good fit — strong alignment, recommended
• 86-100: Excellent fit — near-perfect match

═══════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLES
═══════════════════════════════════════════════════════════════════

FOUNDER: Loves fitness, has marketing skills, 10hrs/week, $5k capital, wants location freedom
IDEA: AI-powered personal training app

Reasoning:
- Passion: Fitness + tech = strong alignment → 82
- Skills: Marketing yes, but no dev skills → 55
- Constraints: 10hrs/week for app dev is tight, $5k low for app → 40
- Lifestyle: App can be location-free once built → 75
- Overall: Passion strong but constraints weak → 62

FOUNDER: Software developer, hates meetings, loves automation, 20hrs/week, $2k capital
IDEA: Productized consulting for startups

Reasoning:
- Passion: Consulting means meetings — drainer → 25
- Skills: Dev skills don't help consulting directly → 45
- Constraints: Time OK, low capital fine for services → 70
- Lifestyle: Consulting = calls = hates this → 20
- Overall: Major lifestyle/passion conflict → 35

═══════════════════════════════════════════════════════════════════

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

    const analysisSystemPrompt = `You are an expert startup evaluator and market strategist.

═══════════════════════════════════════════════════════════════════
INTERNAL REASONING (do NOT output)
═══════════════════════════════════════════════════════════════════

Before analyzing, mentally work through:

1) MARKET SIZE: Is this a $10M or $1B opportunity? Who's already paying for solutions?
2) PROBLEM INTENSITY: Is this a vitamin (nice-to-have) or painkiller (must-have)?
3) COMPETITION: Who else is doing this? What's their weakness?
4) FOUNDER FIT: Given their scores, where are the gaps to address?
5) FIRST DOLLAR PATH: How quickly can they validate and get paid?

═══════════════════════════════════════════════════════════════════
OUTPUT SCHEMA
═══════════════════════════════════════════════════════════════════

{
  "niche_score": 0-100,
  "market_insight": "1-2 sentences on market opportunity",
  "problem_intensity": "Low/Medium/High + why",
  "competition_snapshot": "Who competes, their weakness",
  "pricing_power": "Can they charge premium? Why?",
  "success_likelihood": "Low/Medium/High + key factor",
  "biggest_risks": ["Risk 1", "Risk 2", "Risk 3"],
  "unfair_advantages": ["Advantage 1", "Advantage 2"],
  "recommendations": ["Action 1", "Action 2", "Action 3"],
  "ideal_customer_profile": "Specific person description",
  "elevator_pitch": "One compelling sentence",
  "brutal_honesty": "The hard truth they need to hear"
}

═══════════════════════════════════════════════════════════════════
FEW-SHOT EXAMPLE
═══════════════════════════════════════════════════════════════════

IDEA: "Gym Teacher OS" — Notion template + videos for PE teachers to run summer camps
FOUNDER: Ex-teacher, marketing skills, 10hrs/week, $2k capital

{
  "niche_score": 72,
  "market_insight": "300K+ PE teachers in US alone. Summer income is a known pain point discussed in teacher forums. Low competition in this specific niche.",
  "problem_intensity": "Medium — teachers want extra income but aren't desperate. Seasonally urgent (April-May buying window).",
  "competition_snapshot": "Generic camp business courses exist ($500+), but nothing PE-teacher specific. Your specificity is the moat.",
  "pricing_power": "Medium — can charge $49-99 for template bundle. Teachers are price-sensitive but will pay for niche solutions.",
  "success_likelihood": "Medium-High — low capital needed, clear audience, founder has teacher credibility.",
  "biggest_risks": ["Seasonal demand limits growth", "Teachers are notoriously price-sensitive", "May need to expand beyond summer camps"],
  "unfair_advantages": ["Ex-teacher credibility", "Understands the audience deeply", "Low competition in niche"],
  "recommendations": ["Interview 5 PE teachers this week about summer income pain", "Pre-sell in PE teacher Facebook groups before building", "Start at $49, raise price after 10 sales"],
  "ideal_customer_profile": "K-12 PE teacher, 5-15 years experience, in suburban district, active in teacher Facebook groups, has considered summer camps but didn't know where to start.",
  "elevator_pitch": "The complete system for PE teachers to launch profitable summer fitness camps—without figuring it out from scratch.",
  "brutal_honesty": "This can make $5-15K/year as a side project, not a full-time business. That's fine if it matches your goals, but don't expect to quit your job from this alone."
}

═══════════════════════════════════════════════════════════════════
RULES
═══════════════════════════════════════════════════════════════════

• Be specific, not generic. Reference the actual idea and founder.
• Brutal honesty matters more than encouragement.
• Keep each field concise (max 2 sentences except arrays).
• Return ONLY valid JSON, no commentary.`;

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
