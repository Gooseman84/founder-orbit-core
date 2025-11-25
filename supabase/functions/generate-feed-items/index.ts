import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert startup advisor, idea refinement coach, competitor analyst, and micro-task creator.

Your job is to produce DAILY FEED ITEMS tailored to the founder's profile, their chosen idea, and the latest idea analysis.

Each feed item should be short, punchy, and immediately actionable.

Given input JSON:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... }
}

Respond with STRICT JSON ONLY:

{
  "items": [
    {
      "type": "insight" | "idea_tweak" | "competitor_snapshot" | "micro_task",
      "title": "string",
      "body": "string",
      "cta_label": "string or null",
      "cta_action": "string or null",
      "xp_reward": number,
      "metadata": { ... }
    }
  ]
}

Rules:
- Use simple language.
- Every item must be immediately useful.
- micro_task items should be doable in <10 minutes.
- idea_tweak items should modify the idea slightly.
- competitor_snapshot should point out a real competitor type (no specific company names required).
- insights should be strategic truths.
- Always output valid JSON only.`;

// Valid feed item types
const FEED_TYPES = ["insight", "idea_tweak", "competitor_snapshot", "micro_task"];

// Format and validate raw feed items from AI
function formatFeedItems(rawItems: any[]): any[] {
  if (!Array.isArray(rawItems)) {
    console.error("formatFeedItems: rawItems is not an array");
    return [];
  }

  return rawItems
    .filter((item) => {
      // Validate required fields
      if (!item.type || !item.title || !item.body) {
        console.warn("formatFeedItems: skipping item missing required fields", item);
        return false;
      }
      // Validate type
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
      metadata: item.metadata || {},
    }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    // Resolve userId
    if (!userId) {
      console.error("generate-feed-items: userId is required");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("generate-feed-items: resolved userId", userId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Build feed input using feedEngine logic
    const { data: founder_profile } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: idea } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    let analysis = null;
    if (idea) {
      const { data: analysisData } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", idea.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      analysis = analysisData;
    }

    const feedInput = {
      founder_profile: founder_profile || null,
      idea: idea || null,
      analysis: analysis || null,
    };

    console.log("generate-feed-items: sending input", JSON.stringify(feedInput).substring(0, 200));

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
          { role: "user", content: JSON.stringify(feedInput) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_feed_items",
              description: "Generate personalized feed items for a founder",
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
                        metadata: { type: "object" },
                      },
                      required: ["type", "title", "body"],
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
      const errorText = await response.text();
      console.error("generate-feed-items: AI API error", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI API error", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      idea_id: idea?.id || null,
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
