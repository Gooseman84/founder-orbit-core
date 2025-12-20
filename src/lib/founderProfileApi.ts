// src/lib/founderProfileApi.ts
// Helper functions for reading and writing normalized founder profiles

import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { FounderProfile } from "@/types/founderProfile";
import type { FounderInterview, InterviewTurn } from "@/types/founderInterview";

const TABLE = "founder_profiles";

export async function getFounderProfile(userId: string): Promise<FounderProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("profile")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching founder profile:", error);
    throw error;
  }

  if (!data || !data.profile) {
    return null;
  }

  return data.profile as unknown as FounderProfile;
}

export async function upsertFounderProfile(
  userId: string,
  profile: FounderProfile
): Promise<void> {
  // Mirror key fields into top-level columns for indexing / filtering
  const payload = {
    user_id: userId,
    profile,
    hours_per_week: profile.hoursPerWeek,
    risk_tolerance: profile.riskTolerance,
    commitment_level: profile.commitmentLevel,
    // Maintain compatibility with existing columns used elsewhere in the app
    passions_text: profile.passionsText,
    passions_tags: profile.passionDomains,
    skills_text: profile.skillsText,
    skills_tags: profile.skillTags,
    time_per_week: profile.hoursPerWeek,
    capital_available: profile.availableCapital,
    lifestyle_goals: profile.lifestyleGoalsText,
    success_vision: profile.visionOfSuccessText,
    // EPIC v6 new fields
    work_personality: profile.workPersonality ?? [],
    creator_platforms: profile.creatorPlatforms ?? [],
    edgy_mode: profile.edgyMode ?? null,
    wants_money_systems: profile.wantsMoneySystems ?? false,
    open_to_personas: profile.openToPersonas ?? false,
    open_to_memetic_ideas: profile.openToMemeticIdeas ?? false,
  } as const;

  // Try update first to avoid needing a unique constraint on user_id
  const { data: updated, error: updateError } = await supabase
    .from(TABLE)
    .update(payload as any)
    .eq("user_id", userId)
    .select("id");

  if (updateError) {
    console.error("Error updating founder profile:", updateError);
    throw updateError;
  }

  if (updated && updated.length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from(TABLE).insert(payload as any);

  if (insertError) {
    console.error("Error inserting founder profile:", insertError);
    throw insertError;
  }
}

export async function normalizeFounderProfile(raw: any): Promise<FounderProfile> {
  const { data, error } = await invokeAuthedFunction<{ profile?: FounderProfile }>("normalize-founder-profile", {
    body: raw,
  });

  if (error) {
    console.error("Error normalizing founder profile:", error);
    throw new Error(error.message || "Failed to normalize founder profile");
  }

  if (!data || !data.profile) {
    throw new Error("Invalid response from normalize-founder-profile function");
  }

  return data.profile as FounderProfile;
}

export async function getOrCreateInterview(userId: string): Promise<FounderInterview> {
  const { data, error } = await supabase
    .from("founder_interviews")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .maybeSingle();

  if (error) {
    console.error("Error fetching interview:", error);
    throw error;
  }

  if (data) {
    return mapDbInterview(data);
  }

  const { data: created, error: insertError } = await supabase
    .from("founder_interviews")
    .insert({ user_id: userId, transcript: [] })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error creating interview:", insertError);
    throw insertError;
  }

  return mapDbInterview(created);
}

export async function updateInterviewTranscript(
  interviewId: string,
  transcript: InterviewTurn[],
  status: "in_progress" | "completed" = "in_progress",
  contextSummary?: any
): Promise<void> {
  const { error } = await supabase
    .from("founder_interviews")
    .update({
      transcript: transcript as any,
      status,
      context_summary: contextSummary ?? null,
    })
    .eq("id", interviewId);

  if (error) {
    console.error("Error updating interview:", error);
    throw error;
  }
}

function mapDbInterview(row: any): FounderInterview {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    transcript: (row.transcript ?? []) as InterviewTurn[],
    contextSummary: row.context_summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
