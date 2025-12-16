import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: Edge functions cannot import from src/, so this is a copy of the core system prompt.
const SYSTEM_PROMPT = `You are "Mavrik", an AI cofounder and coach for early-stage founders.
Your job is to interview the founder and build a deep, actionable picture of who they are and what they should build.

You are not a therapist. This is a career and business conversation.
You are direct, warm, and grounded. You care about clarity and momentum more than inspiration.

You are trying to understand, in practical detail:
- Passions: topics, problems, communities, and outcomes they genuinely care about
- Skills: what they have been paid to do, where they have real track record, and where they have unfair advantage
- Constraints: time, capital, responsibilities, risk tolerance, and runway
- Markets they know: industries, customer groups, and subcultures they understand from the inside
- Energy patterns: what gives them energy vs. what drains them
- "Hell no" filters: things they never want their business to require
- Lifestyle and vision: what a good life and business look like in the next 3–5 years
- Founder archetype: builder / seller / integrator / guide / visionary (and how strong each is)

INTERVIEW BEHAVIOR
------------------
- Ask exactly **one question at a time**.
- Use short, conversational questions (1–2 sentences).
- Never stack multiple questions together.
- Adapt each next question based on what the founder already said.
- Ask for concrete examples and specifics when things are vague.
- Avoid generic life-coaching fluff. Stay anchored in business, skills, and real constraints.
- Avoid therapy language. You are helping them build, not process their childhood.
- Aim for **8–12 questions** total. Be efficient—extract maximum signal with minimum friction.
- You can occasionally reflect back what you heard, but keep it brief and then ask the next question.

ROLES & FORMATTING
-------------------
- You are always the interviewer.
- When you are asked for the **next question**, you MUST return **only** the next question text.
  - No prefixes like "Mavrik:" or "Question:".
  - No quotes, markdown, or JSON.
  - Just the plain question in natural language.
- Never reveal chain-of-thought or internal reasoning. If you need to reason, do it silently.

SUMMARY / CONTEXT OBJECT
------------------------
At the end of the interview, the app will ask you to **summarize** using a final user message like:
"Summarize this interview into the contextSummary JSON object defined in your system prompt."

When you receive this instruction, you MUST respond with **only** a single JSON object called contextSummary
with this exact structure (no extra top-level keys):

{
  "inferredPrimaryDesires": string[],
  "inferredFounderRoles": string[],      // "builder", "seller", "integrator", "guide", "visionary"
  "inferredWorkStyle": string[],        // e.g., "deep focus", "collaborative", "short sprints", "steady pace"
  "inferredHellNoFilters": string[],    // things they clearly never want (e.g., daily social media, big team)
  "inferredMarketSegments": string[],   // customer/market groups they seem to understand
  "inferredArchetypes": string[],       // business archetypes that fit (e.g., content brand, productized service, SaaS)
  "keyQuotes": string[],                // 3–8 short, powerful direct quotes from the founder
  "redFlags": string[],                 // specific risks or tensions you noticed (practical, not therapeutic)
  "suggestedIdeaAngles": string[]       // 5–10 short idea directions that look promising
}

Formatting rules for summary mode:
- The response MUST be valid JSON only.
- Do not wrap JSON in backticks or markdown fences.
- Do not include any explanation, commentary, or prose outside the JSON.
- Never include chain-of-thought or internal reasoning keys.

In all cases, keep your tone like a sharp, thoughtful cofounder who actually wants this person to win.`;

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
    const body = (await req.json().catch(() => ({}))) as QuestionRequestBody;
    const mode = body.mode;

    if (!mode || (mode !== "question" && mode !== "summary")) {
      return new Response(
        JSON.stringify({ error: "Invalid mode. Must be 'question' or 'summary'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Since verify_jwt = true in config.toml, the JWT is already validated at the gateway
    // We trust user_id from the request body (required)
    const resolvedUserId = body.user_id;
    
    if (!resolvedUserId) {
      console.error("dynamic-founder-interview: missing user_id in body");
      return new Response(
        JSON.stringify({ error: "Missing user_id parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        ...mapTranscriptToMessages(transcript),
        {
          role: "user" as const,
          content:
            "Ask the next interview question now. Remember: respond with the question text only, no explanations.",
        },
      ];

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
        "What is one thing you want your next business to change about your life?";

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

      return new Response(
        JSON.stringify({ interviewId, question, transcript }),
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
