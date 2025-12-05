import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FinalizeRequestBody {
  user_id?: string;
  interview_id?: string;
}

function mergeUnique(existing: any, inferred: any): string[] {
  const base = Array.isArray(existing) ? existing : [];
  const extra = Array.isArray(inferred) ? inferred : [];
  return Array.from(new Set([...base, ...extra].filter((x) => typeof x === "string"))) as string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as FinalizeRequestBody;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("finalize-founder-profile: missing Supabase env config");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("finalize-founder-profile: unauthorized", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.interview_id) {
      return new Response(
        JSON.stringify({ error: "Missing interview_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = body.user_id ?? user.id;
    if (body.user_id && body.user_id !== user.id) {
      console.error("finalize-founder-profile: user_id mismatch", body.user_id, user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load existing founder profile
    const { data: profileRow, error: profileError } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (profileError) {
      console.error("finalize-founder-profile: error fetching profile", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to load founder profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profileRow || !profileRow.profile) {
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Complete core onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profile = profileRow.profile as any;

    // Load interview + context summary
    const { data: interviewRow, error: interviewError } = await supabase
      .from("founder_interviews")
      .select("context_summary")
      .eq("id", body.interview_id)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (interviewError) {
      console.error("finalize-founder-profile: error fetching interview", interviewError);
      return new Response(
        JSON.stringify({ error: "Failed to load interview" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!interviewRow || !interviewRow.context_summary) {
      return new Response(
        JSON.stringify({ error: "Interview context summary not found. Run summary first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx = interviewRow.context_summary as any;

    // Merge AI-inferred signals into the profile without overwriting explicit user inputs
    profile.primaryDesires = mergeUnique(profile.primaryDesires, ctx.inferredPrimaryDesires);
    profile.founderRoles = mergeUnique(profile.founderRoles, ctx.inferredFounderRoles);
    profile.workStylePreferences = mergeUnique(profile.workStylePreferences, ctx.inferredWorkStyle);
    profile.marketSegmentsUnderstood = mergeUnique(
      profile.marketSegmentsUnderstood,
      ctx.inferredMarketSegments,
    );
    profile.hellNoFilters = mergeUnique(profile.hellNoFilters, ctx.inferredHellNoFilters);
    profile.businessArchetypes = mergeUnique(profile.businessArchetypes, ctx.inferredArchetypes);

    const nowIso = new Date().toISOString();
    profile.updatedAt = nowIso;
    if (!profile.createdAt) {
      profile.createdAt = nowIso;
    }

    const payload = {
      user_id: resolvedUserId,
      profile,
      hours_per_week: profile.hoursPerWeek ?? null,
      risk_tolerance: profile.riskTolerance ?? null,
      commitment_level: profile.commitmentLevel ?? null,
      passions_text: profile.passionsText ?? null,
      passions_tags: profile.passionDomains ?? null,
      skills_text: profile.skillsText ?? null,
      skills_tags: profile.skillTags ?? null,
      time_per_week: profile.hoursPerWeek ?? null,
      capital_available: profile.availableCapital ?? null,
      lifestyle_goals: profile.lifestyleGoalsText ?? null,
      success_vision: profile.visionOfSuccessText ?? null,
    } as const;

    const { data: updated, error: updateError } = await supabase
      .from("founder_profiles")
      .update(payload as any)
      .eq("user_id", resolvedUserId)
      .select("id");

    if (updateError) {
      console.error("finalize-founder-profile: error updating profile", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update founder profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!updated || updated.length === 0) {
      const { error: insertError } = await supabase
        .from("founder_profiles")
        .insert(payload as any);

      if (insertError) {
        console.error("finalize-founder-profile: error inserting profile", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to insert founder profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
