import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are TrueBlazer's Weekly Review Coach — a strategic, supportive AI partner helping founders reflect on their week.

Your job: Analyze 7 days of daily reflections and produce a meaningful weekly summary with insights and focus areas.

Input JSON:
{
  "reflections": [
    {
      "reflection_date": "YYYY-MM-DD",
      "energy_level": number,
      "stress_level": number,
      "mood_tags": string[],
      "what_did": string,
      "what_learned": string,
      "what_felt": string,
      "top_priority": string,
      "blockers": string,
      "ai_theme": string
    }
  ],
  "founder_profile": { ...optional },
  "chosen_idea": { ...optional }
}

Output STRICT JSON ONLY:

{
  "week_theme": "string (a memorable 3-6 word title for the week, e.g., 'The Week of Laying Foundations')",
  "story_of_the_week": "string (3-5 sentences narrative summarizing the week's journey — what happened, how they felt, what changed)",
  "top_wins": [
    "string (concrete accomplishment or breakthrough)"
  ],
  "top_constraints": [
    "string (blockers, challenges, or friction points that came up)"
  ],
  "focus_areas_next_week": [
    {
      "area": "string (short label)",
      "why": "string (brief explanation)",
      "suggested_action": "string (one concrete thing to do)"
    }
  ],
  "energy_trend": "rising" | "stable" | "declining",
  "stress_trend": "rising" | "stable" | "declining",
  "encouragement": "string (1-2 sentences of personalized encouragement based on their week)"
}

Rules:
- top_wins should have 1-3 items, pulled from what_did and what_learned
- top_constraints should have 1-3 items, pulled from blockers and what_felt
- focus_areas_next_week should have exactly 3 items
- Identify patterns across the week (recurring themes, energy patterns, blockers)
- Be honest but encouraging — acknowledge struggles while highlighting progress
- week_theme should feel inspiring and capture the essence of their journey
- Keep language simple and warm
- Always return valid JSON only`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Fetch reflections from the last 7 days
    const { data: reflections, error: reflectionsError } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .gte('reflection_date', sevenDaysAgo.toISOString().split('T')[0])
      .lte('reflection_date', today.toISOString().split('T')[0])
      .order('reflection_date', { ascending: true });

    if (reflectionsError) {
      console.error('[generate-weekly-summary] Error fetching reflections:', reflectionsError);
      throw reflectionsError;
    }

    if (!reflections || reflections.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No reflections found for the past week',
        message: 'Complete some daily check-ins first to generate a weekly summary.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch founder profile
    const { data: founderProfile } = await supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch chosen idea
    const { data: chosenIdea } = await supabase
      .from('ideas')
      .select('id, title, description')
      .eq('user_id', userId)
      .eq('status', 'chosen')
      .maybeSingle();

    // Build AI input
    const aiInput = {
      reflections: reflections.map(r => ({
        reflection_date: r.reflection_date,
        energy_level: r.energy_level,
        stress_level: r.stress_level,
        mood_tags: r.mood_tags,
        what_did: r.what_did,
        what_learned: r.what_learned,
        what_felt: r.what_felt,
        top_priority: r.top_priority,
        blockers: r.blockers,
        ai_theme: r.ai_theme,
      })),
      founder_profile: founderProfile ? {
        passions: founderProfile.passions_tags,
        skills: founderProfile.skills_tags,
      } : null,
      chosen_idea: chosenIdea ? {
        title: chosenIdea.title,
        description: chosenIdea.description,
      } : null,
    };

    console.log('[generate-weekly-summary] Processing', reflections.length, 'reflections');

    // Call OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(aiInput) }
        ],
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[generate-weekly-summary] OpenAI error:', errorText);
      
      if (openaiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices[0]?.message?.content || '{}';
    
    console.log('[generate-weekly-summary] AI response:', rawContent);

    let summary;
    try {
      summary = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[generate-weekly-summary] Failed to parse AI response:', parseError);
      return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Add metadata
    summary.week_start = sevenDaysAgo.toISOString().split('T')[0];
    summary.week_end = today.toISOString().split('T')[0];
    summary.reflection_count = reflections.length;

    return new Response(JSON.stringify({
      success: true,
      summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-weekly-summary] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
