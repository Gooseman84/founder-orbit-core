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

Your mission: Take the best 9-12 raw ideas and make them EXECUTABLE while keeping the excitement.

SELECTION CRITERIA (use ALL):
-----------------------------
1. Founder fit — matches their skills, energy, constraints
2. First-dollar potential — can make money in 7 days
3. Clear buyer — someone specific will pay
4. Monetization path — obvious how money flows
5. Solo execution — 1-3 person team can build this

EXCITEMENT INSURANCE (REQUIRED FOR EVERY IDEA):
----------------------------------------------
Every final idea MUST include:
✓ Punchy hook (non-corporate, no fluff)
✓ Delight/novelty factor — what makes this FUN
✓ First dollar path within 7 days
✓ Clear pricing anchor
✓ Distribution wedge — how it spreads or compounds

If an idea fails excitement insurance, REPLACE IT. No boring ideas allowed.

OUTPUT SCHEMA (STRICT):
{
  "id": string,                    // unique id
  "title": string,                 // refined, punchy title
  "one_liner_pitch": string,       // hook that makes you say "I want to build that"
  "problem": string,               // pain point in founder-speak
  "solution": string,              // what you build
  "ideal_customer": string,        // specific buyer persona
  "business_model": string,        // how money flows
  "pricing_anchor": string,        // specific price point
  "time_to_first_dollar": string,  // path to revenue in 7 days
  "distribution_wedge": string,    // how it spreads/compounds
  "why_now": string,               // market timing
  "execution_difficulty": "Low" | "Medium" | "High",
  "risk_notes": string,            // honest risks
  "delight_factor": string,        // what makes this novel/fun
  "first_dollar_path": string,     // concrete 7-day revenue steps
  "idea_mode": "Standard" | "Persona" | "Chaos" | "Memetic" | "Fusion" | "Wildcard",
  "is_wildcard": boolean,          // OPTIONAL: true ONLY for the wildcard idea
  
  // v6 compatibility scores (0-100)
  "shock_factor": number,
  "virality_potential": number,
  "leverage_score": number,
  "automation_density": number,
  "autonomy_level": number,
  "culture_tailwind": number,
  "chaos_factor": number
}

TONE CONTROL:
When tone = "exciting" (DEFAULT):
- Short, punchy sentences
- No corporate jargon
- No MBA-speak
- Write like a sharp founder friend
- Make readers say "holy sh*t, I want to build that"
`;

  const wildcardInstructions = wildcardMode ? `

WILDCARD MODE ACTIVE:
=====================
You MUST include EXACTLY ONE wildcard idea that:
- IGNORES all founder constraints (hoursPerWeek, capital, hellNoFilters, lifestyleNonNegotiables, energy drainers, risk tolerance)
- IS the LAST item in the refined_ideas array
- HAS "is_wildcard": true set on the idea object
- HAS "idea_mode": "Wildcard"
- STILL must be venture-sized, AI-native, monetizable, and executable
- CAN be ambitious, capital-intensive, or require full-time commitment
- REPRESENTS a "what if you had no limits?" opportunity

The wildcard is meant to inspire and show what's possible if constraints were removed.
All other 8-11 ideas should still respect founder constraints normally.
` : '';

  return basePrompt + wildcardInstructions + `

RESPONSE FORMAT:
- Return ONLY valid JSON: { "refined_ideas": [...] }
- 9-12 ideas exactly
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

// Helper to parse refined ideas from AI response
function parseRefinedIdeas(content: string): any[] {
  try {
    const parsed = JSON.parse(content);
    return parsed.refined_ideas;
  } catch {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON found in response");
    }
    const sliced = content.slice(firstBrace, lastBrace + 1);
    const parsed = JSON.parse(sliced);
    return parsed.refined_ideas;
  }
}

// Helper to call Pass B
async function callPassB(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<{ ok: boolean; status?: number; content?: string; error?: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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
      const parsed = JSON.parse(passAContent);
      rawIdeas = parsed.raw_ideas;
    } catch {
      // Try extraction
      const firstBrace = passAContent.indexOf("{");
      const lastBrace = passAContent.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        console.error("generate-founder-ideas: Pass A no JSON found");
        return new Response(
          JSON.stringify({ error: "Failed to parse Pass A response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const sliced = passAContent.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(sliced);
      rawIdeas = parsed.raw_ideas;
    }

    if (!Array.isArray(rawIdeas) || rawIdeas.length === 0) {
      console.error("generate-founder-ideas: Pass A returned no ideas");
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

    const buildPassBMessage = (retryWithStricterInstruction = false) => {
      let message = `FOUNDER CONTEXT:
${JSON.stringify(founderPayload, null, 2)}

RAW IDEAS FROM PASS A (${rawIdeas.length} ideas):
${JSON.stringify(rawIdeas, null, 2)}

TONE: ${tone}
WILDCARD_MODE: ${wildcardMode}

Select the TOP 9-12 ideas based on founder fit + first-dollar potential + excitement.
Refine them with commercial viability while keeping the ENERGY.
Apply EXCITEMENT INSURANCE to every idea.
`;

      if (wildcardMode) {
        message += `
If WILDCARD_MODE is true, include exactly one wildcard idea as the LAST item in refined_ideas.
The wildcard must have "is_wildcard": true and "idea_mode": "Wildcard".
The wildcard IGNORES founder constraints and represents a "no limits" opportunity.
`;
      }

      if (retryWithStricterInstruction) {
        message += `
CRITICAL: You forgot the wildcard in your previous response. 
Replace the last item with a wildcard idea. Set is_wildcard=true and idea_mode="Wildcard".
This is MANDATORY when WILDCARD_MODE is true.
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

    let refinedIdeas: any[];
    try {
      refinedIdeas = parseRefinedIdeas(passBResult.content!);
    } catch (e) {
      console.error("generate-founder-ideas: Pass B parse error", e);
      return new Response(
        JSON.stringify({ error: "Failed to parse Pass B response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
