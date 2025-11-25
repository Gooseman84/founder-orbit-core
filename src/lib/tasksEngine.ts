import { supabase } from "@/integrations/supabase/client";

interface TaskInput {
  founder_profile: any;
  idea: any;
  analysis: any;
}

interface RawTask {
  type?: string;
  title: string;
  description?: string;
  xp_reward?: number;
  metadata?: Record<string, any>;
}

interface FormattedTask {
  type: "micro" | "quest";
  title: string;
  description: string;
  xp_reward: number;
  metadata: Record<string, any>;
}

/**
 * Builds the input object for task generation
 * Fetches founder profile, chosen idea, and its analysis
 */
export async function buildTaskInput(userId: string): Promise<TaskInput | null> {
  try {
    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching founder profile:", profileError);
      throw new Error("Failed to fetch founder profile");
    }

    if (!profile) {
      throw new Error("No founder profile found. Please complete onboarding first.");
    }

    // Fetch chosen idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) {
      console.error("Error fetching chosen idea:", ideaError);
      throw new Error("Failed to fetch chosen idea");
    }

    if (!idea) {
      throw new Error("No chosen idea found. Please choose an idea first.");
    }

    // Fetch latest analysis for the chosen idea
    const { data: analysis, error: analysisError } = await supabase
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) {
      console.error("Error fetching idea analysis:", analysisError);
      throw new Error("Failed to fetch idea analysis");
    }

    if (!analysis) {
      throw new Error("No analysis found for chosen idea. Please analyze the idea first.");
    }

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
    };
  } catch (error) {
    console.error("Error building task input:", error);
    throw error;
  }
}

/**
 * Formats and validates raw tasks from LLM output
 * Applies defaults and enforces schema
 */
export function formatTasks(rawTasks: RawTask[]): FormattedTask[] {
  if (!Array.isArray(rawTasks)) {
    throw new Error("Tasks must be an array");
  }

  return rawTasks.map((task, index) => {
    // Validate required fields
    if (!task.title || typeof task.title !== "string") {
      throw new Error(`Task at index ${index} is missing a valid title`);
    }

    // Enforce type: must be "micro" or "quest", default to "micro"
    let type: "micro" | "quest" = "micro";
    if (task.type === "quest" || task.type === "micro") {
      type = task.type;
    }

    // Apply defaults
    const xp_reward = typeof task.xp_reward === "number" && task.xp_reward > 0
      ? task.xp_reward
      : 10;

    const description = typeof task.description === "string" 
      ? task.description 
      : "";

    const metadata = typeof task.metadata === "object" && task.metadata !== null
      ? task.metadata
      : {};

    return {
      type,
      title: task.title.trim(),
      description: description.trim(),
      xp_reward,
      metadata,
    };
  });
}
