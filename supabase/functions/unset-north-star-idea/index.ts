// supabase/functions/unset-north-star-idea/index.ts
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("unset-north-star-idea: Missing environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("unset-north-star-idea: Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user via Supabase auth using getUser(token)
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader.trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("unset-north-star-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("unset-north-star-idea: authenticated user", userId);

    // Parse request body
    const { idea_id } = await req.json();

    if (!idea_id) {
      return new Response(
        JSON.stringify({ error: "idea_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("unset-north-star-idea: unsetting north star for idea", idea_id);

    // Use service role client for DB operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Verify idea exists, belongs to user, and is currently north_star
    const { data: idea, error: ideaError } = await supabaseService
      .from("ideas")
      .select("id, user_id, status")
      .eq("id", idea_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (ideaError) {
      console.error("unset-north-star-idea: error fetching idea", ideaError);
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

    // Only allow unsetting if currently north_star
    if (idea.status !== "north_star") {
      return new Response(
        JSON.stringify({ error: "This idea is not currently set as North Star" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update idea to candidate
    const { error: updateError } = await supabaseService
      .from("ideas")
      .update({ status: "candidate" })
      .eq("id", idea_id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("unset-north-star-idea: error updating idea", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to unset North Star" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("unset-north-star-idea: successfully unset north star", idea_id);

    return new Response(
      JSON.stringify({ success: true, unsetIdeaId: idea_id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("unset-north-star-idea: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
