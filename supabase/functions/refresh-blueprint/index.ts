import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Robust JSON cleaning for AI responses that may be wrapped in markdown fences
function cleanAIJsonResponse(text: string): string {
  let cleaned = text.trim();
  // Try greedy regex first (handles nested content correctly)
  const jsonFenceRegex = /^```(?:json)?\s*\n?([\s\S]*)\n?\s*```\s*$/;
  const match = cleaned.match(jsonFenceRegex);
  if (match) {
    cleaned = match[1].trim();
  }
  // Fallback: if still starts with ``` or doesn't start with {, extract between first { and last }
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }
  // CRITICAL: Sanitize control characters inside JSON string values
  // These are illegal in JSON and cause "Bad control character in string literal" errors
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (char) => {
    switch (char) {
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\t': return '\\t';
      case '\b': return '\\b';
      case '\f': return '\\f';
      default: return '';
    }
  });
  return cleaned;
}

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

const SYSTEM_PROMPT = `You are TrueBlazer's Blueprint Refresh Engine. Your job is to synthesize ALL available founder context—profile, workspace documents, reflections, tasks, and business context—into an updated AI summary and actionable recommendations.

<internal_chain_of_thought>
Before outputting JSON, work through these steps SILENTLY:

1. FOUNDER EVOLUTION: How has the founder changed since last blueprint?
   - Recent reflections: energy levels, stress patterns, recurring blockers
   - Task completion: what's getting done vs ignored
   - Workspace documents: what are they ACTUALLY working on
   - Streak data: consistency patterns

2. IDEA PROGRESS: What's happened with their chosen idea?
   - Any new analysis or opportunity scores?
   - Which documents relate to the idea?
   - Are tasks aligned with the idea or scattered?

3. CONSTRAINT SHIFTS: Have their real constraints changed?
   - Time availability (reflected in task patterns)
   - Energy patterns (from reflections)
   - New blockers or breakthroughs

4. GAP ANALYSIS: What's the gap between:
   - Stated goals (blueprint) vs actual behavior (tasks/docs)
   - Energy levels (reflections) vs ambition (idea scope)
   - Skills (profile) vs current challenges (blockers)

5. NEXT MOVES: What are the 3-5 highest-leverage actions for THIS WEEK?
</internal_chain_of_thought>

<output_schema>
{
  "ai_summary": "2-4 sentence synthesis of founder's current state. Reference SPECIFIC workspace docs, reflection patterns, and completed tasks. Be concrete about what's changed.",
  "ai_recommendations": [
    {
      "title": "Action-oriented title (verb-first)",
      "description": "1-3 sentences. Why this matters NOW given their actual work and energy.",
      "priority": "high" | "medium" | "low",
      "time_horizon": "today" | "this_week" | "this_month" | "this_quarter",
      "category": "validation" | "audience" | "offer" | "distribution" | "systems" | "mindset",
      "suggested_task_count": 1-10
    }
  ]
}
</output_schema>

<few_shot_examples>
EXAMPLE 1:
INPUT:
- Profile: UX designer, 15hrs/week, low capital, risk-averse
- Blueprint: Building feedback tool for designers, validation stage
- Recent docs: "Landing page copy v3", "Feature list brainstorm", "Competitor analysis"
- Reflections: Avg energy 6/10, stress 7/10, blockers: "can't find users to interview"
- Tasks: 5/8 completed (mostly design tasks), 0 user research tasks done
- Streak: 12 days

OUTPUT:
{
  "ai_summary": "You're in a classic builder's trap: strong execution on product work (landing page, features) but zero movement on validation. Your 12-day streak shows discipline, but you're channeling it into comfortable design tasks while avoiding user research. Your stress (7/10) likely stems from this mismatch—you sense you're building without evidence. The blocker 'can't find users' is a symptom, not the cause.",
  "ai_recommendations": [
    {
      "title": "Post in 3 designer communities asking about feedback pain",
      "description": "You're avoiding research because it feels abstract. Make it concrete: post today in Figma Community, Dribbble, and a Slack group. Ask 'What's hardest about getting design feedback?' Don't pitch, just listen.",
      "priority": "high",
      "time_horizon": "today",
      "category": "validation",
      "suggested_task_count": 1
    },
    {
      "title": "Schedule 3 user interviews before any product work",
      "description": "Your task history shows you default to design work. Set a hard rule: no Figma until you have 3 interviews booked. Use community responses to find willing participants.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "validation",
      "suggested_task_count": 2
    },
    {
      "title": "Pause landing page iteration until after interviews",
      "description": "You have 'Landing page copy v3'—that's 3 versions for an unvalidated product. Archive this for now. It's procrastination disguised as progress.",
      "priority": "medium",
      "time_horizon": "this_week",
      "category": "mindset",
      "suggested_task_count": 1
    }
  ]
}

EXAMPLE 2:
INPUT:
- Profile: Former PM, 25hrs/week, $5k available, moderate risk
- Blueprint: AI writing assistant for sales teams, audience-building stage
- Recent docs: "Sales call script", "Pricing tiers v2", "Customer interview - Acme Corp"
- Reflections: Avg energy 8/10, stress 4/10, priority: "get first paying customer"
- Tasks: 10/12 completed (mix of product and outreach)
- Streak: 28 days
- Opportunity score: 78/100

OUTPUT:
{
  "ai_summary": "Exceptional execution. 28-day streak, 83% task completion, and you're already doing customer interviews (Acme Corp notes). Energy is high (8/10), stress manageable (4/10)—this is the sweet spot for pushing harder. You have sales scripts, pricing ready, and proof from Acme. The gap isn't strategy—it's volume.",
  "ai_recommendations": [
    {
      "title": "Send 20 cold outreach messages to sales leaders",
      "description": "You have the script and pricing. Volume is the constraint now. Use your 25hrs to maximize touchpoints. Track responses to refine messaging.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "distribution",
      "suggested_task_count": 3
    },
    {
      "title": "Offer Acme Corp a pilot at 50% off for a testimonial",
      "description": "You've already interviewed them. Convert that relationship into your first paying customer. The discount is worth it for the case study.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "validation",
      "suggested_task_count": 1
    },
    {
      "title": "Invest $500 in LinkedIn Sales Navigator",
      "description": "Your $5k should go toward acquisition, not product. Sales Navigator lets you find sales leaders at companies like Acme. High-leverage spend.",
      "priority": "medium",
      "time_horizon": "this_week",
      "category": "systems",
      "suggested_task_count": 1
    }
  ]
}

EXAMPLE 3:
INPUT:
- Profile: Teacher transitioning, 10hrs/week, minimal capital, very risk-averse
- Blueprint: Online course for educators, early exploration
- Recent docs: "Course outline draft", "Module 1 script"
- Reflections: Avg energy 4/10, stress 8/10, blockers: "overwhelmed by everything", "imposter syndrome"
- Tasks: 2/7 completed (started many, finished few)
- Streak: 3 days (recently started)

OUTPUT:
{
  "ai_summary": "You're spreading too thin with depleted energy. Only 2 of 7 tasks completed, stress at 8/10, and blockers around overwhelm and imposter syndrome. Your course outline and Module 1 script show real progress, but you're trying to do too much at once. With only 10hrs/week and low energy, you need ruthless focus.",
  "ai_recommendations": [
    {
      "title": "Finish Module 1 script before starting anything else",
      "description": "You have a draft started. Completing ONE thing will break the 'start but don't finish' pattern that's driving your overwhelm. Aim for done, not perfect.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "offer",
      "suggested_task_count": 2
    },
    {
      "title": "Share Module 1 with 3 teacher friends for feedback",
      "description": "Imposter syndrome fades when real people validate your work. Don't wait for the full course—get feedback now. Their reactions will fuel your energy.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "validation",
      "suggested_task_count": 1
    },
    {
      "title": "Take a 2-day break from building to recharge",
      "description": "Energy at 4/10 means you're running on fumes. With only 10hrs/week, quality matters more than quantity. Rest isn't slacking—it's strategic.",
      "priority": "medium",
      "time_horizon": "today",
      "category": "mindset",
      "suggested_task_count": 1
    }
  ]
}
</few_shot_examples>

<rules>
1. BE SPECIFIC: Reference actual workspace doc titles, reflection patterns, completed task names
2. BE HONEST: Call out avoidance patterns, wasted effort, or misaligned priorities
3. BE ACTIONABLE: Every recommendation should be doable within its time_horizon
4. LIMIT RECOMMENDATIONS: 3-5 max, prioritized by impact
5. MATCH CAPACITY: Recommendations must fit their available hours AND current energy
6. BUILD ON MOMENTUM: If they're completing certain types of tasks, give them more of those
7. ADDRESS BLOCKERS: If a blocker appears in reflections, one recommendation should tackle it
8. RESPOND ONLY WITH JSON: No explanations, no markdown, just the JSON object
</rules>`;

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
        response_format: { type: "json_object" },
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
      const cleanContent = cleanAIJsonResponse(content);
      console.log("[refresh-blueprint] First 100 chars after cleaning:", cleanContent.substring(0, 100));
      parsed = JSON.parse(cleanContent);
    } catch (parseError: any) {
      console.error("[refresh-blueprint] Failed to parse AI response. Error:", parseError.message);
      console.error("[refresh-blueprint] First 200 chars:", content.substring(0, 200));
      console.error("[refresh-blueprint] Last 100 chars:", content.substring(content.length - 100));
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
