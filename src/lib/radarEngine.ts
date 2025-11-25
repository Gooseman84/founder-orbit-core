import { supabase } from "@/integrations/supabase/client";

export interface RadarInput {
  founder_profile: any;
  idea: any;
  analysis: any;
}

export interface RawRadarSignal {
  signal_type: string;
  title: string;
  description: string;
  priority_score?: number;
  recommended_action: string;
  metadata?: any;
}

export interface FormattedRadarSignal {
  signal_type: string;
  title: string;
  description: string;
  priority_score: number;
  recommended_action: string;
  metadata: any;
}

/**
 * Builds input data for radar signal generation
 * Fetches founder profile, chosen idea, and latest analysis
 */
export async function buildRadarInput(userId: string): Promise<RadarInput | null> {
  try {
    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      console.error("No founder profile found for user:", userId);
      return null;
    }

    // Fetch chosen idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) throw ideaError;
    if (!idea) {
      console.error("No chosen idea found for user:", userId);
      return null;
    }

    // Fetch latest idea analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) {
      console.error("No analysis found for chosen idea:", idea.id);
      return null;
    }

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
    };
  } catch (error) {
    console.error("Error building radar input:", error);
    return null;
  }
}

/**
 * Validates and formats raw radar signals from AI
 * Applies defaults and ensures proper structure
 */
export function formatRadarSignals(rawSignals: RawRadarSignal[]): FormattedRadarSignal[] {
  if (!Array.isArray(rawSignals)) {
    console.error("Invalid signals format: expected array");
    return [];
  }

  return rawSignals
    .filter((signal) => {
      // Validate required fields
      if (!signal.signal_type || !signal.title || !signal.description || !signal.recommended_action) {
        console.warn("Skipping invalid signal:", signal);
        return false;
      }

      // Validate signal_type
      const validTypes = ["trend", "problem", "market_shift", "consumer_behavior", "tech_tailwind"];
      if (!validTypes.includes(signal.signal_type)) {
        console.warn("Invalid signal_type:", signal.signal_type);
        return false;
      }

      return true;
    })
    .map((signal) => ({
      signal_type: signal.signal_type,
      title: signal.title.trim(),
      description: signal.description.trim(),
      priority_score: Math.round(Number(signal.priority_score ?? 50)), // Ensure integer
      recommended_action: signal.recommended_action.trim(),
      metadata: signal.metadata ?? {},
    }));
}
