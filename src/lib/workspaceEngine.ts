import { supabase } from "@/integrations/supabase/client";

export interface WorkspaceDocument {
  id: string;
  user_id: string;
  idea_id?: string;
  source_type?: string;
  source_id?: string;
  doc_type?: string;
  title: string;
  content?: string;
  ai_suggestions?: string;
  status?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceInput {
  founder_profile: any;
  idea: any;
  analysis: any;
  doc_type: string;
  title: string;
  current_content: string;
  trigger_context: {
    type: string;
    summary: string;
  };
}

export interface WorkspaceSuggestion {
  suggested_title: string;
  suggested_content: string;
  section_suggestions: string[];
}

/**
 * Builds input data for workspace document generation
 * Fetches founder profile, chosen idea, analysis, and trigger context
 */
export async function buildWorkspaceInput(
  userId: string,
  doc: WorkspaceDocument
): Promise<WorkspaceInput | null> {
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

    // Build trigger context based on source_type
    let triggerContext = {
      type: "manual",
      summary: "User started a manual document.",
    };

    if (doc.source_type === "feed" && doc.source_id) {
      const { data: feedItem, error: feedError } = await supabase
        .from("feed_items")
        .select("title, body")
        .eq("id", doc.source_id)
        .maybeSingle();

      if (!feedError && feedItem) {
        triggerContext = {
          type: "feed",
          summary: `${feedItem.title}: ${feedItem.body}`,
        };
      }
    } else if (doc.source_type === "task" && doc.source_id) {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("title, description")
        .eq("id", doc.source_id)
        .maybeSingle();

      if (!taskError && task) {
        triggerContext = {
          type: "task",
          summary: `${task.title}: ${task.description || ""}`,
        };
      }
    }

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
      doc_type: doc.doc_type || "brain_dump",
      title: doc.title,
      current_content: doc.content || "",
      trigger_context: triggerContext,
    };
  } catch (error) {
    console.error("Error building workspace input:", error);
    return null;
  }
}

/**
 * Validates and formats workspace suggestions from AI
 * Applies defaults and ensures proper structure
 */
export function formatWorkspaceSuggestion(rawJson: any): WorkspaceSuggestion {
  if (!rawJson || typeof rawJson !== "object") {
    console.error("Invalid workspace suggestion format");
    return {
      suggested_title: "Untitled Document",
      suggested_content: "",
      section_suggestions: [],
    };
  }

  return {
    suggested_title:
      typeof rawJson.suggested_title === "string" && rawJson.suggested_title.trim()
        ? rawJson.suggested_title.trim()
        : "Untitled Document",
    suggested_content:
      typeof rawJson.suggested_content === "string"
        ? rawJson.suggested_content.trim()
        : "",
    section_suggestions: Array.isArray(rawJson.section_suggestions)
      ? rawJson.section_suggestions
          .filter((s) => typeof s === "string" && s.trim())
          .map((s) => s.trim())
      : [],
  };
}
