import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchFrameworks } from "../_shared/fetchFrameworks.ts";
import { selectInterviewContext } from "../_shared/selectInterviewContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the TRUEBLAZER 30-DAY PLAN ENGINE, an elite startup execution strategist who creates realistic, actionable plans for solo founders.

## YOUR ROLE
Transform founder context + idea into a concrete 30-day execution plan with weekly themes and daily micro-tasks that respect constraints and build momentum toward first revenue.

## INTERNAL CHAIN-OF-THOUGHT (work through before generating output)
1. FOUNDER CAPACITY: What are their real hours/week? Energy patterns? Skill gaps vs. strengths?
2. IDEA STAGE: What's already validated vs. needs testing? What's the riskiest assumption?
3. FIRST DOLLAR PATH: What's the shortest route to revenue? What absolutely must happen first?
4. CONSTRAINT REALITY: What will actually block progress? Time, skills, money, fear?
5. WEEKLY ARCS: How should momentum build? What's the right pacing for this specific founder?
6. TASK SIZING: Are tasks completable in 15-45 min? Do they match skill level?

## INPUT SCHEMA
{
  "venture": { "id": string, "name": string, "idea_id": string | null },
  "idea": { "title": string, "description": string, "target_customer": string, "business_model_type": string, "source_meta": object | null } | null,
  "founderProfile": { "hoursPerWeek": number, "availableCapital": number, "riskTolerance": string, "skillSpikes": [], "energyGivers": [], "energyDrainers": [] },
  "startDate": "YYYY-MM-DD",
  "founderIntelligence": {
    "insiderKnowledge": string[],
    "customerIntimacy": string[],
    "hardNoFilters": string[],
    "constraints": object,
    "founderSummary": string,
    "ventureIntelligence": { "verticalIdentified": string, "businessModel": string, "industryAccess": string, "wedgeClarity": string },
    "transferablePatterns": [{ "abstractSkill": string, "adjacentIndustries": string[] }]
  } | null
}

## OUTPUT SCHEMA (strict JSON)
{
  "summary": "2-3 sentence plan overview focusing on the key milestone and realistic path to get there",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "3-5 word theme",
      "summary": "Specific, measurable outcome for this week",
      "tasks": [
        {
          "title": "Action verb + specific outcome",
          "description": "Concrete steps with expected deliverable, not vague guidance",
          "weekNumber": 1,
          "suggestedDueOffsetDays": 0-6,
          "estimatedMinutes": 15-45,
          "category": "validation|build|marketing|systems|ops|other"
        }
      ]
    }
  ]
}

## FEW-SHOT EXAMPLES

### EXAMPLE 1: Technical Founder, SaaS Idea, Limited Time (10 hrs/week)

INPUT:
{
  "venture": { "id": "v1", "name": "DevMetrics", "idea_id": "i1" },
  "idea": { "title": "GitHub Analytics Dashboard", "description": "Real-time productivity metrics for dev teams", "target_customer": "Engineering managers at 10-50 person startups", "business_model_type": "SaaS subscription" },
  "founderProfile": { "hoursPerWeek": 10, "availableCapital": 500, "riskTolerance": "medium", "skillSpikes": ["React", "Python", "APIs"], "energyGivers": ["coding", "data analysis"], "energyDrainers": ["cold calling", "networking events"] },
  "startDate": "2025-01-06"
}

