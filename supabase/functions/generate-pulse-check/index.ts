import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_TEMPLATE = `You are a deeply personalized mindset coach and execution strategist for entrepreneurs.

Your job: Analyze the founder's recent reflection patterns, current emotional state, venture progress, and momentum to generate a HIGHLY PERSONALIZED insight.

You have access to:
1. Current pulse data (energy, stress, emotional state, today's reflection)
2. Recent reflections from the past 7 days (what they did, learned, felt, priorities, blockers)
3. Current venture context (what they're building, success metrics)
4. Recent task completions (momentum signals)
5. Current streak data (consistency patterns)

Generate an insight that:
- References SPECIFIC patterns from their reflections (e.g., "You mentioned feeling drained by technical decisions 3 times this week...")
- Connects their energy patterns to actionable advice
- Acknowledges their streak/momentum
- Provides ONE concrete recommended action for TODAY
- Creates ONE micro task that aligns with their current energy and venture focus

Keep the insight to 2-3 sentences MAX but make it DEEPLY personalized - they should feel like you truly understand their journey.

Respond with STRICT JSON via tool call:
{
  "ai_insight": "2-3 sentence personalized insight referencing their patterns",
  "recommended_action": "One specific action for today",
  "micro_task": {
    "title": "Short task title",
    "description": "Brief description",
    "xp_reward": 10
  }
}

Tone:
- Empathetic and warm
- Specific and pattern-aware
- Motivational but grounded in THEIR reality
- Never generic - always reference their actual data`;

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
      console.error("generate-pulse-check: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("generate-pulse-check: authenticated user", userId);

    // 3. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Parse request body
    const { energy_level, stress_level, emotional_state, reflection } = await req.json();

    console.log("Processing pulse check for user:", userId);

    // Fetch all context data in parallel for efficiency
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [
      profileRes,
      ideaRes,
      ventureRes,
      reflectionsRes,
      completedTasksRes,
      streakRes,
    ] = await Promise.all([
      // Founder profile
      supabaseAdmin
        .from("founder_profiles")
        .select("passions_text, skills_text, success_vision, energy_source, work_personality")
        .eq("user_id", userId)
        .maybeSingle(),

      // Chosen idea (North Star)
      supabaseAdmin
        .from("ideas")
        .select("id, title, description, target_customer, business_model_type")
        .eq("user_id", userId)
        .eq("status", "chosen")
        .maybeSingle(),

      // Active venture context
      supabaseAdmin
        .from("ventures")
        .select("id, name, success_metric, venture_state, commitment_window_days")
        .eq("user_id", userId)
        .eq("venture_state", "executing")
        .maybeSingle(),

      // Recent reflections (last 7 days)
      supabaseAdmin
        .from("daily_reflections")
        .select("reflection_date, energy_level, stress_level, mood_tags, what_did, what_learned, what_felt, top_priority, blockers, ai_theme")
        .eq("user_id", userId)
        .gte("reflection_date", sevenDaysAgoStr)
        .order("reflection_date", { ascending: false })
        .limit(7),

      // Recent completed tasks (last 7 days for momentum)
      supabaseAdmin
        .from("tasks")
        .select("title, category, completed_at, xp_reward")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", sevenDaysAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(10),

      // Current streak data
      supabaseAdmin
        .from("daily_streaks")
        .select("current_streak, longest_streak, last_completed_date")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const profile = profileRes.data;
    const idea = ideaRes.data;
    const venture = ventureRes.data;
    const reflections = reflectionsRes.data || [];
    const completedTasks = completedTasksRes.data || [];
    const streak = streakRes.data;

    console.log("Context fetched:", {
      has_profile: !!profile,
      has_idea: !!idea,
      has_venture: !!venture,
      reflection_count: reflections.length,
      completed_task_count: completedTasks.length,
      current_streak: streak?.current_streak || 0,
    });

    // Analyze reflection patterns for the AI
    const reflectionPatterns = analyzeReflectionPatterns(reflections);

    // Build enriched pulse input
    const pulseInput = {
      current_state: {
        energy_level,
        stress_level,
        emotional_state,
        reflection,
      },
      founder_context: profile ? {
        passions: profile.passions_text,
        skills: profile.skills_text,
        vision: profile.success_vision,
        energy_source: profile.energy_source,
        work_personality: profile.work_personality,
      } : null,
      venture_context: venture ? {
        name: venture.name,
        success_metric: venture.success_metric,
        state: venture.venture_state,
        commitment_days: venture.commitment_window_days,
      } : null,
      north_star_idea: idea ? {
        title: idea.title,
        description: idea.description?.slice(0, 200),
        target_customer: idea.target_customer,
        business_model: idea.business_model_type,
      } : null,
      recent_reflections: reflections.map(r => ({
        date: r.reflection_date,
        energy: r.energy_level,
        stress: r.stress_level,
        moods: r.mood_tags,
        what_did: r.what_did,
        what_learned: r.what_learned,
        what_felt: r.what_felt,
        priority: r.top_priority,
        blockers: r.blockers,
        theme: r.ai_theme,
      })),
      reflection_patterns: reflectionPatterns,
      momentum: {
        current_streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        tasks_completed_this_week: completedTasks.length,
        recent_task_categories: [...new Set(completedTasks.map(t => t.category).filter(Boolean))],
        total_xp_earned_this_week: completedTasks.reduce((sum, t) => sum + (t.xp_reward || 0), 0),
      },
    };

    console.log("Enriched pulse input prepared with patterns:", reflectionPatterns);

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: PROMPT_TEMPLATE },
          { role: "user", content: JSON.stringify(pulseInput, null, 2) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pulse_insight",
              description: "Generate deeply personalized pulse insight based on reflection patterns",
              parameters: {
                type: "object",
                properties: {
                  ai_insight: { 
                    type: "string",
                    description: "2-3 sentence personalized insight that references specific patterns from their reflections"
                  },
                  recommended_action: { 
                    type: "string",
                    description: "One specific action for today aligned with their energy and venture"
                  },
                  micro_task: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      xp_reward: { type: "number" }
                    },
                    required: ["title", "description", "xp_reward"],
                    additionalProperties: false
                  }
                },
                required: ["ai_insight", "recommended_action", "micro_task"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_pulse_insight" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log("Parsed AI result:", { has_insight: !!result.ai_insight, has_task: !!result.micro_task });

    // Insert into pulse_checks table with enriched metadata
    const { data: pulseCheck, error: pulseError } = await supabaseAdmin
      .from("pulse_checks")
      .insert({
        user_id: userId,
        energy_level,
        stress_level,
        emotional_state,
        reflection,
        ai_insight: result.ai_insight,
        recommended_action: result.recommended_action,
        metadata: { 
          micro_task: result.micro_task,
          reflection_count_used: reflections.length,
          patterns_detected: reflectionPatterns,
          momentum_snapshot: {
            streak: streak?.current_streak || 0,
            tasks_completed: completedTasks.length,
          }
        }
      })
      .select()
      .single();

    if (pulseError) {
      console.error("Error inserting pulse check:", pulseError);
      throw pulseError;
    }

    console.log("Pulse check inserted:", pulseCheck.id);

    // Insert micro_task into tasks table
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        user_id: userId,
        idea_id: idea?.id || null,
        venture_id: venture?.id || null,
        type: "micro",
        title: result.micro_task.title,
        description: result.micro_task.description,
        xp_reward: result.micro_task.xp_reward || 10,
        status: "pending",
        metadata: { pulse_origin: true, pulse_check_id: pulseCheck.id }
      })
      .select()
      .single();

    if (taskError) {
      console.error("Error inserting task:", taskError);
      throw taskError;
    }

    console.log("Task created from pulse check:", task.id);

    return new Response(
      JSON.stringify({ pulseCheck, task }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-pulse-check:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Analyze reflection patterns to provide rich context to the AI
 */
function analyzeReflectionPatterns(reflections: any[]): Record<string, any> {
  if (!reflections.length) {
    return { has_data: false };
  }

  // Calculate average energy and stress
  const energyLevels = reflections.map(r => r.energy_level).filter(Boolean);
  const stressLevels = reflections.map(r => r.stress_level).filter(Boolean);
  
  const avgEnergy = energyLevels.length 
    ? Math.round((energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length) * 10) / 10
    : null;
  const avgStress = stressLevels.length
    ? Math.round((stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length) * 10) / 10
    : null;

  // Find energy trends
  const energyTrend = energyLevels.length >= 2
    ? energyLevels[0] > energyLevels[energyLevels.length - 1] ? "improving" : 
      energyLevels[0] < energyLevels[energyLevels.length - 1] ? "declining" : "stable"
    : "unknown";

  // Collect all mood tags
  const allMoods = reflections.flatMap(r => r.mood_tags || []);
  const moodFrequency: Record<string, number> = {};
  allMoods.forEach(mood => {
    moodFrequency[mood] = (moodFrequency[mood] || 0) + 1;
  });
  const topMoods = Object.entries(moodFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([mood]) => mood);

  // Collect themes
  const themes = reflections.map(r => r.ai_theme).filter(Boolean);

  // Find recurring blockers (simple keyword extraction)
  const blockerTexts = reflections.map(r => r.blockers).filter(Boolean).join(" ").toLowerCase();
  const commonBlockerKeywords = ["time", "focus", "energy", "technical", "decision", "clarity", "motivation"];
  const blockerPatterns = commonBlockerKeywords.filter(keyword => blockerTexts.includes(keyword));

  // What activities energize them (from what_did on high energy days)
  const highEnergyActivities = reflections
    .filter(r => r.energy_level >= 4 && r.what_did)
    .map(r => r.what_did);

  // What drains them (from what_felt on low energy days)
  const lowEnergyFeelings = reflections
    .filter(r => r.energy_level <= 2 && r.what_felt)
    .map(r => r.what_felt);

  return {
    has_data: true,
    reflection_count: reflections.length,
    avg_energy: avgEnergy,
    avg_stress: avgStress,
    energy_trend: energyTrend,
    top_moods: topMoods,
    recurring_themes: themes.slice(0, 3),
    blocker_patterns: blockerPatterns,
    energizing_activities: highEnergyActivities.slice(0, 2),
    draining_patterns: lowEnergyFeelings.slice(0, 2),
  };
}
