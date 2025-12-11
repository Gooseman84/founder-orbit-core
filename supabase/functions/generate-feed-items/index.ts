import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  recentDocs: any[];
  recentReflections: any[];
}

async function buildUserContext(client: any, userId: string): Promise<UserContext> {
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

  // If we have a chosen idea, also fetch its analysis
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
      const content = (doc.content || '').slice(0, 400).trim();
      const truncated = content.length >= 400 ? '...' : '';
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
      const priority = r.top_priority ? `Priority: "${r.top_priority}"` : '';
      const parts = [theme, energy, stress, priority].filter(Boolean).join(' | ');
      return `- [${date}] ${parts}`;
    })
    .join('\n');
}

// --- V6-AWARE System Prompt ------------------------------------------------

const SYSTEM_PROMPT = `You are TrueBlazer.AI — an expert startup advisor, idea refinement coach, and micro-task creator.

Your job is to produce DAILY FEED ITEMS that are HIGHLY PERSONALIZED and DEEPLY REACTIVE to the founder's v6 idea metrics.

## V6 Metric Triggers (REACT TO THESE):

When analyzing the idea, look at these v6 attributes and react accordingly:

**virality_potential (0-100):**
- ≥70: Generate viral_experiment items. Suggest hook tests, content challenges, shareability hacks.
- ≥50: Include at least one content-focused item.

**leverage_score (0-100):**
- ≥70: Generate money_system_upgrade items. Suggest scaling tactics, delegation, automation leverage.
- ≥50: Include efficiency/delegation suggestions.

**automation_density (0-100):**
- ≥60: Generate money_system_upgrade items. Suggest workflow automation, agent design, systems thinking.
- ≥40: Include one automation or workflow suggestion.

**chaos_factor (0-100):**
- ≥65: Generate chaos_variant items. Push boundaries, suggest bold experiments, unconventional angles.
- ≥50: Include one "wild card" suggestion.

**culture_tailwind (0-100):**
- ≥60: Reference current cultural trends, memes, or zeitgeist in suggestions.
- ≥40: Mention cultural relevance where applicable.

**autonomy_level (0-100):**
- ≥70: Emphasize hands-off, passive income angles in suggestions.
- ≥50: Include one independence-focused suggestion.

**mode (chaos/creator/persona/memetic/automation/money_printer/boundless/locker_room):**
- chaos: Bold, unconventional, boundary-pushing experiments
- creator: Content creation, audience building, platform growth
- persona: Avatar development, character scripts, AI companion angles
- memetic: Meme-able concepts, humor, shareable formats
- automation: Workflow design, agent prompts, system architecture
- money_printer: Revenue systems, passive income, leverage plays
- locker_room: Edgy, culture-first, "shouldn't exist but could" experiments

**platform (tiktok/instagram/youtube/x/linkedin/email):**
- Generate platform-native actions and content formats.

**edgy_mode (safe/bold/unhinged):**
- safe: Conservative, mainstream suggestions
- bold: Moderately provocative, stands out
- unhinged: Maximum creativity, push all boundaries

## Feed Item Types:
- "insight": Strategic truths relevant to their specific idea and stage
- "idea_tweak": Concrete modifications to improve their specific idea
- "competitor_snapshot": Analysis of competitor types in their specific market
- "micro_task": Small tasks (<10 min) that move their specific project forward
- "viral_experiment": Quick tests to validate hooks, content angles, or viral formats
- "money_system_upgrade": Ways to make the system more automated, leveraged, or hands-off
- "memetic_play": Ways to tap into humor, culture, or shareability
- "chaos_variant": Push-the-boundaries tweak of the current idea — novel, unexpected angles

## CRITICAL: strategy_reasoning Field
For EVERY feed item, you MUST include a "strategy_reasoning" field that explains:
- Which v6 metric(s) triggered this suggestion
- Why this item matters for THIS specific idea
- What outcome you expect from this action

Example: "Generated because virality_potential is 82/100 — high shareability potential means hook testing will compound quickly."

## Rules:
- Use simple, direct language
- Every item must be immediately useful and relevant to THEIR situation
- Reference their workspace notes when relevant
- Consider their energy/stress levels when suggesting tasks
- Align with their passions and skills
- Respect their time and capital constraints
- For platform-specific ideas, suggest platform-native actions
- NO generic advice - everything must be specific to their context
- Always include strategy_reasoning for every item
- Always output valid JSON only`;

