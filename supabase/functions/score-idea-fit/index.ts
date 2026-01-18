import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to convert values to safe integers [0,100]
const safeInt = (val: unknown): number | null => {
  if (val === null || val === undefined) return null;
  
  let strVal = String(val).trim();
  
  // Strip % suffix if present
  if (strVal.endsWith('%')) {
    strVal = strVal.slice(0, -1).trim();
  }
  
  const num = Number(strVal);
  if (isNaN(num)) return null;
  
  // Round and clamp to [0, 100]
  return Math.max(0, Math.min(100, Math.round(num)));
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      console.log("score-idea-fit: Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extract token and verify user
    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("score-idea-fit: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("score-idea-fit: authenticated user", userId);

    // 3. Parse and validate request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("score-idea-fit: JSON parse error", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { ideaId, force } = body;

    if (!ideaId || typeof ideaId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid ideaId", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: ideaId", ideaId, "force:", force);

    // 4. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // 5. Fetch the idea
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", userId)
      .single();

    if (ideaError || !idea) {
      console.error("score-idea-fit: idea not found", ideaError);
      return new Response(
        JSON.stringify({ error: "Idea not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Check if already scored (unless force=true)
    if (!force && idea.overall_fit_score !== null) {
      console.log("score-idea-fit: already scored, returning existing scores");
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Fetch founder profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error("score-idea-fit: profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found", code: "PROFILE_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Call Lovable AI for scoring
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("score-idea-fit: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", code: "INTERNAL_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scoringPrompt = `You are an AI scoring engine. Evaluate how well a business idea fits a founder's profile.

FOUNDER PROFILE:
- Skills: ${profile.skills_text || profile.skills_tags?.join(", ") || "Not specified"}
- Passions: ${profile.passions_text || profile.passions_tags?.join(", ") || "Not specified"}
- Hours per week: ${profile.hours_per_week || profile.time_per_week || "Not specified"}
- Risk tolerance: ${profile.risk_tolerance || "Not specified"}
- Lifestyle goals: ${profile.lifestyle_goals || "Not specified"}
- Tech level: ${profile.tech_level || "Not specified"}
- Capital available: ${profile.capital_available || "Not specified"}

BUSINESS IDEA:
- Title: ${idea.title}
- Description: ${idea.description || "Not provided"}
- Business Model: ${idea.business_model_type || "Not specified"}
- Target Customer: ${idea.target_customer || "Not specified"}
- Complexity: ${idea.complexity || "Not specified"}
- Time to First Dollar: ${idea.time_to_first_dollar || "Not specified"}
- Platform: ${idea.platform || "Not specified"}
- Category: ${idea.category || "Not specified"}

Score the fit on 5 dimensions (0-100 each):
1. passion_fit_score: How well does this idea align with the founder's passions and interests?
2. skill_fit_score: How well do the founder's skills match what this idea requires?
3. constraint_fit_score: How well does this idea fit the founder's time, capital, and other constraints?
4. lifestyle_fit_score: How well does this idea support the founder's desired lifestyle and goals?
5. overall_fit_score: Weighted average considering all factors (passion 25%, skill 30%, constraint 25%, lifestyle 20%)

Return scores using the provided tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a fit scoring engine for business ideas. Always use the provided tool to return scores." },
          { role: "user", content: scoringPrompt },
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
                  passion_fit_score: { type: "number", description: "Score 0-100 for passion alignment" },
                  skill_fit_score: { type: "number", description: "Score 0-100 for skill match" },
                  constraint_fit_score: { type: "number", description: "Score 0-100 for constraint fit" },
                  lifestyle_fit_score: { type: "number", description: "Score 0-100 for lifestyle fit" },
                  overall_fit_score: { type: "number", description: "Weighted overall score 0-100" },
                },
                required: ["passion_fit_score", "skill_fit_score", "constraint_fit_score", "lifestyle_fit_score", "overall_fit_score"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "score_idea_fit" } },
      }),
    });

    // Handle rate limits and payment errors
    if (aiResponse.status === 429) {
      console.error("score-idea-fit: AI rate limited");
      return new Response(
        JSON.stringify({ error: "Rate limited. Please try again later.", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (aiResponse.status === 402) {
      console.error("score-idea-fit: AI payment required");
      return new Response(
        JSON.stringify({ error: "Payment required for AI service.", code: "PAYMENT_REQUIRED" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("score-idea-fit: AI error", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("score-idea-fit: AI response received");

    // 9. Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "score_idea_fit") {
      console.error("score-idea-fit: Invalid AI response structure", aiData);
      return new Response(
        JSON.stringify({ error: "AI returned invalid response", code: "AI_INVALID_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawScores;
    try {
      rawScores = JSON.parse(toolCall.function.arguments);
    } catch (parseErr) {
      console.error("score-idea-fit: Failed to parse tool args", parseErr);
      return new Response(
        JSON.stringify({ error: "AI returned invalid response", code: "AI_INVALID_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: rawScores", rawScores);

    // 10. Process scores with safeInt
    const processedScores = {
      passion_fit_score: safeInt(rawScores.passion_fit_score),
      skill_fit_score: safeInt(rawScores.skill_fit_score),
      constraint_fit_score: safeInt(rawScores.constraint_fit_score),
      lifestyle_fit_score: safeInt(rawScores.lifestyle_fit_score),
      overall_fit_score: safeInt(rawScores.overall_fit_score),
    };

    console.log("score-idea-fit: processedScores", processedScores);

    // Validate overall_fit_score is present
    if (processedScores.overall_fit_score === null) {
      console.error("score-idea-fit: Missing overall_fit_score after processing");
      return new Response(
        JSON.stringify({ error: "AI returned invalid response", code: "AI_INVALID_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 11. Update the idea with scores
    const { data: updatedIdea, error: updateError } = await supabaseAdmin
      .from("ideas")
      .update(processedScores)
      .eq("id", ideaId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("score-idea-fit: DB update error", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save scores", code: "DB_WRITE_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("score-idea-fit: success - scores saved for idea", ideaId);

    return new Response(
      JSON.stringify({
        success: true,
        alreadyScored: false,
        scores: processedScores,
        idea: updatedIdea,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("score-idea-fit: unexpected error", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
