import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { selectInterviewContext } from "../_shared/selectInterviewContext.ts";
import { injectCognitiveMode } from "../_shared/cognitiveMode.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Feature {
  title: string;
  description: string;
  user_stories: string[];
  success_metrics: string[];
  constraints?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const BASE_SYSTEM_PROMPT = `You are the Feature Implementation Agent for TrueBlazer AI, a platform for aspiring entrepreneurs to validate and build business ideas.

Your mission: Transform product requirements into complete, phased implementation plans with ready-to-use Lovable.dev prompts.

## TrueBlazer Tech Stack
- Frontend: React 18 + TypeScript + Vite
- UI Library: shadcn/ui components + Tailwind CSS
- Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage + Realtime)
- State Management: React Query (TanStack Query)
- Routing: React Router v6
- AI: Lovable AI Gateway (via edge functions)
- Payments: Stripe
- Email: Resend (to-be-implemented)

## Your Implementation Philosophy
1. **Incremental delivery**: Break features into 3-7 phases, each completable in 4-8 hours
2. **Lovable-first**: Generate complete, copy-paste-ready Lovable prompts (not raw code)
3. **Production-ready**: Include error handling, loading states, validation
4. **Pattern-following**: Use TrueBlazer's existing patterns (hooks, components, edge functions)
5. **Test-driven**: Include specific test criteria for each phase

## Output Format (JSON only, no markdown)
{
  "feature_id": "kebab-case-id",
  "architecture": {
    "components": [
      {
        "name": "ComponentName",
        "path": "/src/components/feature/ComponentName.tsx",
        "purpose": "What this component does",
        "props": ["prop1: type", "prop2: type"]
      }
    ],
    "database_changes": [
      {
        "type": "new_table" | "add_column" | "add_index" | "modify_column",
        "name": "table_name",
        "columns": ["col1 TYPE", "col2 TYPE"],
        "indexes": ["column_name"],
        "rls": true,
        "rls_policies": ["policy description"]
      }
    ],
    "edge_functions": [
      {
        "name": "function-name",
        "method": "POST" | "GET",
        "purpose": "What this endpoint does",
        "auth_required": true,
        "inputs": {"field": "type"},
        "outputs": {"field": "type"}
      }
    ],
    "ui_flows": ["User flow 1: step by step", "User flow 2: step by step"]
  },
  "phases": [
    {
      "phase_number": 1,
      "name": "Phase Name",
      "description": "What gets built in this phase",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "lovable_prompts": [
        "Complete, copy-paste-ready Lovable prompt 1 that includes all context, code structure, and implementation details",
        "Complete prompt 2..."
      ],
      "estimated_hours": 6,
      "prerequisites": ["What must exist before starting this phase"],
      "test_criteria": [
        "Specific, testable criterion 1",
        "Specific, testable criterion 2"
      ],
      "dependencies": ["External packages if needed"]
    }
  ],
  "total_estimated_hours": 24,
  "risks": [
    {
      "description": "Risk description",
      "mitigation": "How to mitigate",
      "severity": "low" | "medium" | "high"
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Venture context helpers
// ---------------------------------------------------------------------------

interface VentureContext {
  venture?: { name: string; venture_state: string; success_metric: string | null };
  idea?: { title: string; description: string | null; business_model_type: string | null; target_customer: string | null };
  founderIntelligence?: Record<string, any> | null;
  architectureSnippet?: string | null;
  machineContext?: Record<string, any> | null;
  currentPhase?: number | null;
}

function extractMachineContext(content: string): Record<string, any> | null {
  const startMarker = '```machine_context';
  const endMarker = '```';
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return null;

  const jsonStart = startIdx + startMarker.length;
  const endIdx = content.indexOf(endMarker, jsonStart);
  if (endIdx === -1) return null;

  try {
    return JSON.parse(content.slice(jsonStart, endIdx).trim());
  } catch {
    return null;
  }
}

