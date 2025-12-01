import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Context Builder (embedded for edge function) ----------------

interface UserContext {
  profile: any | null;
  extendedIntake: any | null;
  chosenIdea: any | null;
  ideaAnalysis: any | null;
  recentDocs: any[];
  recentReflections: any[];
}

async function buildUserContext(client: any, userId: string): Promise<UserContext> {
  const [
    profileRes,
    extendedIntakeRes,
    chosenIdeaRes,
    recentDocsRes,
    recentReflectionsRes,
  ] = await Promise.all([
    client.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('user_intake_extended').select('*').eq('user_id', userId).maybeSingle(),
    client.from('ideas').select('*').eq('user_id', userId).eq('status', 'chosen').maybeSingle(),
    client.from('workspace_documents')
      .select('id, title, content, doc_type, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    client.from('daily_reflections')
      .select('reflection_date, ai_summary, ai_theme, energy_level, stress_level, mood_tags, what_did, top_priority')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(7),
  ]);

  // If we have a chosen idea, also fetch its analysis
  let ideaAnalysis = null;
  if (chosenIdeaRes.data?.id) {
    const { data: analysis } = await client
      .from('idea_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('idea_id', chosenIdeaRes.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ideaAnalysis = analysis;
  }

  return {
    profile: profileRes.data ?? null,
    extendedIntake: extendedIntakeRes.data ?? null,
    chosenIdea: chosenIdeaRes.data ?? null,
    ideaAnalysis,
    recentDocs: recentDocsRes.data ?? [],
    recentReflections: recentReflectionsRes.data ?? [],
  };
}

function formatDocsForPrompt(docs: { title: string | null; content: string | null; doc_type?: string | null }[]): string {
  if (!docs?.length) return 'No recent workspace notes.';
  return docs
    .map((doc, idx) => {
      const title = doc.title || `Document ${idx + 1}`;
      const docType = doc.doc_type ? ` (${doc.doc_type})` : '';
      const content = (doc.content || '').slice(0, 400).trim();
      const truncated = content.length >= 400 ? '...' : '';
      return `- [${title}${docType}]: ${content}${truncated}`;
    })
    .join('\n');
}

function formatReflectionsForPrompt(reflections: any[]): string {
  if (!reflections?.length) return 'No recent reflections.';
  return reflections
    .slice(0, 5)
    .map((r) => {
      const date = r.reflection_date;
      const theme = r.ai_theme ? `Theme: "${r.ai_theme}"` : '';
      const energy = r.energy_level ? `Energy: ${r.energy_level}/5` : '';
      const stress = r.stress_level ? `Stress: ${r.stress_level}/5` : '';
      const priority = r.top_priority ? `Priority: "${r.top_priority}"` : '';
      const parts = [theme, energy, stress, priority].filter(Boolean).join(' | ');
      return `- [${date}] ${parts}`;
    })
    .join('\n');
}

// --- System Prompt ------------------------------------------------

const SYSTEM_PROMPT = `You are an elite execution strategist and co-founder assistant. Your job is to generate HIGHLY PERSONALIZED micro-tasks and quests that:

1. Are directly tied to what they're actively working on (their workspace documents)
2. Move their specific idea forward based on the analysis
3. Respect their time constraints, energy levels, and preferences
4. Reference specific documents when suggesting to continue work

Task Types:
- **Micro Tasks**: 5-15 minutes, low friction, immediately actionable
- **Founder Quests**: 20-60 minutes, higher leverage strategic work

Rules:
- NO generic advice. Every task must be specific to THEIR situation.
- When they have workspace documents, reference them directly (e.g., "Continue your 'Offer Design Doc' by adding pricing tiers...")
- Consider their recent energy/stress levels - if stressed, suggest lighter tasks
- Align with their passions, skills, and constraints
- Keep tasks concrete and achievable
- Always return valid JSON only`;

// Determine workspace metadata based on task content
function determineWorkspaceMetadata(title: string, description: string): { doc_type: string; workspace_enabled: boolean } {
  const combined = `${title} ${description}`.toLowerCase();
  
  if (combined.includes('my offer') || combined.includes('offer')) {
    return { doc_type: 'offer', workspace_enabled: true };
  }
  if (combined.includes('brain dump') || combined.includes('braindump')) {
    return { doc_type: 'brain_dump', workspace_enabled: true };
  }
  if (combined.includes('outline') || combined.includes('marketing outline')) {
    return { doc_type: 'outline', workspace_enabled: true };
  }
  
  return { doc_type: 'plan', workspace_enabled: true };
}

// Format tasks for database insertion
function formatTasks(rawTasks: any[], userId: string, ideaId: string | null) {
  if (!Array.isArray(rawTasks)) {
    throw new Error("Tasks must be an array");
  }

  return rawTasks.map((task: any, index: number) => {
    if (!task.title || typeof task.title !== "string") {
      throw new Error(`Task at index ${index} is missing a valid title`);
    }

    let type: string = "micro";
    if (task.type === "quest" || task.type === "micro") {
      type = task.type;
    }

    const xp_reward = typeof task.xp_reward === "number" && task.xp_reward > 0
      ? task.xp_reward
      : type === "quest" ? 20 : 10;

    const description = typeof task.description === "string" 
      ? task.description 
      : "";

    // Existing metadata from AI
    const existingMetadata = typeof task.metadata === "object" && task.metadata !== null
      ? task.metadata
      : {};

    // Determine workspace metadata based on content
    const workspaceMetadata = determineWorkspaceMetadata(task.title, description);

    // Merge metadata
    const metadata = {
      ...existingMetadata,
      doc_type: workspaceMetadata.doc_type,
      workspace_enabled: workspaceMetadata.workspace_enabled,
    };

    return {
      user_id: userId,
      idea_id: ideaId,
      type,
      title: task.title.trim(),
      description: description.trim(),
      xp_reward,
      metadata,
      status: 'pending',
    };
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let userId = body.userId;

    // If no userId in body, try to get from auth
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const anonClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        userId = user?.id;
      }
    }

    if (!userId) {
      console.error('No userId provided in body or auth');
      return new Response(
        JSON.stringify({ error: 'userId is required in request body or auth header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-micro-tasks: resolved userId:', userId);

    // Create service role client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- Fetch full user context ---
    console.log('generate-micro-tasks: fetching user context...');
    const userContext = await buildUserContext(supabaseClient, userId);
    const docsSnippet = formatDocsForPrompt(userContext.recentDocs);
    const reflectionsSnippet = formatReflectionsForPrompt(userContext.recentReflections);

    console.log('generate-micro-tasks: context loaded - profile:', !!userContext.profile, 
      'idea:', !!userContext.chosenIdea, 'analysis:', !!userContext.ideaAnalysis,
      'docs:', userContext.recentDocs.length, 'reflections:', userContext.recentReflections.length);

    // Require at least a profile
    if (!userContext.profile) {
      return new Response(
        JSON.stringify({ error: 'No founder profile found. Please complete onboarding first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- Build rich user prompt with full context ---
    const userPrompt = `Generate personalized micro-tasks and quests for this founder based on their complete context.

## Founder Profile
${JSON.stringify({
  passions: userContext.profile.passions_text || userContext.profile.passions_tags?.join(', ') || 'Not specified',
  skills: userContext.profile.skills_text || userContext.profile.skills_tags?.join(', ') || 'Not specified',
  time_per_week: userContext.profile.time_per_week,
  capital_available: userContext.profile.capital_available,
  risk_tolerance: userContext.profile.risk_tolerance,
  tech_level: userContext.profile.tech_level,
  success_vision: userContext.profile.success_vision?.slice(0, 300),
}, null, 2)}

## Extended Intake (Deeper Self-Knowledge)
${userContext.extendedIntake ? JSON.stringify({
  deep_desires: userContext.extendedIntake.deep_desires?.slice(0, 200),
  fears: userContext.extendedIntake.fears?.slice(0, 200),
  energy_givers: userContext.extendedIntake.energy_givers?.slice(0, 150),
  energy_drainers: userContext.extendedIntake.energy_drainers?.slice(0, 150),
  personality_flags: userContext.extendedIntake.personality_flags,
}, null, 2) : 'No extended intake available'}

## Current Chosen Idea
${userContext.chosenIdea ? JSON.stringify({
  title: userContext.chosenIdea.title,
  description: userContext.chosenIdea.description?.slice(0, 300),
  business_model_type: userContext.chosenIdea.business_model_type,
  target_customer: userContext.chosenIdea.target_customer,
  complexity: userContext.chosenIdea.complexity,
  time_to_first_dollar: userContext.chosenIdea.time_to_first_dollar,
}, null, 2) : 'No chosen idea yet - suggest exploratory tasks to help them find direction'}

## Idea Analysis (What We Know About Their Market)
${userContext.ideaAnalysis ? JSON.stringify({
  niche_score: userContext.ideaAnalysis.niche_score,
  market_insight: userContext.ideaAnalysis.market_insight?.slice(0, 200),
  problem_intensity: userContext.ideaAnalysis.problem_intensity,
  competition_snapshot: userContext.ideaAnalysis.competition_snapshot?.slice(0, 200),
  biggest_risks: userContext.ideaAnalysis.biggest_risks,
  recommendations: userContext.ideaAnalysis.recommendations,
}, null, 2) : 'No idea analysis available yet'}

## Active Workspace Documents (What They're Working On)
${docsSnippet}

## Recent Reflection Patterns (Energy & Emotional State)
${reflectionsSnippet}

---

Based on ALL the context above, generate 4-6 tasks that:
1. Are directly tied to their active workspace documents when possible
2. Move their specific idea forward based on the analysis
3. Consider their current energy/stress levels
4. Align with their passions, skills, and time constraints
5. Include specific references to their documents (e.g., "Continue your 'Offer Design Doc' by...")
6. Mix of quick wins (micro) and meaningful progress (quests)

${!userContext.chosenIdea ? 'Since they have no chosen idea yet, focus on exploration and discovery tasks.' : ''}
${userContext.recentDocs.length === 0 ? 'Since they have no workspace documents yet, suggest starting a new document as one of the tasks.' : ''}

Return the tasks as a JSON object with a "tasks" array.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_tasks",
              description: "Generate 4-6 personalized micro-tasks and quests for the founder",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["micro", "quest"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        xp_reward: { type: "number" },
                        metadata: { type: "object" }
                      },
                      required: ["type", "title", "description", "xp_reward"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["tasks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_tasks" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('generate-micro-tasks: AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI gateway error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();

    // Extract structured output from tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('generate-micro-tasks: No tool call found in response:', aiData);
      return new Response(
        JSON.stringify({ error: 'AI did not return structured output' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedTasks;
    try {
      parsedTasks = typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch (parseError) {
      console.error('generate-micro-tasks: Failed to parse tool call arguments:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: String(parseError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parsedTasks.tasks || !Array.isArray(parsedTasks.tasks)) {
      console.error('generate-micro-tasks: Invalid tasks structure:', parsedTasks);
      return new Response(
        JSON.stringify({ error: 'Invalid tasks structure in AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-micro-tasks: tasks generated:', parsedTasks.tasks.length);

    // Format tasks for database insertion
    const formattedTasks = formatTasks(
      parsedTasks.tasks, 
      userId, 
      userContext.chosenIdea?.id || null
    );

    // Insert tasks into database
    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(formattedTasks)
      .select();

    if (insertError) {
      console.error('generate-micro-tasks: insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert tasks', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-micro-tasks: successfully created tasks:', insertedTasks?.length);

    return new Response(
      JSON.stringify({ tasks: insertedTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('generate-micro-tasks: error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
