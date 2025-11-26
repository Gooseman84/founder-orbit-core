import { supabase } from "@/integrations/supabase/client";

/**
 * Build the input structure for opportunity score calculation
 * @param userId - User ID
 * @param ideaId - Idea ID
 * @returns Input object for AI prompt
 */
export async function buildOpportunityInput(userId: string, ideaId: string) {
  // Load founder profile
  const { data: founderProfile, error: profileError } = await supabase
    .from("founder_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching founder profile:", profileError);
    throw new Error("Failed to load founder profile");
  }

  if (!founderProfile) {
    throw new Error("Founder profile not found. Please complete onboarding first.");
  }

  // Load idea
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();

  if (ideaError) {
    console.error("Error fetching idea:", ideaError);
    throw new Error("Failed to load idea");
  }

  if (!idea) {
    throw new Error("Idea not found");
  }

  // Load latest idea analysis
  const { data: analysis, error: analysisError } = await supabase
    .from("idea_analysis")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (analysisError) {
    console.error("Error fetching idea analysis:", analysisError);
    throw new Error("Failed to load idea analysis");
  }

  if (!analysis) {
    throw new Error("Idea analysis not found. Please analyze the idea first.");
  }

  // Build input structure matching prompt expectations
  return {
    founder_profile: {
      passions_text: founderProfile.passions_text,
      passions_tags: founderProfile.passions_tags,
      skills_text: founderProfile.skills_text,
      skills_tags: founderProfile.skills_tags,
      tech_level: founderProfile.tech_level,
      time_per_week: founderProfile.time_per_week,
      capital_available: founderProfile.capital_available,
      risk_tolerance: founderProfile.risk_tolerance,
      lifestyle_goals: founderProfile.lifestyle_goals,
      success_vision: founderProfile.success_vision,
    },
    idea: {
      title: idea.title,
      description: idea.description,
      business_model_type: idea.business_model_type,
      target_customer: idea.target_customer,
      time_to_first_dollar: idea.time_to_first_dollar,
      complexity: idea.complexity,
      passion_fit_score: idea.passion_fit_score,
      skill_fit_score: idea.skill_fit_score,
      constraint_fit_score: idea.constraint_fit_score,
      lifestyle_fit_score: idea.lifestyle_fit_score,
      overall_fit_score: idea.overall_fit_score,
    },
    analysis: {
      niche_score: analysis.niche_score,
      market_insight: analysis.market_insight,
      problem_intensity: analysis.problem_intensity,
      competition_snapshot: analysis.competition_snapshot,
      pricing_power: analysis.pricing_power,
      success_likelihood: analysis.success_likelihood,
      biggest_risks: analysis.biggest_risks,
      unfair_advantages: analysis.unfair_advantages,
      recommendations: analysis.recommendations,
      ideal_customer_profile: analysis.ideal_customer_profile,
      elevator_pitch: analysis.elevator_pitch,
      brutal_honesty: analysis.brutal_honesty,
    },
  };
}

/**
 * Validate and clean the AI response for opportunity score
 * @param rawJson - Raw response from AI
 * @returns Validated and cleaned score object
 */
export function validateScoreResponse(rawJson: any) {
  // Ensure we have an object
  if (!rawJson || typeof rawJson !== "object") {
    throw new Error("Invalid score response: not an object");
  }

  // Validate total_score
  let totalScore = rawJson.total_score;
  if (typeof totalScore !== "number" || isNaN(totalScore)) {
    totalScore = 0;
  }
  totalScore = Math.max(0, Math.min(100, totalScore)); // Clamp to 0-100

  // Validate sub_scores
  const subScores = rawJson.sub_scores || {};
  const validatedSubScores = {
    founder_fit: validateSubScore(subScores.founder_fit),
    market_size: validateSubScore(subScores.market_size),
    pain_intensity: validateSubScore(subScores.pain_intensity),
    competition: validateSubScore(subScores.competition),
    difficulty: validateSubScore(subScores.difficulty),
    tailwinds: validateSubScore(subScores.tailwinds),
  };

  // Validate explanation
  let explanation = rawJson.explanation;
  if (typeof explanation !== "string" || !explanation.trim()) {
    explanation = "No explanation provided.";
  }

  // Validate recommendations
  let recommendations = rawJson.recommendations;
  if (!Array.isArray(recommendations)) {
    recommendations = [];
  }
  // Ensure all recommendations are strings
  recommendations = recommendations
    .filter((r: any) => typeof r === "string" && r.trim())
    .map((r: string) => r.trim());

  // If no recommendations, provide a default
  if (recommendations.length === 0) {
    recommendations = ["Continue validating this opportunity with real customer conversations."];
  }

  return {
    total_score: totalScore,
    sub_scores: validatedSubScores,
    explanation: explanation.trim(),
    recommendations,
  };
}

/**
 * Helper function to validate a single sub-score
 * @param value - Sub-score value
 * @returns Validated sub-score (0-100)
 */
function validateSubScore(value: any): number {
  if (typeof value !== "number" || isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}
