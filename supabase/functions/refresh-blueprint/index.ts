import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert startup advisor and founder coach. Given a founder's profile, their business ideas, and their current blueprint, generate:

1. A concise ai_summary (2-3 sentences) that captures:
   - Their core strengths and constraints
   - Their chosen direction or North Star idea
   - Their current stage and momentum

2. An ai_recommendations array (3-5 items) with specific, actionable next steps they should take based on:
   - Their life constraints (time, capital, risk tolerance)
   - Their business positioning (target audience, offer model)
   - Their validation stage and traction definition

Respond with STRICT JSON only:
{
  "ai_summary": "string",
  "ai_recommendations": [
    { "title": "string", "description": "string", "priority": "high" | "medium" | "low" }
  ]
}

Be specific, actionable, and tailored to this founder's unique situation. No generic advice.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[refresh-blueprint] Starting for userId:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[refresh-blueprint] Error fetching profile:", profileError);
      throw profileError;
    }

    // Fetch ideas (including chosen one)
    const { data: ideas, error: ideasError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ideasError) {
      console.error("[refresh-blueprint] Error fetching ideas:", ideasError);
      throw ideasError;
    }

    // Fetch current blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from("founder_blueprints")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (blueprintError) {
      console.error("[refresh-blueprint] Error fetching blueprint:", blueprintError);
      throw blueprintError;
    }

    const chosenIdea = ideas?.find((i: any) => i.status === "chosen");

    // Build context for AI
    const context = {
      founder_profile: profile,
      ideas: ideas?.slice(0, 5), // Top 5 recent ideas
      chosen_idea: chosenIdea,
      current_blueprint: blueprint,
    };

    console.log("[refresh-blueprint] Calling AI with context");

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
          { role: "user", content: JSON.stringify(context, null, 2) },
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
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
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

    const { error: updateError } = await supabase
      .from("founder_blueprints")
      .upsert(updatePayload, { onConflict: "user_id" });

    if (updateError) {
      console.error("[refresh-blueprint] Error updating blueprint:", updateError);
      throw updateError;
    }

    console.log("[refresh-blueprint] Blueprint updated successfully");

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
