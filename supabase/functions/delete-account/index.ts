import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    console.log(`[delete-account] Starting deletion for user: ${userId}`);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Delete in order to respect foreign keys
    const tablesToDelete = [
      "venture_daily_tasks",
      "venture_signals",
      "validation_summaries",
      "validation_sessions",
      "feature_prds",
      "workspace_documents",
      "workspace_folders",
      "implementation_kits",
      "venture_plans",
      "founder_blueprints",
      "ventures",
      "financial_viability_scores",
      "idea_analysis",
      "opportunity_scores",
      "master_prompts",
      "founder_generated_ideas",
      "ideas",
      "founder_patterns",
      "personalized_recommendations",
      "founder_interviews",
      "founder_profiles",
      "user_intake_extended",
      "daily_reflections",
      "daily_streaks",
      "check_ins",
      "tasks",
      "feed_items",
      "niche_radar",
      "market_signal_runs",
      "pulse_checks",
      "xp_events",
      "user_badges",
      "user_milestones",
      "beta_feedback",
      "onboarding_analytics",
      "agent_decisions",
      "agent_memory",
      "support_tickets",
      "user_subscriptions",
    ];

    for (const table of tablesToDelete) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) {
        console.warn(`[delete-account] Error deleting from ${table}:`, error.message);
        // Continue — some tables may have no rows
      } else {
        console.log(`[delete-account] Cleared ${table}`);
      }
    }

    // Delete the auth user
    const { error: deleteUserError } =
      await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("[delete-account] Failed to delete auth user:", deleteUserError);
      return new Response(
        JSON.stringify({ error: "Failed to delete authentication record." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[delete-account] User ${userId} fully deleted.`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
