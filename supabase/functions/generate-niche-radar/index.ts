import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Build radar input (copied from radarEngine.ts)
async function buildRadarInput(supabaseClient: any, userId: string) {
  try {
    const { data: profile, error: profileError } = await supabaseClient
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      console.error("No founder profile found for user:", userId);
      return null;
    }

    const { data: idea, error: ideaError } = await supabaseClient
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) throw ideaError;
    if (!idea) {
      console.error("No chosen idea found for user:", userId);
      return null;
    }

    const { data: analysis, error: analysisError } = await supabaseClient
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) {
      console.error("No analysis found for chosen idea:", idea.id);
      return null;
    }

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

// Helper: Format radar signals (copied from radarEngine.ts)
function formatRadarSignals(rawSignals: any[]) {
  if (!Array.isArray(rawSignals)) {
    console.error("Invalid signals format: expected array");
    return [];
  }

  return rawSignals
    .filter((signal) => {
      if (!signal.signal_type || !signal.title || !signal.description || !signal.recommended_action) {
        console.warn("Skipping invalid signal:", signal);
        return false;
      }

      const validTypes = ["trend", "problem", "market_shift", "consumer_behavior", "tech_tailwind"];
      if (!validTypes.includes(signal.signal_type)) {
        console.warn("Invalid signal_type:", signal.signal_type);
        return false;
      }

      return true;
    })
    .map((signal) => ({
      signal_type: signal.signal_type,
      title: signal.title.trim(),
      description: signal.description.trim(),
      priority_score: Math.round(Number(signal.priority_score ?? 50)), // Convert to integer
      recommended_action: signal.recommended_action.trim(),
      metadata: signal.metadata ?? {},
    }));
}

const SYSTEM_PROMPT = `You are an elite market researcher, category theorist, and opportunity scout.

Your job is to identify EMERGING NICHES and MARKET SIGNALS that match the founder's profile, chosen idea, and business model.

Given:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... }
}

Produce STRICT JSON ONLY:

{
  "signals": [
    {
      "signal_type": "trend" | "problem" | "market_shift" | "consumer_behavior" | "tech_tailwind",
      "title": "string",
      "description": "string",
      "priority_score": number,
      "recommended_action": "string",
      "metadata": { ... }
    }
  ]
}

Rules:
- Use plain English, no jargon.
- Signals should be actionable — not vague.
- Tailor everything to the chosen idea.
- Use real patterns, not random noise.
- No company names required — describe archetypes instead.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    // Resolve userId
    if (!userId) {
      console.error("generate-niche-radar: No userId provided");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("generate-niche-radar: resolved userId:", userId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build LLM input
    const inputData = await buildRadarInput(supabase, userId);
    if (!inputData) {
      return new Response(
        JSON.stringify({ error: "Could not build radar input. Ensure you have a profile, chosen idea, and analysis." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(inputData) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_radar_signals",
              description: "Generate niche radar signals based on market research",
              parameters: {
                type: "object",
                properties: {
                  signals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        signal_type: { type: "string", enum: ["trend", "problem", "market_shift", "consumer_behavior", "tech_tailwind"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        priority_score: { type: "number" },
                        recommended_action: { type: "string" },
                        metadata: { type: "object" }
                      },
                      required: ["signal_type", "title", "description", "recommended_action"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["signals"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_radar_signals" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    
    // Extract signals from tool call
    let rawSignals: any[] = [];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = typeof toolCall.function.arguments === 'string' 
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        rawSignals = parsed.signals || [];
      }
    } catch (parseError) {
      console.error("generate-niche-radar: LLM JSON parse failure:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`generate-niche-radar: # signals generated: ${rawSignals.length}`);

    // Format signals
    const formattedSignals = formatRadarSignals(rawSignals);

    if (formattedSignals.length === 0) {
      console.error("generate-niche-radar: No valid signals after formatting");
      return new Response(
        JSON.stringify({ error: "No valid signals generated" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert signals into database
    const signalsToInsert = formattedSignals.map((signal) => ({
      user_id: userId,
      idea_id: inputData.idea.id,
      signal_type: signal.signal_type,
      title: signal.title,
      description: signal.description,
      priority_score: signal.priority_score,
      recommended_action: signal.recommended_action,
      metadata: signal.metadata,
    }));

    const { data: insertedSignals, error: insertError } = await supabase
      .from("niche_radar")
      .insert(signalsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting radar signals:", insertError);
      throw insertError;
    }

    console.log(`generate-niche-radar: Successfully inserted ${insertedSignals.length} signals`);

    return new Response(
      JSON.stringify({ signals: insertedSignals }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("generate-niche-radar error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