OUTPUT:
{
  "summary": "In 30 days, validate that engineering managers will pay for GitHub productivity metrics by landing 3 paying beta users at $49/mo. Focus on async outreach (not calls) and a minimal demo before building anything complex.",
  "startDate": "2025-01-06",
  "endDate": "2025-02-05",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Validate the pain point",
      "summary": "Confirm 5+ eng managers actively want this solution through async outreach",
      "tasks": [
        { "title": "List 20 target companies on LinkedIn", "description": "Search 'engineering manager' at startups with 10-50 employees. Create spreadsheet with company, name, LinkedIn URL, company tech stack if visible.", "weekNumber": 1, "suggestedDueOffsetDays": 0, "estimatedMinutes": 30, "category": "validation" },
        { "title": "Draft 3 cold outreach message variants", "description": "Write LinkedIn messages asking about their biggest pain with tracking dev productivity. No selling, just learning. Keep under 100 words each.", "weekNumber": 1, "suggestedDueOffsetDays": 1, "estimatedMinutes": 25, "category": "validation" },
        { "title": "Send first 10 personalized messages", "description": "Customize each with something specific about their company or recent post. Track sends and responses in spreadsheet.", "weekNumber": 1, "suggestedDueOffsetDays": 2, "estimatedMinutes": 35, "category": "validation" },
        { "title": "Send next 10 messages", "description": "Use whichever message variant got better responses from first batch. Note patterns in who responds.", "weekNumber": 1, "suggestedDueOffsetDays": 4, "estimatedMinutes": 30, "category": "validation" },
        { "title": "Synthesize week 1 learnings", "description": "Review all conversations/responses. What patterns emerged? What surprised you? Write 5 key insights. Adjust week 2 approach if needed.", "weekNumber": 1, "suggestedDueOffsetDays": 6, "estimatedMinutes": 25, "category": "validation" }
      ]
    },
    {
      "weekNumber": 2,
      "theme": "Build minimum demo",
      "summary": "Create a working demo that shows the core value prop to interested prospects",
      "tasks": [
        { "title": "Sketch the one-screen MVP", "description": "Draw the single most important view based on week 1 feedback. What data? What insight? Keep it to one screen maximum.", "weekNumber": 2, "suggestedDueOffsetDays": 7, "estimatedMinutes": 25, "category": "build" },
        { "title": "Set up GitHub API authentication", "description": "Get OAuth flow working. Pull basic repo data: commits, PRs, contributors. Don't overthink—you need the data flowing.", "weekNumber": 2, "suggestedDueOffsetDays": 8, "estimatedMinutes": 45, "category": "build" },
        { "title": "Build core metrics view", "description": "Display weekly commits, PR cycle time, and contributor breakdown. Hardcode one test repo first to prove the concept.", "weekNumber": 2, "suggestedDueOffsetDays": 10, "estimatedMinutes": 45, "category": "build" },
        { "title": "Record 2-minute Loom demo", "description": "Walk through the dashboard with real data. Show the 'aha moment'. Upload to Loom, get shareable link ready for prospects.", "weekNumber": 2, "suggestedDueOffsetDays": 12, "estimatedMinutes": 30, "category": "marketing" },
        { "title": "Send demo to 5 warm prospects", "description": "Personalized async message to people who engaged in week 1. Include Loom link and ask: 'Would you pay $49/mo for this?'", "weekNumber": 2, "suggestedDueOffsetDays": 13, "estimatedMinutes": 30, "category": "validation" }
      ]
    },
    {
      "weekNumber": 3,
      "theme": "Get first commitments",
      "summary": "Secure 2 verbal commitments to pay $49/mo when beta launches",
      "tasks": [
        { "title": "Follow up on demo responses", "description": "Message everyone who watched the demo. Ask directly: 'If I built this out, would you pay $49/mo? What's missing?'", "weekNumber": 3, "suggestedDueOffsetDays": 14, "estimatedMinutes": 25, "category": "validation" },
        { "title": "Add the one most-requested feature", "description": "Pick the feature mentioned most in feedback. Build a basic version—don't over-engineer. Ship something usable.", "weekNumber": 3, "suggestedDueOffsetDays": 17, "estimatedMinutes": 45, "category": "build" },
        { "title": "Set up Stripe payment link", "description": "Create simple checkout: $49/mo beta price, no complex billing. Test the full flow yourself.", "weekNumber": 3, "suggestedDueOffsetDays": 18, "estimatedMinutes": 30, "category": "systems" },
        { "title": "Create beta signup landing page", "description": "One-page site: headline, 3 bullets, demo video, email capture. Carrd or similar—under 1 hour.", "weekNumber": 3, "suggestedDueOffsetDays": 19, "estimatedMinutes": 40, "category": "marketing" },
        { "title": "Ask 3 prospects for payment", "description": "Send payment link to prospects who said yes. Frame as 'founding member' with lifetime discount lock-in.", "weekNumber": 3, "suggestedDueOffsetDays": 20, "estimatedMinutes": 25, "category": "validation" }
      ]
    },
    {
      "weekNumber": 4,
      "theme": "Close and learn",
      "summary": "Reach 3 paying users and document what worked for the next 30 days",
      "tasks": [
        { "title": "Onboard first paying user", "description": "Set up their GitHub connection. Walk through dashboard via Loom. Note every friction point and question they have.", "weekNumber": 4, "suggestedDueOffsetDays": 21, "estimatedMinutes": 40, "category": "ops" },
        { "title": "Send personal thank-you + feedback ask", "description": "Email each paying user. Ask: 'What would make you recommend this to a colleague?' Capture exact words.", "weekNumber": 4, "suggestedDueOffsetDays": 23, "estimatedMinutes": 20, "category": "validation" },
        { "title": "Fix biggest onboarding friction", "description": "Whatever confused users most during onboarding—fix it now. One improvement, shipped.", "weekNumber": 4, "suggestedDueOffsetDays": 25, "estimatedMinutes": 40, "category": "build" },
        { "title": "Document outreach playbook", "description": "Which messages got responses? Who responded? Create a repeatable system doc for next 30 days of outreach.", "weekNumber": 4, "suggestedDueOffsetDays": 27, "estimatedMinutes": 30, "category": "systems" },
        { "title": "Plan next 30 days", "description": "Review: 3 users hit? What worked? What failed? Set next milestone and high-level weekly goals.", "weekNumber": 4, "suggestedDueOffsetDays": 29, "estimatedMinutes": 30, "category": "other" }
      ]
    }
  ]
}

