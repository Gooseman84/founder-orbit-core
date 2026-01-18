import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

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

interface RequestBody {
  userId: string;
  feature: Feature;
}

const systemPrompt = `You are the Feature Implementation Agent for TrueBlazer AI, a platform for aspiring entrepreneurs to validate and build business ideas.

Your mission: Transform product requirements into complete, phased implementation plans with ready-to-use Lovable.dev prompts.

## TrueBlazer Tech Stack
- Frontend: React 18 + TypeScript + Vite
- UI Library: shadcn/ui components + Tailwind CSS
- Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage + Realtime)
- State Management: React Query (TanStack Query)
- Routing: React Router v6
- AI: Anthropic Claude API (via edge functions)
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authentication: Verify JWT token
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

    const token = authHeader.slice(7).trim(); // Remove 'Bearer '
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[feature-implementation-agent] Auth error:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[feature-implementation-agent] Authenticated user:', user.id);

    // 2. Parse and validate request body
    const { userId, feature }: RequestBody = await req.json();

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

    // 3. Call Anthropic API
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('[feature-implementation-agent] ANTHROPIC_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

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

    let implementationPlan: any;
    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        console.log('[feature-implementation-agent] Calling Anthropic API, attempt:', retryCount + 1);
        
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }]
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        console.log('[feature-implementation-agent] Received response, parsing JSON...');

        // Try to extract JSON from the response (handle potential markdown wrapping)
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
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 4. Store plan in agent_memory
    const { error: memoryError } = await supabaseClient
      .from('agent_memory')
      .upsert({
        user_id: userId || user.id,
        memory_path: `engineering/feature_specs/${implementationPlan.feature_id}`,
        memory_data: implementationPlan,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,memory_path'
      });

    if (memoryError) {
      console.error('[feature-implementation-agent] Memory storage error:', memoryError);
      // Continue anyway - the plan was generated successfully
    } else {
      console.log('[feature-implementation-agent] Plan stored in agent_memory');
    }

    // 5. Log decision
    const { error: decisionError } = await supabaseClient
      .from('agent_decisions')
      .insert({
        user_id: userId || user.id,
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
      // Continue anyway
    } else {
      console.log('[feature-implementation-agent] Decision logged');
    }

    // 6. Return response
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
