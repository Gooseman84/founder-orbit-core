import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

interface UserContext {
  profile: any | null;
  extendedIntake: any | null;
  chosenIdea: any | null;
  ideaAnalysis: any | null;
  recentDocs: any[];
  recentReflections: any[];
}

// --- CORS Headers --------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Environment ------------------------------------------------

const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

// --- Context Builder (embedded for edge function) ----------------

async function buildUserContext(userId: string, client: any): Promise<UserContext> {
  const [
    profileRes,
    extendedIntakeRes,
    chosenIdeaRes,
    recentDocsRes,
    recentReflectionsRes,
  ] = await Promise.all([
    client.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('user_intake_extended').select('*').eq('user_id', userId).maybeSingle(),
    client.from('ideas').select('*').eq('user_id', userId).eq('status', 'chosen').maybeSingle(),
    client.from('workspace_documents')
      .select('id, title, content, doc_type, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3),
    client.from('daily_reflections')
      .select('reflection_date, ai_summary, ai_theme, energy_level, stress_level, mood_tags, what_did, top_priority')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(7),
  ]);

  let ideaAnalysis = null;
  if (chosenIdeaRes.data?.id) {
    const { data: analysis } = await client
      .from('idea_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('idea_id', chosenIdeaRes.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ideaAnalysis = analysis;
  }

  return {
    profile: profileRes.data ?? null,
    extendedIntake: extendedIntakeRes.data ?? null,
    chosenIdea: chosenIdeaRes.data ?? null,
    ideaAnalysis,
    recentDocs: recentDocsRes.data ?? [],
    recentReflections: recentReflectionsRes.data ?? [],
  };
}

function formatDocsForPrompt(docs: { title: string | null; content: string | null; doc_type?: string | null }[]): string {
  if (!docs?.length) return 'No recent workspace notes.';
  return docs
    .map((doc, idx) => {
      const title = doc.title || `Document ${idx + 1}`;
      const docType = doc.doc_type ? ` (${doc.doc_type})` : '';
      const content = (doc.content || '').slice(0, 500).trim();
      const truncated = content.length >= 500 ? '...' : '';
      return `- [${title}${docType}]: ${content}${truncated}`;
    })
    .join('\n');
}

function formatReflectionsForPrompt(reflections: any[]): string {
  if (!reflections?.length) return 'No recent reflections.';
  return reflections
    .slice(0, 5)
    .map((r) => {
      const date = r.reflection_date;
      const theme = r.ai_theme ? `Theme: "${r.ai_theme}"` : '';
      const energy = r.energy_level ? `Energy: ${r.energy_level}/5` : '';
      const stress = r.stress_level ? `Stress: ${r.stress_level}/5` : '';
      const moods = r.mood_tags?.length ? `Mood: ${r.mood_tags.slice(0, 3).join(', ')}` : '';
      const parts = [theme, energy, stress, moods].filter(Boolean).join(' | ');
      return `- [${date}] ${parts}`;
    })
    .join('\n');
}

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
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extract token and verify user
    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("[generate-daily-reflection] auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[generate-daily-reflection] authenticated user", userId);

    // 3. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Parse request body (userId already defined from auth above)
    const body = (await req.json()) as Omit<DailyReflectionRequest, 'userId'>;

    if (!body.reflectionDate) {
      return new Response(
        JSON.stringify({ error: "Missing reflectionDate" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
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

    // --- Fetch user context for richer, personalized reflections ---
    
    console.log('[generate-daily-reflection] Fetching user context...');
    const userContext = await buildUserContext(userId, supabaseAdmin);
    const docsSnippet = formatDocsForPrompt(userContext.recentDocs);
    const reflectionsSnippet = formatReflectionsForPrompt(userContext.recentReflections);
    
    console.log('[generate-daily-reflection] Context loaded - profile:', !!userContext.profile, 'idea:', !!userContext.chosenIdea, 'docs:', userContext.recentDocs.length);

    const userPrompt = `
You are generating a daily reflection for this founder.

## Today's Check-in Data

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

## Additional Context About This Founder

### Founder Profile
${userContext.profile ? JSON.stringify({
  passions: userContext.profile.passions_text || userContext.profile.passions_tags?.join(', ') || 'Not specified',
  skills: userContext.profile.skills_text || userContext.profile.skills_tags?.join(', ') || 'Not specified',
  time_per_week: userContext.profile.time_per_week,
  risk_tolerance: userContext.profile.risk_tolerance,
  success_vision: userContext.profile.success_vision?.slice(0, 300),
}, null, 2) : 'No profile available'}

### Extended Intake (Deeper Self-Knowledge)
${userContext.extendedIntake ? JSON.stringify({
  deep_desires: userContext.extendedIntake.deep_desires?.slice(0, 200),
  fears: userContext.extendedIntake.fears?.slice(0, 200),
  energy_givers: userContext.extendedIntake.energy_givers?.slice(0, 150),
  energy_drainers: userContext.extendedIntake.energy_drainers?.slice(0, 150),
}, null, 2) : 'No extended intake available'}

### Chosen Idea (Current Main Project)
${userContext.chosenIdea ? JSON.stringify({
  title: userContext.chosenIdea.title,
  description: userContext.chosenIdea.description?.slice(0, 200),
  business_model: userContext.chosenIdea.business_model_type,
  target_customer: userContext.chosenIdea.target_customer,
}, null, 2) : 'No chosen idea yet'}

### Recent Workspace Notes
${docsSnippet}

### Recent Reflection Patterns (Last 7 days)
${reflectionsSnippet}

## Your Task

Use ALL the context above to:
1. Understand what actually happened today in the context of their bigger picture.
2. Decide on a short, sharp theme that captures today's essence.
3. Suggest 1–3 micro-actions that would make tomorrow better, considering their constraints (time, energy patterns, current project).
4. If useful, propose ONE practical suggested task aligned with their chosen idea.

Remember: output ONLY JSON in the structure from the system message.
`;

    // --- Call the AI model (Lovable AI Gateway) -------------------

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-daily-reflection] AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    const { data, error } = await supabaseAdmin
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