// Valid feed item types - extended for v6
const FEED_TYPES = ["insight", "idea_tweak", "competitor_snapshot", "micro_task", "viral_experiment", "money_system_upgrade", "memetic_play", "chaos_variant"];

// Format and validate raw feed items from AI
function formatFeedItems(rawItems: any[]): any[] {
  if (!Array.isArray(rawItems)) {
    console.error("formatFeedItems: rawItems is not an array");
    return [];
  }

  return rawItems
    .filter((item) => {
      if (!item.type || !item.title || !item.body) {
        console.warn("formatFeedItems: skipping item missing required fields", item);
        return false;
      }
      if (!FEED_TYPES.includes(item.type)) {
        console.warn("formatFeedItems: skipping item with invalid type", item.type);
        return false;
      }
      return true;
    })
    .map((item) => ({
      type: item.type,
      title: item.title,
      body: item.body,
      cta_label: item.cta_label || null,
      cta_action: item.cta_action || null,
      xp_reward: typeof item.xp_reward === "number" ? item.xp_reward : 2,
      metadata: {
        ...(item.metadata || {}),
        strategy_reasoning: item.strategy_reasoning || null,
        v6_triggers: item.v6_triggers || null,
      },
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      console.error("generate-feed-items: userId is required");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-feed-items: resolved userId", userId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // --- Fetch full user context ---
    console.log("generate-feed-items: fetching user context...");
    const userContext = await buildUserContext(supabase, userId);
    const docsSnippet = formatDocsForPrompt(userContext.recentDocs);
    const reflectionsSnippet = formatReflectionsForPrompt(userContext.recentReflections);

    console.log("generate-feed-items: context loaded - profile:", !!userContext.profile, 
      "idea:", !!userContext.chosenIdea, "docs:", userContext.recentDocs.length,
      "reflections:", userContext.recentReflections.length);

    // Extract v6 metrics for explicit prompt injection
    const v6Metrics = userContext.chosenIdea ? {
      virality_potential: userContext.chosenIdea.virality_potential ?? 'N/A',
      leverage_score: userContext.chosenIdea.leverage_score ?? 'N/A',
      automation_density: userContext.chosenIdea.automation_density ?? 'N/A',
      autonomy_level: userContext.chosenIdea.autonomy_level ?? 'N/A',
      culture_tailwind: userContext.chosenIdea.culture_tailwind ?? 'N/A',
      chaos_factor: userContext.chosenIdea.chaos_factor ?? 'N/A',
      shock_factor: userContext.chosenIdea.shock_factor ?? 'N/A',
      mode: userContext.chosenIdea.mode ?? 'N/A',
      category: userContext.chosenIdea.category ?? 'N/A',
      platform: userContext.chosenIdea.platform ?? 'N/A',
    } : null;

    // Extract founder preferences
    const founderPrefs = userContext.profile ? {
      edgy_mode: userContext.profile.edgy_mode ?? 'safe',
      wants_money_systems: userContext.profile.wants_money_systems ?? false,
      open_to_memetic_ideas: userContext.profile.open_to_memetic_ideas ?? false,
      open_to_personas: userContext.profile.open_to_personas ?? false,
      creator_platforms: userContext.profile.creator_platforms ?? [],
    } : null;

    // --- Build rich user prompt with full context ---
    const userPrompt = `Generate personalized feed items for this founder based on their complete context.

## Founder Profile
${userContext.profile ? JSON.stringify({
  passions: userContext.profile.passions_text || userContext.profile.passions_tags?.join(', ') || 'Not specified',
  skills: userContext.profile.skills_text || userContext.profile.skills_tags?.join(', ') || 'Not specified',
  time_per_week: userContext.profile.time_per_week,
  capital_available: userContext.profile.capital_available,
  risk_tolerance: userContext.profile.risk_tolerance,
  tech_level: userContext.profile.tech_level,
  success_vision: userContext.profile.success_vision?.slice(0, 300),
}, null, 2) : 'No profile available yet'}

## Founder Preferences (V6)
${founderPrefs ? JSON.stringify(founderPrefs, null, 2) : 'No preferences available'}

## Extended Intake (Deeper Self-Knowledge)
${userContext.extendedIntake ? JSON.stringify({
  deep_desires: userContext.extendedIntake.deep_desires?.slice(0, 200),
  fears: userContext.extendedIntake.fears?.slice(0, 200),
  energy_givers: userContext.extendedIntake.energy_givers?.slice(0, 150),
  energy_drainers: userContext.extendedIntake.energy_drainers?.slice(0, 150),
  personality_flags: userContext.extendedIntake.personality_flags,
}, null, 2) : 'No extended intake available'}

## Current Chosen Idea
${userContext.chosenIdea ? JSON.stringify({
  title: userContext.chosenIdea.title,
  description: userContext.chosenIdea.description?.slice(0, 300),
  business_model_type: userContext.chosenIdea.business_model_type,
  target_customer: userContext.chosenIdea.target_customer,
  complexity: userContext.chosenIdea.complexity,
  time_to_first_dollar: userContext.chosenIdea.time_to_first_dollar,
  overall_fit_score: userContext.chosenIdea.overall_fit_score,
}, null, 2) : 'No chosen idea yet - generate exploratory content'}

## ⚡ V6 METRICS (REACT TO THESE!) ⚡
${v6Metrics ? JSON.stringify(v6Metrics, null, 2) : 'No v6 metrics available'}

## Idea Analysis
${userContext.ideaAnalysis ? JSON.stringify({
  niche_score: userContext.ideaAnalysis.niche_score,
  market_insight: userContext.ideaAnalysis.market_insight?.slice(0, 200),
  problem_intensity: userContext.ideaAnalysis.problem_intensity,
  competition_snapshot: userContext.ideaAnalysis.competition_snapshot?.slice(0, 200),
  elevator_pitch: userContext.ideaAnalysis.elevator_pitch?.slice(0, 200),
  biggest_risks: userContext.ideaAnalysis.biggest_risks,
}, null, 2) : 'No idea analysis available'}

## Recent Workspace Notes (what they're actively working on)
${docsSnippet}

## Recent Reflection Patterns (emotional/energy state)
${reflectionsSnippet}

---

Based on ALL the context above, generate 4-6 feed items that:
1. DIRECTLY REACT to the v6 metrics (virality, leverage, automation, chaos, etc.)
2. Reference their workspace notes when helpful
3. Consider their energy/stress patterns when suggesting tasks
4. Align with their passions, skills, and constraints
5. Address any risks or opportunities from their idea analysis
6. Include strategy_reasoning for EVERY item explaining which metrics triggered it

Return the items as a JSON object with an "items" array.`;

    // Call Lovable AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_feed_items",
              description: "Generate personalized feed items for a founder based on v6 metrics",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: FEED_TYPES },
                        title: { type: "string" },
                        body: { type: "string" },
                        cta_label: { type: "string" },
                        cta_action: { type: "string" },
                        xp_reward: { type: "number" },
                        strategy_reasoning: { type: "string", description: "Explain which v6 metrics triggered this item and why" },
                        v6_triggers: { type: "array", items: { type: "string" }, description: "List of v6 metrics that triggered this item" },
                        metadata: { type: "object" },
                      },
                      required: ["type", "title", "body", "strategy_reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_feed_items" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("generate-feed-items: AI gateway error", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      
      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      console.error("generate-feed-items: No tool call in response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedArgs = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    const rawItems = parsedArgs.items || [];
    console.log("generate-feed-items: received items", rawItems.length);

    // Format and validate items
    const formattedItems = formatFeedItems(rawItems);

    if (formattedItems.length === 0) {
      console.warn("generate-feed-items: No valid items after formatting");
      return new Response(
        JSON.stringify({ error: "No valid feed items generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert feed items into database
    const itemsToInsert = formattedItems.map((item) => ({
      user_id: userId,
      idea_id: userContext.chosenIdea?.id || null,
      type: item.type,
      title: item.title,
      body: item.body,
      cta_label: item.cta_label,
      cta_action: item.cta_action,
      xp_reward: item.xp_reward,
      metadata: item.metadata,
    }));

    const { data: insertedItems, error: insertError } = await supabase
      .from("feed_items")
      .insert(itemsToInsert)
      .select();

    if (insertError) {
      console.error("generate-feed-items: insert error", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert feed items", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-feed-items: inserted", insertedItems?.length, "items");

    return new Response(
      JSON.stringify({ items: insertedItems }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-feed-items: error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
