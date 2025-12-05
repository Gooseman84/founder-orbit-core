// src/lib/founderProfileApi.ts
// Helper functions for reading and writing normalized founder profiles

import { supabase } from "@/integrations/supabase/client";
import type { FounderProfile } from "@/types/founderProfile";

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
