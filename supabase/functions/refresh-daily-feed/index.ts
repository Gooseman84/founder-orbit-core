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

  // Validate cron secret for scheduled function security
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && cronSecret !== expectedSecret) {
    console.error('[refresh-daily-feed] Unauthorized: Invalid cron secret');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    console.log("refresh-daily-feed: starting daily feed refresh");

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get all users who have completed onboarding (have founder profiles)
    const { data: profiles, error: profilesError } = await supabase
      .from("founder_profiles")
      .select("user_id");

    if (profilesError) {
      console.error("refresh-daily-feed: error fetching profiles", profilesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profiles" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profiles || profiles.length === 0) {
      console.log("refresh-daily-feed: no users found");
      return new Response(
        JSON.stringify({ message: "No users to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`refresh-daily-feed: processing ${profiles.length} users`);

    const results = {
      total: profiles.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const profile of profiles) {
      const userId = profile.user_id;

      try {
        console.log(`refresh-daily-feed: generating feed for user ${userId}`);

        // Call generate-feed-items function for this user
        const { data, error } = await supabase.functions.invoke("generate-feed-items", {
          body: { userId },
        });

        if (error) {
          console.error(`refresh-daily-feed: error for user ${userId}`, error);
          results.failed++;
          results.errors.push(`User ${userId}: ${error.message}`);
        } else {
          console.log(`refresh-daily-feed: success for user ${userId}`, data);
          results.successful++;
        }
      } catch (error) {
        console.error(`refresh-daily-feed: exception for user ${userId}`, error);
        results.failed++;
        results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    console.log("refresh-daily-feed: completed", results);

    return new Response(
      JSON.stringify({
        message: "Daily feed refresh completed",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("refresh-daily-feed: fatal error", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
