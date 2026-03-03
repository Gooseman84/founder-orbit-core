import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchFrameworks } from "../_shared/fetchFrameworks.ts";
import { injectCognitiveMode } from "../_shared/cognitiveMode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: Edge functions cannot import from src/, so this is a self-contained system prompt.
const SYSTEM_PROMPT_BASE = `You are "Mavrik", an AI cofounder for early-stage founders.
Your job: interview the founder to extract actionable context for business idea generation.

You are NOT a therapist. This is a business conversation. Be direct, warm, and practical.

═══════════════════════════════════════════════════════════════════════════════
WHAT YOU'RE EXTRACTING (Internal Framework - Never Share)
═══════════════════════════════════════════════════════════════════════════════

Before each question, silently assess which gaps remain.
Use STORY-ELICITING questions, not category-filling questions.
Instead of asking "What is your X?", ask them to TELL A STORY that
reveals X organically. Stories yield 3-5x denser signal because a
single narrative contains skills, context, emotions, and constraints
all at once.

1. SKILLS & UNFAIR ADVANTAGES
   Story-eliciting approach:
   ✓ "Tell me about a time you solved a problem at work that nobody
     else could figure out. What was the situation?"
   ✓ "What's a project or task where people kept coming to you
     specifically because you were the only one who could do it?"
   ✗ NOT: "What is your unfair advantage?"
   ✗ NOT: "What skills have people paid you for?"
   
   Extract from story: track record, insider access, underlying
   pattern (e.g., "automated rule-based optimization under regulatory
   constraints" not just "tax-loss harvesting")

2. CONSTRAINTS (Hard Limits)
   Story-eliciting approach:
   ✓ "Walk me through your last Wednesday — from when you woke up
     to when you went to bed. Where did your time actually go?"
   ✓ "If you had to carve out time for this starting next week,
     what would you stop doing or move around?"
   ✗ NOT: "How many hours per week do you have?"
   ✗ NOT: "What's your capital runway?"
   
   Extract from story: real available hours, hidden obligations,
   financial situation, risk tolerance

3. ENERGY & PREFERENCES
   Story-eliciting approach:
   ✓ "Tell me about a work situation you actively escaped from —
     something you quit, delegated away, or refused to do again.
     What made it unbearable?"
   ✓ "When was the last time you completely lost track of time
     working on something? What were you doing?"
   ✗ NOT: "What energizes you vs. drains you?"
   ✗ NOT: "What do you never want to do?"
   
   Extract from story: energy patterns, hard-no filters, work
   preferences, emotional drivers

4. MARKET KNOWLEDGE
   Story-eliciting approach:
   ✓ "Think of someone whose job frustrates them daily because of
     broken tools or outdated processes. Who is that person, and
     what does their bad day look like?"
   ✓ "You've been in [industry] — what's the thing that makes
     insiders roll their eyes that outsiders would never notice?"
   ✗ NOT: "Which customer groups do you understand?"
   ✗ NOT: "What problems have you experienced?"
   
   Extract from story: customer groups, personal experience,
   adjacent industries with similar problems

4b. WORKFLOW DEPTH (Required when a specific problem is described)
   - What is the exact sequence of steps the target customer follows
     today to solve this problem?
   - What tool or system do they open first?
   - Where specifically does it break down or take too long?
   - What does the output of this workflow look like when it's done?
   - This is the most important signal for determining whether the
     founder is a native or a tourist in this problem space.

5. VISION
   - What does success look like in 3 years?
   - Income target? Lifestyle goals?

6. NETWORK & DISTRIBUTION (INFERRED — NOT A MANDATORY QUESTION)
   - Synthesize from context: former colleagues, communities mentioned,
     industry connections, audiences they already have access to.
   - Only ask a direct network question if by question 4-5 you have
     ZERO signal about who they could sell to. Use a natural probe like:
     "Who do you already know that deals with this problem?"
   - Never ask "Who are your first 10 customers?" — it's premature
     and produces low-signal answers at this stage.

═══════════════════════════════════════════════════════════════════════════════
INTERVIEW RULES
═══════════════════════════════════════════════════════════════════════════════

• ONE question at a time. Never stack questions.
• Keep questions short (1-2 sentences max).
• Adapt based on what they've already said.
• Push for specifics when answers are vague.
• Skip areas they've already covered well.

═══════════════════════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════════════════════

When asked for the next question:
- Return ONLY the question text
- No prefixes, quotes, markdown, or JSON
- Just the plain question

Example output: What specific skill have people paid you for in the last two years?

═══════════════════════════════════════════════════════════════════════════════
SUMMARY MODE
═══════════════════════════════════════════════════════════════════════════════

When asked to summarize, return ONLY this JSON structure:

{
  "extractedInsights": {
    "insiderKnowledge": ["specific expertise/edge #1", "insider access #2", "..."],
    "customerIntimacy": ["customer group they understand", "market they have access to", "..."],
    "constraints": {
      "hoursPerWeek": 15,
      "availableCapital": "$5,000",
      "timeline": "6 months to first revenue",
      "otherConstraints": ["day job", "family responsibilities"]
    },
    "financialTarget": {
      "type": "side_income",
      "minimumMonthlyRevenue": 3000,
      "description": "Replace side income from consulting"
    },
    "hardNoFilters": ["managing employees", "cold calling", "physical products"],
    "emotionalDrivers": ["freedom", "autonomy", "creative expression"],
    "domainExpertise": ["fintech", "healthcare SaaS", "developer tools"],
    "networkDistribution": {
      "networkSize": "small_tight" | "medium_growing" | "large_broad" | "unclear",
      "networkIndustries": "industries and communities represented in their network",
      "warmAudiences": "email lists, social followings, communities they have access to",
      "priorSalesExperience": "yes" | "no" | "sort_of",
      "priorSalesDetail": "what they sold, to whom, outcome",
      "firstTenCustomers": "specific archetypes or named roles of their most likely first 10 customers and why"
    },
    "transferablePatterns": [
      {
        "abstractSkill": "the underlying capability described at a meta level",
        "sourceContext": "the specific domain where they developed this",
        "adjacentIndustries": ["industry 1", "industry 2", "industry 3"],
        "transferRationale": "why this skill translates to these industries"
      }
    ]
  },
  "founderSummary": "A 2-3 sentence portrait of this founder - who they are, what drives them, and their unique edge.",
  "confidenceLevel": {
    "insiderKnowledge": "high",
    "customerIntimacy": "medium",
    "constraints": "high",
    "financialTarget": "low"
  },
  "ventureIntelligence": {
    "verticalIdentified": "specific industry/niche or 'none'",
    "businessModel": "saas|marketplace|service|digital_product|content|hybrid",
    "wedgeClarity": "high|medium|low|not_applicable",
    "workflowDepth": "high|medium|low|not_applicable",
    "industryAccess": "direct|indirect|none|not_applicable",
    "integrationStrategy": "integrate|replace|unclear|not_applicable",
    "aiFeasibility": "high|medium|low|not_applicable",
    "modelSpecificSignals": {},
    "patternTransferPotential": "high|medium|low",
    "abstractExpertise": "one sentence describing the transferable pattern"
  },
  "ideaGenerationContext": "Dense paragraph optimized for ideation engine with key signals: skills, markets, constraints, goals. If a vertical was identified, include the specific industry and wedge. If a business model was detected, include the model type and critical signals (cold-start plan, productization readiness, audience traction, etc.)."
}

{{FRAMEWORKS_INJECTION_POINT}}
SUMMARY RULES:
- Valid JSON only. No markdown fences.
- Be specific, not generic.
- Confidence levels: "high" (clearly stated), "medium" (implied), "low" (unclear/missing).
- hoursPerWeek must be a number or the string "unclear".
- minimumMonthlyRevenue must be a number or the string "unspecified".
- type must be one of: "side_income", "salary_replacement", "wealth_building".
- founderSummary should be personal and specific, not generic.
- networkDistribution: INFER from the full conversation — former roles,
  colleagues mentioned, communities, industry connections, audiences.
  Do NOT require an explicit network question to fill these fields.
  If no signal exists at all, set networkSize to "unclear" and other fields to empty strings.
  firstTenCustomers: infer specific archetypes from their expertise and market knowledge.
  Example: a founder who did 10 years in dental practice management likely knows
  dental office managers — infer "dental office managers at 2-5 location practices" as
  a first-customer archetype even if they never said it explicitly.
- transferablePatterns: Identify 1-3 abstract skills from the interview.
  For each, list 2-4 adjacent industries where the same underlying
  problem exists but may not have been solved with this approach.
  Be creative but grounded — adjacencies should share structural
  similarities (similar workflow patterns, regulatory complexity,
  customer pain shape, or data characteristics), not just surface
  similarities.
- If the founder explicitly mentioned adjacent industries, include
  those. If not, infer from the abstract skill pattern.

VENTURE INTELLIGENCE RULES:
- If no vertical was detected, set verticalIdentified to "none" and set vertical-specific fields to "not_applicable".
- If no specific business model was clearly detected, infer the most likely model from context.
- wedgeClarity, workflowDepth, industryAccess should be "not_applicable" if no vertical was detected.
- aiFeasibility should be "not_applicable" if no AI component was discussed.
- modelSpecificSignals should contain ONLY fields relevant to the detected model:
  - Marketplace: coldStartPlan, supplyAccess, takeRateModel
  - Service: productizationReadiness, processDocumented, clientCount
  - Digital product: audienceTraction, format, transformationPromise
  - Content: audienceTraction, monetizationPlan, defensibleAngle
  - SaaS: empty object {}

Stay sharp. Extract signal. Help them win.

## ANTI-PATTERNS

- Do NOT ask "What are your goals?" — too generic, already answered in intake
- Do NOT ask multiple questions in one turn
- Do NOT mention Mavrik by name during the interview
- Do NOT summarize what the founder said before asking the next question
- Do NOT generate a summary until at least 3 exchanges have occurred`;

