import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      console.error('No userId provided in request body');
      return new Response(
        JSON.stringify({ error: 'userId is required in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating master prompt for user: ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the user's chosen idea
    const { data: chosenIdea, error: ideaError } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'chosen')
      .maybeSingle();

    if (ideaError) {
      console.error('Error fetching chosen idea:', ideaError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch chosen idea' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chosenIdea) {
      console.error('No chosen idea found');
      return new Response(
        JSON.stringify({ error: 'No chosen idea found. Please select an idea first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found chosen idea: ${chosenIdea.id}`);

    // Fetch the idea analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('idea_analysis')
      .select('*')
      .eq('idea_id', chosenIdea.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError) {
      console.error('Error fetching idea analysis:', analysisError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch idea analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!analysis) {
      console.error('No analysis found for chosen idea');
      return new Response(
        JSON.stringify({ error: 'No analysis found for this idea. Please analyze the idea first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found idea analysis');

    // Fetch the founder profile
    const { data: profile, error: profileError } = await supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching founder profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch founder profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.error('No founder profile found');
      return new Response(
        JSON.stringify({ error: 'No founder profile found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found founder profile');

    // Prompt template (embedded)
    const promptTemplate = `You are an expert business strategist and founder coach. Your task is to synthesize a founder's profile, their chosen business idea, and a detailed market analysis into a comprehensive "Master Prompt" that they can use as a guiding North Star throughout their entrepreneurial journey.

**INPUT:**
You will receive three key pieces of data:
1. **Founder Profile**: Their passions, skills, constraints (time, capital, tech level), risk tolerance, lifestyle goals, and success vision.
2. **Chosen Idea**: The business idea they've selected, including title, description, business model, target customer, complexity, time to first dollar, and fit scores.
3. **Market Analysis**: The brutal, honest assessment including niche score, market overview, problem intensity, competition snapshot, pricing range, main risks, brutal take, and suggested modifications.

**OUTPUT:**
Return a JSON object with a single field:
{
  "master_prompt": "string"
}

The master_prompt should be a **comprehensive, long-form guidance document** (800-1200 words) that the founder can copy and paste into any AI tool (ChatGPT, Claude, etc.) to get contextualized advice throughout their journey.

**STRUCTURE OF THE MASTER PROMPT:**

1. **Founder Identity & Context** (150-200 words)
   - Summarize who they are: passions, core skills, and professional background
   - Their constraints: time availability, capital, technical capabilities
   - Risk tolerance and lifestyle priorities
   - Their definition of success

2. **The Chosen Path** (150-200 words)
   - The business idea they've committed to
   - Why it aligns with their strengths and constraints
   - Target customer and business model
   - Expected timeline to first revenue

3. **Market Reality Check** (200-250 words)
   - Honest assessment of the niche (niche score context)
   - Market dynamics and problem intensity
   - Competitive landscape
   - Realistic pricing expectations
   - Key risks they must navigate

4. **Strategic Modifications & Approach** (150-200 words)
   - Suggested tweaks to improve market fit
   - How to position uniquely given their constraints
   - Specific advantages they can leverage

5. **Operating Principles** (200-250 words)
   - How they should approach decision-making
   - Guardrails based on their risk tolerance
   - Time and capital allocation strategies
   - When to pivot vs. persist
   - How to measure progress aligned with their vision of success

6. **Context for AI Assistants** (100-150 words)
   - Clear instructions for any AI tool reading this prompt
   - What kind of advice to prioritize
   - What to avoid given their constraints
   - How to tailor responses to their lifestyle goals

**TONE & STYLE:**
- Direct, honest, and motivating
- Reference specific details from their profile and analysis
- Actionable and concrete, not generic platitudes
- Acknowledge both opportunities and real challenges
- Write in second person ("You are a founder who...")
- Make it feel like a personalized strategic brief

**CRITICAL GUIDELINES:**
- The master_prompt field should be a single cohesive string (use \\n for line breaks)
- Integrate actual data points from the input (don't be vague)
- Make it copy-paste ready for immediate use in other AI tools
- Balance realism (from the brutal take) with encouragement
- Ensure it's evergreen guidance, not time-sensitive advice

Return ONLY the JSON object with the master_prompt field. No other commentary.`;

    // Prepare the data payload for the AI
    const inputData = {
      profile: {
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
      chosen_idea: {
        title: chosenIdea.title,
        description: chosenIdea.description,
        business_model_type: chosenIdea.business_model_type,
        target_customer: chosenIdea.target_customer,
        time_to_first_dollar: chosenIdea.time_to_first_dollar,
        complexity: chosenIdea.complexity,
        passion_fit_score: chosenIdea.passion_fit_score,
        skill_fit_score: chosenIdea.skill_fit_score,
        constraint_fit_score: chosenIdea.constraint_fit_score,
        lifestyle_fit_score: chosenIdea.lifestyle_fit_score,
        overall_fit_score: chosenIdea.overall_fit_score,
      },
      analysis: {
        niche_score: analysis.niche_score,
        market_insight: analysis.market_insight,
        problem_intensity: analysis.problem_intensity,
        competition_snapshot: analysis.competition_snapshot,
        pricing_power: analysis.pricing_power,
        biggest_risks: analysis.biggest_risks,
        brutal_honesty: analysis.brutal_honesty,
        recommendations: analysis.recommendations,
      },
    };

    const userPrompt = `Generate a comprehensive Master Prompt based on the following data:\n\n${JSON.stringify(inputData, null, 2)}`;

    console.log('Calling Lovable AI Gateway...');

    // Call Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: promptTemplate },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_master_prompt",
              description: "Generate a comprehensive master prompt for the founder",
              parameters: {
                type: "object",
                properties: {
                  master_prompt: {
                    type: "string",
                    description: "The complete master prompt text (800-1200 words)"
                  }
                },
                required: ["master_prompt"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_master_prompt" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate master prompt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('No tool call in AI response');
      return new Response(
        JSON.stringify({ error: 'No tool call generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from tool call
    let masterPromptData;
    try {
      masterPromptData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      console.error('Tool call arguments:', toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!masterPromptData.master_prompt) {
      console.error('No master_prompt field in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Master prompt generated successfully');

    // Return the response in the format requested by the user
    return new Response(
      JSON.stringify({
        idea_id: chosenIdea.id,
        platform_target: 'general_strategy',
        prompt_body: masterPromptData.master_prompt,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-master-prompt function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
