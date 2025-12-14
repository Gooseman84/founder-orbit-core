// supabase/functions/generate-founder-ideas/index.ts
// EPIC v6 — Unhinged TrueBlazer AI Venture Engine
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// EPIC v6 Generation Modes
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

const V6_SYSTEM_PROMPT = `You are TrueBlazer.AI — v6 UNHINGED.

You think like:
- A YC partner,
- A billionaire dealmaker,
- A Gen Z creator on short-form platforms,
- And an automation-obsessed systems engineer.

Your mission:
Generate AI-powered VENTURES and MONEY SYSTEMS that can be built by a solo founder or tiny team.

You support the following modes:

- "breadth": wide sampling across all sane categories.
- "focus": deep exploration of one niche or theme.
- "creator": content empires, creator tools, monetization systems.
- "automation": workflow, RPA, agents, "do it for me" backends.
- "persona": AI characters, avatars, companions, mentors, mascots.
- "boundless": ignore conventions; maximize creativity and leverage.
- "locker_room": bold, culture-first, viral, "this shouldn't exist but it could" — within ethical bounds.
- "chaos": mash categories together; wild combinations; high shock, high leverage.
- "money_printer": systems, not just businesses — setups that can earn while the founder sleeps.
- "memetic": ideas that spread as jokes, memes, or social artifacts, but also have clear monetization.

Use this Idea schema for output:

{
  "id": string,
  "title": string,
  "oneLiner": string,
  "description": string,
  "category": "saas" | "automation" | "content" | "creator" | "avatar" | "locker_room" | "system" | "memetic",
  "industry": string,
  "model": string,                    // "subscription", "revshare", "affiliate", "info_product", "agency", "productized_service", "marketplace", etc.
  "ai_pattern": string,               // e.g. "AI Agent Swarm", "AI Copilot", "AI Workflow Engine", "AI Insight Engine", "AI Persona Network"
  "platform": string | null,          // "tiktok" | "instagram" | "youtube" | "x" | "linkedin" | "email" | null
  "difficulty": "easy" | "medium" | "hard",
  "solo_fit": boolean,
  "time_to_revenue": "0-30d" | "30-90d" | "90-180d" | "6mo+",
  "why_now": string,
  "why_it_fits_founder": string,
  "problem_statement": string,
  "target_customer": string,
  "mvp_approach": string,
  "go_to_market": string,
  "first_steps": string[],
  "shock_factor": number,             // 0–100
  "virality_potential": number,       // 0–100
  "leverage_score": number,           // 0–100 (automation + margins + scale)
  "automation_density": number,       // 0–100
  "autonomy_level": number,           // 0–100 (how hands-off it can become)
  "culture_tailwind": number,         // 0–100 (aligned with current platforms & behaviors)
  "chaos_factor": number              // 0–100 (how weird/novel this is)
}

Use founder_profile to:
- aim for platforms and business styles they are open to,
- respect ethical boundaries,
- but DO NOT over-filter creativity, especially in "boundless", "locker_room", "chaos" and "money_printer" modes.

In:
- "money_printer": emphasize recurring, automated, or evergreen systems.
- "memetic": emphasize humor, shareability, and cultural hooks.
- "locker_room" and "chaos": push boundaries, but stay legal, ethical, and non-exploitative.

MODE-SPECIFIC BEHAVIOR:
-----------------------
When mode is "breadth": Generate 9-12 diverse ideas across all sane categories.
When mode is "focus": Generate 6-9 ideas deep-diving on the focus_area if provided.
When mode is "creator": Generate 8-10 ideas for content empires, creator tools, monetization.
When mode is "automation": Generate 8-10 ideas for workflow, RPA, agents, backends.
When mode is "persona": Generate 6-8 ideas with AI characters, avatars, companions.
When mode is "boundless": Generate 8-12 ideas ignoring conventions, maximize creativity.
When mode is "locker_room": Generate 6-8 bold, viral, culture-first ideas (founder must have edgy_mode="bold" or "unhinged").
When mode is "chaos": Generate 8-10 wild combinations with high shock and leverage.
When mode is "money_printer": Generate 8-10 systems that earn while founder sleeps.
When mode is "memetic": Generate 6-8 ideas that spread as memes/jokes but monetize.

RESPONSE FORMAT (CRITICAL)
--------------------------
- You MUST return ONLY valid JSON.
- The top-level value MUST be: { "ideas": [...] }
- Do NOT wrap JSON in markdown fences.
- Do NOT include any commentary, prose, or explanation outside JSON.
`;

