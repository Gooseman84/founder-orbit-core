import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// --- V6-AWARE System Prompt ------------------------------------------------

const SYSTEM_PROMPT = `You are TrueBlazer.AI — an elite execution strategist and co-founder assistant.

Your job is to generate HYPER-PERSONALIZED micro-tasks and quests that REACT to v6 metrics.

## V6 METRIC TRIGGERS (Generate specific task types based on these):

**virality_potential (0-100):**
- ≥70: Generate 2 viral experiment tasks (hook tests, content challenges)
- ≥50: Include 1 content-focused task

**leverage_score (0-100):**
- ≥70: Generate 1 scaling/delegation task
- ≥50: Include efficiency suggestions

**automation_density (0-100):**
- ≥60: Generate 2 automation tasks (workflows, bots, agents, systems)
- ≥40: Include 1 workflow optimization task

**chaos_factor (0-100):**
- ≥60: Generate 1 bold/controversial experiment
- ≥50: Include 1 unconventional approach

**culture_tailwind (0-100):**
- ≥50: Reference current cultural trends in tasks

**mode triggers:**
- chaos: Wild experiments, boundary-pushing actions
- creator: Content creation, audience building
- persona: Character development, avatar scripts, AI companion content
- memetic: Meme concepts, humor, shareability experiments
- automation: Workflow design, agent prompts, integration setup
- money_printer: Revenue systems, monetization shortcuts
- locker_room: Edgy content, culture-first experiments

**platform triggers (when specified):**
- TikTok: "Record a 7-second hook", "Draft scroll-stopping hooks"
- Instagram: "Create carousel outline", "Write polarizing captions"
- YouTube: "Script 60-second intro", "List thumbnail concepts"
- X/Twitter: "Draft spicy one-liner threads", "Write viral quote tweets"
- Email: "Write subject line variations", "Draft welcome sequence"

## Task Categories:
- "growth": Audience building, marketing, distribution
- "product": Feature validation, MVP development, offering refinement
- "content": Content creation, scriptwriting, hook development
- "automation": Workflow design, agent setup, system building
- "chaos": Bold experiments, unconventional approaches
- "persona": Character development, voice design, avatar content
- "systems": Revenue systems, backend setup, operational efficiency

## Task Effort Levels:
- "low": 5-15 minutes, minimal friction
- "medium": 15-30 minutes, some focus required
- "high": 30-60+ minutes, strategic work

## CRITICAL: reason Field
For EVERY task, include a "reason" field explaining:
- Which v6 metric(s) triggered this task
- Why this specific action matters for THIS idea
- Expected outcome

Example: "Generated because automation_density is 75/100 — this idea has high system potential, so mapping the automation flow early will compound leverage."

## Task Types:
- **micro**: 5-15 minutes, low friction, immediately actionable
- **quest**: 20-60 minutes, higher leverage strategic work

## Rules:
- NO generic advice. Every task must be specific to THEIR situation.
- Reference workspace documents directly when possible
- Consider energy/stress levels - suggest lighter tasks if stressed
- Align with passions, skills, and constraints
- Include category, effort, and reason for EVERY task
- Always return valid JSON only`;

// Task categories
const TASK_CATEGORIES = ["growth", "product", "content", "automation", "chaos", "persona", "systems"];
const EFFORT_LEVELS = ["low", "medium", "high"];

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

    // Validate category
    const category = TASK_CATEGORIES.includes(task.category) 
      ? task.category 
      : "growth";

    // Validate effort
    const effort = EFFORT_LEVELS.includes(task.effort) 
      ? task.effort 
      : "low";

    // Existing metadata from AI
    const existingMetadata = typeof task.metadata === "object" && task.metadata !== null
      ? task.metadata
      : {};

    // Determine workspace metadata based on content
    const workspaceMetadata = determineWorkspaceMetadata(task.title, description);

    // Merge metadata with v6 fields
    const metadata = {
      ...existingMetadata,
      doc_type: workspaceMetadata.doc_type,
      workspace_enabled: workspaceMetadata.workspace_enabled,
      category,
      effort,
      reason: task.reason || null,
      v6_triggers: task.v6_triggers || null,
    };

    return {
      user_id: userId,
      idea_id: ideaId,
      type,
      title: task.title.trim(),
      description: description.trim(),
      category,
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
    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get('Authorization') ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('generate-micro-tasks: auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('generate-micro-tasks: resolved userId:', userId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
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

    // Extract v6 metrics
    const v6Metrics = userContext.chosenIdea ? {
      virality_potential: userContext.chosenIdea.virality_potential ?? 'N/A',
      leverage_score: userContext.chosenIdea.leverage_score ?? 'N/A',
      automation_density: userContext.chosenIdea.automation_density ?? 'N/A',
      autonomy_level: userContext.chosenIdea.autonomy_level ?? 'N/A',
      culture_tailwind: userContext.chosenIdea.culture_tailwind ?? 'N/A',
      chaos_factor: userContext.chosenIdea.chaos_factor ?? 'N/A',
      shock_factor: userContext.chosenIdea.shock_factor ?? 'N/A',
      mode: userContext.chosenIdea.mode ?? 'N/A',
      category: userContext.chosenIdea.category ?? 'N/A',
      platform: userContext.chosenIdea.platform ?? 'N/A',
    } : null;

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
  edgy_mode: userContext.profile.edgy_mode ?? 'safe',
  wants_money_systems: userContext.profile.wants_money_systems ?? false,
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

## ⚡ V6 METRICS (REACT TO THESE!) ⚡
${v6Metrics ? JSON.stringify(v6Metrics, null, 2) : 'No v6 metrics available'}

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
1. DIRECTLY REACT to v6 metrics (generate viral tasks if virality is high, automation tasks if automation_density is high, etc.)
2. Are tied to their active workspace documents when possible
3. Consider their current energy/stress levels
4. Align with their passions, skills, and time constraints
5. Include category, effort, and reason for EVERY task
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
              description: "Generate 4-6 personalized micro-tasks and quests based on v6 metrics",
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
                        category: { type: "string", enum: TASK_CATEGORIES },
                        effort: { type: "string", enum: EFFORT_LEVELS },
                        reason: { type: "string", description: "Explain which v6 metrics triggered this task and why" },
                        v6_triggers: { type: "array", items: { type: "string" }, description: "List of v6 metrics that triggered this task" },
                        xp_reward: { type: "number" },
                        metadata: { type: "object" }
                      },
                      required: ["type", "title", "description", "category", "effort", "reason", "xp_reward"],
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
      console.error('generate-micro-tasks: Invalid tasks structure');
      return new Response(
        JSON.stringify({ error: 'AI returned invalid task structure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-micro-tasks: AI returned', parsedTasks.tasks.length, 'tasks');

    // Format tasks for database
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
      console.error('generate-micro-tasks: Failed to insert tasks:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save tasks', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-micro-tasks: Inserted', insertedTasks?.length, 'tasks');

    return new Response(
      JSON.stringify({ tasks: insertedTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('generate-micro-tasks: error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
