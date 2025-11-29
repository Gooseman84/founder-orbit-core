import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are TrueBlazer's Daily Reflection Coach — an empathetic, grounded, and action-oriented AI partner for ambitious founders.

Your job: Take the founder's daily check-in data and produce a meaningful reflection summary with actionable next steps.

You will receive input like:
- energy_level (1-5, where 1=exhausted, 5=fully energized)
- stress_level (1-5, where 1=calm, 5=extremely stressed)
- mood_tags (array of mood descriptors)
- what_did (what they accomplished today)
- what_learned (insights or learnings)
- what_felt (emotional reflection, what they're proud of)
- top_priority (their main focus for tomorrow)
- blockers (obstacles or challenges)

Respond with ONLY valid JSON in this exact structure:
{
  "summary": "2-4 sentences summarizing their day — what they accomplished, their emotional state, and any notable patterns",
  "theme": "A short 2-5 word theme for the day, e.g., 'Building Momentum', 'Overcoming Doubt', 'Rest & Reset'",
  "micro_actions": ["1-3 concrete, small actions for tomorrow (2-10 minutes each)"],
  "suggested_task": {
    "title": "Short task title",
    "notes": "Brief description of what to do"
  }
}

Rules:
- summary should be empathetic and reflect their actual words back to them
- theme should capture the essence of their day in a memorable phrase
- micro_actions should be 1-3 realistic, specific tweaks for tomorrow
- suggested_task can be null if there's no clear actionable next step
- If they mentioned blockers, address them in the micro_actions
- If energy is low (1-2), suggest restorative actions
- If stress is high (4-5), acknowledge it and suggest stress-reducing actions
- Keep language simple, warm, and motivational — no clichés
- Always return valid JSON only, no markdown or extra text`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Accept both camelCase and snake_case inputs for flexibility
    const userId = body.userId || body.user_id;
    const reflectionDate = body.reflectionDate || body.reflection_date || new Date().toISOString().split('T')[0];
    const energyLevel = body.energyLevel ?? body.energy_level;
    const stressLevel = body.stressLevel ?? body.stress_level;
    const moodTags = body.moodTags || body.mood_tags || [];
    const whatDid = body.whatDid || body.what_did || '';
    const whatLearned = body.whatLearned || body.what_learned || '';
    const whatFelt = body.whatFelt || body.what_felt || '';
    const topPriority = body.topPriority || body.top_priority || '';
    const blockers = body.blockers || '';

    console.log('[generate-daily-reflection] Received request for userId:', userId);

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('[generate-daily-reflection] Missing OPENAI_API_KEY');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch founder profile for additional context
    const { data: founderProfile } = await supabase
      .from('founder_profiles')
      .select('passions_tags, skills_tags, time_per_week')
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch chosen idea for context
    const { data: chosenIdea } = await supabase
      .from('ideas')
      .select('title, description')
      .eq('user_id', userId)
      .eq('status', 'chosen')
      .maybeSingle();

    // Build AI input
    const aiInput = {
      energy_level: energyLevel,
      stress_level: stressLevel,
      mood_tags: moodTags,
      what_did: whatDid,
      what_learned: whatLearned,
      what_felt: whatFelt,
      top_priority: topPriority,
      blockers: blockers,
      founder_context: founderProfile ? {
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
      console.error('[generate-daily-reflection] OpenAI error:', openaiResponse.status, errorText);
      
      if (openaiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices[0]?.message?.content || '{}';
    
    console.log('[generate-daily-reflection] AI raw response:', rawContent);

    // Parse AI response defensively
    let aiResult;
    try {
      // Strip markdown code blocks if present
      let cleanContent = rawContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      
      aiResult = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('[generate-daily-reflection] Failed to parse AI response:', parseError);
      // Fall back to safe defaults
      aiResult = {
        summary: 'Thank you for checking in today. Taking time to reflect is an important step in your founder journey.',
        theme: 'Daily Reflection',
        micro_actions: ['Review your top priority for tomorrow', 'Take a 5-minute break to reset'],
        suggested_task: null,
      };
    }

    // Ensure arrays and objects are properly structured
    const summary = typeof aiResult.summary === 'string' ? aiResult.summary : 'Reflection recorded successfully.';
    const theme = typeof aiResult.theme === 'string' ? aiResult.theme : 'Daily Check-In';
    const microActions = Array.isArray(aiResult.micro_actions) ? aiResult.micro_actions : [];
    const suggestedTask = aiResult.suggested_task && typeof aiResult.suggested_task === 'object' 
      ? { title: aiResult.suggested_task.title || '', notes: aiResult.suggested_task.notes || '' }
      : null;

    console.log('[generate-daily-reflection] Parsed AI result:', { summary, theme, microActions, suggestedTask });

    // Upsert into daily_reflections using (user_id, reflection_date) as key
    const upsertData = {
      user_id: userId,
      reflection_date: reflectionDate,
      energy_level: energyLevel,
      stress_level: stressLevel,
      mood_tags: moodTags,
      what_did: whatDid || null,
      what_learned: whatLearned || null,
      what_felt: whatFelt || null,
      top_priority: topPriority || null,
      blockers: blockers || null,
      ai_summary: summary,
      ai_theme: theme,
      ai_micro_actions: microActions,
      ai_suggested_task: suggestedTask,
      updated_at: new Date().toISOString(),
    };

    console.log('[generate-daily-reflection] Upserting data:', JSON.stringify(upsertData));

    const { data: reflection, error: upsertError } = await supabase
      .from('daily_reflections')
      .upsert(upsertData, {
        onConflict: 'user_id,reflection_date',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[generate-daily-reflection] Upsert error:', upsertError);
      throw upsertError;
    }

    console.log('[generate-daily-reflection] Reflection saved successfully:', reflection.id);

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
