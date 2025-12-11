import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function buildRadarInput(supabaseClient: any, userId: string) {
  try {
    const { data: profile, error: profileError } = await supabaseClient
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return null;

    const { data: idea, error: ideaError } = await supabaseClient
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) throw ideaError;
    if (!idea) return null;

    const { data: analysis, error: analysisError } = await supabaseClient
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) return null;

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
    };
  } catch (error) {
    console.error("Error building radar input:", error);
    return null;
  }
}

// Extended signal types for v6
const VALID_SIGNAL_TYPES = [
  "trend", 
  "problem", 
  "market_shift", 
  "consumer_behavior", 
  "tech_tailwind",
  // V6 signal types
  "platform_trend",
  "meme_format",
  "creator_monetization_shift",
  "automation_tailwind"
];

const RISK_LEVELS = ["low", "medium", "high"];

function formatRadarSignals(rawSignals: any[]) {
  if (!Array.isArray(rawSignals)) return [];

  return rawSignals
    .filter((signal) => {
      if (!signal.signal_type || !signal.title || !signal.description || !signal.recommended_action) {
        return false;
      }
      return VALID_SIGNAL_TYPES.includes(signal.signal_type);
    })
    .map((signal) => ({
      signal_type: signal.signal_type,
      title: signal.title.trim(),
      description: signal.description.trim(),
      priority_score: Math.round(Number(signal.priority_score ?? 50)),
      recommended_action: signal.recommended_action.trim(),
      metadata: {
        ...(signal.metadata ?? {}),
        why_now: signal.why_now || null,
        relevance_to_idea: signal.relevance_to_idea || null,
        risk_level: RISK_LEVELS.includes(signal.risk_level) ? signal.risk_level : "medium",
        v6_triggers: signal.v6_triggers || null,
      },
    }));
}

const SYSTEM_PROMPT = `You are TrueBlazer.AI — an elite market researcher, category theorist, and opportunity scout.

Your job is to identify EMERGING NICHES and MARKET SIGNALS that REACT to v6 metrics.

## V6 METRIC TRIGGERS (Generate specific signal types based on these):

**culture_tailwind (0-100):**
- ≥70: Prioritize cultural momentum waves, zeitgeist shifts
- ≥50: Include cultural relevance signals

**virality_potential (0-100):**
- ≥60: Identify trends that reward shareable content
- Include platform-specific viral patterns

**chaos_factor (0-100):**
- ≥50: Show unstable markets ripe for disruption
- Include contrarian opportunities

**leverage_score (0-100):**
- ≥65: Show scalable channels and leverage plays
- Include delegation/multiplication opportunities

**automation_density (0-100):**
- ≥60: Include automation_tailwind signals
- Highlight AI/automation tools enabling new plays

**platform (when specified):**
- Prioritize platform_trend signals for that specific platform
- Include platform algorithm changes, feature updates

**mode triggers:**
- memetic: Include meme_format signals
- creator/content: Include creator_monetization_shift signals
- automation/system: Include automation_tailwind signals
- chaos/locker_room: Include edgy but ethical cultural signals

## Signal Types:
- "trend": Macro trends in the industry or market
- "problem": Emerging pain points or unmet needs
- "market_shift": Changes in market dynamics or buyer behavior
- "consumer_behavior": Shifts in how people buy, consume, or interact
- "tech_tailwind": New technologies enabling new opportunities
- "platform_trend": Platform-specific changes (TikTok algorithm, IG features, YouTube shorts, etc.)
- "meme_format": Emerging meme formats, viral templates, cultural moments to ride
- "creator_monetization_shift": New ways creators are making money
- "automation_tailwind": AI/automation tools making previously hard things easy

## CRITICAL: Additional Fields for Each Signal
For EVERY signal, include:
- "why_now": Why is this opportunity emerging RIGHT NOW?
- "relevance_to_idea": How does this SPECIFICALLY connect to THIS founder's idea?
- "risk_level": "low" | "medium" | "high" — risk of pursuing this opportunity

## Rules:
- Use plain English, no jargon
- Signals should be actionable — not vague
- Tailor everything to the chosen idea
- Use real patterns, not random noise
- For platform signals, be specific about what's changing and why it matters
- Always include why_now, relevance_to_idea, and risk_level

Output STRICT JSON ONLY with signals array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Server-side subscription validation
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'upgrade_required', message: 'Pro subscription required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPro = subscription.plan === 'pro' || subscription.plan === 'founder';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    if (!isPro || !isActive) {
      return new Response(
        JSON.stringify({ error: 'upgrade_required', message: 'Active Pro subscription required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inputData = await buildRadarInput(supabase, userId);
    if (!inputData) {
      return new Response(
        JSON.stringify({ error: "Could not build input" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract v6 metrics for explicit prompt injection
    const v6Metrics = {
      virality_potential: inputData.idea.virality_potential ?? 'N/A',
      leverage_score: inputData.idea.leverage_score ?? 'N/A',
      automation_density: inputData.idea.automation_density ?? 'N/A',
      autonomy_level: inputData.idea.autonomy_level ?? 'N/A',
      culture_tailwind: inputData.idea.culture_tailwind ?? 'N/A',
      chaos_factor: inputData.idea.chaos_factor ?? 'N/A',
      shock_factor: inputData.idea.shock_factor ?? 'N/A',
      mode: inputData.idea.mode ?? 'N/A',
      category: inputData.idea.category ?? 'N/A',
      platform: inputData.idea.platform ?? 'N/A',
    };

    // Build enriched input with v6 fields explicitly highlighted
    const userPrompt = `Analyze this founder's context and generate market signals.