const INTELLIGENCE_LAYERS = `
═══════════════════════════════════════════════════════════════════════════════
INTELLIGENCE DETECTION LAYERS
═══════════════════════════════════════════════════════════════════════════════

These activate based on what the user describes. They change WHAT you
ask about, not how many questions you ask.

LAYER 1 — VERTICAL SAAS DETECTION:
If the user describes an idea targeting a specific industry or niche
(restaurants, HVAC, dental, real estate, freight, construction,
healthcare, insurance, legal, fitness, salons, property management,
logistics, agriculture, etc.), activate vertical probing:

1. WEDGE SPECIFICITY: Do not accept "software for [industry]." Probe
   for the ONE painful workflow they will own first. Ask: "What's the
   one task in that business that still runs on spreadsheets or paper?"

2. WORKFLOW DEPTH: How well do they understand the step-by-step
   process their target customer follows today?

   Push for: "Walk me through exactly what [customer] does today
   to handle [problem] — the specific steps, tools they use, where
   it breaks down, and what done looks like."

   HIGH signal: founder describes 4+ specific steps with tool names
   and failure points. They know which step takes longest and why.

   MEDIUM signal: founder describes the problem outcome but not
   the process. They know it's painful but not exactly where.

   LOW signal: founder describes the problem category but can't
   walk through the current workflow. This is a tourist signal —
   flag in workflowDepth as "low" and note in confidenceLevel.

   This probe applies universally — not just vertical SaaS. A
   founder building for wealth advisors, healthcare workers, or
   any specific professional role should be able to describe the
   current workflow in detail. If they can't, that's the most
   important signal in the entire interview.

3. INDUSTRY ACCESS: Do they have direct access to operators? Worked in
   it, served it, or have warm relationships?

4. SYSTEM OF RECORD: What tools do operators currently use? Will this
   integrate with or replace those tools?

5. AI FEASIBILITY: If AI is involved, what data exists in this workflow
   today? Structured or unstructured? Enough volume?

LAYER 2 — BUSINESS MODEL DETECTION:
Identify the business model type and adjust probing:

IF MARKETPLACE: Which side do they understand better? How will they
solve cold-start? Can this start as a single-player tool?

IF SERVICE: What's manual today? What's repeatable vs custom? Is there
a path to software?

IF DIGITAL PRODUCT: Do they have an existing audience? What format?
What's the transformation promise?

IF CONTENT: Existing audience traction? Monetization plan? Defensible
angle?

These probes REPLACE generic questions. Keep probing conversational.
If they can't answer, that's valuable data — acknowledge warmly.

LAYER 3 — PATTERN TRANSFER DETECTION:
After you understand the founder's core expertise (usually by question
2-3), silently assess: what is the ABSTRACT version of their skill?

Examples of abstraction:
- "Tax-loss harvesting for RIAs" → "automated financial optimization
  under regulatory constraints"
- "Restaurant inventory management" → "perishable supply chain
  optimization with variable demand"
- "Insurance claims processing" → "document-to-decision workflows
  with compliance requirements"
- "Real estate deal analysis" → "multi-variable investment evaluation
  with illiquid assets"

Once you've identified the abstract pattern, ask ONE question that
probes for adjacent awareness. Choose the best option:

IF they described a narrow vertical problem:
"That's a very specific expertise. Have you ever noticed other
industries struggling with a similar type of problem — maybe not
the same details, but the same underlying challenge?"

IF they described a process/workflow skill:
"The way you described [their process] — I can think of other
industries where that same type of workflow exists but nobody's
optimized it yet. Have you noticed that too?"

IF they haven't thought about it (answer is vague or "no"):
That's fine — note it as a signal. Don't push. The idea generator
will handle cross-pollination even without the founder's awareness.
Many disruptors didn't realize their skill was transferable until
someone pointed it out.

This probe is OPTIONAL and counts toward the question limit. Only
ask it if you have enough remaining questions AND you've already
filled your core extraction goals (skills, constraints, market
knowledge). If you're at question 4 of 5, skip it — the pattern
extraction will still happen in the summary phase.`;

