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

function formatRadarSignals(rawSignals: any[]) {
  if (!Array.isArray(rawSignals)) return [];

  return rawSignals
    .filter((signal) => {
      if (!signal.signal_type || !signal.title || !signal.description || !signal.recommended_action) {
        return false;
      }
      const validTypes = ["trend", "problem", "market_shift", "consumer_behavior", "tech_tailwind"];
      return validTypes.includes(signal.signal_type);
    })
    .map((signal) => ({
      signal_type: signal.signal_type,
      title: signal.title.trim(),
      description: signal.description.trim(),
      priority_score: Math.round(Number(signal.priority_score ?? 50)),
      recommended_action: signal.recommended_action.trim(),
      metadata: signal.metadata ?? {},
    }));
}

const SYSTEM_PROMPT = `You are an elite market researcher and opportunity scout. Identify EMERGING NICHES matching the founder's profile and chosen idea. Output STRICT JSON ONLY with signals array.`;

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(inputData) }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_radar_signals",
            parameters: {
              type: "object",
              properties: {
                signals: { type: "array", items: { type: "object" } }
              },
              required: ["signals"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_radar_signals" } }
      }),
    });

    if (!aiResponse.ok) throw new Error("AI generation failed");

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = JSON.parse(toolCall.function.arguments);
    const formattedSignals = formatRadarSignals(parsed.signals || []);

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
    console.error(error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