function buildVentureContextBlock(ctx: VentureContext): string {
  const parts: string[] = [];

  if (ctx.venture) {
    parts.push(`## Active Venture
- **Name:** ${ctx.venture.name}
- **State:** ${ctx.venture.venture_state}
- **Success Metric:** ${ctx.venture.success_metric || 'Not set'}`);
  }

  if (ctx.idea) {
    parts.push(`## Chosen Idea
- **Title:** ${ctx.idea.title}
- **Description:** ${ctx.idea.description || 'N/A'}
- **Business Model:** ${ctx.idea.business_model_type || 'N/A'}
- **Target Customer:** ${ctx.idea.target_customer || 'N/A'}`);
  }

  if (ctx.founderIntelligence && Object.keys(ctx.founderIntelligence).length > 0) {
    parts.push(`## Founder Intelligence (from Mavrik interview)
${JSON.stringify(ctx.founderIntelligence, null, 2)}`);
  }

  if (ctx.architectureSnippet) {
    parts.push(`## Architecture Decisions (excerpt)
${ctx.architectureSnippet}`);
  }

  if (ctx.machineContext) {
    const mc = ctx.machineContext;
    const completedPhases = mc.phases
      ?.filter((p: any) => ctx.currentPhase && p.phase_number < ctx.currentPhase)
      .map((p: any) => `- Phase ${p.phase_number}: ${p.name}`) || [];
    const currentPhaseObj = mc.phases?.find((p: any) => p.phase_number === ctx.currentPhase);

    parts.push(`## Vertical Slice Plan Context
- **Total Phases:** ${mc.total_phases || mc.phases?.length || 'unknown'}
- **Current Phase:** ${ctx.currentPhase || 'unknown'}
${completedPhases.length > 0 ? `### Already Completed\n${completedPhases.join('\n')}` : ''}
${currentPhaseObj ? `### Current Phase: ${currentPhaseObj.name}\n${currentPhaseObj.objective || ''}` : ''}
- **Out of Scope:** ${mc.out_of_scope?.join(', ') || 'none listed'}`);
  }

  if (parts.length === 0) return '';

  return `\n\n# VENTURE CONTEXT — Use this to ground your implementation plan\n\n${parts.join('\n\n')}`;
}

async function fetchVentureContext(
  supabaseClient: any,
  userId: string,
  ventureId: string,
  architectureContractId?: string,
  verticalSlicePlanId?: string,
  currentPhase?: number,
): Promise<VentureContext> {
  const ctx: VentureContext = { currentPhase: currentPhase || null };

  // Fetch venture + idea in parallel
  const venturePromise = supabaseClient
    .from('ventures')
    .select('name, venture_state, success_metric, idea_id')
    .eq('id', ventureId)
    .eq('user_id', userId)
    .maybeSingle();

  const profilePromise = supabaseClient
    .from('founder_profiles')
    .select('context_summary')
    .eq('user_id', userId)
    .maybeSingle();

  const archPromise = architectureContractId
    ? supabaseClient
        .from('workspace_documents')
        .select('content')
        .eq('id', architectureContractId)
        .eq('user_id', userId)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const slicePromise = verticalSlicePlanId
    ? supabaseClient
        .from('workspace_documents')
        .select('content')
        .eq('id', verticalSlicePlanId)
        .eq('user_id', userId)
        .maybeSingle()
    : Promise.resolve({ data: null });

  const [ventureRes, profileRes, archRes, sliceRes] = await Promise.all([
    venturePromise, profilePromise, archPromise, slicePromise,
  ]);

  if (ventureRes.data) {
    ctx.venture = {
      name: ventureRes.data.name,
      venture_state: ventureRes.data.venture_state,
      success_metric: ventureRes.data.success_metric,
    };

    // Fetch idea if linked
    if (ventureRes.data.idea_id) {
      const { data: ideaData } = await supabaseClient
        .from('ideas')
        .select('title, description, business_model_type, target_customer')
        .eq('id', ventureRes.data.idea_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (ideaData) {
        ctx.idea = ideaData;
      }
    }
  }

  if (profileRes.data?.context_summary) {
    ctx.founderIntelligence = selectInterviewContext(
      'feature-builder',
      profileRes.data.context_summary,
    );
  }

  if (archRes.data?.content) {
    ctx.architectureSnippet = archRes.data.content.slice(0, 2000);
  }

  if (sliceRes.data?.content) {
    ctx.machineContext = extractMachineContext(sliceRes.data.content);
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[feature-implementation-agent] Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[feature-implementation-agent] Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[feature-implementation-agent] Authenticated user:', user.id);

    // 2. Parse request body (backwards-compatible)
    const {
      feature,
      ventureId,
      architectureContractId,
      verticalSlicePlanId,
      currentPhase,
    }: {
      feature: Feature;
      ventureId?: string;
      architectureContractId?: string;
      verticalSlicePlanId?: string;
      currentPhase?: number;
    } = await req.json();
    const userId = user.id;

    if (!feature.title || !feature.description || !feature.user_stories || !feature.success_metrics) {
      console.error('[feature-implementation-agent] Missing required feature fields');
      return new Response(JSON.stringify({ error: 'Missing required feature fields: title, description, user_stories, success_metrics' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!feature.user_stories.length) {
      return new Response(JSON.stringify({ error: 'At least one user story is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!feature.success_metrics.length) {
      return new Response(JSON.stringify({ error: 'At least one success metric is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[feature-implementation-agent] Processing feature:', feature.title);

    // 3. Fetch venture context (if ventureId provided)
    let ventureContextBlock = '';
    if (ventureId) {
      try {
        const ventureCtx = await fetchVentureContext(
          supabaseClient, userId, ventureId,
          architectureContractId, verticalSlicePlanId, currentPhase,
        );
        ventureContextBlock = buildVentureContextBlock(ventureCtx);
        console.log('[feature-implementation-agent] Venture context loaded, length:', ventureContextBlock.length);
      } catch (ctxErr) {
        console.error('[feature-implementation-agent] Failed to fetch venture context (continuing without):', ctxErr);
      }
    }

    // 4. Build prompts
    const fullSystemPrompt = injectCognitiveMode(
      BASE_SYSTEM_PROMPT + ventureContextBlock,
      'converge',
    );

    const userMessage = `Generate a complete implementation plan for this feature:

**Title:** ${feature.title}

**Description:** ${feature.description}

**User Stories:**
${feature.user_stories.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Success Metrics:**
${feature.success_metrics.map((m, i) => `${i + 1}. ${m}`).join('\n')}

**Constraints:**
${feature.constraints?.map((c, i) => `${i + 1}. ${c}`).join('\n') || 'None specified'}

**Priority:** ${feature.priority}

Generate a complete implementation plan with 3-7 phases, each with detailed Lovable prompts. Return ONLY valid JSON, no markdown code blocks.`;

    // 5. Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[feature-implementation-agent] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let implementationPlan: any;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        console.log('[feature-implementation-agent] Calling AI gateway, attempt:', retryCount + 1);

        const response = await fetch(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'system', content: fullSystemPrompt },
                { role: 'user', content: userMessage },
              ],
            }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI gateway returned ${response.status}: ${errText}`);
        }

        const completionData = await response.json();
        const responseText = completionData.choices?.[0]?.message?.content || '';
        console.log('[feature-implementation-agent] Received response, parsing JSON...');

        // Extract JSON from response (handle potential markdown wrapping)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.slice(7);
        }
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.slice(3);
        }
        if (jsonText.endsWith('```')) {
          jsonText = jsonText.slice(0, -3);
        }
        jsonText = jsonText.trim();

        implementationPlan = JSON.parse(jsonText);
        console.log('[feature-implementation-agent] Successfully parsed implementation plan:', implementationPlan.feature_id);
        break;

      } catch (apiError) {
        console.error('[feature-implementation-agent] API/Parse error:', apiError);
        retryCount++;

        if (retryCount > maxRetries) {
          return new Response(JSON.stringify({
            error: 'Failed to generate implementation plan after retries',
            details: apiError instanceof Error ? apiError.message : 'Unknown error'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 6. Store plan in agent_memory
    const { error: memoryError } = await supabaseClient
      .from('agent_memory')
      .upsert({
        user_id: userId,
        memory_path: `engineering/feature_specs/${implementationPlan.feature_id}`,
        memory_data: implementationPlan,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,memory_path'
      });

    if (memoryError) {
      console.error('[feature-implementation-agent] Memory storage error:', memoryError);
    } else {
      console.log('[feature-implementation-agent] Plan stored in agent_memory');
    }

    // 7. Log decision
    const { error: decisionError } = await supabaseClient
      .from('agent_decisions')
      .insert({
        user_id: userId,
        agent_name: 'feature_implementation',
        decision_type: 'feature_plan_created',
        inputs: feature,
        outputs: implementationPlan,
        reasoning: `Created ${implementationPlan.phases?.length || 0}-phase plan for ${feature.title}`,
        confidence: 90,
        risk_level: 'low',
        requires_approval: false,
        created_at: new Date().toISOString()
      });

    if (decisionError) {
      console.error('[feature-implementation-agent] Decision logging error:', decisionError);
    } else {
      console.log('[feature-implementation-agent] Decision logged');
    }

    // 8. Return response
    console.log('[feature-implementation-agent] Returning successful response');
    return new Response(JSON.stringify({
      success: true,
      feature_id: implementationPlan.feature_id,
      plan: implementationPlan,
      next_steps: `Review the ${implementationPlan.phases?.length || 0}-phase plan, then implement Phase 1`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[feature-implementation-agent] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
