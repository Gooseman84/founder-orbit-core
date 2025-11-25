import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { idea_id } = await req.json();

    if (!idea_id) {
      return new Response(
        JSON.stringify({ error: 'idea_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating micro-tasks for user:', user.id, 'idea:', idea_id);

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('founder_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch founder profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the chosen idea
    const { data: idea, error: ideaError } = await supabaseClient
      .from('ideas')
      .select('*')
      .eq('id', idea_id)
      .eq('user_id', user.id)
      .single();

    if (ideaError) {
      console.error('Idea fetch error:', ideaError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch idea' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch completed tasks to avoid duplicates
    const { data: completedTasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('title, description')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (tasksError) {
      console.error('Tasks fetch error:', tasksError);
      // Non-critical, continue with empty array
    }

    // Embedded prompt template
    const promptTemplate = `You are an expert startup advisor who creates actionable micro-tasks for founders. Your goal is to break down the founder's journey into small, achievable actions that build momentum.

**INPUT:**
You will receive:
1. **Founder Profile**: Their skills, constraints (time, capital), and current focus
2. **Business Idea**: The chosen idea they're working on
3. **Completed Tasks**: Tasks they've already finished (to avoid duplicates)

**OUTPUT:**
Return a JSON object with a single field:
\`\`\`json
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "category": "string",
      "estimated_minutes": "number",
      "xp_reward": "number"
    }
  ]
}
\`\`\`

**TASK GENERATION GUIDELINES:**

1. **Generate 3-5 micro-tasks** that are:
   - Small enough to complete in one sitting (5-60 minutes each)
   - Specific and actionable (not vague goals)
   - Relevant to their current stage and idea
   - Progressive (building on completed tasks)

2. **Categories** should be one of:
   - "Research" - market research, competitor analysis
   - "Validation" - customer interviews, surveys
   - "Planning" - strategy, roadmap, MVP definition
   - "Building" - creating prototypes, MVPs, landing pages
   - "Marketing" - content, outreach, positioning
   - "Operations" - setup, legal, tools

3. **XP Rewards** based on effort:
   - 5-10 XP: Quick wins (5-15 min)
   - 15-25 XP: Moderate tasks (20-45 min)
   - 30-50 XP: Substantial work (45-60 min)

4. **Prioritize based on**:
   - Their time constraints (don't suggest 60-min tasks if they have limited time)
   - Their skill level (match complexity to their abilities)
   - What moves the needle (focus on validation and customer connection early on)

5. **Avoid**:
   - Tasks they've already completed
   - Generic advice ("work on your business")
   - Tasks requiring resources they don't have

**EXAMPLES:**

For an early-stage founder with a SaaS idea:
\`\`\`json
{
  "tasks": [
    {
      "title": "Write down 3 customer pain points",
      "description": "List the top 3 specific problems your target customer faces daily that your solution addresses. Be concrete.",
      "category": "Planning",
      "estimated_minutes": 10,
      "xp_reward": 10
    },
    {
      "title": "Find 5 potential customers on LinkedIn",
      "description": "Search for and save 5 profiles that match your ideal customer profile. Note why each is a good fit.",
      "category": "Research",
      "estimated_minutes": 20,
      "xp_reward": 15
    },
    {
      "title": "Draft a cold outreach message",
      "description": "Write a 3-sentence email introducing your idea and asking for a 15-minute call. Make it about them, not you.",
      "category": "Validation",
      "estimated_minutes": 15,
      "xp_reward": 20
    }
  ]
}
\`\`\`

Return ONLY the JSON object. No other text or commentary.`;

    // Build the user prompt with context
    const userPrompt = `
**Founder Profile:**
- Skills: ${profile.skills_text || 'Not specified'}
- Skills Tags: ${profile.skills_tags?.join(', ') || 'None'}
- Tech Level: ${profile.tech_level || 'Not specified'}
- Time per week: ${profile.time_per_week || 'Not specified'} hours
- Capital available: $${profile.capital_available || 0}
- Risk tolerance: ${profile.risk_tolerance || 'Not specified'}

**Business Idea:**
- Title: ${idea.title}
- Description: ${idea.description || 'No description'}
- Business Model: ${idea.business_model_type || 'Not specified'}
- Target Customer: ${idea.target_customer || 'Not specified'}
- Time to First Dollar: ${idea.time_to_first_dollar || 'Not specified'}
- Complexity: ${idea.complexity || 'Not specified'}

**Completed Tasks:**
${completedTasks && completedTasks.length > 0 
  ? completedTasks.map(t => `- ${t.title}`).join('\n') 
  : '- None yet'}

Generate 3-5 actionable micro-tasks for this founder.
`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: promptTemplate },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    console.log('AI response:', generatedContent);

    // Parse JSON response
    let parsedTasks;
    try {
      parsedTasks = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: generatedContent }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parsedTasks.tasks || !Array.isArray(parsedTasks.tasks)) {
      console.error('Invalid tasks structure:', parsedTasks);
      return new Response(
        JSON.stringify({ error: 'Invalid tasks structure in AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert tasks into database
    const tasksToInsert = parsedTasks.tasks.map((task: any) => ({
      user_id: user.id,
      idea_id: idea_id,
      title: task.title,
      description: task.description,
      category: task.category,
      estimated_minutes: task.estimated_minutes,
      xp_reward: task.xp_reward,
      status: 'open',
    }));

    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Task insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert tasks', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created tasks:', insertedTasks?.length);

    return new Response(
      JSON.stringify({ tasks: insertedTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-micro-tasks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
