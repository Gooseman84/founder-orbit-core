import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type DecisionAction = "continue" | "pivot" | "kill";

interface RequestBody {
  ventureId: string;
  action: DecisionAction;
  reason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("[venture-review-decision] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.log("[venture-review-decision] Invalid token:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    const { ventureId, action, reason } = body;

    console.log("[venture-review-decision] userId:", user.id, "ventureId:", ventureId, "action:", action);

    // Validate required fields
    if (!ventureId || !action) {
      return new Response(
        JSON.stringify({ error: "Missing ventureId or action", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["continue", "pivot", "kill"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid action", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pivot and kill require a reason
    if ((action === "pivot" || action === "kill") && (!reason || reason.trim().length === 0)) {
      return new Response(
        JSON.stringify({ error: "Reason required for pivot/kill", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (reason && reason.length > 200) {
      return new Response(
        JSON.stringify({ error: "Reason must be 200 characters or less", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    // Fetch venture with validation
    const { data: venture, error: ventureError } = await supabaseService
      .from("ventures")
      .select("*")
      .eq("id", ventureId)
      .eq("user_id", user.id)
      .single();

    if (ventureError || !venture) {
      console.log("[venture-review-decision] Venture not found:", ventureError?.message);
      return new Response(
        JSON.stringify({ error: "Venture not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow decisions from executing, reviewed, or committed states
    const allowedStates = ["executing", "reviewed", "committed"];
    if (!allowedStates.includes(venture.venture_state)) {
      console.log("[venture-review-decision] Invalid state:", venture.venture_state);
      return new Response(
        JSON.stringify({ 
          error: `Venture must be in executing, reviewed, or committed state. Current state: ${venture.venture_state}`, 
          code: "INVALID_STATE" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    let updateData: Record<string, any> = {};

    // Merge review data into existing metadata safely
    const existingMetadata = (venture.metadata as Record<string, any>) || {};
    const reviewData = existingMetadata.review || {};

    console.log("[venture-review-decision] Processing:", {
      ventureId,
      action,
      currentState: venture.venture_state,
      commitmentWindowDays: venture.commitment_window_days,
      successMetric: venture.success_metric,
    });

    // State machine transitions:
    // - executing → reviewed (only valid direct transition from executing)
    // - committed → executing (via commitment start) OR committed → reviewed
    // - reviewed → executing (continue), inactive (pivot), killed (kill)
    //
    // For any action from 'executing' or 'committed', we need to transition through 'reviewed' first
    const needsReviewedTransition = 
      (venture.venture_state === "executing" || venture.venture_state === "committed");

    if (needsReviewedTransition) {
      console.log("[venture-review-decision] Transitioning from", venture.venture_state, "to reviewed first");
      
      const { error: transitionError } = await supabaseService
        .from("ventures")
        .update({ 
          venture_state: "reviewed",
          updated_at: now,
        })
        .eq("id", ventureId);

      if (transitionError) {
        console.error("[venture-review-decision] Failed to transition to reviewed:", transitionError);
        return new Response(
          JSON.stringify({ 
            error: "Failed to transition venture state", 
            code: "STATE_TRANSITION_ERROR",
            details: transitionError.message
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("[venture-review-decision] Successfully transitioned to reviewed state");
    }

    // Now process the action from 'reviewed' state
    if (action === "continue") {
      // Start new commitment window - need all required fields for executing state
      const windowDays = venture.commitment_window_days || 14;
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + windowDays * 24 * 60 * 60 * 1000);

      updateData = {
        venture_state: "executing",
        commitment_window_days: windowDays,
        commitment_start_at: startAt.toISOString(),
        commitment_end_at: endAt.toISOString(),
        success_metric: venture.success_metric || "Continue making progress",
        updated_at: now,
        metadata: {
          ...existingMetadata,
          review: {
            ...reviewData,
            last_decision: "continue",
            decided_at: now,
          },
        },
      };
      console.log("[venture-review-decision] Continuing with new window:", windowDays, "days");

    } else if (action === "pivot") {
      // Set to inactive and store reason in metadata
      updateData = {
        venture_state: "inactive",
        updated_at: now,
        commitment_start_at: null,
        commitment_end_at: null,
        metadata: {
          ...existingMetadata,
          review: {
            ...reviewData,
            last_decision: "pivot",
            pivot_reason: reason?.trim(),
            decided_at: now,
          },
        },
      };
      console.log("[venture-review-decision] Pivoting venture, reason:", reason);

    } else if (action === "kill") {
      // Set to killed (terminal state)
      updateData = {
        venture_state: "killed",
        updated_at: now,
        metadata: {
          ...existingMetadata,
          review: {
            ...reviewData,
            last_decision: "kill",
            kill_reason: reason?.trim(),
            decided_at: now,
          },
        },
      };
      console.log("[venture-review-decision] Killing venture, reason:", reason);
    }

    // Update venture with final state
    console.log("[venture-review-decision] Applying final update:", {
      newState: updateData.venture_state,
      hasCommitmentWindow: !!updateData.commitment_window_days,
      hasSuccessMetric: !!updateData.success_metric,
    });

    const { data: updatedVenture, error: updateError } = await supabaseService
      .from("ventures")
      .update(updateData)
      .eq("id", ventureId)
      .select()
      .single();

    if (updateError) {
      console.error("[venture-review-decision] Update error:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to update venture", 
          code: "INTERNAL_ERROR",
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[venture-review-decision] Success, new state:", updatedVenture.venture_state);

    return new Response(
      JSON.stringify({ 
        success: true, 
        venture: updatedVenture,
        action,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[venture-review-decision] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
