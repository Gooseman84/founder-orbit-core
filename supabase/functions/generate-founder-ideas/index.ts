// supabase/functions/generate-founder-ideas/index.ts
// EPIC v7 — TrueBlazer Two-Pass Idea Engine (v6.1 Creativity + v2.0 Commercial Rigor)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EPIC v6/v7 Generation Modes
type IdeaGenerationMode = 
  | "breadth" 
  | "focus" 
  | "creator" 
  | "automation" 
  | "persona" 
  | "boundless" 
  | "locker_room" 
  | "chaos" 
  | "money_printer" 
  | "memetic";

type GenerationTone = "standard" | "exciting";

// ============================================
// PASS A: CREATIVE DIVERGENCE PROMPT
// ============================================
const PASS_A_SYSTEM_PROMPT = `You are TrueBlazer DIVERGENCE ENGINE v6.1 — UNHINGED CREATIVITY MODE.

Your mission: Generate 12-20 RAW, WILD, BOLD business ideas with ZERO filtering.

RULES FOR PASS A:
-----------------
✓ ALLOW weird, bold, niche, unconventional ideas
✓ OPTIMIZE for novelty, insight, emotional pull
✓ IGNORE feasibility temporarily
✓ ENCOURAGE asymmetric bets
✓ INCLUDE surprising angles and contrarian takes
✓ PUSH boundaries of what's possible

❌ NO scoring
❌ NO filtering
❌ NO rejection
❌ NO "that won't work" thinking
❌ NO corporate safe ideas

IDEA MODES TO USE:
- "Standard": Solid, proven patterns with a twist
- "Persona": AI characters, avatars, companions
- "Chaos": Wild combinations, category mashups
- "Memetic": Spreads like memes, humor-driven
- "Fusion": Multiple concepts merged together

OUTPUT SCHEMA (STRICT):
Each idea must include:
{
  "raw_title": string,           // bold, punchy title
  "raw_hook": string,            // 1 sentence that makes founders say "holy sh*t"
  "novel_twist": string,         // why this is DIFFERENT
  "target_persona": string,      // who desperately needs this
  "why_this_is_interesting": string, // the insight that makes this special
  "idea_mode": "Standard" | "Persona" | "Chaos" | "Memetic" | "Fusion"
}

TONE: Write like a sharp founder friend who just had 3 espressos. Not a consultant.

RESPONSE FORMAT:
- Return ONLY valid JSON: { "raw_ideas": [...] }
- 12-20 ideas minimum
- No markdown, no commentary
`;

// ============================================
// PASS B: COMMERCIAL REFINEMENT PROMPT
// ============================================
function buildPassBSystemPrompt(wildcardMode: boolean): string {
  const basePrompt = `You are TrueBlazer REFINEMENT ENGINE v2.0 — COMMERCIAL REALITY CHECK.

Your mission: Take the best raw ideas and rewrite them as EXECUTABLE ventures while keeping the excitement.

IMPORTANT: Keep output SMALL. Your #1 job is to obey the schema + length limits.
If you exceed limits, shorten text. DO NOT add extra fields.

OUTPUT SCHEMA (STRICT):
Return ONLY valid JSON in this exact shape:
{
  "refined_ideas": [
    {
      "id": string,
      "title": string,
      "one_liner_pitch": string,
      "problem": string,          // max 240 chars
      "solution": string,         // max 240 chars
      "ideal_customer": string,   // max 160 chars
      "business_model": string,   // short
      "first_steps": [string, string, string], // exactly 3 items; each max 120 chars

      // v6 metrics (numbers 0–100)
      "shock_factor": number,
      "virality_potential": number,
      "leverage_score": number,
      "automation_density": number,
      "autonomy_level": number,
      "culture_tailwind": number,
      "chaos_factor": number
    }
  ]
}

CONSTRAINTS (HARD):
- refined_ideas MUST contain exactly 6 ideas total.
- NEVER include any additional keys.
- NEVER use markdown.
- NO commentary before/after JSON.

TONE:
- Short, punchy sentences
- No corporate jargon
- No MBA-speak
- Write like a sharp founder friend
`;

  const wildcardInstructions = wildcardMode ? `

WILDCARD MODE ACTIVE:
=====================
- refined_ideas MUST contain exactly 6 ideas total.
- EXACTLY ONE wildcard idea MUST be included as the LAST item.
- The wildcard ignores founder constraints.
- Mark it with: "idea_mode": "Wildcard" and "is_wildcard": true
- For the wildcard, still obey all length limits and schema.

All other 5 ideas should respect founder constraints.
` : '';

  return basePrompt + wildcardInstructions + `

RESPONSE FORMAT:
- Return ONLY valid JSON: { "refined_ideas": [...] }
- No markdown, no commentary
`;
}