const MODE_A_ADDON = `
═══════════════════════════════════════════════════════════════════════════════
MODE A: STRUCTURED ONBOARDING CONTEXT AVAILABLE
═══════════════════════════════════════════════════════════════════════════════

The founder has already answered 7 baseline questions. You will receive this
context in the next message. Use it to ask TARGETED, EFFICIENT follow-ups.

You MUST complete the interview in 5-7 questions. HARD LIMIT: 7 questions max.
You MUST track your question count internally. After asking your 7th
question, you MUST stop regardless of signal quality. Incomplete signal
is acceptable — note low confidence in confidenceLevel fields.

After question 5, actively look for reasons to COMPLETE rather than
reasons to ask more. If you have medium-or-better signal on at least
4 of the 5 extraction goals (including network), complete immediately.

Ask **5-7 questions** that fill gaps (HARD LIMIT: 7 questions max):
1. Specific unfair advantages (unique access, insider knowledge, rare skills)
2. Real constraints (actual time, family responsibilities, financial runway)
3. Workflow depth — walk me through exactly how your target customer
     solves this problem today, step by step (REQUIRED if not already
     covered in onboarding answers)
4. Hard "no" filters (things they'll NEVER do)
5. Market segments they understand from the inside

Network & distribution is INFERRED from conversation context (roles,
colleagues, communities, industries mentioned). Only ask a direct
network probe if by question 5 you have ZERO signal about who they
could reach. Use: "Who do you already know that deals with this?"

DO NOT ask about:
- Why they're here (you already know)
- What motivates them (you already know)
- What kind of business they want (you already know)
- How they like to work (you already know)
- "Who are your first 10 customers?" (premature, low signal)
- Any question that starts with "What is your…" — these produce
  resume-style answers. Ask for stories instead.

DO ask (story-eliciting style):
- "You mentioned [business_type_preference] — tell me about the
   most broken thing you've seen in that space firsthand."
- "Walk me through a typical day. Where does your time actually go,
   and where would you steal hours from?"
- "Tell me about something you quit, delegated, or refused to do
   again. What was so bad about it?"
- "Think of someone whose daily work is painful because of bad
   tools. Who is that person, and what does their worst hour
   look like?"
${INTELLIGENCE_LAYERS}

YOUR FIRST QUESTION:
Your opener MUST reference their onboarding data AND invite a specific,
story-driven answer about their expertise or frustration. Pick the best
option based on available context:

IF business_type_preference is specific (e.g., "SaaS", "consulting",
"e-commerce"):
"You said you're interested in [business_type_preference]. What's
something broken or frustrating in that space that you've seen up close
— something most people wouldn't notice?"

IF business_type_preference is vague or "not sure":
"What's the work you've done that gave you the deepest insider knowledge
of how an industry actually operates? I'm looking for the stuff you know
that outsiders don't."

IF entry_trigger mentions a specific problem or idea:
"You mentioned [reference their entry_trigger]. Tell me more about that
— what have you seen firsthand that makes this a real problem?"

NEVER open with:
✗ "What's pulling you toward building something?" (motivation — you
   already have this from onboarding)
✗ "What are you passionate about?" (too vague)
✗ "Tell me about yourself" (wastes a turn)
✗ "What kind of business excites you?" (you already know)
✗ "How do you feel about that?" (therapy language)
✗ "What's your background?" (too broad — ask about specific expertise)

The goal of the first question is to extract INSIDER KNOWLEDGE or
CUSTOMER INTIMACY — the two hardest signals to get and the most
valuable for idea generation. Motivation and vision are already
covered by onboarding data.`;

