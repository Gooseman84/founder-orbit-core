import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Context Builder (embedded for edge function) ----------------

interface UserContext {
  profile: any | null;
  extendedIntake: any | null;
  chosenIdea: any | null;
  ideaAnalysis: any | null;
  opportunityScore: any | null;
  blueprint: any | null;
  recentDocs: any[];
  recentReflections: any[];
  recentTasks: any[];
  streakData: any | null;
  xpTotal: number;
}

async function buildUserContext(client: any, userId: string): Promise<UserContext> {
  const [
    profileRes,
    extendedIntakeRes,
    blueprintRes,
    chosenIdeaRes,
    recentDocsRes,
    recentReflectionsRes,
    recentTasksRes,
    streakRes,
  ] = await Promise.all([
    client.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    client.from('user_intake_extended').select('*').eq('user_id', userId).maybeSingle(),
    client.from('founder_blueprints').select('*').eq('user_id', userId).maybeSingle(),
    client.from('ideas').select('*').eq('user_id', userId).eq('status', 'chosen').maybeSingle(),
    client.from('workspace_documents')
      .select('id, title, content, doc_type, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    client.from('daily_reflections')
      .select('reflection_date, ai_summary, ai_theme, energy_level, stress_level, mood_tags, what_did, top_priority, blockers')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(7),
    client.from('tasks')
      .select('title, status, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10),
    client.from('daily_streaks')
      .select('current_streak, longest_streak')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  // Fetch idea analysis and opportunity score if we have a chosen idea
  let ideaAnalysis = null;
  let opportunityScore = null;
  if (chosenIdeaRes.data?.id) {
    const [analysisRes, scoreRes] = await Promise.all([
      client.from('idea_analysis')
        .select('*')
        .eq('user_id', userId)
        .eq('idea_id', chosenIdeaRes.data.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client.from('opportunity_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('idea_id', chosenIdeaRes.data.id)
        .maybeSingle(),
    ]);
    ideaAnalysis = analysisRes.data;
    opportunityScore = scoreRes.data;
  }

  // Fetch XP total
  const { data: xpTotal } = await client.rpc("get_user_total_xp", { p_user_id: userId });

  return {
    profile: profileRes.data ?? null,
    extendedIntake: extendedIntakeRes.data ?? null,
    blueprint: blueprintRes.data ?? null,
    chosenIdea: chosenIdeaRes.data ?? null,
    ideaAnalysis,
    opportunityScore,
    recentDocs: recentDocsRes.data ?? [],
    recentReflections: recentReflectionsRes.data ?? [],
    recentTasks: recentTasksRes.data ?? [],
    streakData: streakRes.data ?? null,
    xpTotal: xpTotal || 0,
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
  
  // Aggregate patterns
  const energyLevels = reflections.map(r => r.energy_level).filter(Boolean);
  const stressLevels = reflections.map(r => r.stress_level).filter(Boolean);
  const avgEnergy = energyLevels.length ? (energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length).toFixed(1) : 'N/A';
  const avgStress = stressLevels.length ? (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1) : 'N/A';
  
  const themes = reflections.map(r => r.ai_theme).filter(Boolean);
  const blockers = reflections.map(r => r.blockers).filter(Boolean);
  const priorities = reflections.map(r => r.top_priority).filter(Boolean);
  
  let summary = `Average energy: ${avgEnergy}/5 | Average stress: ${avgStress}/5\n`;
  
  if (themes.length) {
    summary += `Recent themes: ${themes.slice(0, 3).join(', ')}\n`;
  }
  
  if (blockers.length) {
    summary += `Recurring blockers: ${blockers.slice(0, 2).join('; ')}\n`;
  }
  
  if (priorities.length) {
    summary += `Recent priorities: ${priorities.slice(0, 3).join('; ')}\n`;
  }
  
  summary += '\nDaily entries:\n';
  summary += reflections
    .slice(0, 5)
    .map((r) => {
      const date = r.reflection_date;
      const theme = r.ai_theme ? `"${r.ai_theme}"` : '';
      const energy = r.energy_level ? `E:${r.energy_level}` : '';
      const stress = r.stress_level ? `S:${r.stress_level}` : '';
      const parts = [theme, energy, stress].filter(Boolean).join(' | ');
      return `- [${date}] ${parts}`;
    })
    .join('\n');
  
  return summary;
}

// --- System Prompt ------------------------------------------------

const SYSTEM_PROMPT = `You are TrueBlazer's Founder Blueprint Synthesizer.

Your job is to take EVERYTHING we know about a founder - their profile, their actual work (workspace documents), their emotional patterns (daily reflections), and their business context - then generate:

1) A clear, motivational summary of where they are NOW (based on actual evidence, not assumptions)
2) A short, prioritized list of next moves that align with their life, strengths, and what they've actually been working on

You are NOT a generic startup coach.
You are a focused, honest, supportive co-founder who:
- READS what they've actually written in their workspace documents
- NOTICES patterns in their energy, stress, and blockers
- ADJUSTS recommendations based on their real behavior, not just their stated goals

---

OUTPUT FORMAT (STRICT JSON)
---

You MUST respond with **ONLY** this JSON structure:

{
  "ai_summary": string,
  "ai_recommendations": [
    {
      "title": string,
      "description": string,
      "priority": "high" | "medium" | "low",
      "time_horizon": "today" | "this_week" | "this_month" | "this_quarter",
      "category": "validation" | "audience" | "offer" | "distribution" | "systems" | "mindset",
      "suggested_task_count": number
    }
  ]
}

Rules:

ai_summary:
- 2–4 sentences
- Reference SPECIFIC things from their workspace docs when relevant
- Acknowledge their recent energy/stress patterns
- Capture: Who they are, What they're building, Where they actually are (based on evidence), What matters most next

Each recommendation:
- title: Short, action-oriented
- description: 1–3 sentences. Reference their constraints AND their recent work/patterns when relevant
- priority: "high" if it builds on momentum they already have or addresses a recurring blocker
- time_horizon: Match to their available time and current energy levels
- category: validation/audience/offer/distribution/systems/mindset
- suggested_task_count: 1–10

Return 3–7 recommendations.

---

COACHING LOGIC
---

1) Reference their actual work. If they've been writing an "Offer Design Doc", suggest they continue it. If they have a "Landing Page Plan", reference it.

2) Notice energy patterns. If recent reflections show low energy or high stress, suggest lighter tasks or mindset work. If they're on a streak and energized, push them further.

3) Address recurring blockers. If the same blocker appears in multiple reflections, make one recommendation specifically about it.

4) Respect constraints. Time, capital, risk tolerance - but also notice if their actions don't match their stated constraints.

5) Be specific and grounded. "Continue your Offer Design Doc by adding pricing tiers" is better than "Work on your offer".

---

NEVER include explanation outside the JSON. Return ONLY valid JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
      console.error("[refresh-blueprint] auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("[refresh-blueprint] authenticated user", userId);

    // 3. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // --- Fetch full user context ---
    console.log("[refresh-blueprint] Fetching user context...");
    const userContext = await buildUserContext(supabaseAdmin, userId);
    const docsSnippet = formatDocsForPrompt(userContext.recentDocs);
    const reflectionsSnippet = formatReflectionsForPrompt(userContext.recentReflections);

    console.log("[refresh-blueprint] Context loaded - profile:", !!userContext.profile,
      "idea:", !!userContext.chosenIdea, "analysis:", !!userContext.ideaAnalysis,
      "docs:", userContext.recentDocs.length, "reflections:", userContext.recentReflections.length);

    // --- Build rich user prompt ---
    const userPrompt = `Refresh this founder's blueprint based on their complete context - especially their recent work and reflection patterns.

## Founder Profile
${userContext.profile ? JSON.stringify({
  passions: userContext.profile.passions_text || userContext.profile.passions_tags?.join(', ') || 'Not specified',
  skills: userContext.profile.skills_text || userContext.profile.skills_tags?.join(', ') || 'Not specified',
  time_per_week: userContext.profile.time_per_week,
  capital_available: userContext.profile.capital_available,
  risk_tolerance: userContext.profile.risk_tolerance,
  tech_level: userContext.profile.tech_level,
  lifestyle_goals: userContext.profile.lifestyle_goals,
  success_vision: userContext.profile.success_vision?.slice(0, 400),
}, null, 2) : 'No profile available'}

## Extended Intake (Deeper Self-Knowledge)
${userContext.extendedIntake ? JSON.stringify({
  deep_desires: userContext.extendedIntake.deep_desires?.slice(0, 200),
  fears: userContext.extendedIntake.fears?.slice(0, 200),
  energy_givers: userContext.extendedIntake.energy_givers?.slice(0, 150),
  energy_drainers: userContext.extendedIntake.energy_drainers?.slice(0, 150),
  personality_flags: userContext.extendedIntake.personality_flags,
  work_preferences: userContext.extendedIntake.work_preferences,
}, null, 2) : 'No extended intake available'}

## Current Blueprint State
${userContext.blueprint ? JSON.stringify({
  life_vision: userContext.blueprint.life_vision?.slice(0, 200),
  life_time_horizon: userContext.blueprint.life_time_horizon,
  income_target: userContext.blueprint.income_target,
  validation_stage: userContext.blueprint.validation_stage,
  north_star_one_liner: userContext.blueprint.north_star_one_liner,
  target_audience: userContext.blueprint.target_audience,
  problem_statement: userContext.blueprint.problem_statement?.slice(0, 200),
  offer_model: userContext.blueprint.offer_model,
  distribution_channels: userContext.blueprint.distribution_channels,
  unfair_advantage: userContext.blueprint.unfair_advantage,
}, null, 2) : 'No existing blueprint'}

## Chosen Idea
${userContext.chosenIdea ? JSON.stringify({
  title: userContext.chosenIdea.title,
  description: userContext.chosenIdea.description?.slice(0, 300),
  business_model_type: userContext.chosenIdea.business_model_type,
  target_customer: userContext.chosenIdea.target_customer,
  complexity: userContext.chosenIdea.complexity,
  overall_fit_score: userContext.chosenIdea.overall_fit_score,
}, null, 2) : 'No chosen idea yet'}

## Idea Analysis (Market Intelligence)
${userContext.ideaAnalysis ? JSON.stringify({
  niche_score: userContext.ideaAnalysis.niche_score,
  market_insight: userContext.ideaAnalysis.market_insight?.slice(0, 200),
  problem_intensity: userContext.ideaAnalysis.problem_intensity,
  competition_snapshot: userContext.ideaAnalysis.competition_snapshot?.slice(0, 200),
  biggest_risks: userContext.ideaAnalysis.biggest_risks,
  recommendations: userContext.ideaAnalysis.recommendations,
}, null, 2) : 'No idea analysis available'}

## Opportunity Score
${userContext.opportunityScore ? JSON.stringify({
  total_score: userContext.opportunityScore.total_score,
  sub_scores: userContext.opportunityScore.sub_scores,
  explanation: userContext.opportunityScore.explanation?.slice(0, 200),
}, null, 2) : 'No opportunity score available'}

## RECENT WORKSPACE DOCUMENTS (What they've actually been working on)
${docsSnippet}

## RECENT REFLECTION PATTERNS (Their emotional/energy state)
${reflectionsSnippet}

## Recent Activity
- Completed tasks: ${userContext.recentTasks?.map((t: any) => t.title).slice(0, 5).join(', ') || 'None recently'}
- Current streak: ${userContext.streakData?.current_streak || 0} days
- XP level: ${Math.floor(userContext.xpTotal / 100)}

---

Based on ALL this context, generate an updated blueprint that:
1. References their actual workspace documents when making recommendations
2. Adjusts for their recent energy/stress patterns
3. Addresses any recurring blockers from their reflections
4. Builds on momentum they already have (continue what's working)
5. Is specific to THEIR situation, not generic advice

Return ONLY the JSON with ai_summary and ai_recommendations.`;

    console.log("[refresh-blueprint] Calling AI with enriched context");

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[refresh-blueprint] AI error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("[refresh-blueprint] AI response received");

    // Parse AI response
    let parsed;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsed = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("[refresh-blueprint] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    const { ai_summary, ai_recommendations } = parsed;

    // Update blueprint
    const updatePayload = {
      user_id: userId,
      ai_summary,
      ai_recommendations,
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("founder_blueprints")
      .upsert(updatePayload, { onConflict: "user_id" });

    if (updateError) {
      console.error("[refresh-blueprint] Error updating blueprint:", updateError);
      throw updateError;
    }

    console.log("[refresh-blueprint] Blueprint updated successfully with enriched context");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[refresh-blueprint] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
