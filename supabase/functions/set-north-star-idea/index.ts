// supabase/functions/set-north-star-idea/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("set-north-star-idea: Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("set-north-star-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    console.log("set-north-star-idea: authenticated user", userId);

    // Parse request body
    const { idea_id } = await req.json();

    if (!idea_id) {
      return new Response(
        JSON.stringify({ error: "idea_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("set-north-star-idea: setting north star for idea", idea_id);

    // Verify idea exists and belongs to the user, fetch full details
    const { data: idea, error: ideaError } = await supabaseService
      .from("ideas")
      .select("id, user_id, title, description, target_customer, business_model_type, category")
      .eq("id", idea_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (ideaError) {
      console.error("set-north-star-idea: error fetching idea", ideaError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch idea" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!idea) {
      return new Response(
        JSON.stringify({ error: "Idea not found or does not belong to you" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Set all user's ideas to "candidate"
    const { error: resetError } = await supabaseService
      .from("ideas")
      .update({ status: "candidate" })
      .eq("user_id", userId)
      .neq("id", idea_id);

    if (resetError) {
      console.error("set-north-star-idea: error resetting ideas to candidate", resetError);
      return new Response(
        JSON.stringify({ error: "Failed to update ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Set selected idea to "north_star"
    const { error: setError } = await supabaseService
      .from("ideas")
      .update({ status: "north_star" })
      .eq("id", idea_id)
      .eq("user_id", userId);

    if (setError) {
      console.error("set-north-star-idea: error setting north star", setError);
      return new Response(
        JSON.stringify({ error: "Failed to set North Star" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Ensure a venture exists for this idea (any state)
    let ventureId: string | null = null;

    // First check if venture already exists
    const { data: existingVenture, error: ventureCheckError } = await supabaseService
      .from("ventures")
      .select("id, venture_state")
      .eq("user_id", userId)
      .eq("idea_id", idea_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ventureCheckError) {
      console.error("set-north-star-idea: error checking venture", ventureCheckError);
      // Non-fatal, continue without venture
    } else if (existingVenture) {
      ventureId = existingVenture.id;
      console.log("set-north-star-idea: found existing venture", ventureId, "state:", existingVenture.venture_state);
    } else {
      // Create new venture with inactive state
      const { data: newVenture, error: createVentureError } = await supabaseService
        .from("ventures")
        .insert({
          user_id: userId,
          idea_id: idea_id,
          name: idea.title || "My Venture",
          status: "active",
          venture_state: "inactive",
        })
        .select("id")
        .single();

      if (createVentureError) {
        console.error("set-north-star-idea: error creating venture", createVentureError);
        // Non-fatal, continue without venture
      } else {
        ventureId = newVenture.id;
        console.log("set-north-star-idea: created new venture", ventureId);
      }
    }

    // Step 4: Upsert founder_blueprints.north_star_idea_id
    let blueprintUpdated = false;
    try {
      const { data: existingBlueprint, error: blueprintCheckError } = await supabaseService
        .from("founder_blueprints")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (blueprintCheckError) {
        console.error("set-north-star-idea: error checking blueprint", blueprintCheckError);
      } else if (existingBlueprint) {
        // Update existing blueprint with idea data
        const { error: updateError } = await supabaseService
          .from("founder_blueprints")
          .update({ 
            north_star_idea_id: idea_id,
            north_star_one_liner: idea.description || idea.title || null,
            target_audience: idea.target_customer || null,
            problem_statement: idea.description || null,
            offer_model: idea.business_model_type || idea.category || null,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("set-north-star-idea: error updating blueprint", updateError);
        } else {
          blueprintUpdated = true;
          console.log("set-north-star-idea: updated founder_blueprints with idea data");
        }
      } else {
        // Insert new blueprint with idea data
        const { error: insertError } = await supabaseService
          .from("founder_blueprints")
          .insert({
            user_id: userId,
            north_star_idea_id: idea_id,
            north_star_one_liner: idea.description || idea.title || null,
            target_audience: idea.target_customer || null,
            problem_statement: idea.description || null,
            offer_model: idea.business_model_type || idea.category || null,
            status: "active"
          });

        if (insertError) {
          console.error("set-north-star-idea: error inserting blueprint", insertError);
        } else {
          blueprintUpdated = true;
          console.log("set-north-star-idea: inserted new founder_blueprints with idea data");
        }
      }
    } catch (blueprintError) {
      console.error("set-north-star-idea: blueprint upsert error", blueprintError);
      // Non-fatal, continue
    }

    console.log("set-north-star-idea: successfully set north star", idea_id, "venture:", ventureId, "blueprint:", blueprintUpdated);

    return new Response(
      JSON.stringify({ success: true, northStarIdeaId: idea_id, ventureId, blueprintUpdated }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("set-north-star-idea: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
