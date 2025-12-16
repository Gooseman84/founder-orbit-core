// supabase/functions/recalculate-fit-scores/index.ts
// Computes fit scores for an idea against founder profile
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Scoring functions (server-side implementation)
function overlapScore(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map(s => s.toLowerCase().trim()));
  const setB = new Set(b.map(s => s.toLowerCase().trim()));
  let matches = 0;
  for (const item of setA) {
    if (setB.has(item)) matches++;
  }
  return Math.round((matches / setA.size) * 100);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeFitScores(idea: any, profile: any): {
  overall: number;
  passion: number;
  skill: number;
  constraints: number;
  lifestyle: number;
} {
  const founderProfile = profile?.profile || {};
  
  // Passion fit: check description/category against passions
  const passionTags = profile?.passions_tags || founderProfile?.passionTags || [];
  const ideaText = `${idea.title} ${idea.description} ${idea.category} ${idea.business_model_type}`.toLowerCase();
  const passionMatches = passionTags.filter((p: string) => ideaText.includes(p.toLowerCase())).length;
  const passionFit = clamp(passionTags.length > 0 ? (passionMatches / passionTags.length) * 100 : 50);

  // Skill fit: check against skills
  const skillTags = profile?.skills_tags || founderProfile?.skillTags || [];
  const skillMatches = skillTags.filter((s: string) => ideaText.includes(s.toLowerCase())).length;
  const skillFit = clamp(skillTags.length > 0 ? (skillMatches / skillTags.length) * 100 : 50);

  // Constraints fit: time, capital, risk
  const hoursPerWeek = profile?.hours_per_week || founderProfile?.hoursPerWeek || 20;
  const capitalAvailable = profile?.capital_available || founderProfile?.availableCapital || 5000;
  const riskTolerance = profile?.risk_tolerance || founderProfile?.riskTolerance || "medium";
  
  // Lower complexity = better constraints fit
  const complexityMap: Record<string, number> = { low: 90, medium: 70, high: 50 };
  const complexityScore = complexityMap[idea.complexity?.toLowerCase()] || 70;
  
  // Time to first dollar affects constraints
  const timeMap: Record<string, number> = { 
    "0-30d": 100, "1-2 weeks": 95, "2-4 weeks": 85, "1 month": 80, 
    "1-3 months": 60, "3-6 months": 40 
  };
  const timeScore = timeMap[idea.time_to_first_dollar] || 60;
  
  const constraintsFit = clamp((complexityScore + timeScore) / 2);

  // Lifestyle fit: autonomy, automation levels from v6 metrics
  const autonomyLevel = idea.autonomy_level || 50;
  const automationDensity = idea.automation_density || 50;
  const leverageScore = idea.leverage_score || 50;
  
  // Higher automation/autonomy = better lifestyle fit for most founders
  const lifestyleFit = clamp((autonomyLevel + automationDensity + leverageScore) / 3);

  // Overall weighted score
  const overall = clamp(
    passionFit * 0.25 +
    skillFit * 0.25 +
    constraintsFit * 0.25 +
    lifestyleFit * 0.25
  );

  return {
    overall,
    passion: passionFit,
    skill: skillFit,
    constraints: constraintsFit,
    lifestyle: lifestyleFit,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const body = await req.json().catch(() => ({}));
    const { ideaId } = body;

    if (!ideaId || typeof ideaId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing ideaId", code: "INVALID_REQUEST" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`recalculate-fit-scores: user=${userId}, idea=${ideaId}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch idea (ensure ownership)
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", userId)
      .single();

    if (ideaError || !idea) {
      return new Response(
        JSON.stringify({ error: "Idea not found", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile
    const { data: profile } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Founder profile not found", code: "PROFILE_MISSING" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute fit scores
    const fitScores = computeFitScores(idea, profile);

    // Update idea with fit_scores jsonb AND legacy columns
    const { error: updateError } = await supabase
      .from("ideas")
      .update({
        fit_scores: fitScores,
        overall_fit_score: fitScores.overall,
        passion_fit_score: fitScores.passion,
        skill_fit_score: fitScores.skill,
        constraint_fit_score: fitScores.constraints,
        lifestyle_fit_score: fitScores.lifestyle,
      })
      .eq("id", ideaId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("recalculate-fit-scores: Update failed", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save scores", code: "UPDATE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`recalculate-fit-scores: Saved scores for idea ${ideaId}`, fitScores);

    return new Response(
      JSON.stringify({ fit_scores: fitScores }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("recalculate-fit-scores: Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
