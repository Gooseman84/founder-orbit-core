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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating master prompt for user: ${user.id}`);

    // Fetch the user's chosen idea
    const { data: chosenIdea, error: ideaError } = await supabase
      .from('ideas')
      .select('*')
      .eq('user_id', user.id)
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
      .eq('user_id', user.id)
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
      .eq('user_id', user.id)
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

    // Read the prompt template
    const promptTemplate = await Deno.readTextFile('./prompts/generateMasterPrompt.txt');

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
        market_overview: analysis.market_overview,
        problem_intensity: analysis.problem_intensity,
        competition_snapshot: analysis.competition_snapshot,
        pricing_range: analysis.pricing_range,
        main_risks: analysis.main_risks,
        brutal_take: analysis.brutal_take,
        suggested_modifications: analysis.suggested_modifications,
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

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from AI
    let masterPromptData;
    try {
      masterPromptData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI content:', aiContent);
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
