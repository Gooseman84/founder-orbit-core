import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert business idea generator for founders. You analyze founder profiles and generate highly personalized, actionable business ideas.

Given a founder profile JSON with passions, skills, constraints (time, capital, risk tolerance), and lifestyle goals, generate 5-10 business ideas that are realistic and well-matched to the founder.

For each idea, provide:
1. A compelling title (concise, 5-10 words)
2. A clear description (2-3 sentences explaining the business)
3. Business model type (e.g., "SaaS", "Marketplace", "Service", "E-commerce", "Content/Creator", "Agency", "Productized Service")
4. Target customer (be specific: e.g., "Small business owners in healthcare", "Busy parents with young children")
5. Time to first dollar (realistic estimate: "1-3 months", "3-6 months", "6-12 months", "12+ months")
6. Complexity (one of: "Low", "Medium", "High")
7. Fit scores (0-100 integers):
   - passion_fit_score: How well does this align with their stated passions?
   - skill_fit_score: How well does this match their existing skills?
   - constraint_fit_score: How well does this fit their time, capital, and risk constraints?
   - lifestyle_fit_score: How well does this support their lifestyle goals?
   - overall_fit_score: Average of the four scores above

Guidelines:
- Be realistic about constraints (if they have $1000 and 5 hours/week, don't suggest opening a restaurant)
- Prioritize ideas with 70+ overall fit scores
- Include a mix of complexity levels if the founder's constraints allow
- Consider their risk tolerance when suggesting ideas
- Make descriptions actionable and specific, not generic
- Ensure time_to_first_dollar reflects realistic market conditions
- Base scores on genuine alignment, not wishful thinking`;

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

    console.log("Generating ideas for user:", user.id);

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Profile found, calling AI...");

    // Prepare profile data for AI
    const profileData = {
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
    };

    const userPrompt = `Generate business ideas for this founder profile:\n\n${JSON.stringify(profileData, null, 2)}`;

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
              name: "generate_business_ideas",
              description: "Generate personalized business ideas with fit scores",
              parameters: {
                type: "object",
                properties: {
                  ideas: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        business_model_type: { type: "string" },
                        target_customer: { type: "string" },
                        time_to_first_dollar: { type: "string" },
                        complexity: { type: "string", enum: ["Low", "Medium", "High"] },
                        passion_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                        skill_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                        constraint_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                        lifestyle_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                        overall_fit_score: { type: "integer", minimum: 0, maximum: 100 },
                      },
                      required: [
                        "title",
                        "description",
                        "business_model_type",
                        "target_customer",
                        "time_to_first_dollar",
                        "complexity",
                        "passion_fit_score",
                        "skill_fit_score",
                        "constraint_fit_score",
                        "lifestyle_fit_score",
                        "overall_fit_score",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["ideas"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_business_ideas" } },
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

    // Extract ideas from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const generatedIdeas = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${generatedIdeas.ideas.length} ideas`);

    // Insert ideas into database
    const ideasToInsert = generatedIdeas.ideas.map((idea: any) => ({
      user_id: user.id,
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
      status: "candidate",
    }));

    const { data: insertedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(ideasToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully inserted ${insertedIdeas.length} ideas`);

    return new Response(
      JSON.stringify({ ideas: insertedIdeas }),
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
