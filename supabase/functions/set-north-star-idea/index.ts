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

    // ===== AUTH: Require Authorization header =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("set-north-star-idea: Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== TWO CLIENTS: Auth (anon key) + Admin (service role) =====
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ===== VERIFY USER via supabaseAuth.auth.getUser() (no token param) =====
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error("set-north-star-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
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

    // Verify idea exists and belongs to the user

    // Verify idea exists and belongs to the user
    const { data: idea, error: ideaError } = await supabaseService
      .from("ideas")
      .select("id, user_id")
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

    console.log("set-north-star-idea: successfully set north star", idea_id);

    return new Response(
      JSON.stringify({ success: true, northStarIdeaId: idea_id }),
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
