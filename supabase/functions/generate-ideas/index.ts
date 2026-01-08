import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const buildSystemPrompt = (hasExtendedIntake: boolean, businessTypeHint: string, difficultyGuidance: string) => `You are TrueBlazer.AI, the world's greatest business ideation engine for founders. You analyze founder profiles deeply and generate highly personalized, actionable business ideas that are realistic and well-matched to the founder's unique situation.

You will receive a JSON object containing a founder profile with these fields:

**Core Profile:**
- passions_text: What the founder is passionate about
- passions_tags: Specific passion categories
- skills_text: The founder's professional skills and expertise
- skills_tags: Specific skill categories
- tech_level: Their technical capability level
- time_per_week: Hours available per week to work on the business
- capital_available: Amount of capital they can invest
- risk_tolerance: Their comfort level with risk (low, medium, high)
- lifestyle_goals: Their desired lifestyle and work-life balance
- success_vision: What success looks like to them

**Structured Onboarding Context:**
- entry_trigger: Why they're exploring entrepreneurship right now
- future_vision: What they want their life to look like in 1 year
- desired_identity: How they want to be known
- business_type_preference: Their preferred business type
- energy_source: What type of work energizes them
- learning_style: How they prefer to learn and grow
- commitment_level: Their current commitment level (exploring, committed, ready)
${hasExtendedIntake ? `
**Extended Profile (Deep Psychological & Preference Data):**
- deep_desires: Their deepest motivations and dreams they rarely share
- fears: What holds them back or worries them
- identity_statements: How they want to be seen and remembered
- energy_givers: Activities and situations that energize them
- energy_drainers: Activities and situations that exhaust them
- business_archetypes: Preferred business models (e.g., saas, content_brand, coaching_consulting)
- work_preferences: How they like to work (e.g., writing, selling, building_systems)
- personality_flags: Key traits like wants_autopilot, wants_to_be_face, wants_predictable_income, thrives_under_pressure, prefers_structure, loves_experimenting

