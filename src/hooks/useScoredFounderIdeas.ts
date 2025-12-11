import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";
import type { FounderProfile } from "@/types/founderProfile";
import { scoreIdeaForFounder, scoreV6IdeaForFounder, type IdeaScoreBreakdown } from "@/lib/ideaScoring";
import { useFounderIdeas } from "@/hooks/useFounderIdeas";

// Support both legacy and v6 ideas
export interface ScoredIdea {
  idea: BusinessIdea | BusinessIdeaV6;
  scores: IdeaScoreBreakdown;
  isV6: boolean;
}

interface UseScoredFounderIdeasResult {
  scoredIdeas: ScoredIdea[];
  isLoading: boolean;
  error: Error | null;
  generate: (params?: { mode?: string; focus_area?: string }) => Promise<void>;
  clearIdeas: () => void;
}

export const useScoredFounderIdeas = (): UseScoredFounderIdeasResult => {
  const { user } = useAuth();
  const { ideas, isPending, error, generate, clearIdeas } = useFounderIdeas();
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setIsProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("founder_profiles")
          .select("profile")
          .eq("user_id", user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data?.profile as unknown as FounderProfile);
      } catch (e: unknown) {
        console.error("Error loading founder profile", e);
        setProfileError(e instanceof Error ? e : new Error("Failed to load profile"));
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const scoredIdeas: ScoredIdea[] = useMemo(() => {
    if (!profile || ideas.length === 0) return [];

    const scored = ideas.map((idea) => {
      // Check if this is a v6 idea
      const isV6 = idea.engineVersion === "v6" || "aiPattern" in idea;
      
      return {
        idea,
        scores: isV6 
          ? scoreV6IdeaForFounder(idea as BusinessIdeaV6, profile)
          : scoreIdeaForFounder(idea as BusinessIdea, profile),
        isV6,
      };
    });

    // Sort by overall score descending
    scored.sort((a, b) => b.scores.overall - a.scores.overall);
    return scored;
  }, [ideas, profile]);

  const combinedError = error ?? profileError;

  return {
    scoredIdeas,
    isLoading: isPending || isProfileLoading,
    error: combinedError instanceof Error ? combinedError : combinedError ? new Error(String(combinedError)) : null,
    generate,
    clearIdeas,
  };
};
