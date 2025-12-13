import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { idea, userId } = await req.json();

    if (!userId) {
      console.error("save-founder-idea: missing userId");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Light validation
    if (!idea || typeof idea !== "object" || !idea.id || !idea.title) {
      return new Response(
        JSON.stringify({ error: "Invalid idea format - must have id and title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("save-founder-idea: saving for user", userId, "idea", idea.title);

    // Check if already saved in ideas table
    const { data: existingIdea } = await supabase
      .from("ideas")
      .select("id")
      .eq("user_id", userId)
      .eq("title", idea.title)
      .maybeSingle();

    let ideaDbId = existingIdea?.id;

    if (!existingIdea) {
      // Insert into ideas table for IdeaDetail page compatibility
      const { data: newIdea, error: insertError } = await supabase
        .from("ideas")
        .insert({
          user_id: userId,
          title: idea.title,
          description: idea.description || idea.oneLiner || null,
          category: idea.category || null,
          business_model_type: idea.model || idea.businessArchetype || idea.revenueModel || null,
          target_customer: idea.targetCustomer || null,
          platform: idea.platform || null,
          complexity: idea.difficulty === "easy" ? "low" : idea.difficulty === "hard" ? "high" : "medium",
          time_to_first_dollar: idea.timeToRevenue || null,
          mode: idea.mode || "generated",
          engine_version: idea.engineVersion || "v6",
          shock_factor: idea.shockFactor ?? null,
          virality_potential: idea.viralityPotential ?? null,
          leverage_score: idea.leverageScore ?? null,
          automation_density: idea.automationDensity ?? null,
          autonomy_level: idea.autonomyLevel ?? null,
          culture_tailwind: idea.cultureTailwind ?? null,
          chaos_factor: idea.chaosFactor ?? null,
          status: "candidate",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Ideas table insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to save idea" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ideaDbId = newIdea.id;
      console.log("Saved to ideas table:", ideaDbId);
    }

    // Also save to founder_generated_ideas for library tracking
    const { data: existingGenerated } = await supabase
      .from("founder_generated_ideas")
      .select("id")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .maybeSingle();

    if (!existingGenerated) {
      await supabase
        .from("founder_generated_ideas")
        .insert({
          user_id: userId,
          idea_id: idea.id,
          idea: idea,
          source: "trueblazer_ideation_engine",
        });
    }

    return new Response(
      JSON.stringify({ success: true, id: ideaDbId, idea_id: idea.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
