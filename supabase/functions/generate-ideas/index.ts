import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert business idea generator for founders. You analyze founder profiles and generate highly personalized, actionable business ideas that are realistic and well-matched to the founder's unique situation.

You will receive a JSON object containing a founder profile with these fields:
- passions_text: What the founder is passionate about
- skills_text: The founder's professional skills and expertise
- tech_level: Their technical capability level
- time_per_week: Hours available per week to work on the business
- capital_available: Amount of capital they can invest
- risk_tolerance: Their comfort level with risk (low, medium, high)
- lifestyle_goals: Their desired lifestyle and work-life balance
- success_vision: What success looks like to them

Your task is to generate 5-10 business ideas that are:
1. Realistic and achievable given their constraints
2. Well-aligned with their passions, skills, and goals
3. Practical and actionable, not overly complex or theoretical
4. Ethical and legal - NO scams, deceptive practices, or unethical businesses
5. Matched to their time and capital constraints

For each idea, you must provide:
- title: A compelling, concise title (5-10 words)
- description: A clear 2-3 sentence explanation of the business
- business_model_type: One of: "saas", "coaching", "productized_service", "community", "content", "marketplace", "hybrid"
- target_customer: Be specific (e.g., "Small business owners in healthcare", "Busy parents with young children")
- time_to_first_dollar: One of: "weeks", "months", "year_plus"
- complexity: One of: "low", "medium", "high"
- fit_scores: An object with four scores (0-100 integers):
  - passion: How well this aligns with their stated passions
  - skills: How well this matches their existing skills
  - constraints: How well this fits their time, capital, and risk constraints
  - lifestyle: How well this supports their lifestyle goals

Guidelines:
- Be realistic about constraints: if they have $1000 and 5 hours/week, don't suggest opening a restaurant
- Prioritize ideas with 70+ scores across all dimensions
- Include a mix of complexity levels if constraints allow
- Consider risk tolerance when suggesting ideas
- Make descriptions actionable and specific, not generic
- Ensure time_to_first_dollar reflects realistic market conditions
- Base scores on genuine alignment, not wishful thinking
- Focus on proven business models that can start small`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body safely
    const requestJson = await req.json().catch(() => ({} as any));
    const { userId } = requestJson as { userId?: string };

    // Try to get user from auth header if present
    const authHeader = req.headers.get("Authorization");
    let resolvedUserId: string | null = null;

    if (userId) {
      // Use userId from body if provided
      resolvedUserId = userId;
      console.log("generate-ideas: resolved userId from body", resolvedUserId);
    } else if (authHeader) {
      // Try to get user from auth header
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
      if (user && !userError) {
        resolvedUserId = user.id;
        console.log("generate-ideas: resolved userId from auth header", resolvedUserId);
      }
    }

    // If no user id could be determined, return error
    if (!resolvedUserId) {
      console.error("No user id found in request body or auth header");
      return new Response(
        JSON.stringify({ error: "Missing user id. Make sure you are logged in." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-ideas: resolved userId", resolvedUserId);

    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .single();

    if (profileError || !profile) {
      console.log("generate-ideas: no founder profile found");
      console.error("Profile fetch error for user:", resolvedUserId, profileError);
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
                        business_model_type: { 
                          type: "string",
                          enum: ["saas", "coaching", "productized_service", "community", "content", "marketplace", "hybrid"]
                        },
                        target_customer: { type: "string" },
                        time_to_first_dollar: { 
                          type: "string",
                          enum: ["weeks", "months", "year_plus"]
                        },
                        complexity: { 
                          type: "string", 
                          enum: ["low", "medium", "high"] 
                        },
                        fit_scores: {
                          type: "object",
                          properties: {
                            passion: { type: "integer", minimum: 0, maximum: 100 },
                            skills: { type: "integer", minimum: 0, maximum: 100 },
                            constraints: { type: "integer", minimum: 0, maximum: 100 },
                            lifestyle: { type: "integer", minimum: 0, maximum: 100 },
                          },
                          required: ["passion", "skills", "constraints", "lifestyle"],
                          additionalProperties: false,
                        },
                      },
                      required: [
                        "title",
                        "description",
                        "business_model_type",
                        "target_customer",
                        "time_to_first_dollar",
                        "complexity",
                        "fit_scores",
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
    const ideasToInsert = generatedIdeas.ideas.map((idea: any) => {
      // Calculate overall fit score as average of the four scores
      const overallFitScore = Math.round(
        (idea.fit_scores.passion + 
         idea.fit_scores.skills + 
         idea.fit_scores.constraints + 
         idea.fit_scores.lifestyle) / 4
      );

      return {
        user_id: resolvedUserId,
        title: idea.title,
        description: idea.description,
        business_model_type: idea.business_model_type,
        target_customer: idea.target_customer,
        time_to_first_dollar: idea.time_to_first_dollar,
        complexity: idea.complexity,
        passion_fit_score: idea.fit_scores.passion,
        skill_fit_score: idea.fit_scores.skills,
        constraint_fit_score: idea.fit_scores.constraints,
        lifestyle_fit_score: idea.fit_scores.lifestyle,
        overall_fit_score: overallFitScore,
        status: "candidate",
      };
    });

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
