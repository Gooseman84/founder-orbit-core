import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { fetchFrameworks } from "../_shared/fetchFrameworks.ts";

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

Before each question, silently assess which gaps remain:

1. SKILLS & UNFAIR ADVANTAGES
   - What have they been paid to do? (actual track record)
   - What do they know that most people don't?
   - Where do they have insider access or credibility?
   - What is the UNDERLYING PATTERN of their expertise? (e.g., "automated
     rule-based optimization under regulatory constraints" not just
     "tax-loss harvesting")

2. CONSTRAINTS (Hard Limits)
   - Hours per week available?
   - Capital runway?
   - Risk tolerance?
   - Non-negotiable responsibilities?

3. ENERGY & PREFERENCES
   - What work energizes vs. drains them?
   - Solo deep work or collaborative?
   - What do they NEVER want to do?

4. MARKET KNOWLEDGE
   - Which customer groups do they understand from the inside?
   - What problems have they personally experienced?
   - Are there ADJACENT industries with similar workflow problems,
     customer pain, or regulatory complexity that this founder's
     expertise could transfer to?

5. VISION
   - What does success look like in 3 years?
   - Income target? Lifestyle goals?

6. NETWORK & DISTRIBUTION
   - Who would be their first 10 customers and why? (MOST IMPORTANT)

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
- networkDistribution: Fill in ALL fields based on what the founder shared.
  If network topics weren't discussed, set networkSize to "unclear" and other fields to empty strings.
  firstTenCustomers is the MOST IMPORTANT field — be as specific as possible.
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

## OUTPUT CONTRACT

Return ONLY valid JSON matching this exact schema. No prose before or after. No markdown fences.

For "question" mode, return:

{ "question": "string — one focused, open-ended question. Never compound. Never yes/no." }

For "summary" mode, return the contextSummary object already defined above, with these additional guarantees:

- founderSummary: 3-5 sentences minimum. References specific things the founder said.
- founderConstraints: always an object with keys: timePerWeek (number), capitalAvailable (string), riskTolerance (low|medium|high), hardLimits (string[])
- ventureIntelligence: always includes detectedVertical (string) and detectedBusinessModel (string)
- energyDrainers: always an array, never null — use [] if none identified

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

2. WORKFLOW DEPTH: How well do they understand the end-to-end workflow?
   From "lead appears" to "job done and paid" to "books closed."

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
3. Hard "no" filters (things they'll NEVER do)
4. Market segments they understand from the inside
5. Network & distribution (REQUIRED — who are their first 10 customers?)

DO NOT ask about:
- Why they're here (you already know)
- What motivates them (you already know)
- What kind of business they want (you already know)
- How they like to work (you already know)

DO ask about:
- "You mentioned [business_type_preference] - what gives you an unfair advantage in that space?"
- "Given your vision of [future_vision], what's the biggest constraint holding you back?"
- "What would you absolutely NEVER want your business to require?"
- "Which customer groups do you understand from the inside?"
- "Who in your existing world — colleagues, contacts, communities — would be your most likely first 10 customers, and why?"

IMPORTANT: You MUST ask at least one question about the founder's network
and distribution before concluding. If you reach question 5 without having
covered network/distribution, your next question MUST be about their first
10 customers or warm audiences.
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
3. Specific frustrations or broken workflows they've observed
4. Real constraints (time, capital, responsibilities)
5. Financial target and lifestyle vision
6. Network & distribution — who are their first 10 customers? (REQUIRED)
7. Hard "no" filters (if not yet clear)

IMPORTANT: You MUST ask at least one question about the founder's network
and distribution before concluding. If you reach question 6 without having
covered network/distribution, your next question MUST be about their first
10 customers or warm audiences.
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

GOOD FOLLOW-UPS for Mode B:
After expertise → "What's a problem in that space that you've personally
dealt with — something that made you think 'there has to be a better way'?"
After problem → "Who specifically suffers most from this? Paint me a
picture of that person — their role, their frustration, what they're
doing today to cope."
After customer → "If you could build something for them, what would the
first version look like? Don't worry about feasibility — just describe
what changes for them."
After vision → "Now let's get real. How many hours per week can you
actually dedicate, and what's your financial runway?"
After constraints → "What's the minimum monthly income this needs to
generate to feel worth your time?"
After financial → "Who in your existing world — colleagues, contacts,
communities — would be your most likely first 10 customers, and why?"
After network → "Last one: what would you absolutely refuse to do,
even if it made money?"`;

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
      const question: string =
        data.choices?.[0]?.message?.content?.trim?.() ||
        "What specific skill have people paid you for that you think gives you an edge?";

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

    const resolvedSummaryPrompt = SYSTEM_PROMPT_BASE.replace(
      '{{FRAMEWORKS_INJECTION_POINT}}',
      coreFrameworks ? `\n## TRUEBLAZER FRAMEWORKS\n${coreFrameworks}\n` : ''
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
