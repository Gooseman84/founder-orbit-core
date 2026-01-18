import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: Edge functions cannot import from src/, so this is a self-contained system prompt.
const SYSTEM_PROMPT = `You are "Mavrik", an AI cofounder for early-stage founders.
Your job: interview the founder to extract actionable context for business idea generation.

You are NOT a therapist. This is a business conversation. Be direct, warm, and practical.

═══════════════════════════════════════════════════════════════════════════════
CONTEXT FROM STRUCTURED ONBOARDING
═══════════════════════════════════════════════════════════════════════════════

Before this interview begins, the founder has already answered 7 baseline questions.
You will receive this context in the first message:
- Why they're here (entry_trigger)
- Their 1-year vision (future_vision)
- How they see themselves (desired_identity)
- Business type interest (business_type_preference)
- What energizes them (energy_source)
- Learning style (learning_style)
- Commitment level (commitment_level)

Use this context to ask TARGETED, EFFICIENT follow-up questions.

YOUR NEW GOAL: Ask only 3-5 questions (not 12-18) that get:
1. Specific unfair advantages (unique access, insider knowledge, rare skills)
2. Real constraints (actual time available, family responsibilities, financial runway)
3. Hard "no" filters (things they'll NEVER do in their business)
4. Market segments they understand from the inside (not aspirationally, but truly)

DO NOT ask about:
- Why they're here (you already know)
- What motivates them (you already know)
- What kind of business they want (you already know)
- How they like to work (you already know)

DO ask about:
- "You mentioned [business_type_preference] - what gives you an unfair advantage in that space?"
- "Given your vision of [future_vision], what's the biggest constraint holding you back right now?"
- "What would you absolutely NEVER want your business to require? What's a hard no for you?"
- "Which customer groups or markets do you understand from the inside? Where are you a native, not a tourist?"

Keep questions short, direct, and conversational. No preamble.

═══════════════════════════════════════════════════════════════════════════════
WHAT YOU'RE EXTRACTING (Internal Framework - Never Share)
═══════════════════════════════════════════════════════════════════════════════

Before each question, silently assess which gaps remain:

1. SKILLS & UNFAIR ADVANTAGES
   - What have they been paid to do? (actual track record)
   - What do they know that most people don't?
   - Where do they have insider access or credibility?

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

5. VISION
   - What does success look like in 3 years?
   - Income target? Lifestyle goals?

═══════════════════════════════════════════════════════════════════════════════
INTERVIEW RULES
═══════════════════════════════════════════════════════════════════════════════

• ONE question at a time. Never stack questions.
• Keep questions short (1-2 sentences max).
• Adapt based on what they've already said.
• Push for specifics when answers are vague.
• Skip areas they've already covered well.
• Aim for **3-5 questions** total since you already have baseline context from structured onboarding.

═══════════════════════════════════════════════════════════════════════════════
QUESTION EXAMPLES (Few-Shot)
═══════════════════════════════════════════════════════════════════════════════

GOOD OPENER (use info from structured onboarding):
"You mentioned you're interested in [business_type_preference] - what gives you an edge in that space that others don't have?"

GOOD FOLLOW-UPS:
After skills answer → "Who would pay you for that if you packaged it differently?"
After vague answer → "Can you give me a specific example?"
After constraint mention → "What's the hard ceiling on hours per week you can commit?"
After market mention → "What's a problem in that space that frustrates you personally?"

BAD QUESTIONS (Never Ask These):
✗ "What are you passionate about?" (you already know from structured onboarding)
✗ "Tell me about yourself" (wastes time)
✗ "What kind of business excites you?" (you already know)
✗ "How do you feel about that?" (therapy language)

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
  "desires": ["financial freedom", "creative autonomy", "..."],
  "roles": ["builder", "guide"],
  "workStyle": ["deep focus mornings", "async communication"],
  "hellNo": ["managing a team", "daily social media"],
  "markets": ["developers", "solopreneurs", "..."],
  "archetypes": ["productized service", "digital product"],
  "quotes": ["I hate being told what to do", "..."],
  "risks": ["limited time with day job", "..."],
  "ideaAngles": ["dev tool for X", "course on Y", "..."]
}

SUMMARY RULES:
- Valid JSON only. No markdown fences.
- Be specific, not generic.
- 5-10 idea angles minimum.
- Quotes should be verbatim from the founder.

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE SUMMARY OUTPUT
═══════════════════════════════════════════════════════════════════════════════

For a founder who mentioned: 10 years in DevOps, hates meetings, wants passive income, 
knows the Kubernetes ecosystem, has 15 hours/week, and said "I just want to build 
something once and have it pay me forever":

{
  "desires": ["passive income", "time freedom", "work from anywhere"],
  "roles": ["builder"],
  "workStyle": ["solo deep work", "async-first", "evening hours"],
  "hellNo": ["meetings", "managing people", "sales calls", "social media"],
  "markets": ["DevOps engineers", "SRE teams", "Kubernetes users"],
  "archetypes": ["dev tool", "paid template", "technical course"],
  "quotes": ["I just want to build something once and have it pay me forever", "meetings are where productivity goes to die"],
  "risks": ["limited hours may slow validation", "builder-only may need to force marketing"],
  "ideaAngles": [
    "Kubernetes config generator SaaS",
    "DevOps interview prep course",
    "Terraform template marketplace",
    "Incident postmortem template kit",
    "SRE onboarding documentation templates"
  ]
}

Stay sharp. Extract signal. Help them win.`;

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

      // Build messages array
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system" as const, content: SYSTEM_PROMPT },
      ];

      // If this is a NEW interview (empty transcript), fetch structured onboarding context
      if (transcript.length === 0) {
        console.log("dynamic-founder-interview: new interview, fetching structured onboarding context");
        
        const { data: profile, error: profileError } = await supabase
          .from("founder_profiles")
          .select("entry_trigger, future_vision, desired_identity, business_type_preference, energy_source, learning_style, commitment_level_text")
          .eq("user_id", resolvedUserId)
          .maybeSingle();

        if (profileError) {
          console.error("dynamic-founder-interview: error fetching founder profile", profileError);
        }

        if (profile) {
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
          console.log("dynamic-founder-interview: injected structured onboarding context");
        } else {
          console.log("dynamic-founder-interview: no structured onboarding profile found");
        }
      }

      // Add transcript history
      messages.push(...mapTranscriptToMessages(transcript));
      
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

      // Calculate question count for canFinalize (allow ending after 3+ questions)
      const aiQuestionCount = transcript.filter(t => t.role === "ai").length;
      const canFinalize = aiQuestionCount >= 3;

      return new Response(
        JSON.stringify({ interviewId, question, transcript, canFinalize }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // mode === "summary"
    const summaryMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...mapTranscriptToMessages(transcript),
      {
        role: "user" as const,
        content:
          "Summarize this interview into the contextSummary JSON object defined in your system prompt. Return ONLY valid JSON.",
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