function buildModeContext(mode: IdeaGenerationMode, focusArea?: string): string {
  const modeDescriptions: Record<IdeaGenerationMode, string> = {
    breadth: "Generate a wide variety of ideas across all categories. Mix business types, platforms, and approaches. GO WILD.",
    focus: focusArea 
      ? `Deep-dive on: "${focusArea}". All ideas should explore wild angles within this specific niche.`
      : "Generate focused ideas in the founder's strongest domain. Push boundaries.",
    creator: "Focus on content empires, creator economy tools, audience monetization. Make creators RICH.",
    automation: "Focus on workflow automation, AI agents, background services. Build things that run while you sleep.",
    persona: "Focus on AI characters, avatars, companions, mentors. Create digital beings people LOVE.",
    boundless: "IGNORE all conventional wisdom. Maximum creativity. Maximum leverage. BREAK THE RULES.",
    locker_room: "Bold, culture-first, viral ideas. Things that make people say 'this shouldn't exist but I love it.'",
    chaos: "Mash categories together in unexpected ways. High shock value. Wild combinations. The weirder, the better.",
    money_printer: "Systems over businesses. Recurring revenue. Automation-heavy. Things that PRINT MONEY while you sleep.",
    memetic: "Ideas that spread like memes. Humor, cultural hooks, shareability. Must also make money.",
  };
  
  return modeDescriptions[mode];
}

// Helper to extract valid JSON from potentially messy AI response
function extractJSON(content: string): any {
  // First try direct parse
  try {
    return JSON.parse(content);
  } catch {}
  
  // Remove markdown code blocks if present
  let cleaned = content.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  
  // Try parsing cleaned content
  try {
    return JSON.parse(cleaned);
  } catch {}
  
  // Find the outermost { } pair by counting braces
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) {
    // Try to find an array instead
    const firstBracket = cleaned.indexOf("[");
    if (firstBracket !== -1) {
      let depth = 0;
      let endIndex = -1;
      for (let i = firstBracket; i < cleaned.length; i++) {
        if (cleaned[i] === "[") depth++;
        else if (cleaned[i] === "]") {
          depth--;
          if (depth === 0) {
            endIndex = i;
            break;
          }
        }
      }
      if (endIndex !== -1) {
        try {
          return JSON.parse(cleaned.slice(firstBracket, endIndex + 1));
        } catch {}
      }
    }
    throw new Error("No JSON object found in response");
  }
  
  let depth = 0;
  let endIndex = -1;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  // If we found a complete object, parse it
  if (endIndex !== -1) {
    const jsonStr = cleaned.slice(firstBrace, endIndex + 1);
    return JSON.parse(jsonStr);
  }
  
  // JSON is truncated - attempt repair by finding last complete object in array
  console.warn("generate-founder-ideas: Attempting to repair truncated JSON");
  
  // Find all complete objects by tracking the last valid closing brace at depth 1
  let lastCompleteObjectEnd = -1;
  depth = 0;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") {
      depth--;
      if (depth === 1) {
        // This closes an object inside the main object/array
        lastCompleteObjectEnd = i;
      }
    }
  }
  
  if (lastCompleteObjectEnd !== -1) {
    // Close the array and object
    const repairedJson = cleaned.slice(firstBrace, lastCompleteObjectEnd + 1) + "]}";
    try {
      const parsed = JSON.parse(repairedJson);
      console.log("generate-founder-ideas: Successfully repaired truncated JSON");
      return parsed;
    } catch {}
  }
  
  throw new Error("No matching closing brace found and repair failed");
}