### EXAMPLE 2: Non-Technical Founder, Service Business, More Time Available

INPUT:
{
  "venture": { "id": "v2", "name": "Resume Revival", "idea_id": "i2" },
  "idea": { "title": "Executive Resume Service", "description": "High-touch resume rewriting for senior professionals", "target_customer": "Directors and VPs seeking new roles", "business_model_type": "Service" },
  "founderProfile": { "hoursPerWeek": 20, "availableCapital": 200, "riskTolerance": "high", "skillSpikes": ["copywriting", "interviewing", "career coaching"], "energyGivers": ["1:1 conversations", "writing", "helping people"], "energyDrainers": ["technical setup", "spreadsheets"] },
  "startDate": "2025-01-06"
}

OUTPUT:
{
  "summary": "In 30 days, generate $600+ in revenue by landing 3 paid resume clients at $200 each. Leverage strong writing skills and energy for 1:1 conversations—focus on warm network outreach before any marketing.",
  "startDate": "2025-01-06",
  "endDate": "2025-02-05",
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Mine your network first",
      "summary": "Book 6 conversations with potential clients or people who know them",
      "tasks": [
        { "title": "List 30 warm contacts", "description": "Go through LinkedIn connections and phone contacts. Who's job hunting? Who manages job hunters? Who's in HR/recruiting? Add to simple list.", "weekNumber": 1, "suggestedDueOffsetDays": 0, "estimatedMinutes": 40, "category": "validation" },
        { "title": "Draft 3 personal outreach templates", "description": "Write: 1) direct ask for job hunters, 2) referral ask for connectors, 3) partnership ask for recruiters. Keep casual, not salesy.", "weekNumber": 1, "suggestedDueOffsetDays": 1, "estimatedMinutes": 35, "category": "marketing" },
        { "title": "Send first 15 personalized messages", "description": "Use LinkedIn or text—whatever feels natural. Mention something specific about them. Ask for 15-min chat.", "weekNumber": 1, "suggestedDueOffsetDays": 2, "estimatedMinutes": 45, "category": "marketing" },
        { "title": "Conduct 2 discovery conversations", "description": "Learn: What's their biggest resume frustration? What have they tried? What would they pay? Take notes during.", "weekNumber": 1, "suggestedDueOffsetDays": 4, "estimatedMinutes": 45, "category": "validation" },
        { "title": "Offer 2 free resume reviews", "description": "Give free 15-min resume teardowns to prospects. Show expertise. End with 'I can help further if interested...'", "weekNumber": 1, "suggestedDueOffsetDays": 5, "estimatedMinutes": 45, "category": "validation" },
        { "title": "Set pricing from feedback", "description": "Review week's conversations. What price felt right? Write down your launch package and price.", "weekNumber": 1, "suggestedDueOffsetDays": 6, "estimatedMinutes": 20, "category": "systems" }
      ]
    },
    {
      "weekNumber": 2,
      "theme": "Land first paying client",
      "summary": "Get first client signed, paid, and project started",
      "tasks": [
        { "title": "Create one-page service description", "description": "Write what's included: intake call, draft, 2 revision rounds, final PDF. Keep to one page, no fancy design needed.", "weekNumber": 2, "suggestedDueOffsetDays": 7, "estimatedMinutes": 30, "category": "systems" },
        { "title": "Set up simple payment method", "description": "Venmo, PayPal, or Stripe link—whatever is fastest. You can upgrade later. Test it works.", "weekNumber": 2, "suggestedDueOffsetDays": 8, "estimatedMinutes": 25, "category": "systems" },
        { "title": "Follow up with 5 warm prospects", "description": "Message everyone who showed interest in week 1. Share package and $200 price. Ask for commitment.", "weekNumber": 2, "suggestedDueOffsetDays": 9, "estimatedMinutes": 30, "category": "marketing" },
        { "title": "Close first client", "description": "Get payment. Send intake questionnaire (5 questions about their goals, achievements, target roles). Schedule kickoff call.", "weekNumber": 2, "suggestedDueOffsetDays": 10, "estimatedMinutes": 25, "category": "validation" },
        { "title": "Conduct client intake call", "description": "30-45 min deep dive. Career story, achievements, target roles. Record with permission for reference.", "weekNumber": 2, "suggestedDueOffsetDays": 11, "estimatedMinutes": 45, "category": "ops" },
        { "title": "Deliver first resume draft", "description": "Complete first draft within 48 hours of intake. Speed builds trust. Send with specific feedback questions.", "weekNumber": 2, "suggestedDueOffsetDays": 13, "estimatedMinutes": 90, "category": "ops" }
      ]
    },
    {
      "weekNumber": 3,
      "theme": "Systematize and scale",
      "summary": "Land second client and create repeatable delivery process",
      "tasks": [
        { "title": "Document your resume process", "description": "Write step-by-step what you did for client 1: intake questions, structure approach, formatting rules. This becomes your template.", "weekNumber": 3, "suggestedDueOffsetDays": 14, "estimatedMinutes": 35, "category": "systems" },
        { "title": "Complete client 1 revisions", "description": "Incorporate feedback. Aim for 'final' status. Note what changes they requested for future clients.", "weekNumber": 3, "suggestedDueOffsetDays": 15, "estimatedMinutes": 45, "category": "ops" },
        { "title": "Ask client 1 for referral", "description": "After delivering final version, ask: 'Know anyone else job hunting who could use help?' Offer $25 referral bonus.", "weekNumber": 3, "suggestedDueOffsetDays": 16, "estimatedMinutes": 15, "category": "marketing" },
        { "title": "Send second wave of outreach", "description": "15 more personalized messages. Mention 'now working with clients' for credibility. Focus on your ideal client type.", "weekNumber": 3, "suggestedDueOffsetDays": 17, "estimatedMinutes": 45, "category": "marketing" },
        { "title": "Close second client", "description": "Apply lessons from client 1: clearer expectations, faster intake. Get payment before starting work.", "weekNumber": 3, "suggestedDueOffsetDays": 19, "estimatedMinutes": 25, "category": "validation" },
        { "title": "Request testimonial from client 1", "description": "Ask for 2-3 sentences you can use. Give prompts: 'What was the process like? How do you feel about your new resume?'", "weekNumber": 3, "suggestedDueOffsetDays": 20, "estimatedMinutes": 15, "category": "marketing" }
      ]
    },
    {
      "weekNumber": 4,
      "theme": "Hit revenue goal",
      "summary": "$600+ total revenue with system for continuing growth",
      "tasks": [
        { "title": "Deliver client 2 resume", "description": "Apply documented process. Should be faster than client 1. Track time spent for pricing validation.", "weekNumber": 4, "suggestedDueOffsetDays": 22, "estimatedMinutes": 75, "category": "ops" },
        { "title": "Close third client", "description": "You have social proof now. Use testimonial in outreach. Mention clients served.", "weekNumber": 4, "suggestedDueOffsetDays": 24, "estimatedMinutes": 25, "category": "validation" },
        { "title": "Create simple landing page", "description": "One page: what you do, testimonial, $200 package, contact form. Use Carrd—no technical skills needed.", "weekNumber": 4, "suggestedDueOffsetDays": 26, "estimatedMinutes": 45, "category": "marketing" },
        { "title": "Calculate your effective hourly rate", "description": "Total revenue ÷ total hours spent on client work + admin. Is this sustainable? What needs to change?", "weekNumber": 4, "suggestedDueOffsetDays": 28, "estimatedMinutes": 20, "category": "other" },
        { "title": "Plan next 30 days", "description": "Based on learnings: raise prices? Add packages? Narrow focus to specific industry? Set next revenue target.", "weekNumber": 4, "suggestedDueOffsetDays": 29, "estimatedMinutes": 30, "category": "other" }
      ]
    }
  ]
}

