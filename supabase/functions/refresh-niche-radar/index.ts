import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("refresh-niche-radar: starting daily radar refresh");

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get all users who have chosen ideas (ready for radar signals)
    const { data: chosenIdeas, error: ideasError } = await supabase
      .from("ideas")
      .select("user_id")
      .eq("status", "chosen");

    if (ideasError) {
      console.error("refresh-niche-radar: error fetching chosen ideas", ideasError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch chosen ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chosenIdeas || chosenIdeas.length === 0) {
      console.log("refresh-niche-radar: no users with chosen ideas found");
      return new Response(
        JSON.stringify({ message: "No users to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique user IDs (in case a user has multiple chosen ideas by mistake)
    const uniqueUserIds = [...new Set(chosenIdeas.map(idea => idea.user_id))];
    console.log(`refresh-niche-radar: processing ${uniqueUserIds.length} users`);

    const results = {
      total: uniqueUserIds.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const userId of uniqueUserIds) {
      try {
        console.log(`refresh-niche-radar: generating radar signals for user ${userId}`);

        // Call generate-niche-radar function for this user
        const { data, error } = await supabase.functions.invoke("generate-niche-radar", {
          body: { userId },
        });

        if (error) {
          console.error(`refresh-niche-radar: error for user ${userId}`, error);
          results.failed++;
          results.errors.push(`User ${userId}: ${error.message}`);
        } else {
          console.log(`refresh-niche-radar: success for user ${userId}`, data);
          results.successful++;
        }
      } catch (error) {
        console.error(`refresh-niche-radar: exception for user ${userId}`, error);
        results.failed++;
        results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log("refresh-niche-radar: completed", results);

    return new Response(
      JSON.stringify({
        message: "Niche radar refresh completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refresh-niche-radar: fatal error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
