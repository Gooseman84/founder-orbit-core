import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlatformMode = 'strategy' | 'lovable' | 'cursor' | 'v0';

interface MasterPromptContext {
  founderProfile: any;
  chosenIdea: any;
  ideaAnalysis: any;
  extendedIntake: any | null;
  recentDocs: any[];
  recentReflections: any[];
  recentTasks: any[];
  streakData: { current_streak: number; longest_streak: number } | null;
  totalXp: number;
  blueprintSummary: any | null;
  executionState: {
    topDocs: string[];
    topBlockers: string[];
    topWins: string[];
    energyTrend: number | null;
    stressTrend: number | null;
  };
}

// Build enriched context similar to refresh-blueprint
async function buildMasterPromptContext(
  supabase: any,
  userId: string,
  ideaId: string
): Promise<MasterPromptContext | null> {
  console.log('Building enriched context for master prompt...');

  // Fetch all data in parallel
  const [
    profileResult,
    ideaResult,
    analysisResult,
    extendedIntakeResult,
    docsResult,
    reflectionsResult,
    tasksResult,
    streakResult,
    xpResult,
    blueprintResult
  ] = await Promise.all([
    // Founder profile
    supabase.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    // Chosen idea
    supabase.from('ideas').select('*').eq('id', ideaId).eq('user_id', userId).maybeSingle(),
    // Idea analysis
    supabase.from('idea_analysis').select('*').eq('idea_id', ideaId).eq('user_id', userId).maybeSingle(),
    // Extended intake (optional)
    supabase.from('user_intake_extended').select('*').eq('user_id', userId).maybeSingle(),
    // Last 5 workspace documents
    supabase.from('workspace_documents')
      .select('title, content, updated_at, doc_type')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    // Last 7 daily reflections
    supabase.from('daily_reflections')
      .select('reflection_date, energy_level, stress_level, mood_tags, ai_theme, blockers, what_did')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(7),
    // Last 10 completed tasks
    supabase.from('tasks')
      .select('title, category, completed_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(10),
    // Streak data
    supabase.from('daily_streaks').select('current_streak, longest_streak').eq('user_id', userId).maybeSingle(),
    // Total XP via RPC
    supabase.rpc('get_user_total_xp', { p_user_id: userId }),
    // Blueprint summary
    supabase.from('founder_blueprints')
      .select('ai_summary, validation_stage, north_star_one_liner, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  // Validate required data
  if (profileResult.error || !profileResult.data) {
    console.error('Error fetching profile:', profileResult.error);
    return null;
  }
  if (ideaResult.error || !ideaResult.data) {
    console.error('Error fetching idea:', ideaResult.error);
    return null;
  }
  if (analysisResult.error || !analysisResult.data) {
    console.error('Error fetching analysis:', analysisResult.error);
    return null;
  }

  // Extract data with graceful fallbacks
  const recentDocs = docsResult.data || [];
  const recentReflections = reflectionsResult.data || [];
  const recentTasks = tasksResult.data || [];

  // Compute execution state summaries
  const topDocs = recentDocs.slice(0, 3).map((d: any) => d.title).filter(Boolean);
  
  const topBlockers = recentReflections
    .filter((r: any) => r.blockers)
    .slice(0, 3)
    .map((r: any) => r.blockers);
  
  const topWins = recentTasks
    .slice(0, 3)
    .map((t: any) => t.title);

  // Compute energy/stress trends (average of last 3 reflections with data)
  const reflectionsWithEnergy = recentReflections.filter((r: any) => r.energy_level != null);
  const reflectionsWithStress = recentReflections.filter((r: any) => r.stress_level != null);
  
  const energyTrend = reflectionsWithEnergy.length > 0 
    ? reflectionsWithEnergy.slice(0, 3).reduce((sum: number, r: any) => sum + r.energy_level, 0) / Math.min(3, reflectionsWithEnergy.length)
    : null;
  
  const stressTrend = reflectionsWithStress.length > 0
    ? reflectionsWithStress.slice(0, 3).reduce((sum: number, r: any) => sum + r.stress_level, 0) / Math.min(3, reflectionsWithStress.length)
    : null;

  return {
    founderProfile: profileResult.data,
    chosenIdea: ideaResult.data,
    ideaAnalysis: analysisResult.data,
    extendedIntake: extendedIntakeResult.data || null,
    recentDocs,
    recentReflections,
    recentTasks,
    streakData: streakResult.data || null,
    totalXp: xpResult.data || 0,
    blueprintSummary: blueprintResult.data || null,
    executionState: {
      topDocs,
      topBlockers,
      topWins,
      energyTrend,
      stressTrend
    }
  };
}

// Compute context hash for staleness detection - stable hash without crypto libs
function computeContextHash(context: MasterPromptContext): string {
  const input = [
    context.founderProfile?.updated_at,
    context.chosenIdea?.created_at,
    context.ideaAnalysis?.created_at,
    context.recentDocs?.[0]?.updated_at,
    context.recentReflections?.[0]?.reflection_date,
    context.recentTasks?.[0]?.completed_at,
    context.blueprintSummary?.updated_at,
  ]
    .filter(Boolean)
    .join('|');

  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

// Get the latest source updated_at timestamp
function getSourceUpdatedAt(context: MasterPromptContext): string {
  const dates = [
    context.founderProfile?.updated_at,
    context.chosenIdea?.created_at,
    context.ideaAnalysis?.created_at,
    context.recentDocs[0]?.updated_at,
    context.recentReflections[0]?.reflection_date,
    context.recentTasks[0]?.completed_at,
    context.blueprintSummary?.updated_at
  ].filter(Boolean).map(d => new Date(d).getTime());

  if (dates.length === 0) return new Date().toISOString();
  return new Date(Math.max(...dates)).toISOString();
}

// Style guidelines for exciting output
const STYLE_GUIDELINES = `
STYLE GUIDELINES:
Write with energy and conviction.
Short sentences.
No corporate fluff.
Be confident, direct, and motivating.
`;

// Build the STRATEGY prompt (enhanced existing behavior)
function buildStrategyPrompt(context: MasterPromptContext): string {
  const { founderProfile, chosenIdea, ideaAnalysis, extendedIntake, executionState, blueprintSummary, streakData, totalXp } = context;
  
  return `You are an elite meta-prompt engineer, startup strategist, and entrepreneurial execution architect.
${STYLE_GUIDELINES}
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

INPUT CONTEXT:

FOUNDER PROFILE:
${JSON.stringify(founderProfile, null, 2)}

${extendedIntake ? `EXTENDED INTAKE (Deep Desires, Fears, Energy):
${JSON.stringify(extendedIntake, null, 2)}` : ''}

CHOSEN IDEA:
${JSON.stringify(chosenIdea, null, 2)}

IDEA ANALYSIS:
${JSON.stringify(ideaAnalysis, null, 2)}

${blueprintSummary ? `BLUEPRINT SUMMARY:
- North Star: ${blueprintSummary.north_star_one_liner || 'Not set'}
- Validation Stage: ${blueprintSummary.validation_stage || 'Not set'}
- AI Summary: ${blueprintSummary.ai_summary || 'Not generated'}` : ''}

RECENT PROGRESS:
- Current Streak: ${streakData?.current_streak || 0} days
- Total XP: ${totalXp}
- Recent Work: ${executionState.topDocs.join(', ') || 'None tracked yet'}
- Recent Wins: ${executionState.topWins.join(', ') || 'None yet'}
- Blockers: ${executionState.topBlockers.join(', ') || 'None identified'}
- Energy Trend (1-5): ${executionState.energyTrend?.toFixed(1) || 'Unknown'}
- Stress Trend (1-5): ${executionState.stressTrend?.toFixed(1) || 'Unknown'}

Respond with STRICT JSON only:

{
  "prompt_body": "string",
  "platform_target": "general_strategy",
  "idea_id": "string"
}

The prompt_body should be a SINGLE TEXT BLOCK that is highly structured and skimmable, and must:
- Start with a clear title line for the whole plan.
- Use numbered section headers in all caps (e.g. "1. FOUNDER IDENTITY", "2. CHOSEN IDEA", "3. PROBLEM → SOLUTION → EXECUTION").
- Within each section, use short paragraphs and bullet points where helpful.
- Insert a blank line between sections and major bullet groups for readability.
- Clearly separate: founder identity, idea summary, problem/solution, business model, go-to-market, 90-day plan, weekly sprint structure, risks, assumptions, KPIs, and usage instructions for the AI assistant.
- Include a "RECENT PROGRESS" section summarizing current momentum, wins, and blockers.
- Keep everything in one contiguous text block (no JSON, no markdown code fences).
- Include constraints and preferences and initial steps for execution.

IMPORTANT: Include an "UNHINGED EDGE" section with exactly 3 bold, unconventional growth/virality experiments tailored to this specific idea. These should be creative, boundary-pushing ideas that could accelerate growth even if risky.

- End with this exact sentence on its own line: "Always ask me clarifying questions before generating answers."

Return strictly JSON. Do not include markdown or commentary outside the JSON.`;
}

// Build the BUILDER prompt (new for vibe coding platforms)
function buildBuilderPrompt(context: MasterPromptContext, platformMode: PlatformMode): string {
  const { founderProfile, chosenIdea, ideaAnalysis, extendedIntake, executionState, blueprintSummary } = context;

  const platformInstructions: Record<PlatformMode, string> = {
    lovable: `
VIBE CODING INSTRUCTIONS (LOVABLE):
- Generate a Lovable-ready prompt that names exact files and asks for complete code blocks
- Use React + TypeScript + Tailwind + shadcn/ui patterns
- Include Supabase for backend (auth, database, edge functions)
- Specify component hierarchy clearly
- Ask for one feature at a time for best results`,
    cursor: `
VIBE CODING INSTRUCTIONS (CURSOR):
- Use Cursor IDE patterns with file paths
- Reference existing code patterns when extending
- Include inline comments for complex logic
- Structure for iterative development
- Use .cursorrules conventions if applicable`,
    v0: `
VIBE CODING INSTRUCTIONS (V0.DEV):
- Focus on UI components and screens
- Use shadcn/ui component library
- Specify exact layouts and responsive breakpoints
- Include design tokens and color schemes
- Describe interactions and states clearly`,
    strategy: '' // Not used for builder
  };

  // Extract constraints from profile
  const timePerWeek = founderProfile?.hours_per_week || founderProfile?.time_per_week || 10;
  const capital = founderProfile?.capital_available || 0;
  const riskTolerance = founderProfile?.risk_tolerance || 'moderate';
  const skills = founderProfile?.skills_tags || [];
  const techLevel = founderProfile?.tech_level || 'beginner';

  return `You are a senior full-stack architect and product strategist helping a founder build their MVP using ${platformMode === 'v0' ? 'v0.dev' : platformMode === 'lovable' ? 'Lovable' : 'Cursor'}.
${STYLE_GUIDELINES}
Generate a comprehensive BUILD PROMPT that can be pasted directly into the platform to start building.

INPUT CONTEXT:

FOUNDER CONSTRAINTS:
- Time Available: ${timePerWeek} hours/week
- Capital: $${capital}
- Risk Tolerance: ${riskTolerance}
- Technical Level: ${techLevel}
- Skills: ${skills.join(', ') || 'General'}
${extendedIntake?.energy_givers ? `- Energizers: ${extendedIntake.energy_givers}` : ''}
${extendedIntake?.energy_drainers ? `- Drainers: ${extendedIntake.energy_drainers}` : ''}

CHOSEN IDEA:
- Title: ${chosenIdea.title}
- Description: ${chosenIdea.description}
- Target Customer: ${chosenIdea.target_customer || 'Not specified'}
- Business Model: ${chosenIdea.business_model_type || 'Not specified'}
- Time to First Dollar: ${chosenIdea.time_to_first_dollar || 'Not specified'}
- Complexity: ${chosenIdea.complexity || 'Medium'}

IDEA ANALYSIS:
- Elevator Pitch: ${ideaAnalysis.elevator_pitch || 'Not generated'}
- Ideal Customer: ${ideaAnalysis.ideal_customer_profile || 'Not defined'}
- Problem Intensity: ${ideaAnalysis.problem_intensity || 'Unknown'}
- Competition: ${ideaAnalysis.competition_snapshot || 'Unknown'}
- Pricing Power: ${ideaAnalysis.pricing_power || 'Unknown'}

${blueprintSummary ? `NORTH STAR:
${blueprintSummary.north_star_one_liner || chosenIdea.title}` : ''}

CURRENT MOMENTUM:
- Recent Work: ${executionState.topDocs.join(', ') || 'Starting fresh'}
- Recent Wins: ${executionState.topWins.join(', ') || 'None yet'}
- Blockers: ${executionState.topBlockers.join(', ') || 'None identified'}

Respond with STRICT JSON only:

{
  "prompt_body": "string",
  "platform_target": "${platformMode}",
  "idea_id": "string"
}

The prompt_body must be a SINGLE TEXT BLOCK with these sections IN ORDER:

1. PROJECT NORTH STAR
1-2 sentences: what we're building and why it matters.

2. USER + FOUNDER CONSTRAINTS
- Time/week, budget, risk tolerance
- Strengths and skills
- "Hell no" constraints (things to avoid based on drainers)

3. MVP DEFINITION (WEEK 1)
A prioritized list of 5-10 features to build first.
Explicitly define what "done" means for the MVP.
Focus on the smallest slice that proves the idea works.

4. USER FLOWS
Top 3-5 user journeys in bullets.
E.g., "User signs up → completes onboarding → creates first [thing] → shares/monetizes"

5. PAGES / ROUTES
Exact pages/routes needed and what each does.
E.g., "/" (landing), "/dashboard", "/create", "/settings"

6. DATA MODEL
Suggested tables + key fields + relations.
Include RLS requirements for user data security.
Example format:
- users: id, email, created_at
- [resource]: id, user_id, title, ...

7. EDGE FUNCTIONS / APIS
List the serverless functions needed.
For each: purpose, input shape, output shape.
E.g., "generate-thing: POST { prompt } → { result }"

8. COMPONENT PLAN
UI component breakdown for the MVP.
Group by page/feature.

9. BUILD ORDER
Step-by-step build sequence (Day 1–Day 7).
Start with auth + core data model, then add features incrementally.

10. GUARDRAILS
- "Do not overbuild beyond MVP scope"
- "Ship thin slices and iterate"
- "Prefer simple patterns over clever abstractions"
- "Test happy path first"

11. UNHINGED EDGE
3 bold, unconventional growth/virality experiments for this idea.
These can be risky or boundary-pushing but should be tailored to the specific business.
${platformInstructions[platformMode]}

End the prompt_body with:
"Ask 3 clarifying questions before writing code if anything is missing."

Return strictly JSON. Do not include markdown or commentary outside the JSON.`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, ideaId, platform_mode } = await req.json();
    
    // Validate and default platform_mode
    const validModes: PlatformMode[] = ['strategy', 'lovable', 'cursor', 'v0'];
    const resolvedMode: PlatformMode = validModes.includes(platform_mode) ? platform_mode : 'strategy';
    
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

    console.log(`generate-master-prompt: userId=${resolvedUserId}, mode=${resolvedMode}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve ideaId if not provided
    let resolvedIdeaId = ideaId;
    if (!resolvedIdeaId) {
      const { data: chosenIdea } = await supabase
        .from('ideas')
        .select('id')
        .eq('user_id', resolvedUserId)
        .eq('status', 'chosen')
        .maybeSingle();
      
      if (!chosenIdea) {
        return new Response(
          JSON.stringify({ error: 'No chosen idea found. Please select an idea first.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resolvedIdeaId = chosenIdea.id;
    }

    // Build enriched context
    const context = await buildMasterPromptContext(supabase, resolvedUserId, resolvedIdeaId);
    
    if (!context) {
      return new Response(
        JSON.stringify({ error: 'Failed to build context. Ensure you have a profile, idea, and analysis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: context built successfully');

    // Compute hash and timestamp
    const contextHash = computeContextHash(context);
    const sourceUpdatedAt = getSourceUpdatedAt(context);

    // Select prompt template based on mode
    const promptTemplate = resolvedMode === 'strategy' 
      ? buildStrategyPrompt(context)
      : buildBuilderPrompt(context, resolvedMode);

    // Call Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('generate-master-prompt: calling AI...');

    // Select model and max_tokens based on platform mode
    // Strategy: lighter model, builder modes: pro for maximum output quality
    const aiModel = resolvedMode === 'strategy' 
      ? 'google/gemini-2.5-flash' 
      : 'google/gemini-2.5-pro';
    
    // Token limits by mode to ensure prompts are never cut short
    const maxTokensByMode: Record<PlatformMode, number> = {
      'strategy': 12000,
      'lovable': 16000,
      'cursor': 16000,
      'v0': 10000
    };
    const maxTokens = maxTokensByMode[resolvedMode];

    console.log(`generate-master-prompt: using model=${aiModel}, max_tokens=${maxTokens}`);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: promptTemplate },
          { role: 'user', content: `Generate the master prompt for idea_id: ${resolvedIdeaId}` }
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
    console.log('generate-master-prompt: AI response received');

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

    if (!masterPromptData.prompt_body) {
      console.error('Missing prompt_body in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert master prompt using the unique constraint
    const { data: savedPrompt, error: upsertError } = await supabase
      .from('master_prompts')
      .upsert(
        {
          user_id: resolvedUserId,
          idea_id: resolvedIdeaId,
          platform_mode: resolvedMode,
          prompt_body: masterPromptData.prompt_body,
          platform_target: masterPromptData.platform_target || resolvedMode,
          context_hash: contextHash,
          source_updated_at: sourceUpdatedAt,
        },
        { onConflict: 'user_id,idea_id,platform_mode' }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.error('Error upserting master prompt:', upsertError);
      throw new Error(`Failed to save master prompt: ${upsertError.message}`);
    }

    console.log('generate-master-prompt: saved successfully via upsert');

    // Return the response with new fields
    return new Response(
      JSON.stringify({
        success: true,
        id: savedPrompt.id,
        prompt_body: masterPromptData.prompt_body,
        platform_mode: resolvedMode,
        platform_target: masterPromptData.platform_target || resolvedMode,
        context_hash: contextHash,
        source_updated_at: sourceUpdatedAt,
        idea_id: resolvedIdeaId
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