## RULES
1. **TASK SIZING**: Every task 15-45 minutes (60 max for complex build tasks). If longer, break it down.
2. **ACTION VERBS**: Start every task with a verb: Write, Send, Build, Call, Create, List, Draft, Record.
3. **SPECIFIC OUTCOMES**: "Send 10 outreach messages" not "Do outreach." "List 20 target companies" not "Research market."
4. **SKILL-APPROPRIATE**: Match tasks to founder's skills. Don't assign coding to non-coders. Leverage energy givers, minimize drainers.
5. **CONSTRAINT-RESPECTING**: 10 hrs/week = ~5 substantial tasks/week. 20 hrs/week = ~8-10 tasks. Don't overschedule.
6. **VALIDATION FIRST**: Week 1 should always focus on talking to/reaching customers, not building.
7. **MOMENTUM BUILDING**: Early wins create confidence. Quick feedback loops. Visible progress each week.
8. **HONEST TIMELINES**: If the goal seems unrealistic for this founder's constraints, say so in summary and adjust target.
9. **EXACTLY 4 WEEKS**: Always generate exactly 4 weeks with 5-8 tasks each (more tasks for founders with more hours).

## FOUNDER INTELLIGENCE RULES
When founderIntelligence is present in the input, apply these rules:
- LEVERAGE INSIDER ACCESS: If insiderKnowledge mentions specific expertise or customerIntimacy mentions specific customer groups, tasks should directly reference those assets. "Interview 3 dental practice owners you've worked with" beats "Find dental practices to interview."
- RESPECT HARD NOs: Every task must be checked against hardNoFilters. If "cold calling" is a hard no, use async outreach instead. If "managing employees" is a hard no, keep everything solo-founder.
- VERTICAL SPECIFICITY: If ventureIntelligence.verticalIdentified is set, tasks should reference specific tools, workflows, and terminology from that vertical — not generic business advice.
- INDUSTRY ACCESS: If ventureIntelligence.industryAccess is "direct", tasks can assume warm introductions. If "indirect" or "none", tasks must build access from scratch.
- PATTERN TRANSFER: If transferablePatterns exist and this appears to be a cross-industry play, include explicit validation tasks in Week 1: "Interview 3 people in [target industry] to confirm they face the same [abstract problem] you solved in [source industry]."

