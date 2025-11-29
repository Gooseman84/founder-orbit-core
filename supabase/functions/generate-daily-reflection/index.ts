import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are TrueBlazer's Daily Reflection Coach — an empathetic, grounded, and action-oriented AI partner.

Your job: Take the founder's daily check-in data and produce a meaningful reflection summary with actionable next steps.

Input JSON:
{
  "energy_level": number (1-5),
  "stress_level": number (1-5),
  "mood_tags": string[],
  "what_did": string,
  "what_learned": string,
  "what_felt": string,
  "top_priority": string,
  "blockers": string,
  "founder_profile": { ...optional },
  "chosen_idea": { ...optional }
}

Output STRICT JSON ONLY:

{
  "ai_summary": "string (2-4 sentences summarizing their day — what they accomplished, their emotional state, and any notable patterns)",
  "ai_theme": "string (a short 2-5 word theme for the day, e.g., 'Building Momentum', 'Overcoming Doubt', 'Rest & Reset')",
  "ai_micro_actions": [
    {
      "title": "string",
      "description": "string",
      "estimated_minutes": number
    }
  ],
  "ai_suggested_task": {
    "title": "string",
    "description": "string",
    "xp_reward": number,
    "type": "micro" | "quest"
  } | null
}

Rules:
- ai_summary should be empathetic and reflect their actual words back to them
- ai_theme should capture the essence of their day in a memorable phrase
- ai_micro_actions should be 1-3 concrete, small actions for tomorrow (2-10 minutes each)
- ai_suggested_task is optional — only include if there's a clear next step that deserves to be tracked as a task
- If they mentioned blockers, address them in the micro_actions
- If energy is low (1-2), suggest restorative actions
- If stress is high (4-5), acknowledge it and suggest stress-reducing actions
- Keep language simple, warm, and motivational — no clichés
- Always return valid JSON only`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, energy_level, stress_level, mood_tags, what_did, what_learned, what_felt, top_priority, blockers } = await req.json();

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
      energy_level,
      stress_level,
      mood_tags: mood_tags || [],
      what_did: what_did || '',
      what_learned: what_learned || '',
      what_felt: what_felt || '',
      top_priority: top_priority || '',
      blockers: blockers || '',
      founder_profile: founderProfile ? {
        passions: founderProfile.passions_tags,
        skills: founderProfile.skills_tags,
        time_per_week: founderProfile.time_per_week,
      } : null,
      chosen_idea: chosenIdea ? {
        title: chosenIdea.title,
        description: chosenIdea.description,
      } : null,
    };

    console.log('[generate-daily-reflection] AI input:', JSON.stringify(aiInput));

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
      console.error('[generate-daily-reflection] OpenAI error:', errorText);
      
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
    
    console.log('[generate-daily-reflection] AI response:', rawContent);

    let aiResult;
    try {
      aiResult = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('[generate-daily-reflection] Failed to parse AI response:', parseError);
      aiResult = {
        ai_summary: 'Thank you for checking in today. Take a moment to appreciate your progress.',
        ai_theme: 'Reflection Day',
        ai_micro_actions: [],
        ai_suggested_task: null,
      };
    }

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Upsert into daily_reflections (one per user per day)
    const { data: reflection, error: upsertError } = await supabase
      .from('daily_reflections')
      .upsert({
        user_id: userId,
        reflection_date: today,
        energy_level,
        stress_level,
        mood_tags: mood_tags || [],
        what_did,
        what_learned,
        what_felt,
        top_priority,
        blockers,
        ai_summary: aiResult.ai_summary,
        ai_theme: aiResult.ai_theme,
        ai_micro_actions: aiResult.ai_micro_actions || [],
        ai_suggested_task: aiResult.ai_suggested_task,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,reflection_date',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[generate-daily-reflection] Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('[generate-daily-reflection] Reflection saved:', reflection.id);

    return new Response(JSON.stringify({
      success: true,
      reflection,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-daily-reflection] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
