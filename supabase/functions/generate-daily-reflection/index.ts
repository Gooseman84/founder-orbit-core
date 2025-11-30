import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Types ---------------------------------------------------

type DailyReflectionRequest = {
  userId: string;
  reflectionDate: string; // "YYYY-MM-DD"
  energyLevel?: number;   // 1–5
  stressLevel?: number;   // 1–5
  moodTags?: string[];
  whatDid?: string;
  whatLearned?: string;
  whatFelt?: string;
  topPriority?: string;
  blockers?: string;
};

type AISuggestedTask = {
  title?: string;
  notes?: string;
} | null;

type AIDailyReflectionRaw = {
  summary?: unknown;
  theme?: unknown;
  micro_actions?: unknown;
  suggested_task?: unknown;
};

type AIDailyReflectionParsed = {
  summary: string;
  theme: string;
  micro_actions: string[];
  suggested_task: AISuggestedTask;
};

// --- CORS Headers --------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Environment ------------------------------------------------

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const openaiApiKey = Deno.env.get("OPENAI_API_KEY")!;

// --- Helper: Safe JSON Parsing + Fallbacks -----------------------

function safeParseDailyReflectionResult(rawText: string): AIDailyReflectionParsed {
  let parsed: AIDailyReflectionRaw;

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
    console.error("[generate-daily-reflection] Failed to parse AI JSON:", err, "Raw:", rawText);
    // Hard fallback if the AI returns something totally invalid
    return {
      summary: "Today you made progress, even if the details are unclear. Focus on one meaningful action tomorrow.",
      theme: "Keep moving",
      micro_actions: [
        "Choose one specific task for tomorrow and schedule a time to do it.",
      ],
      suggested_task: null,
    };
  }

  // Summary
  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : "Today you showed up and moved things forward. Tomorrow is a chance to tighten your focus.";

  // Theme
  const theme =
    typeof parsed.theme === "string" && parsed.theme.trim().length > 0
      ? parsed.theme.trim()
      : "Showing up";

  // Micro actions
  let microActions: string[] = [];

  if (Array.isArray(parsed.micro_actions)) {
    microActions = parsed.micro_actions
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  if (microActions.length === 0) {
    microActions = [
      "Pick one important task and do it before checking email or messages.",
    ];
  }

  // Suggested task
  let suggestedTask: AISuggestedTask = null;

  if (parsed.suggested_task && typeof parsed.suggested_task === "object") {
    const obj = parsed.suggested_task as Record<string, unknown>;
    const title =
      typeof obj.title === "string" && obj.title.trim().length > 0
        ? obj.title.trim()
        : undefined;
    const notes =
      typeof obj.notes === "string" && obj.notes.trim().length > 0
        ? obj.notes.trim()
        : undefined;

    if (title || notes) {
      suggestedTask = { title, notes };
    }
  }

  return {
    summary,
    theme,
    micro_actions: microActions,
    suggested_task: suggestedTask,
  };
}

// --- Helper: clamp numeric values into 1–5 -----------------------

function clamp1to5(n: number | undefined, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(5, Math.max(1, Math.round(n)));
}

// --- Main handler -----------------------------------------------

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as DailyReflectionRequest;

    if (!body.userId || !body.reflectionDate) {
      return new Response(
        JSON.stringify({ error: "Missing userId or reflectionDate" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      userId,
      reflectionDate,
      energyLevel,
      stressLevel,
      moodTags,
      whatDid,
      whatLearned,
      whatFelt,
      topPriority,
      blockers,
    } = body;

    console.log('[generate-daily-reflection] Processing for user:', userId, 'date:', reflectionDate);

    // Normalize fields before sending to the model
    const normalizedEnergy = clamp1to5(energyLevel, 3);
    const normalizedStress = clamp1to5(stressLevel, 3);
    const normalizedMoodTags = Array.isArray(moodTags)
      ? moodTags.filter((t) => typeof t === "string" && t.trim().length > 0)
      : [];

    // --- Build LLM prompt ---------------------------------------

    const systemPrompt = `
You are an AI cofounder and performance partner for an ambitious entrepreneur.

Your job is to:
- Read their daily check-in and pulse data.
- Understand what actually happened today.
- Reflect back a clear story, a sharp theme, and 1–3 specific micro-actions for tomorrow.
- Optionally propose ONE practical task for their task list.

Tone:
- Direct, supportive, grounded.
- No clichés, no generic self-help, no therapy language.
- Focus on tiny, realistic behavior changes.

You MUST return ONLY valid JSON with this structure:

{
  "summary": "string",
  "theme": "string",
  "micro_actions": ["string", "..."],
  "suggested_task": {
    "title": "string",
    "notes": "string"
  }
}

"micro_actions" should be 1–3 short, concrete actions.
"suggested_task" can be null if nothing stands out.
`;

    const userPrompt = `
You are generating a daily reflection for this founder.

Here is today's data as JSON:

${JSON.stringify(
  {
    reflection_date: reflectionDate,
    energy_level: normalizedEnergy,
    stress_level: normalizedStress,
    mood_tags: normalizedMoodTags,
    what_did: whatDid ?? "",
    what_learned: whatLearned ?? "",
    what_felt: whatFelt ?? "",
    top_priority: topPriority ?? "",
    blockers: blockers ?? "",
  },
  null,
  2
)}

Tasks:
1. Decide what the real story of the day is.
2. Choose a short, sharp theme for the day.
3. Suggest 1–3 micro-actions that would make tomorrow better.
4. If useful, propose ONE suggested task.

Remember: output ONLY JSON in the structure from the system message.
`;

    // --- Call the AI model -------------------------------------

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
      console.error('[generate-daily-reflection] OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const completion = await response.json();
    const aiText = completion.choices?.[0]?.message?.content ?? "{}";

    console.log('[generate-daily-reflection] AI response received');

    // --- Parse + normalize AI output safely --------------------

    const aiResult = safeParseDailyReflectionResult(aiText);

    // --- Upsert into daily_reflections -------------------------

    const { data, error } = await supabase
      .from("daily_reflections")
      .upsert(
        {
          user_id: userId,
          reflection_date: reflectionDate,
          energy_level: normalizedEnergy,
          stress_level: normalizedStress,
          mood_tags: normalizedMoodTags,
          what_did: whatDid ?? "",
          what_learned: whatLearned ?? "",
          what_felt: whatFelt ?? "",
          top_priority: topPriority ?? "",
          blockers: blockers ?? "",
          ai_summary: aiResult.summary,
          ai_theme: aiResult.theme,
          ai_micro_actions: aiResult.micro_actions,
          ai_suggested_task: aiResult.suggested_task,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,reflection_date",
        }
      )
      .select("*")
      .single();

    if (error) {
      console.error("[generate-daily-reflection] Error upserting:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store reflection" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[generate-daily-reflection] Reflection saved successfully:', data.id);

    // --- Respond to frontend ----------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        reflection: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("[generate-daily-reflection] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error processing reflection" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
