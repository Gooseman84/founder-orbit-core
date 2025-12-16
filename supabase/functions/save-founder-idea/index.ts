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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT and get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("save-founder-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use authenticated user's ID (ignore userId from body to prevent impersonation)
    const userId = user.id;
    console.log("save-founder-idea: authenticated user", userId);

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { idea, fitScores } = await req.json();

    // Light validation
    if (!idea || typeof idea !== "object" || !idea.id || !idea.title) {
      return new Response(
        JSON.stringify({ error: "Invalid idea format - must have id and title" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("save-founder-idea: fitScores received:", fitScores);

    // ===== PLAN CHECK: Get user subscription =====
    const { data: subData } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = (subData?.status === "active" && subData?.plan) || "free";
    const isPro = plan === "pro" || plan === "founder";

    // ===== PLAN CHECK: Library limit (FREE = 5 saved ideas) =====
    if (!isPro) {
      const { count: savedCount } = await supabase
        .from("ideas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const MAX_FREE_SAVED = 5;
      if ((savedCount || 0) >= MAX_FREE_SAVED) {
        console.log(`save-founder-idea: FREE user ${userId} hit library limit`);
        return new Response(
          JSON.stringify({ 
            error: "Library full on Free plan",
            code: "LIBRARY_FULL",
            plan: "free",
            limit: MAX_FREE_SAVED
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
          // Persist fit scores if provided
          passion_fit_score: fitScores?.passion ?? null,
          skill_fit_score: fitScores?.skill ?? null,
          constraint_fit_score: fitScores?.constraints ?? null,
          lifestyle_fit_score: fitScores?.lifestyle ?? null,
          overall_fit_score: fitScores?.overall ?? null,
          fit_scores: fitScores ? JSON.stringify(fitScores) : null,
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
