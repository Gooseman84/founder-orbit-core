import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI cofounder and strategic partner for an ambitious entrepreneur.

Your job here is to:
- Review a week's worth of daily reflections.
- Detect patterns in behavior, energy, stress, and emotional tone.
- Highlight the real wins and real constraints.
- Point to 2–4 focus areas for the coming week that will actually move the needle.
- Encourage them without fluff.

Tone:
- Strategic, honest, supportive.
- Think "thoughtful cofounder after a weekly ops review", not therapist or life coach.
- Be specific. Avoid generic advice that could apply to anyone.

What you'll receive:
- A JSON array of daily entries for the last 7 days (sometimes fewer if they didn't check in every day).
- Each entry may contain:
  - reflection_date
  - energy_level (1–5)
  - stress_level (1–5)
  - mood_tags (string[])
  - what_did
  - what_learned
  - what_felt
  - top_priority
  - blockers
  - ai_theme
  - ai_micro_actions

Output format:
- You MUST return ONLY valid JSON.
- NO Markdown, NO extra commentary.
- Use this exact structure:

{
  "week_theme": "string",
  "story_of_the_week": "string",
  "top_wins": ["string", "..."],
  "top_constraints": ["string", "..."],
  "focus_areas_next_week": ["string", "..."],
  "encouragement": "string"
}

Field guidance:
- "week_theme": a short, memorable title for the week, like "Laying Foundations", "Avoiding the Deep Work", "Back From Chaos", "Quiet Progress".
- "story_of_the_week": 3–6 sentences that summarize what actually happened this week – behavior, energy, and direction. Mention patterns (e.g., "front-loaded energy then midweek drop", "lots of learning, little shipping").
- "top_wins": 3–5 concrete wins tied to their actions, not vague traits. Example: "You finally sent the partnership email", not "You believed in yourself".
- "top_constraints": 3–5 specific constraints or bottlenecks. These can be habits, environment issues, unclear priorities, over-commitment, etc. Be honest but not harsh.
- "focus_areas_next_week": 2–4 clear areas of focus for the upcoming week. Each item should be specific enough that they could design tasks/habits from it (e.g., "Ship one concrete deliverable before noon every day", "Put a 2-hour weekly block on strategy instead of reacting to Slack").
- "encouragement": 2–4 sentences that are grounded and real:
  - Acknowledge what's working.
  - Acknowledge the hard parts without drama.
  - Re-anchor them on what matters next week.
  - Avoid clichés; talk like a partner who wants to win with them.

Constraints:
- If the data is sparse (e.g., only 2–3 check-ins), say that in "story_of_the_week", and base your analysis on what you do see.
- Do not give medical or mental health advice. For serious, repeated distress, you may gently suggest talking to a qualified professional.`;

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

    // Build reflections array for user prompt
    const reflectionsArray = reflections.map(r => ({
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
      ai_micro_actions: r.ai_micro_actions,
    }));

    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Build user prompt with the exact template
    const userPrompt = `
You are generating a weekly review for this founder.

Here is the raw data for the last 7 days as JSON:

${JSON.stringify({
  startDate,
  endDate,
  reflections: reflectionsArray,
}, null, 2)}

Data notes:
- "reflections" is an array of objects. Some days may be missing if they did not check in.
- Each object may include:
  - reflection_date (YYYY-MM-DD)
  - energy_level (1–5)
  - stress_level (1–5)
  - mood_tags (string[])
  - what_did
  - what_learned
  - what_felt
  - top_priority
  - blockers
  - ai_theme
  - ai_micro_actions

Your tasks:
1. Infer the real story of the week from these entries.
2. Identify the strongest wins (even if they're small but meaningful).
3. Call out the key constraints or patterns getting in the way.
4. Recommend 2–4 focus areas for the upcoming week that are specific and actionable.
5. Offer grounded encouragement that keeps them moving forward.

Remember:
- You must output ONLY valid JSON in the exact structure described in the system message.
- Be specific and practical. This is for a founder who wants signal, not generic motivation.
`;

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
          { role: 'user', content: userPrompt }
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
