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
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extract token and verify user
    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("save-founder-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("save-founder-idea: authenticated user", userId);

    // 3. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("save-founder-idea: JSON parse error", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idea, fitScores } = body;

    // Validate required fields
    if (!idea || typeof idea !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing idea object", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!idea.id || typeof idea.id !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid idea.id", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!idea.title || typeof idea.title !== "string" || idea.title.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Missing or empty idea.title", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("save-founder-idea: fitScores received:", fitScores);

    // Convert score values to integers (DB columns are integer type)
    // Accepts: numbers, numeric strings, percentages ("81.2%"), etc.
    // Clamps to [0, 100] for score fields
    const safeInt = (val: unknown, clamp = true): number | null => {
      if (val === null || val === undefined) return null;
      
      let strVal = String(val).trim();
      
      // Strip % suffix if present
      if (strVal.endsWith('%')) {
        strVal = strVal.slice(0, -1).trim();
      }
      
      const num = Number(strVal);
      if (isNaN(num)) return null;
      
      let result = Math.round(num);
      
      // Clamp to [0, 100] for score fields
      if (clamp) {
        result = Math.max(0, Math.min(100, result));
      }
      
      return result;
    };

    // Process all score values
    const processedScores = {
      passion_fit_score: safeInt(fitScores?.passion),
      skill_fit_score: safeInt(fitScores?.skill),
      constraint_fit_score: safeInt(fitScores?.constraints),
      lifestyle_fit_score: safeInt(fitScores?.lifestyle),
      overall_fit_score: safeInt(fitScores?.overall),
    };

    // Validate that overall_fit_score is present (required field)
    if (processedScores.overall_fit_score === null) {
      console.error("save-founder-idea: Missing required overall_fit_score");
      return new Response(
        JSON.stringify({ 
          error: "Missing required overall_fit_score", 
          code: "VALIDATION_ERROR" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== PLAN CHECK: Get user subscription =====
    const { data: subData } = await supabaseAdmin
      .from("user_subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .maybeSingle();

    // Normalize plan: "free" -> "trial" for backwards compatibility
    let plan = (subData?.status === "active" && subData?.plan) || "trial";
    if (plan === "free") plan = "trial";
    
    const isPro = plan === "pro" || plan === "founder";
    
    // Check if trial has expired (7 days from subscription creation)
    const isTrialUser = plan === "trial";
    let isTrialExpired = false;
    if (isTrialUser && subData?.created_at) {
      const trialStartDate = new Date(subData.created_at);
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      isTrialExpired = new Date() > trialEndDate;
    }

    // ===== PLAN CHECK: Library limit (TRIAL = 3 saved ideas) =====
    if (isTrialUser) {
      if (isTrialExpired) {
        console.log(`save-founder-idea: TRIAL user ${userId} trial expired`);
        return new Response(
          JSON.stringify({ 
            error: "Your trial has expired. Subscribe to save more ideas.",
            code: "TRIAL_EXPIRED",
            plan: "trial"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { count: savedCount } = await supabaseAdmin
        .from("ideas")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const MAX_TRIAL_SAVED = 3;
      if ((savedCount || 0) >= MAX_TRIAL_SAVED) {
        console.log(`save-founder-idea: TRIAL user ${userId} hit library limit`);
        return new Response(
          JSON.stringify({ 
            error: "Library full during trial. Subscribe for unlimited storage.",
            code: "LIBRARY_FULL",
            plan: "trial",
            limit: MAX_TRIAL_SAVED
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("save-founder-idea: saving for user", userId, "idea", idea.title);
    console.log("save-founder-idea: insert payload scores:", processedScores);

    // Check if already saved in ideas table
    const { data: existingIdea } = await supabaseAdmin
      .from("ideas")
      .select("id")
      .eq("user_id", userId)
      .eq("title", idea.title)
      .maybeSingle();

    let ideaDbId = existingIdea?.id;

    if (!existingIdea) {
      // Insert into ideas table for IdeaDetail page compatibility
      const { data: newIdea, error: insertError } = await supabaseAdmin
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
          // Use pre-validated score integers
          ...processedScores,
          fit_scores: fitScores ? JSON.stringify(fitScores) : null,
          // Multi-source idea fields
          source_type: idea.source_type || 'generated',
          source_meta: idea.source_meta || {},
          normalized: idea.normalized || null,
          parent_idea_ids: idea.parent_idea_ids || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("save-founder-idea: Ideas table insert error:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        
        // Check for duplicate/constraint errors
        if (insertError.code === "23505") {
          return new Response(
            JSON.stringify({ error: "Idea already exists", code: "DUPLICATE_ERROR" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ error: "Failed to save idea", code: "DB_WRITE_FAILED" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ideaDbId = newIdea.id;
      console.log("Saved to ideas table:", ideaDbId);
    }

    // Also save to founder_generated_ideas for library tracking
    const { data: existingGenerated } = await supabaseAdmin
      .from("founder_generated_ideas")
      .select("id")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .maybeSingle();

    if (!existingGenerated) {
      await supabaseAdmin
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