// Helper to parse refined ideas from AI response (robust version)
function parseRefinedIdeas(content: string): any[] {
  // Log raw content for debugging (first 500 chars)
  console.log("generate-founder-ideas: Pass B raw response preview:", content.slice(0, 500));
  
  const parsed = extractJSON(content);
  
  // Handle various possible response formats
  if (Array.isArray(parsed)) {
    return parsed;
  } else if (parsed.refined_ideas && Array.isArray(parsed.refined_ideas)) {
    return parsed.refined_ideas;
  } else if (parsed.ideas && Array.isArray(parsed.ideas)) {
    return parsed.ideas;
  } else {
    // Try to find any array property
    const arrayProp = Object.values(parsed).find((v) => Array.isArray(v)) as any[] | undefined;
    if (arrayProp && arrayProp.length > 0) {
      return arrayProp;
    }
    console.error("generate-founder-ideas: Pass B response structure unexpected:", Object.keys(parsed));
    return [];
  }
}

// Helper to call Pass B (and other small JSON-only calls)
async function callPassB(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  opts?: { max_tokens?: number; temperature?: number }
): Promise<{ ok: boolean; status?: number; content?: string; error?: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: opts?.max_tokens ?? 6000,
      temperature: opts?.temperature ?? 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, error: await response.text() };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content as string | undefined;

  if (!content) {
    return { ok: false, error: "Empty response" };
  }

  return { ok: true, content };
}

async function repairJsonWithModel(apiKey: string, rawText: string) {
  const repairPrompt =
    "Fix this into valid JSON only. Do not add new content. Preserve as much as possible. If truncated, remove the incomplete trailing item and close all brackets properly. Return ONLY valid JSON.";

  const result = await callPassB(
    apiKey,
    "You are a JSON repair assistant. Output JSON only.",
    `${repairPrompt}\n\n---\n${rawText}`,
    { max_tokens: 2000, temperature: 0.2 }
  );

  return result;
}

