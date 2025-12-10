import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are TrueBlazer.AI — Idea Fusion Engine.

Your job is to merge 2–3 ideas into ONE stronger hybrid that:
- Has a simpler or more powerful business model
- Increases leverage and/or virality
- Has a faster or clearer path to revenue for a solo founder or tiny team
- Uses the strongest AI patterns from the inputs
- Combines the best elements while eliminating redundancy

When fusing ideas:
1. Identify the strongest revenue mechanism across all inputs
2. Find the most viral or leveraged distribution angle
3. Combine audience segments if they overlap or can be sequenced
4. Take the simplest MVP approach that still captures value
5. Merge AI patterns into a more powerful combined system
6. Amplify any "chaos_factor" or "shock_factor" that could accelerate growth

Return a single Idea object using the v6 schema:

{
  "id": string (generate a new UUID),
  "title": string,
  "description": string,
  "category": "saas" | "automation" | "content" | "creator" | "avatar" | "locker_room" | "system" | "memetic",
  "industry": string,
  "model": string,
  "ai_pattern": string,
  "platform": string | null,
  "difficulty": "easy" | "medium" | "hard",
  "solo_fit": boolean,
  "time_to_revenue": "0-30d" | "30-90d" | "90-180d" | "6mo+",
  "why_now": string,
  "shock_factor": number (0-100),
  "virality_potential": number (0-100),
  "leverage_score": number (0-100),
  "automation_density": number (0-100),
  "autonomy_level": number (0-100),
  "culture_tailwind": number (0-100),
  "chaos_factor": number (0-100),
  "one_liner": string,
  "problem_statement": string,
  "target_customer": string,
  "mvp_approach": string,
  "go_to_market": string,
  "why_it_fits_founder": string,
  "first_steps": string[],
  "fusion_notes": string (brief explanation of what was combined)
}

Rules:
- Output ONLY valid JSON
- The fused idea should feel like a NEW, stronger concept — not just a mashup
- Preserve the most compelling elements from each input
- The chaos/shock factors should reflect the combined intensity
- Generate a new UUID for the id field`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, ideas } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ideas || !Array.isArray(ideas) || ideas.length < 2 || ideas.length > 3) {
      return new Response(
        JSON.stringify({ error: "Must provide 2-3 ideas to fuse" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("fuse-ideas: fusing", ideas.length, "ideas for user", userId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Fetch founder profile for context
    const { data: profile } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Build user prompt with ideas to fuse
    const userPrompt = `Fuse these ${ideas.length} ideas into ONE stronger hybrid venture:

## Ideas to Fuse

${ideas.map((idea: any, index: number) => `
### Idea ${index + 1}: ${idea.title}
${JSON.stringify(idea, null, 2)}
`).join("\n")}

## Founder Context
${profile ? JSON.stringify({
  passions: profile.passions_text || profile.passions_tags?.join(", ") || "Not specified",
  skills: profile.skills_text || profile.skills_tags?.join(", ") || "Not specified",
  time_per_week: profile.time_per_week,
  capital_available: profile.capital_available,
  risk_tolerance: profile.risk_tolerance,
  edgy_mode: profile.edgy_mode,
  creator_platforms: profile.creator_platforms,
}, null, 2) : "No profile available"}

Create a single fused idea that combines the strongest elements of all inputs. Return only the JSON object.`;

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
              name: "create_fused_idea",
              description: "Create a fused idea from 2-3 input ideas",
              parameters: {
                type: "object",
                properties: {
                  idea: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      description: { type: "string" },
                      category: { type: "string" },
                      industry: { type: "string" },
                      model: { type: "string" },
                      ai_pattern: { type: "string" },
                      platform: { type: "string" },
                      difficulty: { type: "string" },
                      solo_fit: { type: "boolean" },
                      time_to_revenue: { type: "string" },
                      why_now: { type: "string" },
                      shock_factor: { type: "number" },
                      virality_potential: { type: "number" },
                      leverage_score: { type: "number" },
                      automation_density: { type: "number" },
                      autonomy_level: { type: "number" },
                      culture_tailwind: { type: "number" },
                      chaos_factor: { type: "number" },
                      one_liner: { type: "string" },
                      problem_statement: { type: "string" },
                      target_customer: { type: "string" },
                      mvp_approach: { type: "string" },
                      go_to_market: { type: "string" },
                      why_it_fits_founder: { type: "string" },
                      first_steps: { type: "array", items: { type: "string" } },
                      fusion_notes: { type: "string" },
                    },
                    required: ["id", "title", "description", "category"],
                  },
                },
                required: ["idea"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_fused_idea" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("fuse-ideas: AI gateway error", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error("AI generation failed");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || !toolCall.function?.arguments) {
      console.error("fuse-ideas: No tool call in response");
      throw new Error("Invalid AI response format");
    }

    const parsedArgs = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    const fusedIdea = parsedArgs.idea;
    if (!fusedIdea) {
      throw new Error("No fused idea in response");
    }

    console.log("fuse-ideas: created fused idea:", fusedIdea.title);

    // Generate a proper UUID if not provided
    const ideaId = fusedIdea.id || crypto.randomUUID();

    // Insert the fused idea into the ideas table
    const { data: insertedIdea, error: insertError } = await supabase
      .from("ideas")
      .insert({
        id: ideaId,
        user_id: userId,
        title: fusedIdea.title,
        description: fusedIdea.description,
        category: fusedIdea.category,
        business_model_type: fusedIdea.model,
        target_customer: fusedIdea.target_customer,
        platform: fusedIdea.platform || null,
        complexity: fusedIdea.difficulty === "easy" ? "low" : fusedIdea.difficulty === "hard" ? "high" : "medium",
        time_to_first_dollar: fusedIdea.time_to_revenue,
        mode: "fusion",
        engine_version: "v6",
        shock_factor: fusedIdea.shock_factor,
        virality_potential: fusedIdea.virality_potential,
        leverage_score: fusedIdea.leverage_score,
        automation_density: fusedIdea.automation_density,
        autonomy_level: fusedIdea.autonomy_level,
        culture_tailwind: fusedIdea.culture_tailwind,
        chaos_factor: fusedIdea.chaos_factor,
        status: "candidate",
      })
      .select()
      .single();

    if (insertError) {
      console.error("fuse-ideas: insert error", insertError);
      throw new Error("Failed to save fused idea");
    }

    // Return the full fused idea with additional fields
    return new Response(
      JSON.stringify({
        idea: {
          ...insertedIdea,
          one_liner: fusedIdea.one_liner,
          problem_statement: fusedIdea.problem_statement,
          mvp_approach: fusedIdea.mvp_approach,
          go_to_market: fusedIdea.go_to_market,
          why_it_fits_founder: fusedIdea.why_it_fits_founder,
          first_steps: fusedIdea.first_steps,
          fusion_notes: fusedIdea.fusion_notes,
          ai_pattern: fusedIdea.ai_pattern,
          why_now: fusedIdea.why_now,
          industry: fusedIdea.industry,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fuse-ideas: error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
