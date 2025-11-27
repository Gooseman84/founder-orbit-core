import { SupabaseClient } from "@supabase/supabase-js";
import { UserIntakeExtended, PersonalityFlags, BusinessArchetype, WorkPreference } from "@/types/intake";

export type UpsertUserIntakeExtendedInput = {
  deep_desires?: string;
  fears?: string;
  identity_statements?: string;
  energy_givers?: string;
  energy_drainers?: string;
  business_archetypes?: BusinessArchetype[];
  work_preferences?: WorkPreference[];
  personality_flags?: PersonalityFlags;
};

export async function getUserIntakeExtended(
  supabase: SupabaseClient
): Promise<UserIntakeExtended | null> {
  const { data, error } = await supabase
    .from("user_intake_extended")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserIntakeExtended) ?? null;
}

export async function upsertUserIntakeExtended(
  supabase: SupabaseClient,
  userId: string,
  payload: UpsertUserIntakeExtendedInput
): Promise<UserIntakeExtended> {
  const { data, error } = await supabase
    .from("user_intake_extended")
    .upsert({ ...payload, user_id: userId }, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as UserIntakeExtended;
}