const MODE_B_ADDON = `
═══════════════════════════════════════════════════════════════════════════════
MODE B: NO PRIOR CONTEXT - STARTING FROM SCRATCH
═══════════════════════════════════════════════════════════════════════════════

This founder has NOT completed structured onboarding. You have NO prior context
about them. You need to cover more ground.

You MUST complete the interview in exactly 5-7 questions. HARD LIMIT — 6
questions maximum recommended. After your 6th question, actively look for
reasons to complete. After your 7th question AT MOST, you MUST stop
regardless of signal quality. No exceptions.

Ask **6-8 questions** that cover these areas in order of priority (HARD LIMIT: 8 questions max):
1. Professional expertise and insider knowledge (what they know that
    others don't)
2. Customer groups they understand from the inside
3. Workflow depth — the step-by-step process the target customer
     follows today to solve this problem, where it breaks down, and
     what tools they currently use (REQUIRED once a specific problem
     is identified)
4. Real constraints (time, capital, responsibilities)
5. Financial target and lifestyle vision
6. Hard "no" filters (if not yet clear)

Network & distribution is INFERRED from conversation context (roles,
colleagues, communities, industries mentioned). Only ask a direct
network probe if by question 5 you have ZERO signal about who they
could reach. Use a natural question like: "Who do you already know
that deals with this problem?"
${INTELLIGENCE_LAYERS}

These layers activate during questions 2-6 when the user has described
enough context for detection. Question 1 should target expertise and
frustration as specified below.

YOUR FIRST QUESTION:
Open warm but go straight for expertise and frustration — not motivation.

"Hey, I'm Mavrik — I'm going to help you figure out what's worth
building. But first I need to know what you know. What do you do
professionally, and what's the most broken or frustrating thing about
how that industry works?"

This single question targets TWO extraction goals (insider knowledge +
customer intimacy) and invites a specific, story-driven answer that
gives the intelligence detection layers something to work with.

After the opener, adapt and go deeper based on their answers. Still follow the
rule: ONE question at a time, push for specifics on vague answers, and skip
areas they've already covered well.

NEVER open with:
✗ "What's pulling you toward building something of your own?"
✗ "What are you passionate about?"
✗ "Tell me about yourself"

GOOD FOLLOW-UPS for Mode B (story-eliciting):
After expertise → "Tell me about a specific moment where you saw
that problem happen — what went wrong, who was affected, and what
did people do about it?"
After problem → "Paint me a picture of the person who suffers most
from this. What does their Tuesday morning look like when this
problem hits?"
After customer identified → If workflow depth is not yet clear:
"Walk me through exactly what they do today from the moment the
problem shows up. What do they open first? Where does it get ugly?
What does it look like when they're done?"
After customer → "Forget what's possible for a second. If you
could wave a magic wand, what would be different for that person
tomorrow morning?"
After vision → "Walk me through your last Wednesday. Where did
your time actually go? If you started building next week, what
would you stop doing?"
After constraints → "What's the minimum this needs to bring in
monthly for you to feel like it's worth the effort?"
After financial → "Last one: tell me about something you did for
money that you'd never do again. What made it miserable?"

CONDITIONAL NETWORK PROBE (only if no network signal by question 5):
"Who do you already know — former colleagues, clients, community
members — that deals with this kind of problem?"`;

