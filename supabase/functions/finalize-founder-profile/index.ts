import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinalizeRequestBody {
  interview_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("finalize-founder-profile: missing Supabase env config");
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
      console.error("finalize-founder-profile: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = user.id;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // ===== REQUEST BODY =====
    const body = (await req.json().catch(() => ({}))) as FinalizeRequestBody;

    if (!body.interview_id) {
      return new Response(
        JSON.stringify({ error: "Missing interview_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== Load existing profile + interview in parallel =====
    const [profileResult, interviewResult] = await Promise.all([
      supabase
        .from("founder_profiles")
        .select("*")
        .eq("user_id", resolvedUserId)
        .maybeSingle(),
      supabase
        .from("founder_interviews")
        .select("context_summary")
        .eq("id", body.interview_id)
        .eq("user_id", resolvedUserId)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      console.error("finalize-founder-profile: error fetching profile", profileResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to load founder profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (interviewResult.error) {
      console.error("finalize-founder-profile: error fetching interview", interviewResult.error);
      return new Response(
        JSON.stringify({ error: "Failed to load interview" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!interviewResult.data || !interviewResult.data.context_summary) {
      return new Response(
        JSON.stringify({ error: "Interview context summary not found. Run summary first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx = interviewResult.data.context_summary as any;
    const nowIso = new Date().toISOString();

    // ===== Build profile JSONB blob =====
    // Merge interview-extracted intelligence into the profile blob
    // for backward compatibility. Lightning Round columns are NOT touched.
    const existingProfile = (profileResult.data?.profile as any) || {};

    const profile = {
      ...existingProfile,

      // Interview-extracted fields (complement Lightning Round data)
      domainExpertise: ctx.domainExpertise ?? existingProfile.domainExpertise,
      customerPain: ctx.customerPain ?? existingProfile.customerPain,
      ventureIntelligence: ctx.ventureIntelligence ?? existingProfile.ventureIntelligence,
      transferablePatterns: ctx.transferablePatterns ?? existingProfile.transferablePatterns,
      interviewSignalQuality: ctx.interviewSignalQuality ?? existingProfile.interviewSignalQuality,
      keyQuotes: ctx.keyQuotes ?? existingProfile.keyQuotes,
      redFlags: ctx.redFlags ?? existingProfile.redFlags,
      founderSummary: ctx.founderSummary ?? existingProfile.founderSummary,
      ideaGenerationContext: ctx.ideaGenerationContext ?? existingProfile.ideaGenerationContext,

      updatedAt: nowIso,
      createdAt: existingProfile.createdAt || nowIso,
    };

    // ===== Build DB update payload =====
    // Only set interview-related fields. Do NOT overwrite Lightning Round columns.
    const payload: Record<string, any> = {
      profile,
      context_summary: ctx,
      interview_completed_at: nowIso,
    };

    console.log("finalize-founder-profile: storing context_summary + profile blob", {
      hasExistingProfile: !!profileResult.data,
      interviewSignalQuality: ctx.interviewSignalQuality,
    });

    // ===== Upsert profile =====
    if (profileResult.data) {
      const { error: updateError } = await supabase
        .from("founder_profiles")
        .update(payload)
        .eq("user_id", resolvedUserId);

      if (updateError) {
        console.error("finalize-founder-profile: error updating profile", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update founder profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // No profile exists yet — create minimal row
      const { error: insertError } = await supabase
        .from("founder_profiles")
        .insert({ user_id: resolvedUserId, ...payload });

      if (insertError) {
        console.error("finalize-founder-profile: error inserting profile", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create founder profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ===== Mark interview as completed =====
    const { error: statusError } = await supabase
      .from("founder_interviews")
      .update({ status: "completed" })
      .eq("id", body.interview_id)
      .eq("user_id", resolvedUserId);

    if (statusError) {
      console.error("finalize-founder-profile: error updating interview status", statusError);
    }

    return new Response(
      JSON.stringify({ profile }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("finalize-founder-profile: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