function salvagePassBJsonLastCompleteObject(rawText: string): string | null {
  // Last-resort salvage: keep only complete objects inside refined_ideas.
  const cleaned = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const keyIdx = cleaned.indexOf('"refined_ideas"');
  if (keyIdx === -1) return null;
  const arrStart = cleaned.indexOf("[", keyIdx);
  if (arrStart === -1) return null;

  // Walk the array and remember the last index where an object closed at depth=1 (inside the array)
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastObjEnd = -1;

  for (let i = arrStart; i < cleaned.length; i++) {
    const ch = cleaned[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        lastObjEnd = i;
      }
    }

    // stop if we find a clean close bracket after at least one object
    if (ch === "]" && lastObjEnd !== -1) break;
  }

  if (lastObjEnd === -1) return null;

  const prefixObjStart = cleaned.lastIndexOf("{", lastObjEnd);
  if (prefixObjStart === -1) return null;

  // Build a minimal JSON object wrapper and close it.
  const arrBody = cleaned.slice(arrStart + 1, lastObjEnd + 1);
  return `{ "refined_ideas": [${arrBody}] }`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;
    const mode: IdeaGenerationMode = body.mode || "breadth";
    const focusArea: string | undefined = body.focus_area;
    const tone: GenerationTone = body.tone || "exciting";
    const wildcardMode: boolean = body.wildcard_mode === true;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing user_id in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-founder-ideas v7: mode=${mode}, tone=${tone}, focus_area=${focusArea || "none"}, wildcard_mode=${wildcardMode}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ===== PLAN CHECK: Get user subscription =====
    const { data: subData } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = (subData?.status === "active" && subData?.plan) || "free";
    const isPro = plan === "pro" || plan === "founder";

    // ===== PLAN CHECK: Daily generation limit (FREE = 2/day) =====
    if (!isPro) {
      const today = new Date().toISOString().split("T")[0];
      const { count: todayCount } = await supabase
        .from("founder_generated_ideas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", `${today}T00:00:00.000Z`);

      const MAX_FREE_GENERATIONS = 2;
      if ((todayCount || 0) >= MAX_FREE_GENERATIONS) {
        console.log(`generate-founder-ideas: FREE user ${userId} hit daily limit`);
        return new Response(
          JSON.stringify({ 
            error: "Daily idea generation limit reached",
            code: "IDEA_LIMIT_REACHED",
            plan: "free",
            limit: MAX_FREE_GENERATIONS
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ===== PLAN CHECK: Mode restrictions (FREE = breadth, focus, creator only) =====
    const FREE_MODES = ["breadth", "focus", "creator"];
    if (!isPro && !FREE_MODES.includes(mode)) {
      console.log(`generate-founder-ideas: FREE user ${userId} tried Pro mode ${mode}`);
      return new Response(
        JSON.stringify({ 
          error: `The "${mode}" mode requires TrueBlazer Pro`,
          code: "MODE_REQUIRES_PRO",
          mode,
          plan: "free"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load founder profile
    const { data: profileRow, error: profileError } = await supabase
      .from("founder_profiles")
      .select("profile, work_personality, creator_platforms, edgy_mode, wants_money_systems, open_to_personas, open_to_memetic_ideas")
      .eq("user_id", userId)
      .single();

    if (profileError || !profileRow?.profile) {
      console.error("generate-founder-ideas: founder profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if locker_room mode is allowed
    if (mode === "locker_room") {
      const edgyMode = profileRow.edgy_mode;
      if (edgyMode !== "bold" && edgyMode !== "unhinged") {
        return new Response(
          JSON.stringify({ error: "Locker Room mode requires edgy_mode to be 'bold' or 'unhinged'." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Load interview context summary
    const { data: interviewRows } = await supabase
      .from("founder_interviews")
      .select("context_summary, updated_at, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1);

    const contextSummary = interviewRows?.[0]?.context_summary ?? null;

    // Build payload
    const founderPayload = {
      mode,
      focus_area: focusArea || null,
      tone,
      founderProfile: {
        ...profileRow.profile,
        workPersonality: profileRow.work_personality || [],
        creatorPlatforms: profileRow.creator_platforms || [],
        edgyMode: profileRow.edgy_mode || "safe",
        wantsMoneySystems: profileRow.wants_money_systems || false,
        openToPersonas: profileRow.open_to_personas || false,
        openToMemeticIdeas: profileRow.open_to_memetic_ideas || false,
      },
      contextSummary,
    };

    const modeContext = buildModeContext(mode, focusArea);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("generate-founder-ideas: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============================================
    // PASS A: CREATIVE DIVERGENCE
    // ============================================
    console.log("generate-founder-ideas v7: Starting Pass A (Creative Divergence)...");
    
    const passAMessage = `MODE: ${mode}
MODE INSTRUCTIONS: ${modeContext}
TONE: ${tone}

FOUNDER CONTEXT:
${JSON.stringify(founderPayload, null, 2)}

Generate 12-20 RAW, WILD ideas now. NO FILTERING. Return ONLY: { "raw_ideas": [...] }`;

    const passAResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 8000,
        temperature: 0.9,
        messages: [
          { role: "system", content: PASS_A_SYSTEM_PROMPT },
          { role: "user", content: passAMessage },
        ],
      }),
    });

    if (!passAResponse.ok) {
      const status = passAResponse.status;
      const text = await passAResponse.text();
      console.error("generate-founder-ideas: Pass A AI error", status, text);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please wait and try again.", code: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds.", code: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed in Pass A" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const passAData = await passAResponse.json();
    const passAContent = passAData.choices?.[0]?.message?.content as string | undefined;

    if (!passAContent) {
      console.error("generate-founder-ideas: Pass A empty response");
      return new Response(
        JSON.stringify({ error: "Pass A returned empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let rawIdeas: any[];
    try {
      // Log raw content for debugging (first 500 chars)
      console.log("generate-founder-ideas: Pass A raw response preview:", passAContent.slice(0, 500));
      
      const parsed = extractJSON(passAContent);
      
      // Handle various possible response formats
      if (Array.isArray(parsed)) {
        // Direct array response
        rawIdeas = parsed;
      } else if (parsed.raw_ideas && Array.isArray(parsed.raw_ideas)) {
        // Expected format: { raw_ideas: [...] }
        rawIdeas = parsed.raw_ideas;
      } else if (parsed.ideas && Array.isArray(parsed.ideas)) {
        // Alternate format: { ideas: [...] }
        rawIdeas = parsed.ideas;
      } else {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find((v) => Array.isArray(v)) as any[] | undefined;
        if (arrayProp && arrayProp.length > 0) {
          rawIdeas = arrayProp;
        } else {
          console.error("generate-founder-ideas: Pass A response structure unexpected:", Object.keys(parsed));
          return new Response(
            JSON.stringify({ error: "Pass A response format unexpected" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    } catch (e) {
      console.error("generate-founder-ideas: Pass A JSON parse error", e, "Content preview:", passAContent.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "Failed to parse Pass A response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Array.isArray(rawIdeas) || rawIdeas.length === 0) {
      console.error("generate-founder-ideas: Pass A returned no ideas after parsing");
      return new Response(
        JSON.stringify({ error: "Pass A returned no ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-founder-ideas v7: Pass A generated ${rawIdeas.length} raw ideas`);

    // ============================================
    // PASS B: COMMERCIAL REFINEMENT
    // ============================================
    console.log("generate-founder-ideas v7: Starting Pass B (Commercial Refinement)...");

    const passBSystemPrompt = buildPassBSystemPrompt(wildcardMode);

    // Reduce Pass B payload size: only pass minimal raw idea fields
    const rawIdeasSlim = rawIdeas.map((idea: any, idx: number) => ({
      id: idea?.id ?? `raw-${idx}`,
      raw_title: idea?.raw_title ?? idea?.title ?? "",
      raw_hook: idea?.raw_hook ?? idea?.hook ?? "",
      novel_twist: idea?.novel_twist ?? "",
      target_persona: idea?.target_persona ?? "",
      idea_mode: idea?.idea_mode ?? "Standard",
    }));

    const buildPassBMessage = (retryWithStricterInstruction = false) => {
      const ideaCount = wildcardMode ? 6 : 6;
      const nonWildcardCount = wildcardMode ? 5 : 6;

      let message = `FOUNDER CONTEXT:
${JSON.stringify(founderPayload, null, 2)}

RAW IDEAS FROM PASS A (${rawIdeasSlim.length} ideas; minimal fields):
${JSON.stringify(rawIdeasSlim, null, 2)}

TONE: ${tone}
WILDCARD_MODE: ${wildcardMode}

Select the TOP ${nonWildcardCount} ideas based on founder fit + first-dollar potential + excitement.
Then rewrite them to match the STRICT schema.

HARD LIMITS:
- refined_ideas must contain exactly ${ideaCount} items total.
- problem max 240 chars
- solution max 240 chars
- ideal_customer max 160 chars
- first_steps must be exactly 3 strings, each max 120 chars
- If you exceed limits, shorten text.
- Do NOT add extra fields.
- Do NOT use markdown.
`;

      if (wildcardMode) {
        message += `
Add exactly one wildcard idea as the LAST item in refined_ideas.
Mark it with is_wildcard=true and idea_mode="Wildcard".
`;
      }

      if (retryWithStricterInstruction) {
        message += `
CRITICAL: You forgot the wildcard in your previous response.
Add it as the LAST item. This is mandatory when WILDCARD_MODE is true.
`;
      }

      message += `
Return ONLY: { "refined_ideas": [...] }`;

      return message;
    };

    // First Pass B attempt
    let passBResult = await callPassB(
      LOVABLE_API_KEY,
      passBSystemPrompt,
      buildPassBMessage(false)
    );

    if (!passBResult.ok) {
      const status = passBResult.status;
      console.error("generate-founder-ideas: Pass B AI error", status, passBResult.error);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please wait and try again.", code: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds.", code: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed in Pass B" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let refinedIdeas: any[] = [];
    try {
      refinedIdeas = parseRefinedIdeas(passBResult.content!);
    } catch (e) {
      console.error("generate-founder-ideas: Pass B parse error", e);
      console.log("generate-founder-ideas: Pass B parse failed; attempting JSON repair");

      // 1) Retry once with a JSON repair prompt (fast + cheap)
      const repair = await repairJsonWithModel(LOVABLE_API_KEY, passBResult.content!);
      if (repair.ok && repair.content) {
        try {
          refinedIdeas = parseRefinedIdeas(repair.content);
        } catch (e2) {
          console.warn("generate-founder-ideas: JSON repair parse failed", e2);
        }
      }

      // 2) Last-resort salvage: truncate to last complete object
      if (!refinedIdeas || !Array.isArray(refinedIdeas) || refinedIdeas.length === 0) {
        const salvaged = salvagePassBJsonLastCompleteObject(passBResult.content!);
        if (salvaged) {
          try {
            refinedIdeas = parseRefinedIdeas(salvaged);
          } catch (e3) {
            console.warn("generate-founder-ideas: salvage parse failed", e3);
          }
        }
      }

      // 3) Graceful failure (no unhandled exception)
      if (!refinedIdeas || !Array.isArray(refinedIdeas) || refinedIdeas.length === 0) {
        return new Response(
          JSON.stringify({
            error: "AI returned malformed JSON. Please retry.",
            code: "parse_failed",
            message: "AI returned malformed JSON. Please retry.",
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!Array.isArray(refinedIdeas) || refinedIdeas.length === 0) {
      console.error("generate-founder-ideas: Pass B returned no ideas");
      return new Response(
        JSON.stringify({ error: "Pass B returned no refined ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== WILDCARD SAFETY GUARD =====
    if (wildcardMode) {
      const hasWildcard = refinedIdeas.some((idea: any) => idea.is_wildcard === true);
      
      if (!hasWildcard) {
        console.log("generate-founder-ideas v7: Wildcard missing, retrying Pass B with stricter instruction...");
        
        // Retry with stricter instruction
        const retryResult = await callPassB(
          LOVABLE_API_KEY,
          passBSystemPrompt,
          buildPassBMessage(true)
        );

        if (retryResult.ok && retryResult.content) {
          try {
            const retryIdeas = parseRefinedIdeas(retryResult.content);
            if (Array.isArray(retryIdeas) && retryIdeas.length > 0) {
              const retryHasWildcard = retryIdeas.some((idea: any) => idea.is_wildcard === true);
              if (retryHasWildcard) {
                refinedIdeas = retryIdeas;
                console.log("generate-founder-ideas v7: Wildcard recovered on retry");
              } else {
                console.warn("generate-founder-ideas v7: Wildcard still missing after retry, proceeding without");
              }
            }
          } catch (e) {
            console.warn("generate-founder-ideas v7: Retry parse failed, proceeding without wildcard", e);
          }
        } else {
          console.warn("generate-founder-ideas v7: Retry failed, proceeding without wildcard");
        }
      }
    }

    console.log(`generate-founder-ideas v7: Pass B refined ${refinedIdeas.length} ideas`);

    // ============================================
    // MAP TO V7 RESPONSE FORMAT
    // ============================================
    const finalIdeas = refinedIdeas.map((idea: any, index: number) => {
      const isWildcard = idea.is_wildcard === true;
      
      // Handle title prefix for wildcard
      let title = idea.title || "Untitled Idea";
      if (isWildcard && !title.startsWith("WILDCARD:")) {
        title = `WILDCARD: ${title}`;
      }

      return {
        id: idea.id || `v7-${mode}-${index}`,
        title,
        oneLiner: idea.one_liner_pitch || "",
        description: `${idea.problem || ""} ${idea.solution || ""}`.trim(),
        
        // v7 specific
        problem: idea.problem || "",
        solution: idea.solution || "",
        idealCustomer: idea.ideal_customer || "",
        pricingAnchor: idea.pricing_anchor || "",
        distributionWedge: idea.distribution_wedge || "",
        executionDifficulty: idea.execution_difficulty || "Medium",
        riskNotes: idea.risk_notes || "",
        delightFactor: idea.delight_factor || "",
        firstDollarPath: idea.first_dollar_path || idea.time_to_first_dollar || "",
        
        // Classification
        category: isWildcard ? "wildcard" : inferCategory(idea),
        industry: "",
        model: idea.business_model || "subscription",
        aiPattern: "",
        platform: null,
        difficulty: mapDifficulty(idea.execution_difficulty),
        soloFit: idea.execution_difficulty !== "High",
        timeToRevenue: "0-30d",
        
        // Legacy compat
        whyNow: idea.why_now || "",
        whyItFitsFounder: idea.why_now || "",
        problemStatement: idea.problem || "",
        targetCustomer: idea.ideal_customer || "",
        mvpApproach: idea.solution || "",
        goToMarket: idea.distribution_wedge || "",
        firstSteps: idea.first_dollar_path ? [idea.first_dollar_path] : [],
        
        // v6 scores
        shockFactor: idea.shock_factor ?? 50,
        viralityPotential: idea.virality_potential ?? 50,
        leverageScore: idea.leverage_score ?? 60,
        automationDensity: idea.automation_density ?? 50,
        autonomyLevel: idea.autonomy_level ?? 50,
        cultureTailwind: idea.culture_tailwind ?? 50,
        chaosFactor: idea.chaos_factor ?? 30,
        
        // Metadata
        engineVersion: "v7",
        mode,
        ideaModeV7: isWildcard ? "Wildcard" : (idea.idea_mode || "Standard"),
        tone,
        
        // Wildcard flag
        wildcard: isWildcard,
      };
    });

    // Return full v7 response
    const response = {
      generation_version: "v6.1+v2.0",
      tone,
      mode,
      engine_version: "v7",
      wildcard_mode: wildcardMode,
      pass_a_raw_ideas: rawIdeas,
      final_ranked_ideas: refinedIdeas,
      ideas: finalIdeas, // Backwards compatible field
    };

    console.log(`generate-founder-ideas v7: Complete. ${rawIdeas.length} raw → ${finalIdeas.length} refined (wildcard_mode=${wildcardMode})`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-founder-ideas v7: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Helper functions
function inferCategory(idea: any): string {
  const modeMap: Record<string, string> = {
    "Standard": "saas",
    "Persona": "avatar",
    "Chaos": "locker_room",
    "Memetic": "memetic",
    "Fusion": "system",
  };
  return modeMap[idea.idea_mode] || "saas";
}

function mapDifficulty(execDiff: string): string {
  const map: Record<string, string> = {
    "Low": "easy",
    "Medium": "medium",
    "High": "hard",
  };
  return map[execDiff] || "medium";
}