When founderIntelligence is null, generate tasks using only the idea and founderProfile (standard behavior).

{{FRAMEWORKS_INJECTION_POINT}}

## OUTPUT
Return ONLY valid JSON matching the schema. No markdown, no explanation, no preamble.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("generate-venture-plan: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("generate-venture-plan: authenticated user", userId);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Parse request body for other parameters only
    const body = await req.json();
    const { ventureId, planType = "30_day", startDate } = body;

    if (!ventureId) {
      return new Response(
        JSON.stringify({ error: "ventureId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-venture-plan: generating for user", userId, "venture", ventureId);

    // Load venture and verify ownership
    const { data: venture, error: ventureError } = await supabase
      .from("ventures")
      .select("*")
      .eq("id", ventureId)
      .eq("user_id", userId)
      .single();

    if (ventureError || !venture) {
      console.error("generate-venture-plan: venture not found", ventureError);
      return new Response(
        JSON.stringify({ error: "Venture not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load linked idea if exists
    let idea = null;
    if (venture.idea_id) {
      const { data: ideaData } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", venture.idea_id)
        .single();
      idea = ideaData;
    }

    // Load founder profile
    const { data: profileRow, error: profileError } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", userId)
      .single();

    if (profileError || !profileRow?.profile) {
      console.error("generate-venture-plan: founder profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Mavrik interview for enriched plan generation
    const { data: interviewData } = await supabase
      .from("founder_interviews")
      .select("context_summary")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const rawInterviewContext = interviewData?.context_summary as any || null;
    const interviewContext = selectInterviewContext("generate-venture-plan", rawInterviewContext);
    console.log("generate-venture-plan: hasInterviewContext =", !!interviewContext);

    // Detect business model for framework filtering
    const detectedModel = idea?.business_model_type || "all";
    console.log("generate-venture-plan: detectedModel =", detectedModel);

    // Fetch frameworks from database
    const [coreFrameworks, conditionalFrameworks] = await Promise.all([
      fetchFrameworks(supabase, {
        functions: ["generate-venture-plan"],
        businessModel: detectedModel,
        injectionRole: "core",
        maxTokens: 1200,
      }),
      fetchFrameworks(supabase, {
        functions: ["generate-venture-plan"],
        businessModel: detectedModel,
        injectionRole: "conditional",
        maxTokens: 600,
      }),
    ]);
    console.log("generate-venture-plan: frameworks fetched", {
      coreLength: coreFrameworks.length,
      conditionalLength: conditionalFrameworks.length,
    });

    // Calculate start date (default: today)
    const planStartDate = startDate || new Date().toISOString().split("T")[0];
    const endDateObj = new Date(planStartDate);
    endDateObj.setDate(endDateObj.getDate() + 30);
    const planEndDate = endDateObj.toISOString().split("T")[0];

    // Build AI payload
    const payload = {
      venture: {
        id: venture.id,
        name: venture.name,
        idea_id: venture.idea_id,
      },
      idea: idea ? {
        ...idea,
        source_meta: idea.source_meta || null,
      } : null,
      founderProfile: profileRow.profile,
      startDate: planStartDate,
      founderIntelligence: interviewContext ? {
        insiderKnowledge: interviewContext.extractedInsights?.insiderKnowledge || [],
        customerIntimacy: interviewContext.extractedInsights?.customerIntimacy || [],
        hardNoFilters: interviewContext.extractedInsights?.hardNoFilters || [],
        constraints: interviewContext.extractedInsights?.constraints || {},
        founderSummary: interviewContext.founderSummary || "",
        ventureIntelligence: interviewContext.ventureIntelligence || {},
        transferablePatterns: interviewContext.extractedInsights?.transferablePatterns || [],
      } : null,
    };

    console.log("generate-venture-plan: calling AI with payload", JSON.stringify(payload).slice(0, 500));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("generate-venture-plan: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT.replace(
            '{{FRAMEWORKS_INJECTION_POINT}}',
            [
              coreFrameworks ? `\n## TRUEBLAZER FRAMEWORKS\n${coreFrameworks}` : '',
              conditionalFrameworks ? `\n## CONDITIONAL FRAMEWORKS\n${conditionalFrameworks}` : '',
            ].filter(Boolean).join('\n') || ''
          ) },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("generate-venture-plan: AI gateway error", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!rawContent) {
      console.error("generate-venture-plan: missing content in AI response", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let planData: {
      summary: string;
      startDate: string;
      endDate: string;
      weeks: Array<{
        weekNumber: number;
        theme: string;
        summary: string;
        tasks: Array<{
          title: string;
          description: string;
          weekNumber: number;
          suggestedDueOffsetDays: number | null;
          estimatedMinutes: number | null;
          category: string;
        }>;
      }>;
    };

    try {
      planData = JSON.parse(rawContent);
    } catch (e) {
      console.warn("generate-venture-plan: direct JSON parse failed, attempting extraction", e);
      const firstBrace = rawContent.indexOf("{");
      const lastBrace = rawContent.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        console.error("generate-venture-plan: no JSON object found", rawContent);
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const sliced = rawContent.slice(firstBrace, lastBrace + 1);
      planData = JSON.parse(sliced);
    }

    // Validate basic structure
    if (!planData.weeks || !Array.isArray(planData.weeks)) {
      console.error("generate-venture-plan: invalid plan structure", planData);
      return new Response(
        JSON.stringify({ error: "AI did not return valid plan structure" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert venture_plan row
    const { data: planRow, error: planInsertError } = await supabase
      .from("venture_plans")
      .insert({
        user_id: userId,
        venture_id: venture.id,
        plan_type: planType,
        start_date: planData.startDate || planStartDate,
        end_date: planData.endDate || planEndDate,
        summary: planData.summary || null,
        ai_raw: planData,
      })
      .select()
      .single();

    if (planInsertError) {
      console.error("generate-venture-plan: failed to insert plan", planInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to save plan" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert tasks
    const tasksToInsert: Array<{
      user_id: string;
      venture_id: string;
      title: string;
      description: string | null;
      category: string | null;
      estimated_minutes: number | null;
      xp_reward: number;
      status: string;
      week_number: number;
      source: string;
    }> = [];

    for (const week of planData.weeks) {
      for (const task of week.tasks || []) {
        tasksToInsert.push({
          user_id: userId,
          venture_id: venture.id,
          title: task.title,
          description: task.description || null,
          category: task.category || "other",
          estimated_minutes: task.estimatedMinutes || null,
          xp_reward: 15, // Default XP for 30-day plan tasks
          status: "pending",
          week_number: task.weekNumber || week.weekNumber,
          source: "30_day_plan",
        });
      }
    }

    const tasksCreated: string[] = [];
    if (tasksToInsert.length > 0) {
      const { data: insertedTasks, error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select("id");

      if (tasksError) {
        console.error("generate-venture-plan: failed to insert tasks", tasksError);
        // Don't fail the whole request, just log it
      } else if (insertedTasks) {
        for (const t of insertedTasks) {
          tasksCreated.push(t.id);
        }
      }
    }

    console.log("generate-venture-plan: success", {
      planId: planRow.id,
      tasksCreated: tasksCreated.length,
    });

    return new Response(
      JSON.stringify({
        plan: planRow,
        tasksCreated,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-venture-plan: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
