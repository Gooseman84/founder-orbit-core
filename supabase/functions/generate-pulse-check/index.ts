import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_TEMPLATE = `You are an expert mindset coach, startup psychologist, and execution strategist.

Your job: Based on the founder's emotional state, energy level, stress level, and reflection, produce:
- A grounded emotional insight
- A short validation statement
- A recommended action they can take TODAY
- One micro task aligned with their chosen idea

Input JSON example:
{
  "energy_level": number,
  "stress_level": number,
  "emotional_state": "string",
  "reflection": "string",
  "latest_feed_item": { ...optional },
  "chosen_idea": { ...optional }
}

Respond with STRICT JSON ONLY:

{
  "ai_insight": "string",
  "recommended_action": "string",
  "micro_task": {
    "title": "string",
    "description": "string",
    "xp_reward": number
  }
}

Tone:
- Empathetic
- Clear
- Motivational but grounded
- No clichés`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, energy_level, stress_level, emotional_state, reflection } = await req.json();
    
    // Resolve userId
    const resolvedUserId = userId;
    if (!resolvedUserId) {
      console.error("No userId provided");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing pulse check for user:", resolvedUserId);

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Build pulse input - fetch founder profile, chosen idea, and latest feed item
    const { data: profile } = await supabaseAdmin
      .from("founder_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    const { data: idea } = await supabaseAdmin
      .from("ideas")
      .select("*")
      .eq("user_id", resolvedUserId)
      .eq("status", "chosen")
      .maybeSingle();

    const { data: feedItem } = await supabaseAdmin
      .from("feed_items")
      .select("*")
      .eq("user_id", resolvedUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const pulseInput = {
      energy_level,
      stress_level,
      emotional_state,
      reflection,
      latest_feed_item: feedItem || undefined,
      chosen_idea: idea || undefined,
    };

    console.log("Pulse input prepared:", { energy_level, stress_level, has_idea: !!idea });

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
          { role: "user", content: JSON.stringify(pulseInput) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_pulse_insight",
              description: "Generate pulse check insight with recommended action and micro task",
              parameters: {
                type: "object",
                properties: {
                  ai_insight: { type: "string" },
                  recommended_action: { type: "string" },
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

    // Insert into pulse_checks table
    const { data: pulseCheck, error: pulseError } = await supabaseAdmin
      .from("pulse_checks")
      .insert({
        user_id: resolvedUserId,
        energy_level,
        stress_level,
        emotional_state,
        reflection,
        ai_insight: result.ai_insight,
        recommended_action: result.recommended_action,
        metadata: { micro_task: result.micro_task }
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
        user_id: resolvedUserId,
        idea_id: idea?.id || null,
        type: "micro",
        title: result.micro_task.title,
        description: result.micro_task.description,
        xp_reward: result.micro_task.xp_reward,
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
