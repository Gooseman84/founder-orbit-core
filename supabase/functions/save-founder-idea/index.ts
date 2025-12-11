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
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use anon key with auth header for user verification
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { idea } = await req.json();

    // Light validation
    if (!idea || typeof idea !== "object" || !idea.id || !idea.title) {
      return new Response(
        JSON.stringify({ error: "Invalid idea format - must have id and title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already saved in ideas table
    const { data: existingIdea } = await supabase
      .from("ideas")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", idea.title)
      .maybeSingle();

    let ideaDbId = existingIdea?.id;

    if (!existingIdea) {
      // Insert into ideas table for IdeaDetail page compatibility
      const { data: newIdea, error: insertError } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
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
      .eq("user_id", user.id)
      .eq("idea_id", idea.id)
      .maybeSingle();

    if (!existingGenerated) {
      await supabase
        .from("founder_generated_ideas")
        .insert({
          user_id: user.id,
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
