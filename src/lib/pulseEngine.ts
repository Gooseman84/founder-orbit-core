import { supabase } from "@/integrations/supabase/client";

export interface PulseInput {
  energy_level: number;
  stress_level: number;
  emotional_state: string;
  reflection: string;
  latest_feed_item?: any;
  chosen_idea?: any;
}

export interface MicroTask {
  title: string;
  description: string;
  xp_reward: number;
}

export interface PulseResult {
  ai_insight: string;
  recommended_action: string;
  micro_task: MicroTask;
}

/**
 * Builds input data for pulse check AI analysis
 * @param userId - The user's ID
 * @param pulseData - The pulse check data (energy, stress, emotional state, reflection)
 * @returns JSON object ready for LLM input
 */
export async function buildPulseInput(
  userId: string,
  pulseData: {
    energy_level: number;
    stress_level: number;
    emotional_state: string;
    reflection: string;
  }
): Promise<PulseInput> {
  // Fetch founder profile
  const { data: profile } = await supabase
    .from("founder_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Fetch chosen idea
  const { data: idea } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "chosen")
    .maybeSingle();

  // Fetch latest feed item (optional)
  const { data: feedItem } = await supabase
    .from("feed_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    energy_level: pulseData.energy_level,
    stress_level: pulseData.stress_level,
    emotional_state: pulseData.emotional_state,
    reflection: pulseData.reflection,
    latest_feed_item: feedItem || undefined,
    chosen_idea: idea || undefined,
  };
}

/**
 * Validates and formats the AI-generated pulse result
 * @param rawJson - Raw JSON response from LLM
 * @returns Validated and formatted pulse result
 */
export function formatPulseResult(rawJson: any): PulseResult {
  // Ensure required fields exist and are strings
  const ai_insight = typeof rawJson.ai_insight === "string" 
    ? rawJson.ai_insight.trim() 
    : "Keep moving forward, one step at a time.";

  const recommended_action = typeof rawJson.recommended_action === "string"
    ? rawJson.recommended_action.trim()
    : "Take a moment to review your progress today.";

  // Validate micro_task structure
  const micro_task: MicroTask = {
    title: typeof rawJson.micro_task?.title === "string"
      ? rawJson.micro_task.title.trim()
      : "Review your goals",
    description: typeof rawJson.micro_task?.description === "string"
      ? rawJson.micro_task.description.trim()
      : "Take 5 minutes to reflect on your current priorities.",
    xp_reward: typeof rawJson.micro_task?.xp_reward === "number" && rawJson.micro_task.xp_reward > 0
      ? rawJson.micro_task.xp_reward
      : 5,
  };

  return {
    ai_insight,
    recommended_action,
    micro_task,
  };
}
