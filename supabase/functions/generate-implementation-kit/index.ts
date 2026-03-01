import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // === JWT Authentication ===
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('[generate-implementation-kit] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use verified userId from JWT, ignore any client-provided userId
    const userId = user.id;
    console.log('[generate-implementation-kit] Authenticated user:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { blueprintId, ventureId, techStack } = await req.json();

    if (!blueprintId || !ventureId || !techStack) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription status - Implementation Kit is Pro only
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = subscription?.plan || 'trial';
    const isPaidUser = plan === 'pro' || plan === 'founder';

    if (!isPaidUser) {
      return new Response(
        JSON.stringify({ 
          error: 'IMPLEMENTATION_KIT_REQUIRES_PRO', 
          message: 'Implementation Kit is a Pro feature. Upgrade to get your complete build specifications.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching blueprint:', blueprintId);

    // Fetch blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from('founder_blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (blueprintError || !blueprint) {
      console.error('Blueprint fetch error:', blueprintError);
      return new Response(
        JSON.stringify({ error: 'Blueprint not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch Mavrik interview for enriched implementation context
    const { data: interviewData } = await supabase
      .from("founder_interviews")
      .select("context_summary")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const interviewContext = interviewData?.context_summary as any || null;
    console.log('[generate-implementation-kit] hasInterviewContext:', !!interviewContext);

    console.log('Creating implementation kit record...');

    // Create implementation kit record with 'generating' status
    const { data: kit, error: kitError } = await supabase
      .from('implementation_kits')
      .insert({
        user_id: userId,
        venture_id: ventureId,
        blueprint_id: blueprintId,
        frontend_framework: techStack.frontend,
        backend_platform: techStack.backend,
        ai_coding_tool: techStack.aiTool,
        deployment_platform: techStack.deployment,
        status: 'generating',
      })
      .select()
      .single();

    if (kitError) {
      console.error('Error creating kit:', kitError);
      return new Response(
        JSON.stringify({ error: 'Failed to create kit record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating workspace folder...');

    // Create folder for implementation kit
    const { data: folder, error: folderError } = await supabase
      .from('workspace_folders')
      .insert({
        user_id: userId,
        venture_id: ventureId,
        name: `${blueprint.north_star_one_liner || 'Venture'} - Implementation Kit`,
      })
      .select()
      .single();

    if (folderError) {
      console.error('Folder creation warning:', folderError);
    }

    // Update kit with folder ID
    if (folder) {
      await supabase
        .from('implementation_kits')
        .update({ implementation_folder_id: folder.id })
        .eq('id', kit.id);
    }

    console.log('Starting background document generation...');

    // Return immediately - don't wait for document generation
    const response = new Response(
      JSON.stringify({ 
        kit: { ...kit, implementation_folder_id: folder?.id }, 
        folderId: folder?.id || null,
        message: 'Generating documents in background...' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // Generate documents in background (fire and forget - don't await)
    generateDocumentsInBackground(
      supabaseUrl,
      supabaseServiceKey,
      lovableApiKey,
      kit.id,
      blueprint,
      techStack,
      userId,
      ventureId,
      folder?.id || null,
      interviewContext
    );

    return response;

  } catch (error) {
    console.error('Error in generate-implementation-kit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Background document generation function
async function generateDocumentsInBackground(
  supabaseUrl: string,
  supabaseServiceKey: string,
  lovableApiKey: string,
  kitId: string,
  blueprint: any,
  techStack: any,
  userId: string,
  ventureId: string,
  folderId: string | null,
  interviewContext: any
) {
  // Create a new supabase client for background work
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Background generation started for kit:', kitId);

    // Helper function to call Lovable AI Gateway with validation and retry
    async function callAI(prompt: string, docName: string = 'document'): Promise<string> {
      const MAX_ATTEMPTS = 2;
      
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        console.log(`[callAI] Generating ${docName} (attempt ${attempt}/${MAX_ATTEMPTS})...`);
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            max_completion_tokens: 8192,
            messages: [{ role: 'user', content: prompt }],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`AI API error for ${docName}: ${error}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // Validate content is not empty or too short
        if (content.length >= 100) {
          console.log(`[callAI] ${docName} generated successfully (${content.length} chars)`);
          return content;
        }

        console.warn(`[callAI] ${docName} returned insufficient content (${content.length} chars), attempt ${attempt}/${MAX_ATTEMPTS}`);
        
        if (attempt === MAX_ATTEMPTS) {
          throw new Error(`${docName} generation failed: AI returned empty or insufficient content (${content.length} chars) after ${MAX_ATTEMPTS} attempts`);
        }
      }
      
      // Should never reach here, but TypeScript needs it
      throw new Error(`${docName} generation failed unexpectedly`);
    }

    // Extract blueprint content
    const blueprintTitle = blueprint.north_star_one_liner || 'Untitled Venture';
    const blueprintContent = JSON.stringify({
      problem_statement: blueprint.problem_statement,
      target_audience: blueprint.target_audience,
      offer_model: blueprint.offer_model,
      monetization_strategy: blueprint.monetization_strategy,
      validation_stage: blueprint.validation_stage,
      success_metrics: blueprint.success_metrics,
      ai_summary: blueprint.ai_summary,
      ai_recommendations: blueprint.ai_recommendations,
    }, null, 2);

    // Build founder intelligence context string
    const founderIntelStr = interviewContext ? `

FOUNDER INTELLIGENCE (from Mavrik interview):
- Vertical: ${interviewContext.ventureIntelligence?.verticalIdentified || "none"}
- Business Model: ${interviewContext.ventureIntelligence?.businessModel || "unknown"}
- Wedge Clarity: ${interviewContext.ventureIntelligence?.wedgeClarity || "unknown"}
- Workflow Depth: ${interviewContext.ventureIntelligence?.workflowDepth || "unknown"}
- Industry Access: ${interviewContext.ventureIntelligence?.industryAccess || "unknown"}
- Integration Strategy: ${interviewContext.ventureIntelligence?.integrationStrategy || "unknown"}
- AI Feasibility: ${interviewContext.ventureIntelligence?.aiFeasibility || "not_applicable"}
- Insider Knowledge: ${JSON.stringify(interviewContext.extractedInsights?.insiderKnowledge || [])}
- Customer Intimacy: ${JSON.stringify(interviewContext.extractedInsights?.customerIntimacy || [])}
- Founder Summary: ${interviewContext.founderSummary || "N/A"}
${interviewContext.extractedInsights?.transferablePatterns?.length ? `- Transferable Patterns: ${JSON.stringify(interviewContext.extractedInsights.transferablePatterns)}` : ""}

If FOUNDER INTELLIGENCE is provided above, use it to:
- Reference specific industry workflows, integrations, and terminology
- Identify required third-party integrations based on the vertical (e.g., custodian APIs for wealth management, EHR systems for healthcare, POS systems for restaurants)
- Align the architecture with the founder's integration strategy (integrate vs replace)
- Account for industry-specific compliance or regulatory requirements
- If this is a cross-industry pattern transfer, note which components are transferable from the source industry and which need new research
` : "";

    // Build prompts
    const northStarPrompt = buildNorthStarPrompt(blueprintTitle, blueprintContent, techStack, founderIntelStr);
    const contractPrompt = buildArchitecturePrompt(blueprintTitle, techStack, founderIntelStr);
    const slicePrompt = buildSlicePlanPrompt(blueprintTitle, blueprintContent, techStack, founderIntelStr);
    const launchPrompt = buildLaunchPlaybookPrompt(blueprintTitle, blueprintContent, techStack, founderIntelStr);

    console.log('Generating all 4 documents in parallel...');

    // Generate all 4 documents in parallel
    const [northStarSpec, architectureContract, verticalSlicePlan, launchPlaybook] = await Promise.all([
      callAI(northStarPrompt, 'North Star Spec'),
      callAI(contractPrompt, 'Architecture Contract'),
      callAI(slicePrompt, 'Thin Vertical Slice Plan'),
      callAI(launchPrompt, 'Launch Playbook'),
    ]);

    console.log('All documents generated, saving to database...');

    // Save all 4 documents in parallel
    const [northStarResult, contractResult, sliceResult, launchResult] = await Promise.all([
      supabase.from('workspace_documents').insert({
        user_id: userId,
        venture_id: ventureId,
        folder_id: folderId,
        title: 'North Star Spec',
        doc_type: 'north_star_spec',
        content: northStarSpec,
        status: 'final',
      }).select().single(),
      supabase.from('workspace_documents').insert({
        user_id: userId,
        venture_id: ventureId,
        folder_id: folderId,
        title: 'Architecture Contract',
        doc_type: 'architecture_contract',
        content: architectureContract,
        status: 'final',
      }).select().single(),
      supabase.from('workspace_documents').insert({
        user_id: userId,
        venture_id: ventureId,
        folder_id: folderId,
        title: 'Thin Vertical Slice Plan',
        doc_type: 'vertical_slice_plan',
        content: verticalSlicePlan,
        status: 'final',
      }).select().single(),
      supabase.from('workspace_documents').insert({
        user_id: userId,
        venture_id: ventureId,
        folder_id: folderId,
        title: 'Launch Playbook',
        doc_type: 'launch_playbook',
        content: launchPlaybook,
        status: 'final',
      }).select().single(),
    ]);

    console.log('Documents saved, running spec validation...');

    // Run spec validation pass
    let specValidation: any = { overallQuality: 'medium', flags: [], approvedForExecution: true };
    try {
      specValidation = await runSpecValidation(
        northStarSpec,
        architectureContract,
        verticalSlicePlan,
        launchPlaybook,
        lovableApiKey
      );
      console.log('Spec validation complete:', specValidation.overallQuality, 'flags:', specValidation.flags?.length);
    } catch (validationError) {
      console.error('Spec validation failed (non-blocking):', validationError);
    }

    // Update kit with document IDs, validation result, and mark complete
    await supabase
      .from('implementation_kits')
      .update({
        north_star_spec_id: northStarResult.data?.id,
        architecture_contract_id: contractResult.data?.id,
        vertical_slice_plan_id: sliceResult.data?.id,
        launch_playbook_id: launchResult.data?.id,
        status: 'complete',
        spec_validation: specValidation,
      })
      .eq('id', kitId);

    console.log('Implementation kit generation complete!');

  } catch (error) {
    console.error('Background generation error:', error);
    
    // Update kit status to error
    await supabase
      .from('implementation_kits')
      .update({ 
        status: 'error', 
        error_message: error instanceof Error ? error.message : 'Unknown error' 
      })
      .eq('id', kitId);
  }
}

// Spec Validator System Prompt
const SPEC_VALIDATOR_SYSTEM_PROMPT = `You are a specification quality reviewer. You receive four founder documents and identify ambiguity that would cause an AI coding agent (like Lovable.dev) to make incorrect assumptions or build the wrong thing.

## OUTPUT CONTRACT
Return ONLY valid JSON. No prose, no markdown fences.

{
  "overallQuality": "high" | "medium" | "low",
  "flags": [
    {
      "document": "north_star_spec" | "architecture_contract" | "thin_vertical_slice" | "launch_playbook",
      "severity": "blocking" | "warning" | "suggestion",
      "ambiguousText": "exact phrase from the document that is ambiguous",
      "issue": "one sentence explaining why this phrase causes problems for an AI builder",
      "resolutionQuestion": "the exact question to ask the founder to resolve this"
    }
  ],
  "approvedForExecution": boolean
}

## Rules
- Maximum 8 flags total. Prioritize blocking over warning over suggestion.
- approvedForExecution is true only if there are zero blocking flags.
- Do NOT flag standard technical terminology with industry-standard meanings.
- Do NOT flag founder context or narrative — only flag spec language an AI builder would misinterpret.

## Always Flag These Words/Phrases
"soon", "often", "reasonable", "appropriate", "basic", "simple", "standard", 
"good enough", "as needed", "when ready", "later", "ideally", "if possible", 
"fast", "responsive" (without specific breakpoints), "modern", "clean"

## Always Flag These Patterns
- Feature scope described without acceptance criteria
- Timeline references without specific dates or day counts
- "The system should handle X" without defining X's boundaries
- Architecture decisions described as "optional" or "depending on needs"
- Any feature in scope without a definition of done`;

async function runSpecValidation(
  northStarSpec: string,
  architectureContract: string,
  verticalSlicePlan: string,
  launchPlaybook: string,
  lovableApiKey: string
): Promise<{
  overallQuality: string;
  flags: Array<{
    document: string;
    severity: string;
    ambiguousText: string;
    issue: string;
    resolutionQuestion: string;
  }>;
  approvedForExecution: boolean;
}> {
  try {
    const userMessage = `Review these four documents for specification quality:\n\nNORTH STAR SPEC:\n${northStarSpec}\n\nARCHITECTURE CONTRACT:\n${architectureContract}\n\nTHIN VERTICAL SLICE PLAN:\n${verticalSlicePlan}\n\nLAUNCH PLAYBOOK:\n${launchPlaybook}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-5-mini',
        max_completion_tokens: 2000,
        messages: [
          { role: 'system', content: SPEC_VALIDATOR_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(\`Spec validation AI error: \${errorText}\`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const clean = text.replace(/\`\`\`json|\`\`\`/g, '').trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error('Spec validation error:', error);
    // Never block kit completion due to validation failure
    return {
      overallQuality: 'medium',
      flags: [],
      approvedForExecution: true,
    };
  }
}

// Prompt builders
function buildNorthStarPrompt(title: string, content: string, techStack: any, founderIntel: string): string {
  return `You are a product strategy expert. Generate a North Star Spec document.

BLUEPRINT:
Title: ${title}
Content: ${content}

TECH STACK:
Frontend: ${techStack.frontend}
Backend: ${techStack.backend}
AI Tool: ${techStack.aiTool}
Deployment: ${techStack.deployment}
${founderIntel}
Generate a North Star Spec following this EXACT structure:

# North Star Spec: ${title}

## 1. Positioning (Who/What/Why)

**Who is this for?**
[One clear sentence describing the target user]

**What does it do?**
[One clear sentence describing the core value proposition]

**Why does it matter?**
[One clear sentence explaining why this is important/urgent]

## 2. Core Loop

**Trigger →** [What brings users to the product]
**Action →** [The main action they take]
**Reward →** [The value they receive]
**Return →** [Why they come back]

## 3. V1 Scope

### ✅ In Scope (Must Have for Launch)
1. [Feature 1 - be very specific]
2. [Feature 2 - be very specific]
3. [Feature 3 - be very specific]
4. [Feature 4 - be very specific]
5. [Feature 5 - be very specific]

### ❌ Out of Scope (Not for V1)
1. [Feature to skip - explain why it's post-v1]
2. [Feature to skip - explain why it's post-v1]
3. [Feature to skip - explain why it's post-v1]

## 4. Business Model

**Pricing Structure:**
[Describe pricing tiers: Free tier with limits, Pro tier pricing]

**Free Tier Limits:**
- [Specific limit 1]
- [Specific limit 2]
- [Specific limit 3]

**Pro Tier Benefits ($XX/month):**
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

## 5. Product Rules (Always True)

These are immutable principles that guide all product decisions:

1. **[Rule Title]:** [Description of this principle]
2. **[Rule Title]:** [Description of this principle]
3. **[Rule Title]:** [Description of this principle]
4. **[Rule Title]:** [Description of this principle]
5. **[Rule Title]:** [Description of this principle]

## 6. Data Principles

**What we MUST store:**
- [Data type 1 and why it's essential]
- [Data type 2 and why it's essential]
- [Data type 3 and why it's essential]

**What we NEVER store:**
- [Sensitive data 1 and why not]
- [Sensitive data 2 and why not]

**Data Retention:**
[Policy on how long data is kept]

---

## MACHINE CONTEXT BLOCK
At the very top of the document, before any markdown content, output this JSON block:

\`\`\`machine_context
{
  "product_name": "string — exact product name",
  "target_segment": "string — one sentence describing the primary user",
  "core_problem": "string — one sentence, the problem being solved",
  "value_proposition": "string — one sentence, the specific value delivered",
  "v1_features_in_scope": ["string", "string", "string"],
  "v1_features_out_of_scope": ["string", "string"],
  "pricing_tiers": [
    { "name": "string", "price_monthly": number, "key_limits": ["string"] }
  ],
  "product_rules": ["string — immutable principle 1", "string — immutable principle 2"],
  "success_metric_at_30_days": "string — one specific, measurable outcome"
}
\`\`\`

Then output the full North Star Spec markdown document below it.

Make it specific, actionable, and based on the actual blueprint details. Use markdown formatting. Keep it to 2 pages maximum when printed.`;
}

function buildArchitecturePrompt(title: string, techStack: any, founderIntel: string): string {
  const supabasePatterns = `### Supabase Patterns

**Simple Operations:** Direct table access via Supabase client
\`\`\`typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId);
\`\`\`

**Complex Operations:** Use Supabase RPC functions
\`\`\`typescript
const { data, error } = await supabase
  .rpc('function_name', { param1, param2 });
\`\`\`

**Real-time:** Use Supabase subscriptions for live updates

**Authentication:** JWT tokens in every request, validated by RLS`;

  const restPatterns = `### RESTful API Patterns

**Endpoints:**
- GET /api/v1/[resource] - List all
- GET /api/v1/[resource]/:id - Get one
- POST /api/v1/[resource] - Create
- PUT /api/v1/[resource]/:id - Update
- DELETE /api/v1/[resource]/:id - Delete

**Authentication:** JWT tokens in Authorization header

**Response Format:**
\`\`\`typescript
{
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
}
\`\`\``;

  const rlsSupabase = `**REQUIRED on every table:**
\`\`\`sql
alter table table_name enable row level security;

create policy "Users manage their own data"
  on table_name for all
  using (auth.uid() = user_id);
\`\`\``;

  const rlsRest = `**Enforced in application layer:**
Every query must filter by user_id or organization_id`;

  const componentPatterns = techStack.frontend === 'react' || techStack.frontend === 'nextjs'
    ? `**Framework:** Tailwind CSS + shadcn/ui

**Pattern:** Composable components
\`\`\`tsx
// ✅ Good
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>

// ❌ Bad
<MegaComponent withHeader withFooter content={...} />
\`\`\``
    : `**Framework:** ${techStack.frontend === 'vue' ? 'Vue 3 Composition API' : 'Component-based architecture'}

Use scoped styles and composition patterns.`;

  return `You are a senior software architect. Generate an Architecture Contract document.

CONTEXT:
Business: ${title}
Frontend: ${techStack.frontend}
Backend: ${techStack.backend}
AI Tool: ${techStack.aiTool}
Deployment: ${techStack.deployment}
${founderIntel}
Generate an Architecture Contract following this structure:

# Architecture Contract: ${title}

## Purpose
This document defines the technical scaffold that EVERY feature must follow. It ensures consistency, scalability, and maintainability as the codebase grows.

---

## Contract 1: Folder Structure & Boundaries

### Directory Layout
\`\`\`
${techStack.frontend === 'nextjs' ? 'app/' : 'src/'}
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (buttons, inputs)
│   └── features/       # Feature-specific components
├── lib/                # Utilities, helpers, types
│   ├── api/           # API client functions
│   ├── hooks/         # Custom React hooks
│   └── utils/         # Pure utility functions
├── ${techStack.frontend === 'nextjs' ? 'app/' : 'pages/'}         # Routes
└── types/              # TypeScript type definitions
\`\`\`

### Boundaries
**Rule:** Feature code stays in feature folders. Shared code moves to lib/.

**Example:** User profile components go in \`components/features/profile/\`, NOT scattered across the app.

---

## Contract 2: Domain Model

Define the core entities for this business. Based on the blueprint, identify 3-5 primary entities.

### Core Entities

#### Users
\`\`\`typescript
interface User {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'free' | 'pro';
  created_at: Date;
  updated_at: Date;
}
\`\`\`

[Generate 2-4 more entities based on the business model with TypeScript interfaces]

### Entity Relationships
- [Describe relationships: "User has many Projects", "Project belongs to User", etc.]

---

## Contract 3: API Patterns

${techStack.backend === 'supabase' ? supabasePatterns : restPatterns}

### Error Handling
- 400: Bad Request (validation errors)
- 401: Unauthorized (auth required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Internal Server Error

---

## Contract 4: Database Conventions

### Table Naming
- Lowercase, snake_case
- Plural names (users, projects, tasks)
- Junction tables: [table1]_[table2]

### Standard Columns
Every table MUST have:
\`\`\`sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz default now(),
updated_at timestamptz default now()
\`\`\`

### Row Level Security (RLS)
${techStack.backend === 'supabase' ? rlsSupabase : rlsRest}

### Migrations
- Sequential numbering: 001_initial.sql, 002_add_feature.sql
- Always include rollback instructions
- Test locally before deploying

---

## Contract 5: UI System Rules

### Design Tokens
\`\`\`css
/* Colors */
--primary: hsl(var(--primary));
--secondary: hsl(var(--secondary));
--accent: hsl(var(--accent));

/* Spacing */
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
\`\`\`

### Component Patterns
${componentPatterns}

### State Management
- **Local state:** useState for component-specific data
- **Global state:** Context API or Zustand for app-wide state
- **Server state:** React Query for API data caching

---

## Enforcement Checklist

Before every feature:
- [ ] Follows folder structure?
- [ ] Uses defined domain model?
- [ ] Follows API conventions?
- [ ] Database has RLS + standard columns?
- [ ] UI uses design tokens?

---

## MACHINE CONTEXT BLOCK
At the very top of the document, before any markdown content, output this JSON block:

\`\`\`machine_context
{
  "tech_stack": {
    "frontend": "string",
    "backend": "string",
    "ai_tool": "string",
    "deployment": "string"
  },
  "data_models": [
    { "table": "string", "key_columns": ["string"], "rls_required": boolean }
  ],
  "edge_functions": [
    { "name": "string", "method": "POST|GET", "auth_required": boolean, "inputs": {}, "outputs": {} }
  ],
  "auth_pattern": "string — describe the auth approach in one sentence",
  "must_never_do": ["string — hard constraint 1", "string — hard constraint 2"]
}
\`\`\`

Then output the full Architecture Contract markdown document below it.

Make it tech-stack-specific and actionable for \${techStack.frontend} + \${techStack.backend}.`;
}

function buildSlicePlanPrompt(title: string, content: string, techStack: any, founderIntel: string): string {
  const supabaseAuth = `1. **Set up Supabase Auth**
   - Enable email/password authentication
   - Configure email templates
   - Set up redirect URLs
   
2. **Create auth pages**
   - Sign up page (email + password)
   - Sign in page
   - Password reset flow
   - Email verification
   
3. **Build user profile**
   - Profile settings page
   - Update email/password
   - Delete account option`;

  const jwtAuth = `1. **Implement JWT authentication**
   - Create registration endpoint
   - Create login endpoint
   - Implement password hashing (bcrypt)
   - Generate JWT tokens
   
2. **Create auth pages**
   - Sign up page
   - Sign in page
   - Password reset flow
   
3. **Build user profile**
   - Profile settings page
   - Update password
   - Session management`;

  return `You are a technical lead. Generate a Thin Vertical Slice Plan.

CONTEXT:
Business: ${title}
Blueprint: ${content}
Tech Stack: ${techStack.frontend} + ${techStack.backend}
Deployment: ${techStack.deployment}
${founderIntel}
Generate a plan following this structure:

# Thin Vertical Slice Plan: ${title}

## What is the Thin Vertical Slice?

The **Thin Vertical Slice** is the minimal end-to-end system that proves your SaaS can:
1. Sign up users
2. Deliver core value
3. Charge money
4. Support users when things break

This is NOT your full product. This is the **spine** everything else attaches to.

---

## Phase 1: Authentication & User Management

### Goal
Users can sign up, sign in, and manage their profile.

### Tasks
${techStack.backend === 'supabase' ? supabaseAuth : jwtAuth}

### Database Schema
\`\`\`sql
-- User profiles (extends auth.users)
create table user_profiles (
  id uuid references auth.users(id) primary key,
  full_name text,
  avatar_url text,
  subscription_tier text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

${techStack.backend === 'supabase' ? `-- RLS policies
alter table user_profiles enable row level security;

create policy "Users can view own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);` : ''}
\`\`\`

### Acceptance Criteria
- [ ] New user can sign up
- [ ] User receives verification email
- [ ] User can sign in
- [ ] User can reset password
- [ ] User can update profile
- [ ] Session persists across reloads

**Timeline:** Week 1 (5 days)

---

## Phase 2: Billing Infrastructure

### Goal
System can track subscriptions and accept payments.

### Tasks
1. **Set up Stripe**
   - Create Stripe account (test mode first)
   - Get API keys
   - Install Stripe SDK
   - Create webhook endpoint

2. **Define subscription plans**
   - Free tier (define exact limits)
   - Pro tier ($29/month or appropriate pricing)
   - Create products in Stripe dashboard

3. **Build checkout flow**
   - Upgrade button in UI
   - Stripe Checkout integration
   - Success/cancel redirect pages
   - Customer portal link (for managing subscription)

4. **Handle webhooks**
   - \`checkout.session.completed\`
   - \`customer.subscription.updated\`
   - \`customer.subscription.deleted\`
   - \`invoice.payment_failed\`

### Database Schema
\`\`\`sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null, -- 'active', 'canceled', 'past_due'
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

${techStack.backend === 'supabase' ? `alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);` : ''}
\`\`\`

### Acceptance Criteria
- [ ] Free user can upgrade to Pro
- [ ] Payment processed via Stripe
- [ ] Subscription status updates correctly
- [ ] User can manage subscription via portal
- [ ] Failed payments handled gracefully
- [ ] Webhooks update database correctly

**Timeline:** Week 2 (5 days)

---

## Phase 3: Core Data Model & Workflow

### Goal
Implement the primary business entities and the one key workflow that delivers value.

Based on the blueprint, identify 2-3 core entities and the main workflow.

### Implementation Tasks
1. **Build data layer**
   - Create database tables
   - Set up RLS policies
   - Write API endpoints (or Supabase queries)

2. **Build UI layer**
   - Input form/interface
   - Processing/loading states
   - Results display
   - Error handling

3. **Integration**
   - Connect frontend to backend
   - Add validation
   - Test edge cases

### Acceptance Criteria
- [ ] User can complete core workflow end-to-end
- [ ] Data persists correctly
- [ ] UI handles loading/error states
- [ ] Works on desktop and mobile
- [ ] Free tier limits enforced

**Timeline:** Week 3 (5 days)

---

## Phase 4: Logging, Monitoring & Deployment

### Goal
Production-ready with proper observability.

### Tasks
1. **Set up error tracking**
   - Install Sentry (or similar)
   - Add error boundaries in React
   - Log critical backend errors

2. **Add analytics**
   - Track key events (signup, upgrade, core action)
   - Set up conversion funnels
   - Monitor user behavior

3. **Deployment**
   - Deploy to ${techStack.deployment}
   - Set up environment variables
   - Configure custom domain (optional)
   - Enable HTTPS

4. **Monitoring**
   - Uptime monitoring
   - Performance monitoring
   - Database query performance
   - Set up alerts for critical errors

### Acceptance Criteria
- [ ] App deployed to production
- [ ] Errors captured in Sentry
- [ ] Key events tracked in analytics
- [ ] Uptime monitoring active
- [ ] Can debug production issues

**Timeline:** Week 4 (5 days)

---

## Success Criteria (Definition of Done)

The Thin Vertical Slice is COMPLETE when:

✅ **A new user can:**
1. Create an account
2. Use the core feature
3. Upgrade to paid (even if they don't)
4. Get support if something breaks

✅ **You (the founder) can:**
1. See errors in production
2. Track user behavior
3. Process payments
4. Debug issues quickly

---

## What Comes AFTER the Thin Vertical Slice

Once this is done, you can:
- Add features systematically (each following the architecture contract)
- Scale with confidence (the foundation is solid)
- Ship faster (patterns are established)

But ship THIS first. Everything else can wait.

## MACHINE CONTEXT BLOCK
At the very top of the document, before any markdown content, output this JSON block:

\`\`\`machine_context
{
  "total_phases": number,
  "phases": [
    {
      "phase_number": number,
      "name": "string",
      "deliverables": ["string"],
      "estimated_hours": number,
      "test_criteria": ["string — binary pass/fail"],
      "lovable_prompt_summary": "string — one sentence describing what the Lovable prompt for this phase accomplishes"
    }
  ],
  "critical_path_order": ["string — phase name in execution order"],
  "first_working_milestone": "string — the earliest moment something functional exists"
}
\`\`\`

Then output the full Thin Vertical Slice Plan markdown document below it.

Make it specific and actionable for \${techStack.frontend} + \${techStack.backend} + \${techStack.deployment}.`;
}

function buildLaunchPlaybookPrompt(
  title: string, 
  content: string, 
  techStack: any, 
  founderIntel: string
): string {
  return `You are a startup launch strategist who specializes in helping solo founders get their first 10 paying customers. You understand that non-technical founders building with AI coding tools have a specific challenge: they can ship fast, but they don't know how to get anyone to care.

BLUEPRINT:
Title: ${title}
Content: ${content}

TECH STACK:
Frontend: ${techStack.frontend}
Backend: ${techStack.backend}
Deployment: ${techStack.deployment}

${founderIntel}

Generate a Launch Playbook following this EXACT structure:

# Launch Playbook: ${title}

## Phase 0: Pre-Launch Foundation (Before You Ship)

### Landing Page
Build this BEFORE you build the product. It validates demand and captures early interest.

**Required elements:**
1. [Headline — one sentence that states the problem you solve, tailored to the specific target customer from the blueprint]
2. [Subhead — one sentence about the solution, written for the target customer's language level]
3. [3 benefit bullets — outcomes, not features]
4. [Email capture — "Get early access" or "Join the waitlist"]
5. [Social proof placeholder — "Built by a [credential]" or "Trusted by [N] early users"]

**Where to build it:**
- If using ${techStack.frontend}: add a "/" route with the landing page as the default for non-authenticated users
- Alternative: use Carrd.co ($19/year) for a standalone page if you want to test messaging before building

**Analytics setup (required before launch):**
- Install Plausible, PostHog, or Vercel Analytics
- Track these specific events:
  1. page_view (landing page)
  2. waitlist_signup (email captured)
  3. signup_started (auth flow begun)
  4. signup_completed (account created)
  5. core_action_completed (the main value-delivery action)
  6. upgrade_clicked (Pro/paid CTA)
  7. payment_completed (first payment)

**Conversion funnel to monitor:**
Landing page visitors → Waitlist signups → Account signups → Core action completed → Payment

Target: 30%+ of waitlist → signup, 20%+ of signup → core action.

### Legal Minimum (don't skip this)
- Terms of Service (use a generator like Termly or iubenda)
- Privacy Policy (required if collecting email/data)
- Cookie notice (if using analytics)
- Add links in footer before launch

---

## Phase 1: Launch Week Plan

### Day -3 to -1: Soft Launch
- Send the app to 5 people you trust (friends, colleagues, mentors)
- Ask them to complete the core workflow and report friction
- Fix the top 3 issues they find
- Do NOT publicly launch until these are fixed

### Day 0: Launch Day

**Where to post (in this order):**

1. **Your existing network first.**
   [If FOUNDER INTELLIGENCE shows direct industry access or customer intimacy, list specific outreach tactics here. E.g., "You have direct relationships with RIAs — send a personal message to 5-10 of them: 'I built something to solve [specific pain]. Would you try it and tell me what's missing?'"]
   
   [If no direct access: "Post on your personal LinkedIn with a story about WHY you built this. People buy the founder's journey before they buy the product."]

2. **One community where your target customers already hang out.**
   [Based on the target customer from the blueprint, identify 1-2 specific communities. E.g., for RIAs: "Kitces.com forums, r/financialplanning, RIA Slack groups." For restaurants: "r/restaurateur, Restaurant Owner Facebook groups." For developers: "Hacker News Show HN, r/SideProject, IndieHackers."]
   
   Do NOT post a sales pitch. Post a problem story:
   "I've worked in [industry] for [X] years and always hated [pain]. So I built [product] to fix it. Here's what it does. Would love feedback from people who deal with this."

3. **Product Hunt (optional, only if B2B SaaS).**
   - Best posted Tuesday-Thursday, 12:01 AM PT
   - Prepare: tagline, 3 screenshots, 60-second demo video (Loom)
   - Don't obsess over ranking — it's for backlinks and credibility

### Day 1-3: Respond to Everything
- Reply to every comment, email, and DM within 2 hours
- Ask every early user: "What's the one thing that would make you pay for this?"
- Log every piece of feedback in a simple spreadsheet

### Day 4-7: Iterate on Feedback
- Identify the #1 requested feature or fix
- Ship it by day 7
- Post an update: "You asked for [X], we shipped it in 3 days"
- This builds trust faster than any marketing

---

## Phase 2: First 10 Customers (Days 8-30)

### Customer Acquisition Channels

[CRITICAL: Personalize this section using FOUNDER INTELLIGENCE. The channels should match the founder's strengths and avoid their hard-no filters.]

**If founder has DIRECT industry access:**
Your fastest path to revenue is warm outreach to people who already know and trust you. This is not sales — it's solving a problem for people you care about.

Specific tactics:
1. Make a list of 20 people in your network who experience the problem your product solves
2. Send a personal message (not a mass email): "I built [product] to solve [pain]. I'd love to give you free access for a month and get your honest feedback. If it saves you time, I'll ask you to pay $[price] after that."
3. Goal: 10 conversations → 5 trials → 2-3 paying customers

**If founder has INDIRECT access (knows the industry but not the customers directly):**
1. Find where your target customers ask for help (forums, subreddits, Slack groups, Facebook groups)
2. Answer questions genuinely for 1 week before mentioning your product
3. When someone posts a problem your product solves, respond with help AND mention your tool: "I actually built something for this — happy to give you free access"
4. Goal: 50 helpful responses → 5 trials → 2-3 paying customers

**If founder has NO industry access (pattern transfer / cross-industry play):**
1. You need to build credibility from scratch in the target industry
2. Write 3 LinkedIn posts about the problem from an outsider's perspective: "I spent 8 years in [source industry] solving [abstract problem]. I just realized [target industry] has the exact same problem — and nobody's solving it."
3. DM 10 people who engage with your posts
4. Offer free beta access in exchange for 15-minute feedback calls
5. Goal: 3 posts → 10 DMs → 5 calls → 2-3 pilot users

[If hard-no filters include "cold calling" or similar, explicitly state: "All outreach is async — messages, posts, and DMs only. No calls unless the prospect requests one."]

### Pricing Activation
- Launch with a simple pricing page: Free tier + one paid tier
- First 10 customers: offer a "founding member" discount (30-50% off for life) in exchange for feedback and a testimonial
- Don't optimize pricing until you have 20+ paying customers
- Track: time from signup to first payment (your activation metric)

### Content Flywheel (start simple)
Pick ONE format you'll do weekly:
- If you like writing: 1 LinkedIn post per week about a problem your product solves
- If you like talking: 1 short Loom video per week showing a use case
- If you like neither: 1 tweet thread per week (takes 15 minutes)

Rule: every piece of content must end with a link to your product. Not a hard sell — just "I built [product] to fix this → [link]."

---

## Phase 3: Metrics That Matter

### Week 1 Dashboard
Track these numbers daily:
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Landing page visits | 100+ | Analytics |
| Signups | 15+ | Auth table count |
| Core action completed | 8+ | Event tracking |
| Feedback received | 5+ | Manual count |

### Month 1 Dashboard
| Metric | Target | How to Measure |
|--------|--------|---------------|
| Total signups | 50+ | Auth table count |
| Active users (used in last 7 days) | 15+ | Event tracking |
| Paying customers | 3-5 | Stripe dashboard |
| MRR | $100+ | Stripe dashboard |
| NPS / satisfaction | 8+ | Ask 5 users |

### Red Flags (pivot signals)
- 0 signups after 100+ landing page visits → messaging problem
- Signups but 0 core actions → onboarding problem
- Core actions but 0 payments → pricing or value problem
- Payments but immediate churn → retention problem

Each problem has a different fix. Don't change everything at once.

---

## Launch Checklist

Before you go live, verify:

- [ ] Landing page live with clear value proposition
- [ ] Analytics tracking all 7 events listed above
- [ ] Payment flow works end-to-end (test with Stripe test mode)
- [ ] Error tracking active (Sentry or similar)
- [ ] Terms of Service and Privacy Policy linked in footer
- [ ] 5 beta testers have completed the core workflow
- [ ] Top 3 friction points from beta testing are fixed
- [ ] You have a list of 20 people to message on launch day
- [ ] You've written your launch post/message
- [ ] Customer support channel exists (even if it's just an email)

---

## MACHINE CONTEXT BLOCK
At the very top of the document, before any markdown content, output this JSON block:

\`\`\`machine_context
{
  "ideal_first_customer_profile": "string — one sentence describing the exact person to target first",
  "acquisition_channels": [
    { "channel": "string", "priority": "high|medium|low", "first_action": "string — the specific first step" }
  ],
  "week_one_actions": ["string", "string", "string"],
  "validation_signal": "string — the one signal that confirms you have product-market fit",
  "first_10_customers_strategy": "string — one paragraph describing the exact approach",
  "red_flags_to_watch": ["string — warning sign 1", "string — warning sign 2"]
}
\`\`\`

Then output the full Launch Playbook markdown document below it.

Make every section specific to this business, this target customer, and this founder's situation. Use the FOUNDER INTELLIGENCE to personalize the customer acquisition tactics. Reference the specific industry, the specific customer relationships, and the specific expertise. Do NOT give generic advice.

Keep the total document to 3-4 pages when printed. Use markdown formatting.`;
}