## Founder Profile
${JSON.stringify({
  passions: inputData.founder_profile.passions_text || inputData.founder_profile.passions_tags?.join(', '),
  skills: inputData.founder_profile.skills_text || inputData.founder_profile.skills_tags?.join(', '),
  risk_tolerance: inputData.founder_profile.risk_tolerance,
  edgy_mode: inputData.founder_profile.edgy_mode ?? 'safe',
}, null, 2)}

## Current Idea
${JSON.stringify({
  title: inputData.idea.title,
  description: inputData.idea.description?.slice(0, 400),
  business_model_type: inputData.idea.business_model_type,
  target_customer: inputData.idea.target_customer,
}, null, 2)}

## ⚡ V6 METRICS (REACT TO THESE!) ⚡
${JSON.stringify(v6Metrics, null, 2)}

## Idea Analysis
${JSON.stringify({
  niche_score: inputData.analysis.niche_score,
  market_insight: inputData.analysis.market_insight?.slice(0, 300),
  competition_snapshot: inputData.analysis.competition_snapshot?.slice(0, 200),
  biggest_risks: inputData.analysis.biggest_risks,
}, null, 2)}

---

Generate 5-8 market signals that:
1. REACT to v6 metrics (platform trends if platform specified, meme formats if memetic mode, etc.)
2. Include why_now, relevance_to_idea, and risk_level for EVERY signal
3. Are specific and actionable
4. Connect directly to this founder's idea`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_radar_signals",
            description: "Generate market signals based on v6 metrics",
            parameters: {
              type: "object",
              properties: {
                signals: { 
                  type: "array", 
                  items: { 
                    type: "object",
                    properties: {
                      signal_type: { type: "string", enum: VALID_SIGNAL_TYPES },
                      title: { type: "string" },
                      description: { type: "string" },
                      priority_score: { type: "number" },
                      recommended_action: { type: "string" },
                      why_now: { type: "string", description: "Why is this opportunity emerging right now?" },
                      relevance_to_idea: { type: "string", description: "How does this connect to this founder's idea?" },
                      risk_level: { type: "string", enum: RISK_LEVELS },
                      v6_triggers: { type: "array", items: { type: "string" }, description: "Which v6 metrics triggered this signal" },
                      metadata: { type: "object" }
                    },
                    required: ["signal_type", "title", "description", "recommended_action", "why_now", "relevance_to_idea", "risk_level"]
                  } 
                }
              },
              required: ["signals"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_radar_signals" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("generate-niche-radar: AI error", aiResponse.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }
    
    const parsed = JSON.parse(toolCall.function.arguments);
    const formattedSignals = formatRadarSignals(parsed.signals || []);

    console.log("generate-niche-radar: formatted", formattedSignals.length, "signals");

    // Delete old signals and insert new ones
    await supabase.from("niche_radar").delete().eq("user_id", userId);
    
    const signalsToInsert = formattedSignals.map(s => ({
      user_id: userId,
      idea_id: inputData.idea.id,
      ...s,
    }));

    const { data, error } = await supabase.from("niche_radar").insert(signalsToInsert).select();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("generate-niche-radar: error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
