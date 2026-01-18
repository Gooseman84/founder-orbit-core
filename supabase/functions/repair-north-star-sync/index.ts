// supabase/functions/repair-north-star-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
      console.error("repair-north-star-sync: Missing environment variables");
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
      console.error("repair-north-star-sync: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    console.log("repair-north-star-sync: authenticated user", userId);

    // Step 1: Find user's current North Star idea
    const { data: northStarIdea, error: ideaError } = await supabaseService
      .from("ideas")
      .select("id, title")
      .eq("user_id", userId)
      .eq("status", "north_star")
      .limit(1)
      .maybeSingle();

    if (ideaError) {
      console.error("repair-north-star-sync: error fetching north star idea", ideaError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch North Star idea" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!northStarIdea) {
      console.log("repair-north-star-sync: no North Star idea found");
      return new Response(
        JSON.stringify({ success: false, code: "NO_NORTH_STAR" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("repair-north-star-sync: found North Star idea", northStarIdea.id, northStarIdea.title);

    let ventureId: string | null = null;
    let ventureCreated = false;
    let blueprintUpdated = false;

    // Step 2: Ensure venture exists for this idea
    const { data: existingVenture, error: ventureCheckError } = await supabaseService
      .from("ventures")
      .select("id, venture_state")
      .eq("user_id", userId)
      .eq("idea_id", northStarIdea.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ventureCheckError) {
      console.error("repair-north-star-sync: error checking venture", ventureCheckError);
    } else if (existingVenture) {
      ventureId = existingVenture.id;
      console.log("repair-north-star-sync: found existing venture", ventureId, "state:", existingVenture.venture_state);
    } else {
      // Create new venture
      const { data: newVenture, error: createVentureError } = await supabaseService
        .from("ventures")
        .insert({
          user_id: userId,
          idea_id: northStarIdea.id,
          name: northStarIdea.title || "My Venture",
          status: "active",
          venture_state: "inactive",
        })
        .select("id")
        .single();

      if (createVentureError) {
        console.error("repair-north-star-sync: error creating venture", createVentureError);
      } else {
        ventureId = newVenture.id;
        ventureCreated = true;
        console.log("repair-north-star-sync: created new venture", ventureId);
      }
    }

    // Step 3: Upsert founder_blueprints.north_star_idea_id
    const { data: existingBlueprint, error: blueprintCheckError } = await supabaseService
      .from("founder_blueprints")
      .select("id, north_star_idea_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (blueprintCheckError) {
      console.error("repair-north-star-sync: error checking blueprint", blueprintCheckError);
    } else if (existingBlueprint) {
      // Check if update is needed
      if (existingBlueprint.north_star_idea_id !== northStarIdea.id) {
        const { error: updateError } = await supabaseService
          .from("founder_blueprints")
          .update({ 
            north_star_idea_id: northStarIdea.id,
            north_star_one_liner: northStarIdea.title || null,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("repair-north-star-sync: error updating blueprint", updateError);
        } else {
          blueprintUpdated = true;
          console.log("repair-north-star-sync: updated founder_blueprints.north_star_idea_id");
        }
      } else {
        console.log("repair-north-star-sync: blueprint already synced");
      }
    } else {
      // Insert new blueprint
      const { error: insertError } = await supabaseService
        .from("founder_blueprints")
        .insert({
          user_id: userId,
          north_star_idea_id: northStarIdea.id,
          north_star_one_liner: northStarIdea.title || null,
          status: "active"
        });

      if (insertError) {
        console.error("repair-north-star-sync: error inserting blueprint", insertError);
      } else {
        blueprintUpdated = true;
        console.log("repair-north-star-sync: inserted new founder_blueprints row");
      }
    }

    const repaired = ventureCreated || blueprintUpdated;
    console.log("repair-north-star-sync: complete", { 
      northStarIdeaId: northStarIdea.id, 
      ventureId, 
      ventureCreated, 
      blueprintUpdated, 
      repaired 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        northStarIdeaId: northStarIdea.id, 
        ventureId,
        repaired,
        ventureCreated,
        blueprintUpdated
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("repair-north-star-sync: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