function buildModeContext(mode: IdeaGenerationMode, focusArea?: string): string {
  const modeDescriptions: Record<IdeaGenerationMode, string> = {
    breadth: "Generate a wide variety of ideas across all sane categories. Mix business types, platforms, and approaches.",
    focus: focusArea 
      ? `Deep-dive on: "${focusArea}". All ideas should explore angles within this specific niche or theme.`
      : "Generate focused ideas in the founder's strongest domain based on their profile.",
    creator: "Focus on content empires, creator economy tools, audience monetization, and personal brand leverage systems.",
    automation: "Focus on workflow automation, RPA, AI agents, background services, and 'do it for me' backends.",
    persona: "Focus on AI characters, avatars, companions, mentors, mascots, and personality-driven products.",
    boundless: "IGNORE all conventional wisdom. Maximum creativity. Maximum leverage. Push the boundaries of what's possible.",
    locker_room: "Bold, culture-first, viral ideas. Things that make people say 'this shouldn't exist but I love it.' Stay ethical but push limits.",
    chaos: "Mash categories together in unexpected ways. High shock value. Wild combinations. The weirder, the better.",
    money_printer: "Systems over businesses. Recurring revenue. Automation-heavy. Things that print money while the founder sleeps.",
    memetic: "Ideas that spread like memes. Humor, cultural hooks, shareability. Must also have clear monetization path.",
  };
  
  return modeDescriptions[mode];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Parse request body for user_id, mode, and focus_area
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;
    const mode: IdeaGenerationMode = body.mode || "breadth";
    const focusArea: string | undefined = body.focus_area;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing user_id in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-founder-ideas v6: mode=${mode}, focus_area=${focusArea || "none"}`);

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

    // Load founder profile (normalized JSON)
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
          JSON.stringify({ error: "Locker Room mode requires edgy_mode to be 'bold' or 'unhinged'. Update your profile preferences." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Load latest completed interview context summary (optional)
    const { data: interviewRows } = await supabase
      .from("founder_interviews")
      .select("context_summary, updated_at, status")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1);

    const contextSummary = interviewRows?.[0]?.context_summary ?? null;

    // Build payload with v6 fields
    const payload = {
      mode,
      focus_area: focusArea || null,
      founderProfile: {
        ...profileRow.profile,
        // Include v6 fields from top-level columns
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

    const userMessage = `MODE: ${mode}
MODE INSTRUCTIONS: ${modeContext}

FOUNDER PROFILE AND CONTEXT:
${JSON.stringify(payload, null, 2)}

Generate ideas now. Return ONLY: { "ideas": [...] }`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: V6_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("generate-founder-ideas: AI gateway error", status, text);

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
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!rawContent) {
      console.error("generate-founder-ideas: missing content in AI response", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { ideas: any[] };

    try {
      // Try direct parse
      parsed = JSON.parse(rawContent);
    } catch {
      console.warn("generate-founder-ideas: direct JSON parse failed, attempting extraction");
      // Try to extract JSON object
      const firstBrace = rawContent.indexOf("{");
      const lastBrace = rawContent.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) {
        console.error("generate-founder-ideas: no JSON found in AI content");
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const sliced = rawContent.slice(firstBrace, lastBrace + 1);
      parsed = JSON.parse(sliced);
    }

    const ideas = parsed.ideas;
    if (!Array.isArray(ideas)) {
      console.error("generate-founder-ideas: parsed ideas is not an array", parsed);
      return new Response(
        JSON.stringify({ error: "AI did not return an array of ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-founder-ideas v6: generated ${ideas.length} ideas in mode=${mode}`);

    // Map v6 ideas to response format
    const v6Ideas = ideas.map((idea: any, index: number) => ({
      id: idea.id || `v6-${mode}-${index}`,
      title: idea.title || "Untitled Idea",
      oneLiner: idea.oneLiner || idea.one_liner || idea.description?.slice(0, 100) || "",
      description: idea.description || "",
      category: idea.category || "saas",
      industry: idea.industry || "",
      model: idea.model || "subscription",
      aiPattern: idea.ai_pattern || idea.aiPattern || "",
      platform: idea.platform || null,
      difficulty: idea.difficulty || "medium",
      soloFit: idea.solo_fit ?? idea.soloFit ?? true,
      timeToRevenue: idea.time_to_revenue || idea.timeToRevenue || "30-90d",
      whyNow: idea.why_now || idea.whyNow || "",
      whyItFitsFounder: idea.why_it_fits_founder || idea.whyItFitsFounder || "",
      problemStatement: idea.problem_statement || idea.problemStatement || "",
      targetCustomer: idea.target_customer || idea.targetCustomer || "",
      mvpApproach: idea.mvp_approach || idea.mvpApproach || "",
      goToMarket: idea.go_to_market || idea.goToMarket || "",
      firstSteps: idea.first_steps || idea.firstSteps || [],
      // v6 numeric scores (0-100)
      shockFactor: idea.shock_factor ?? idea.shockFactor ?? 50,
      viralityPotential: idea.virality_potential ?? idea.viralityPotential ?? 50,
      leverageScore: idea.leverage_score ?? idea.leverageScore ?? 50,
      automationDensity: idea.automation_density ?? idea.automationDensity ?? 50,
      autonomyLevel: idea.autonomy_level ?? idea.autonomyLevel ?? 50,
      cultureTailwind: idea.culture_tailwind ?? idea.cultureTailwind ?? 50,
      chaosFactor: idea.chaos_factor ?? idea.chaosFactor ?? 50,
      // Engine version
      engineVersion: "v6",
      mode,
    }));

    return new Response(
      JSON.stringify({ ideas: v6Ideas, mode, engine_version: "v6" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-founder-ideas: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