Use ALL of this context to generate deeply personalized business ideas. The extended profile data is particularly valuable for understanding:
- WHY certain businesses will resonate emotionally
- What work styles will sustain their motivation long-term
- Hidden fears that might sabotage certain business types
- Natural energy patterns that predict success or burnout` : ''}

**BUSINESS TYPE GUIDANCE:** ${businessTypeHint}
**DIFFICULTY GUIDANCE:** ${difficultyGuidance}

Your task is to generate 3-7 business ideas that are:
1. Realistic and achievable given their constraints
2. Deeply aligned with their passions, skills, psychological profile, and goals
3. Practical and actionable, not overly complex or theoretical
4. Ethical and legal - NO scams, deceptive practices, or unethical businesses
5. Matched to their time, capital, and energy constraints
6. ${hasExtendedIntake ? 'Aligned with their preferred business archetypes and work preferences' : 'Suited to their available resources'}
7. ${hasExtendedIntake ? 'Designed to leverage energy givers and avoid energy drainers' : 'Designed for sustainable execution'}
8. Matched to their energy_source (e.g., "solving problems" → technical ideas, "helping people" → service ideas)

For each idea, you must provide:
- title: A compelling, concise title (5-10 words)
- description: A clear 2-3 sentence explanation of the business
- why_it_fits: ${hasExtendedIntake ? 'A personalized explanation of why THIS specific person should pursue this idea, referencing their deep desires, energy patterns, and personality' : 'A brief explanation of why this fits their profile, referencing their vision and energy source'}
- business_model_type: One of: "saas", "coaching", "productized_service", "community", "content", "marketplace", "hybrid"
- target_customer: Be specific (e.g., "Small business owners in healthcare", "Busy parents with young children")
- how_it_makes_money: Clear revenue model explanation
- time_to_first_dollar: One of: "weeks", "months", "year_plus"
- complexity: One of: "low", "medium", "high"
- difficulty_level: Integer 1-5 (1=easiest, 5=hardest)
- time_intensity_hours_per_week: Estimated hours needed per week
- first_three_steps: Array of 3 concrete, actionable first steps to start
- fit_scores: An object with four scores (0-100 integers):
  - passion: How well this aligns with their stated passions${hasExtendedIntake ? ' and deep desires' : ''}
  - skills: How well this matches their existing skills
  - constraints: How well this fits their time, capital, and risk constraints
  - lifestyle: How well this supports their lifestyle goals${hasExtendedIntake ? ' and personality flags' : ''}

Guidelines:
- Be realistic about constraints: if they have $1000 and 5 hours/week, don't suggest opening a restaurant
- Prioritize ideas with 70+ scores across all dimensions
- Include a mix of complexity levels if constraints allow
- Consider risk tolerance when suggesting ideas
- Make descriptions actionable and specific, not generic
- Ensure time_to_first_dollar reflects realistic market conditions
- Base scores on genuine alignment, not wishful thinking
- Focus on proven business models that can start small
${hasExtendedIntake ? `- If they want autopilot income, prioritize passive/semi-passive models
- If they want to be the face, suggest personal brand opportunities
- If they prefer structure, suggest businesses with clear frameworks
- Match business archetypes to their stated preferences` : ''}`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body safely
    const requestJson = await req.json().catch(() => ({} as any));

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.error("generate-ideas: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = user.id;
    console.log("generate-ideas: resolved userId", resolvedUserId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
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

    // Fetch extended intake (optional - backward compatible)
    const { data: extendedIntake, error: extendedError } = await supabase
      .from("user_intake_extended")
      .select("*")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (extendedError) {
      console.log("generate-ideas: error fetching extended intake (non-fatal):", extendedError);
    }

    const hasExtendedIntake = !!extendedIntake;
    console.log("generate-ideas: hasExtendedIntake =", hasExtendedIntake);

    // Prepare structured onboarding context hints
    const businessTypeHint = !profile.business_type_preference || profile.business_type_preference === 'not-sure' 
      ? 'Show diverse business types'
      : `Prioritize ${profile.business_type_preference} ideas but include 1-2 alternatives`;

    const difficultyGuidance = profile.commitment_level === 'exploring'
      ? 'Favor difficulty_level 1-2 (easy to start)'
      : profile.commitment_level === 'ready'
      ? 'Can include difficulty_level up to 4 (more ambitious)'
      : 'Mix of difficulty_level 2-3 (moderate)';

    // Prepare profile data for AI
    const profileData: Record<string, any> = {
      // Core profile
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
      // Structured onboarding fields
      entry_trigger: profile.entry_trigger,
      future_vision: profile.future_vision,
      desired_identity: profile.desired_identity,
      business_type_preference: profile.business_type_preference,
      energy_source: profile.energy_source,
      learning_style: profile.learning_style,
      commitment_level: profile.commitment_level,
    };

    // Add extended intake if available
    if (extendedIntake) {
      profileData.extended_profile = {
        deep_desires: extendedIntake.deep_desires,
        fears: extendedIntake.fears,
        identity_statements: extendedIntake.identity_statements,
        energy_givers: extendedIntake.energy_givers,
        energy_drainers: extendedIntake.energy_drainers,
        business_archetypes: extendedIntake.business_archetypes,
        work_preferences: extendedIntake.work_preferences,
        personality_flags: extendedIntake.personality_flags,
      };
    }

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

    // Build dynamic system prompt based on available data
    const systemPrompt = buildSystemPrompt(hasExtendedIntake, businessTypeHint, difficultyGuidance);

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_business_ideas",
              description: "Generate personalized business ideas with fit scores and detailed information",
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
                        why_it_fits: { type: "string" },
                        business_model_type: { 
                          type: "string",
                          enum: ["saas", "coaching", "productized_service", "community", "content", "marketplace", "hybrid"]
                        },
                        target_customer: { type: "string" },
                        how_it_makes_money: { type: "string" },
                        time_to_first_dollar: { 
                          type: "string",
                          enum: ["weeks", "months", "year_plus"]
                        },
                        complexity: { 
                          type: "string", 
                          enum: ["low", "medium", "high"] 
                        },
                        difficulty_level: { type: "integer", minimum: 1, maximum: 5 },
                        time_intensity_hours_per_week: { type: "integer", minimum: 1, maximum: 80 },
                        first_three_steps: {
                          type: "array",
                          items: { type: "string" },
                          minItems: 3,
                          maxItems: 3
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
                        "why_it_fits",
                        "business_model_type",
                        "target_customer",
                        "how_it_makes_money",
                        "time_to_first_dollar",
                        "complexity",
                        "difficulty_level",
                        "time_intensity_hours_per_week",
                        "first_three_steps",
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
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error("generate-ideas: AI gateway error:", status, errorText);

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

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    // Return both inserted ideas and the full generated data (for UI display of extra fields)
    return new Response(
      JSON.stringify({ 
        ideas: insertedIdeas,
        generated_details: generatedIdeas.ideas // Include extra fields like why_it_fits, first_three_steps, etc.
      }),
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
