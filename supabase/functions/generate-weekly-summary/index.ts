import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---------------------------------------------------

type WeeklySummaryRequest = {
  endDate?: string; // "YYYY-MM-DD", optional (defaults to today)
};

type AIWeeklySummaryRaw = {
  week_theme?: unknown;
  story_of_the_week?: unknown;
  top_wins?: unknown;
  top_constraints?: unknown;
  focus_areas_next_week?: unknown;
  encouragement?: unknown;
};

type AIWeeklySummaryParsed = {
  week_theme: string;
  story_of_the_week: string;
  top_wins: string[];
  top_constraints: string[];
  focus_areas_next_week: string[];
  encouragement: string;
};

// --- CORS Headers --------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Environment ---------------------------------------------

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

// --- Helper: Safe JSON Parsing + Fallbacks -------------------

function safeParseWeeklySummaryResult(rawText: string): AIWeeklySummaryParsed {
  let parsed: AIWeeklySummaryRaw;

  // Strip markdown code blocks if present
  let cleanText = rawText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.slice(7);
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.slice(3);
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.slice(0, -3);
  }
  cleanText = cleanText.trim();

  try {
    parsed = JSON.parse(cleanText);
  } catch (err) {
    console.error("[generate-weekly-summary] Failed to parse AI JSON:", err, "Raw:", rawText);
    // Hard fallback if AI response is unusable
    return {
      week_theme: "Another week of showing up",
      story_of_the_week:
        "The details of this week were unclear, but you still showed up to do the work. Use the coming week to tighten your focus, pick one meaningful priority, and protect time for it.",
      top_wins: [
        "You stayed engaged with your work even without a clear structure.",
      ],
      top_constraints: [
        "Lack of clear priorities for the week.",
        "No consistent review of what moved the needle.",
      ],
      focus_areas_next_week: [
        "Choose one primary business outcome to move forward.",
        "Block time on your calendar for deep work before reactive tasks.",
      ],
      encouragement:
        "You're further ahead than if you had done nothing. This week, give your best effort to a small number of important actions and let that momentum compound.",
    };
  }

  // String helpers
  const asString = (val: unknown, fallback: string): string =>
    typeof val === "string" && val.trim().length > 0
      ? val.trim()
      : fallback;

  const asStringArray = (val: unknown, defaultIfEmpty: string[]): string[] => {
    if (!Array.isArray(val)) return defaultIfEmpty;
    const cleaned = val
      .filter((item) => typeof item === "string")
      .map((item) => (item as string).trim())
      .filter((item) => item.length > 0);
    return cleaned.length > 0 ? cleaned : defaultIfEmpty;
  };

  const week_theme = asString(
    parsed.week_theme,
    "Another week of learning and iteration",
  );

  const story_of_the_week = asString(
    parsed.story_of_the_week,
    "You continued to move your work forward this week, even if the execution wasn't perfect. The real opportunity now is to clarify your priorities and make sure your energy is going into the work that matters most.",
  );

  const top_wins = asStringArray(parsed.top_wins, [
    "You continued to show up for your work despite competing demands.",
  ]);

  const top_constraints = asStringArray(parsed.top_constraints, [
    "Priorities were not always clear day to day.",
    "Reactive work may have taken time from deep, important work.",
  ]);

  const focus_areas_next_week = asStringArray(
    parsed.focus_areas_next_week,
    [
      "Pick one clear outcome for the week and write it down.",
      "Protect at least two deep-work blocks on your calendar.",
    ],
  );

  const encouragement = asString(
    parsed.encouragement,
    "You don't need a perfect week to make real progress. Keep tightening the feedback loop between what you want, what you do, and what you learn. One honest week of focused execution can change your trajectory.",
  );

  return {
    week_theme,
    story_of_the_week,
    top_wins,
    top_constraints,
    focus_areas_next_week,
    encouragement,
  };
}

// --- Helper: Date utils --------------------------------------

function formatDateToYMD(date: Date): string {
  return date.toISOString().split("T")[0];
}

function shiftDateByDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// --- Main handler --------------------------------------------

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("[generate-weekly-summary] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // ===== END CANONICAL AUTH BLOCK =====

    const body = (await req.json()) as WeeklySummaryRequest;

    // Determine endDate (defaults to today)
    let endDateStr: string;
    if (body.endDate) {
      endDateStr = body.endDate;
    } else {
      endDateStr = formatDateToYMD(new Date());
    }

    const endDate = new Date(endDateStr);
    if (Number.isNaN(endDate.getTime())) {
      return new Response(
        JSON.stringify({ error: "Invalid endDate format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Start date = endDate - 6 days (7-day window inclusive)
    const startDate = shiftDateByDays(endDate, -6);
    const startDateStr = formatDateToYMD(startDate);

    console.log('[generate-weekly-summary] Processing for user:', userId, 'range:', startDateStr, 'to', endDateStr);

    // --- Fetch reflections from DB ---------------------------

    const { data: reflections, error } = await supabaseAdmin
      .from("daily_reflections")
      .select("*")
      .eq("user_id", userId)
      .gte("reflection_date", startDateStr)
      .lte("reflection_date", endDateStr)
      .order("reflection_date", { ascending: true });

    if (error) {
      console.error("[generate-weekly-summary] Error fetching reflections:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reflections" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // If no reflections at all, return a graceful, non-AI summary
    if (!reflections || reflections.length === 0) {
      const fallbackSummary: AIWeeklySummaryParsed = {
        week_theme: "No check-ins yet",
        story_of_the_week:
          "There are no daily check-ins recorded for this period. That means you still have a clean slate to start building the habit. The weekly review will become more powerful as you log your energy, focus, and progress each day.",
        top_wins: [
          "You've set up the system that will support your future check-ins.",
        ],
        top_constraints: [
          "No consistent daily reflection habit yet.",
        ],
        focus_areas_next_week: [
          "Complete at least 3 Daily Pulse & Check-Ins next week.",
          "Keep each check-in light and honest, not perfect.",
        ],
        encouragement:
          "The hard part is often just starting. Your future weekly summaries will be much more insightful as you build the habit of checking in regularly.",
      };

      return new Response(
        JSON.stringify({
          success: true,
          summary: fallbackSummary,
          startDate: startDateStr,
          endDate: endDateStr,
          reflection_count: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Prepare data for the model --------------------------

    const reflectionsForModel = reflections.map((r: any) => ({
      reflection_date: r.reflection_date,
      energy_level: r.energy_level,
      stress_level: r.stress_level,
      mood_tags: r.mood_tags,
      what_did: r.what_did,
      what_learned: r.what_learned,
      what_felt: r.what_felt,
      top_priority: r.top_priority,
      blockers: r.blockers,
      ai_theme: r.ai_theme,
      ai_micro_actions: r.ai_micro_actions,
    }));

    const systemPrompt = `
You are an AI cofounder and strategic partner for an ambitious entrepreneur.

Your job here is to:
- Review a week's worth of daily reflections.
- Detect patterns in behavior, energy, stress, and emotional tone.
- Highlight real wins and constraints.
- Suggest 2–4 focus areas for the upcoming week that will actually move the needle.
- Encourage them without fluff.

Tone:
- Strategic, honest, supportive.
- Think "thoughtful cofounder after a weekly ops review", not therapist or motivational poster.
- Be specific. Avoid generic advice that could apply to anyone.

You MUST return ONLY valid JSON in this structure:

{
  "week_theme": "string",
  "story_of_the_week": "string",
  "top_wins": ["string", "..."],
  "top_constraints": ["string", "..."],
  "focus_areas_next_week": ["string", "..."],
  "encouragement": "string"
}
`;

    const userPrompt = `
You are generating a weekly review for this founder.

Here is the raw data for the last 7 days as JSON:

${JSON.stringify(
  {
    startDate: startDateStr,
    endDate: endDateStr,
    reflections: reflectionsForModel,
  },
  null,
  2,
)}

Notes:
- Some days may be missing if they did not check in.
- energy_level and stress_level are 1–5 (1 = low, 5 = high).
- mood_tags are emotion keywords.
- what_did / what_learned / what_felt are free-text reflections.
- ai_theme and ai_micro_actions come from the daily AI reflection.

Tasks:
1. Infer the real story of the week from these entries.
2. Identify concrete wins (even small ones).
3. Call out key constraints and patterns getting in the way.
4. Recommend 2–4 focus areas for the upcoming week (specific and actionable).
5. Offer grounded encouragement that keeps them moving forward.

Remember: output ONLY JSON in the structure from the system message.
`;

    console.log('[generate-weekly-summary] Processing', reflections.length, 'reflections');

    // --- Call the AI model -----------------------------------

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-weekly-summary] OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const completion = await response.json();
    const aiText = completion.choices?.[0]?.message?.content ?? "{}";

    console.log('[generate-weekly-summary] AI response received');

    // --- Parse + normalize AI output safely ------------------

    const summary = safeParseWeeklySummaryResult(aiText);

    // --- Respond to frontend --------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        startDate: startDateStr,
        endDate: endDateStr,
        reflection_count: reflections.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error("[generate-weekly-summary] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error generating weekly summary" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
