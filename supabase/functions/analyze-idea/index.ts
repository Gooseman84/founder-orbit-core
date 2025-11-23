import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a brutally honest business analyst and market researcher. Your job is to analyze business ideas and provide realistic, data-driven assessments of their viability.

Given a business idea and the founder's profile/constraints, provide a comprehensive niche analysis that evaluates market potential, competition, and realistic execution challenges.

Your analysis should be:
- Honest and direct (don't sugarcoat problems)
- Specific and actionable (not generic advice)
- Grounded in market reality (not optimistic fantasies)
- Focused on the founder's specific constraints

For each idea, provide:

1. **niche_score** (0-100 integer): How viable is this niche for this specific founder?
   - 90-100: Exceptional opportunity with clear path to revenue
   - 70-89: Solid opportunity with manageable challenges
   - 50-69: Possible but requires significant work or pivots
   - 30-49: Challenging, requires major advantages or changes
   - 0-29: Not recommended without fundamental changes

2. **market_overview** (2-3 sentences): Current state of the market, size, growth trends, and accessibility for a new entrant.

3. **problem_intensity** (2-3 sentences): How urgent and painful is the problem this solves? Will customers actually pay to solve it?

4. **competition_snapshot** (2-3 sentences): Who are the main competitors? What's the competitive landscape? Any gaps or opportunities?

5. **pricing_range** (1-2 sentences): Realistic pricing based on market standards. What can customers afford and what will they pay?

6. **main_risks** (array of 3-5 strings): Biggest threats to success. Be specific about what could go wrong.

7. **brutal_take** (3-4 sentences): The unvarnished truth. Why this might fail, what's being overlooked, and whether it's worth pursuing. Be direct but constructive.

8. **suggested_modifications** (3-4 sentences): Specific, actionable changes to improve viability. Focus on what would genuinely increase success odds.

Important Guidelines:
- Consider the founder's time, capital, and skills when assessing viability
- Don't recommend pivoting to something completely different
- Focus on improvements within the same general direction
- Be realistic about time to revenue given market conditions
- Account for the founder's risk tolerance and lifestyle goals
- Don't inflate scores just to be encouraging
- If something won't work, say so clearly in the brutal_take`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get request body
    const { idea_id } = await req.json();
    if (!idea_id) {
      return new Response(
        JSON.stringify({ error: "idea_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing idea:", idea_id, "for user:", user.id);

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", idea_id)
      .eq("user_id", user.id)
      .single();

    if (ideaError || !idea) {
      console.error("Idea fetch error:", ideaError);
      return new Response(
        JSON.stringify({ error: "Idea not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Idea and profile found, calling AI...");

    // Prepare data for AI
    const ideaData = {
      title: idea.title,
      description: idea.description,
      business_model_type: idea.business_model_type,
      target_customer: idea.target_customer,
      time_to_first_dollar: idea.time_to_first_dollar,
      complexity: idea.complexity,
    };

    const profileData = {
      passions_text: profile.passions_text,
      skills_text: profile.skills_text,
      time_per_week: profile.time_per_week,
      capital_available: profile.capital_available,
      risk_tolerance: profile.risk_tolerance,
      lifestyle_goals: profile.lifestyle_goals,
    };

    const userPrompt = `Analyze this business idea for viability:

IDEA:
${JSON.stringify(ideaData, null, 2)}

FOUNDER PROFILE:
${JSON.stringify(profileData, null, 2)}

Provide a comprehensive analysis considering the founder's specific constraints and skills.`;

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI with tool calling for structured output
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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_business_idea",
              description: "Analyze business idea viability with market research",
              parameters: {
                type: "object",
                properties: {
                  niche_score: { type: "integer", minimum: 0, maximum: 100 },
                  market_overview: { type: "string" },
                  problem_intensity: { type: "string" },
                  competition_snapshot: { type: "string" },
                  pricing_range: { type: "string" },
                  main_risks: { type: "array", items: { type: "string" } },
                  brutal_take: { type: "string" },
                  suggested_modifications: { type: "string" },
                },
                required: [
                  "niche_score",
                  "market_overview",
                  "problem_intensity",
                  "competition_snapshot",
                  "pricing_range",
                  "main_risks",
                  "brutal_take",
                  "suggested_modifications",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_business_idea" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract analysis from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log("Analysis generated with niche score:", analysis.niche_score);

    // Check if analysis already exists for this idea
    const { data: existingAnalysis } = await supabase
      .from("idea_analysis")
      .select("id")
      .eq("idea_id", idea_id)
      .single();

    let savedAnalysis;
    
    if (existingAnalysis) {
      // Update existing analysis
      const { data, error: updateError } = await supabase
        .from("idea_analysis")
        .update({
          niche_score: analysis.niche_score,
          market_overview: analysis.market_overview,
          problem_intensity: analysis.problem_intensity,
          competition_snapshot: analysis.competition_snapshot,
          pricing_range: analysis.pricing_range,
          main_risks: analysis.main_risks,
          brutal_take: analysis.brutal_take,
          suggested_modifications: analysis.suggested_modifications,
        })
        .eq("id", existingAnalysis.id)
        .select()
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update analysis" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      savedAnalysis = data;
      console.log("Updated existing analysis");
    } else {
      // Insert new analysis
      const { data, error: insertError } = await supabase
        .from("idea_analysis")
        .insert({
          user_id: user.id,
          idea_id: idea_id,
          niche_score: analysis.niche_score,
          market_overview: analysis.market_overview,
          problem_intensity: analysis.problem_intensity,
          competition_snapshot: analysis.competition_snapshot,
          pricing_range: analysis.pricing_range,
          main_risks: analysis.main_risks,
          brutal_take: analysis.brutal_take,
          suggested_modifications: analysis.suggested_modifications,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save analysis" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      savedAnalysis = data;
      console.log("Inserted new analysis");
    }

    return new Response(
      JSON.stringify({ analysis: savedAnalysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
