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
    const { userId, ideaId } = await req.json();
    
    // Resolve userId: prefer body, fallback to auth context
    let resolvedUserId = userId;
    
    if (!resolvedUserId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const tempClient = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data: { user } } = await tempClient.auth.getUser(authHeader.replace('Bearer ', ''));
        if (user) {
          resolvedUserId = user.id;
        }
      }
    }
    
    if (!resolvedUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing user id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: resolved userId');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the chosen idea (use ideaId if provided, otherwise find chosen idea)
    let chosenIdea;
    if (ideaId) {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .eq('user_id', resolvedUserId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching idea by id:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch idea' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      chosenIdea = data;
    } else {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', resolvedUserId)
        .eq('status', 'chosen')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching chosen idea:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch chosen idea' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      chosenIdea = data;
    }

    if (!chosenIdea) {
      return new Response(
        JSON.stringify({ error: 'No chosen idea found. Please select an idea first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: idea found');

    // Fetch the idea analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('idea_analysis')
      .select('*')
      .eq('idea_id', chosenIdea.id)
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (analysisError) {
      console.error('Error fetching idea analysis:', analysisError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch idea analysis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'No analysis found for this idea. Please analyze the idea first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: analysis found');

    // Fetch the founder profile
    const { data: profile, error: profileError } = await supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', resolvedUserId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching founder profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch founder profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'No founder profile found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: profile found');

    // Load the prompt template from generateMasterPrompt.txt
    const promptTemplate = `You are an elite meta-prompt engineer, startup strategist, and entrepreneurial execution architect.

Your job is to generate a single, extremely powerful MASTER PROMPT that gives the user:

- A complete definition of their founder identity
- A complete definition of their chosen business idea
- A full problem → solution → execution framework
- A business model outline
- Go-to-market positioning
- A 90-day execution plan
- A weekly sprint structure
- Key risks
- Key assumptions
- KPIs to track
- The user's personal constraints and strengths
- Instructions for the AI assistant receiving this prompt

Input JSON includes:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... }
}

Respond with STRICT JSON only:

{
  "prompt_body": "string",
  "platform_target": "general_strategy",
  "idea_id": "string"
}

The prompt_body should be a SINGLE TEXT BLOCK that:
- Describes the founder's context
- Describes the chosen idea
- Summarizes the idea analysis
- Includes instructions for any model receiving the prompt
- Includes business strategy guidance
- Includes constraints and preferences
- Includes initial steps for execution
- Ends with: "Always ask me clarifying questions before generating answers."

Return strictly JSON. Do not include markdown or commentary outside the JSON.`;

    // Construct input JSON for the LLM
    const inputData = {
      founder_profile: profile,
      idea: chosenIdea,
      analysis: analysis
    };

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
          { role: 'user', content: JSON.stringify(inputData) }
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
                  prompt_body: {
                    type: "string",
                    description: "The complete master prompt text"
                  },
                  platform_target: {
                    type: "string",
                    description: "Target platform for the prompt"
                  },
                  idea_id: {
                    type: "string",
                    description: "The ID of the idea"
                  }
                },
                required: ["prompt_body", "platform_target", "idea_id"],
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

    if (!masterPromptData.prompt_body || !masterPromptData.platform_target || !masterPromptData.idea_id) {
      console.error('Missing required fields in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into master_prompts table
    const { error: insertError } = await supabase
      .from('master_prompts')
      .insert({
        user_id: resolvedUserId,
        idea_id: chosenIdea.id,
        prompt_body: masterPromptData.prompt_body,
        platform_target: masterPromptData.platform_target
      });

    if (insertError) {
      console.error('Error inserting master prompt:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save master prompt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the response
    return new Response(
      JSON.stringify({
        prompt_body: masterPromptData.prompt_body,
        platform_target: masterPromptData.platform_target,
        idea_id: masterPromptData.idea_id
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
