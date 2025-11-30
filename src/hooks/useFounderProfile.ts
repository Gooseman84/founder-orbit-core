import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingData } from "@/types/onboarding";
import { ExtendedIntakeData } from "@/hooks/useExtendedIntake";
import {
  BusinessArchetype,
  WorkPreference,
  PersonalityFlags,
} from "@/types/intake";

export type FounderProfileData = {
  id: string;
  user_id: string;
  passions_text: string | null;
  passions_tags: string[] | null;
  skills_text: string | null;
  skills_tags: string[] | null;
  tech_level: string | null;
  time_per_week: number | null;
  capital_available: number | null;
  risk_tolerance: string | null;
  lifestyle_goals: string | null;
  success_vision: string | null;
  created_at: string;
};

export type ExtendedProfileData = {
  id: string;
  user_id: string;
  deep_desires: string | null;
  fears: string | null;
  identity_statements: string | null;
  energy_givers: string | null;
  energy_drainers: string | null;
  business_archetypes: BusinessArchetype[] | null;
  work_preferences: WorkPreference[] | null;
  personality_flags: PersonalityFlags | null;
  created_at: string;
  updated_at: string;
};

export type CombinedProfile = {
  core: FounderProfileData | null;
  extended: ExtendedProfileData | null;
  hasCore: boolean;
  hasExtended: boolean;
};

export function useFounderProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CombinedProfile>({
    core: null,
    extended: null,
    hasCore: false,
    hasExtended: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch both tables in parallel
      const [coreResult, extendedResult] = await Promise.all([
        supabase
          .from("founder_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_intake_extended")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (coreResult.error) throw coreResult.error;
      if (extendedResult.error) throw extendedResult.error;

      const coreData = coreResult.data as FounderProfileData | null;
      const extendedData = extendedResult.data as ExtendedProfileData | null;

      setProfile({
        core: coreData,
        extended: extendedData,
        hasCore: !!coreData,
        hasExtended: !!extendedData,
      });
    } catch (err) {
      console.error("Error fetching founder profile:", err);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refresh: fetchProfile,
  };
}
