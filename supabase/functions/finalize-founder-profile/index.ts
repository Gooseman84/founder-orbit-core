import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Merge text fields intelligently - append new insights if they add value
function mergeText(existing: string | null | undefined, inferred: string | null | undefined): string | null {
  if (!existing && !inferred) return null;
  if (!existing) return inferred || null;
  if (!inferred) return existing;
  
  // If inferred content is already contained in existing, skip
  if (existing.toLowerCase().includes(inferred.toLowerCase())) {
    return existing;
  }
  
  // Append with separator
  return `${existing}\n\n[From interview]: ${inferred}`;
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

    // ===== REQUEST BODY (no user_id required) =====
    const body = (await req.json().catch(() => ({}))) as FinalizeRequestBody;

    if (!body.interview_id) {
      return new Response(
        JSON.stringify({ error: "Missing interview_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load existing founder profile with ALL fields (including structured onboarding)
    const { data: existingProfile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (profileError) {
      console.error("finalize-founder-profile: error fetching profile", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to load founder profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let resolvedProfile = existingProfile;

    if (!resolvedProfile) {
      console.log("finalize-founder-profile: Creating new founder profile from interview data");
      const nowForInsert = new Date().toISOString();
      const { data: newProfile, error: insertError } = await supabase
        .from("founder_profiles")
        .insert({ user_id: resolvedUserId, profile: {}, interview_completed_at: nowForInsert })
        .select("*")
        .single();

      if (insertError || !newProfile) {
        console.error("finalize-founder-profile: error creating profile", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create founder profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      resolvedProfile = newProfile;
    }

    let profile = (resolvedProfile.profile as any) || {};

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

    // Build payload that PRESERVES structured onboarding data and ADDS interview insights
    const payload: Record<string, any> = {
      user_id: resolvedUserId,
      profile,
      
      // Store the full interview context summary
      context_summary: ctx,
      interview_completed_at: nowIso,
      
      // Keep existing structured onboarding fields (don't overwrite with nulls)
      // Only update if profile has values
      hours_per_week: profile.hoursPerWeek ?? resolvedProfile.hours_per_week,
      risk_tolerance: profile.riskTolerance ?? resolvedProfile.risk_tolerance,
      commitment_level: profile.commitmentLevel ?? resolvedProfile.commitment_level,
      time_per_week: profile.hoursPerWeek ?? resolvedProfile.time_per_week,
      capital_available: profile.availableCapital ?? resolvedProfile.capital_available,
      
      // Merge text fields - append interview insights to structured data
      passions_text: mergeText(resolvedProfile.passions_text, ctx.inferredPrimaryDesires?.join(', ')),
      skills_text: mergeText(resolvedProfile.skills_text, ctx.inferredFounderRoles?.join(', ')),
      lifestyle_goals: mergeText(resolvedProfile.lifestyle_goals, ctx.inferredWorkStyle?.join(', ')),
      success_vision: mergeText(resolvedProfile.success_vision, profile.visionOfSuccessText),
      
      // Merge array fields
      passions_tags: mergeUnique(resolvedProfile.passions_tags, profile.passionDomains),
      skills_tags: mergeUnique(resolvedProfile.skills_tags, profile.skillTags),
    };

    console.log("finalize-founder-profile: merging structured + interview data", {
      hasStructuredData: !!resolvedProfile.structured_onboarding_completed_at,
      hasInterviewData: !!ctx,
      entryTrigger: resolvedProfile.entry_trigger,
      futureVision: resolvedProfile.future_vision,
    });

    const { data: updated, error: updateError } = await supabase
      .from("founder_profiles")
      .update(payload)
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