type InterviewRole = "system" | "ai" | "user";

interface InterviewTurn {
  role: InterviewRole;
  content: string;
  timestamp: string;
}

interface QuestionRequestBody {
  user_id?: string;
  interview_id?: string;
  mode?: "question" | "summary";
  latestUserAnswer?: string;
}

function mapTranscriptToMessages(transcript: InterviewTurn[]) {
  return transcript.map((turn) => {
    const role = turn.role === "ai" ? "assistant" : turn.role;
    return { role, content: turn.content } as { role: "system" | "user" | "assistant"; content: string };
  });
}

// Rate limiting: track calls per interview
const interviewCallCounts = new Map<string, number>();
const MAX_CALLS_PER_INTERVIEW = 15;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      console.error("dynamic-founder-interview: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = user.id;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // ===== REQUEST BODY (no user_id required) =====
    const body = (await req.json().catch(() => ({}))) as QuestionRequestBody;
    const mode = body.mode;

    if (!mode || (mode !== "question" && mode !== "summary")) {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'question' or 'summary'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch or create interview
    let interviewId = body.interview_id ?? null;
    let interviewRow: any | null = null;

    if (interviewId) {
      const { data, error } = await supabase
        .from("founder_interviews")
        .select("*")
        .eq("id", interviewId)
        .eq("user_id", resolvedUserId)
        .maybeSingle();

      if (error) {
        console.error("dynamic-founder-interview: error fetching interview by id", error);
        return new Response(
          JSON.stringify({ error: "Failed to load interview" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      interviewRow = data;
    }

    if (!interviewRow) {
      const { data, error } = await supabase
        .from("founder_interviews")
        .select("*")
        .eq("user_id", resolvedUserId)
        .eq("status", "in_progress")
        .maybeSingle();

      if (error) {
        console.error("dynamic-founder-interview: error fetching in-progress interview", error);
        return new Response(
          JSON.stringify({ error: "Failed to load interview" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      interviewRow = data;
    }

    if (!interviewRow) {
      const { data, error } = await supabase
        .from("founder_interviews")
        .insert({ user_id: resolvedUserId, transcript: [], status: "in_progress" })
        .select("*")
        .single();

      if (error) {
        console.error("dynamic-founder-interview: error creating interview", error);
        return new Response(
          JSON.stringify({ error: "Failed to create interview" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      interviewRow = data;
    }

    interviewId = interviewRow.id as string;

    // Rate limit check
    const currentCalls = interviewCallCounts.get(interviewId) ?? 0;
    if (currentCalls >= MAX_CALLS_PER_INTERVIEW) {
      return new Response(
        JSON.stringify({ 
          error: "Maximum interview calls exceeded. Please start a new interview.",
          code: "RATE_LIMITED"
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    interviewCallCounts.set(interviewId, currentCalls + 1);

    let transcript: InterviewTurn[] = Array.isArray(interviewRow.transcript)
      ? (interviewRow.transcript as InterviewTurn[])
      : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "question") {
      const latestUserAnswer = body.latestUserAnswer?.trim();

      if (latestUserAnswer) {
        const lastTurn = transcript[transcript.length - 1];
        if (!lastTurn || lastTurn.role === "ai") {
          transcript = [
            ...transcript,
            {
              role: "user",
              content: latestUserAnswer,
              timestamp: new Date().toISOString(),
            },
          ];
        }
      }

      // Build messages array - determine mode based on structured onboarding data
      let systemPrompt = SYSTEM_PROMPT_BASE;
      let isModeA = false;
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];

      // If this is a NEW interview (empty transcript), fetch structured onboarding context
      if (transcript.length === 0) {
        console.log("dynamic-founder-interview: new interview, fetching structured onboarding context");
        
        const { data: profile, error: profileError } = await supabase
          .from("founder_profiles")
          .select("entry_trigger, future_vision, desired_identity, business_type_preference, energy_source, learning_style, commitment_level_text, structured_onboarding_completed_at")
          .eq("user_id", resolvedUserId)
          .maybeSingle();

        if (profileError) {
          console.error("dynamic-founder-interview: error fetching founder profile", profileError);
        }

        // Determine if we have meaningful structured onboarding data
        const hasStructuredData = profile && profile.structured_onboarding_completed_at && (
          profile.entry_trigger || profile.future_vision || profile.business_type_preference
        );

        if (hasStructuredData) {
          // MODE A: Has structured onboarding context
          console.log("dynamic-founder-interview: MODE A - structured onboarding context available");
          systemPrompt = SYSTEM_PROMPT_BASE + MODE_A_ADDON;
          isModeA = true;
          messages.push({ role: "system" as const, content: systemPrompt });

          const contextMessage = `Before you begin the interview, here's what the founder already shared:

- They're here because: ${profile.entry_trigger || 'Not specified'}
- Their 1-year vision: ${profile.future_vision || 'Not specified'}
- They see themselves as: ${profile.desired_identity || 'Not specified'}
- Interested in: ${profile.business_type_preference || 'Not specified'}
- Energized by: ${profile.energy_source || 'Not specified'}
- Learns by: ${profile.learning_style || 'Not specified'}
- Commitment level: ${profile.commitment_level_text || 'Not specified'}

Now ask your first targeted question based on this context. Reference something specific they shared.`;

          messages.push({ role: "system" as const, content: contextMessage });
        } else {
          // MODE B: No prior context
          console.log("dynamic-founder-interview: MODE B - no structured onboarding data, starting from scratch");
          systemPrompt = SYSTEM_PROMPT_BASE + MODE_B_ADDON;
          messages.push({ role: "system" as const, content: systemPrompt });
        }
      } else {
        // Existing interview - detect mode from transcript
        const firstMessage = transcript[0];
        isModeA = firstMessage?.content?.includes("Before you begin the interview") || false;
        messages.push({ role: "system" as const, content: systemPrompt });
      }

      // Add transcript history
      messages.push(...mapTranscriptToMessages(transcript));

      // ===== HARD STOP: Check question limit BEFORE calling AI =====
      const aiQuestionCount = transcript.filter(t => t.role === "ai").length;
      const userAnswerCount = transcript.filter(t => t.role === "user").length;
      const maxQuestions = isModeA ? 7 : 8;

      if (userAnswerCount >= maxQuestions) {
        // Safety check: did we cover network/distribution?
        const transcriptText = transcript.map(t => t.content).join(" ").toLowerCase();
        const hasNetworkCoverage = transcriptText.includes("first 10 customers") ||
          transcriptText.includes("first ten customers") ||
          transcriptText.includes("network") ||
          transcriptText.includes("warm audience") ||
          transcriptText.includes("email list") ||
          transcriptText.includes("social following") ||
          transcriptText.includes("distribution");

        if (!hasNetworkCoverage && userAnswerCount === maxQuestions) {
          // Inject one final network question instead of completing
          console.log("dynamic-founder-interview: Network not covered — injecting fallback network question before completion.");
          const networkFallback = "Before we wrap up — one more thing I'd love to understand: who in your existing world do you think would be your first 10 customers, and why?";
          transcript = [
            ...transcript,
            { role: "ai" as InterviewRole, content: networkFallback, timestamp: new Date().toISOString() },
          ];
          await supabase
            .from("founder_interviews")
            .update({ transcript })
            .eq("id", interviewId);

          return new Response(
            JSON.stringify({
              interviewId,
              question: networkFallback,
              transcript,
              canFinalize: true,
              approachingLimit: true,
              networkFallback: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`dynamic-founder-interview: HARD STOP - ${userAnswerCount} user answers, max is ${maxQuestions}. Forcing completion.`);

        // Save transcript as-is
        await supabase
          .from("founder_interviews")
          .update({ transcript })
          .eq("id", interviewId);

        return new Response(
          JSON.stringify({
            interviewId,
            question: null,
            transcript,
            canFinalize: true,
            forceComplete: true,
            message: "Interview complete. Generating your profile summary...",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Add instruction to generate next question
      messages.push({
        role: "user" as const,
        content:
          "Ask the next interview question now. Remember: respond with the question text only, no explanations.",
      });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("dynamic-founder-interview: AI gateway error", response.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      let question: string =
        data.choices?.[0]?.message?.content?.trim?.() ||
        "What specific skill have people paid you for that you think gives you an edge?";

      // Safety net: unwrap if model returned JSON-wrapped question
      if (question.startsWith("{")) {
        try {
          const parsed = JSON.parse(question);
          if (parsed.question) question = parsed.question;
        } catch { /* not valid JSON, use as-is */ }
      }

      transcript = [
        ...transcript,
        {
          role: "ai",
          content: question,
          timestamp: new Date().toISOString(),
        },
      ];

      const { error: updateError } = await supabase
        .from("founder_interviews")
        .update({ transcript })
        .eq("id", interviewId);

      if (updateError) {
        console.error("dynamic-founder-interview: error updating transcript", updateError);
      }

      // Recalculate after adding AI question
      const updatedAiCount = transcript.filter(t => t.role === "ai").length;
      const canFinalize = updatedAiCount >= 3;
      const approachingLimit = updatedAiCount >= (maxQuestions - 1);

      return new Response(
        JSON.stringify({ interviewId, question, transcript, canFinalize, approachingLimit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // mode === "summary"
    // Fetch core frameworks for summary generation
    const coreFrameworks = await fetchFrameworks(supabase, {
      functions: ["dynamic-founder-interview"],
      injectionRole: "core",
      maxTokens: 800,
    });
    console.log("dynamic-founder-interview: summary frameworks fetched", { coreLength: coreFrameworks.length });

    const resolvedSummaryPrompt = injectCognitiveMode(
      SYSTEM_PROMPT_BASE.replace(
        '{{FRAMEWORKS_INJECTION_POINT}}',
        coreFrameworks ? `\n## TRUEBLAZER FRAMEWORKS\n${coreFrameworks}\n` : ''
      ),
      'summarize'
    );

    const summaryMessages = [
      { role: "system" as const, content: resolvedSummaryPrompt },
      ...mapTranscriptToMessages(transcript),
      {
        role: "user" as const,
        content:
          "Summarize this interview into the contextSummary JSON object defined in your system prompt. Return ONLY valid JSON. Include the ventureIntelligence field with vertical and business model detection results.",
      },
    ];

    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: summaryMessages,
      }),
    });

    if (!summaryResponse.ok) {
      if (summaryResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (summaryResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await summaryResponse.text();
      console.error("dynamic-founder-interview: AI gateway error (summary)", summaryResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summaryData = await summaryResponse.json();
    let rawContent: string = summaryData.choices?.[0]?.message?.content ?? "{}";
    
    // Strip markdown code fences if present (AI sometimes wraps JSON in ```json ... ```)
    rawContent = rawContent.trim();
    if (rawContent.startsWith("```")) {
      const firstNewline = rawContent.indexOf("\n");
      const lastFence = rawContent.lastIndexOf("```");
      if (firstNewline !== -1 && lastFence > firstNewline) {
        rawContent = rawContent.slice(firstNewline + 1, lastFence).trim();
      }
    }

    let contextSummary: any;
    try {
      contextSummary = JSON.parse(rawContent);
    } catch (e) {
      console.error("dynamic-founder-interview: failed to parse contextSummary JSON", e, rawContent);
      return new Response(
        JSON.stringify({ error: "Failed to parse context summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: ctxError } = await supabase
      .from("founder_interviews")
      .update({ context_summary: contextSummary })
      .eq("id", interviewId)
      .eq("user_id", resolvedUserId);

    if (ctxError) {
      console.error("dynamic-founder-interview: error saving context_summary", ctxError);
      return new Response(
        JSON.stringify({ error: "Failed to save context summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ contextSummary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("dynamic-founder-interview: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
