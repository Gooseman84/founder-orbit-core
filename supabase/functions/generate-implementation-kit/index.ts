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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { blueprintId, ventureId, techStack, userId } = await req.json();

    if (!blueprintId || !ventureId || !techStack || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      folder?.id || null
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
  folderId: string | null
) {
  // Create a new supabase client for background work
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Background generation started for kit:', kitId);

    // Helper function to call Lovable AI Gateway
    async function callAI(prompt: string): Promise<string> {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5-mini',
          max_completion_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI API error: ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
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
    }, null, 2);

    // Build prompts
    const northStarPrompt = buildNorthStarPrompt(blueprintTitle, blueprintContent, techStack);
    const contractPrompt = buildArchitecturePrompt(blueprintTitle, techStack);
    const slicePrompt = buildSlicePlanPrompt(blueprintTitle, blueprintContent, techStack);

    console.log('Generating all 3 documents in parallel...');

    // Generate all 3 documents in parallel
    const [northStarSpec, architectureContract, verticalSlicePlan] = await Promise.all([
      callAI(northStarPrompt),
      callAI(contractPrompt),
      callAI(slicePrompt),
    ]);

    console.log('All documents generated, saving to database...');

    // Save all 3 documents in parallel
    const [northStarResult, contractResult, sliceResult] = await Promise.all([
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
    ]);

    console.log('Documents saved, updating kit status...');

    // Update kit with document IDs and mark complete
    await supabase
      .from('implementation_kits')
      .update({
        north_star_spec_id: northStarResult.data?.id,
        architecture_contract_id: contractResult.data?.id,
        vertical_slice_plan_id: sliceResult.data?.id,
        status: 'complete',
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

// Prompt builders
function buildNorthStarPrompt(title: string, content: string, techStack: any): string {
  return `You are a product strategy expert. Generate a North Star Spec document.

BLUEPRINT:
Title: ${title}
Content: ${content}

TECH STACK:
Frontend: ${techStack.frontend}
Backend: ${techStack.backend}
AI Tool: ${techStack.aiTool}
Deployment: ${techStack.deployment}

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

Make it specific, actionable, and based on the actual blueprint details. Use markdown formatting. Keep it to 2 pages maximum when printed.`;
}

function buildArchitecturePrompt(title: string, techStack: any): string {
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

Make it tech-stack-specific and actionable for ${techStack.frontend} + ${techStack.backend}.`;
}

function buildSlicePlanPrompt(title: string, content: string, techStack: any): string {
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

Make it specific and actionable for ${techStack.frontend} + ${techStack.backend} + ${techStack.deployment}.`;
}
