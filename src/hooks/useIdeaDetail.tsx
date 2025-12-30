// src/hooks/useIdeaDetail.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Idea } from "./useIdeas";
import { recordXpEvent } from "@/lib/xpEngine";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

export interface IdeaAnalysis {
  id: string;
  user_id: string;
  idea_id: string;
  niche_score: number | null;
  market_insight: string | null;
  problem_intensity: string | null;
  competition_snapshot: string | null;
  pricing_power: string | null;
  success_likelihood: string | null;
  biggest_risks: any;
  unfair_advantages: any;
  recommendations: any;
  ideal_customer_profile: string | null;
  elevator_pitch: string | null;
  brutal_honesty: string | null;
  created_at: string;
}

const fetchIdea = async (ideaId: string, userId: string): Promise<Idea> => {
  const { data, error } = await supabase.from("ideas").select("*").eq("id", ideaId).eq("user_id", userId).single();

  if (error) throw error;
  return data;
};

const fetchIdeaAnalysis = async (ideaId: string, userId: string): Promise<IdeaAnalysis | null> => {
  const { data, error } = await supabase
    .from("idea_analysis")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const invokeAnalyzeIdea = async (ideaId: string) => {
  const { data, error } = await invokeAuthedFunction<any>(
    "analyze-idea",
    { body: { ideaId } }
  );

  if (error) throw error;
  return data;
};

const invokeScoreIdeaFit = async (ideaId: string, force = false) => {
  const { data, error } = await invokeAuthedFunction<any>(
    "score-idea-fit",
    { body: { ideaId, force } }
  );

  if (error) throw error;
  return data;
};

const updateIdeaStatusInDb = async (ideaId: string, userId: string, status: string): Promise<Idea> => {
  // If setting to "chosen", first set all other ideas to "candidate"
  if (status === "chosen") {
    const { error: resetError } = await supabase
      .from("ideas")
      .update({ status: "candidate" })
      .eq("user_id", userId)
      .neq("id", ideaId);

    if (resetError) throw resetError;
  }

  // Now update the current idea
  const { data, error } = await supabase
    .from("ideas")
    .update({ status })
    .eq("id", ideaId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Check if scores are missing (need lazy scoring)
const needsScoring = (idea: Idea | undefined): boolean => {
  if (!idea) return false;
  return idea.overall_fit_score === null || idea.overall_fit_score === undefined;
};

// Cooldown storage key
const getCooldownKey = (ideaId: string) => `score_fit_last_${ideaId}`;
const COOLDOWN_MS = 60 * 1000; // 60 seconds

const checkCooldown = (ideaId: string): { canScore: boolean; remainingSeconds: number } => {
  const lastTime = sessionStorage.getItem(getCooldownKey(ideaId));
  if (!lastTime) return { canScore: true, remainingSeconds: 0 };
  
  const elapsed = Date.now() - parseInt(lastTime, 10);
  if (elapsed >= COOLDOWN_MS) return { canScore: true, remainingSeconds: 0 };
  
  return { canScore: false, remainingSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000) };
};

const setCooldown = (ideaId: string) => {
  sessionStorage.setItem(getCooldownKey(ideaId), Date.now().toString());
};

export const useIdeaDetail = (ideaId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for lazy scoring
  const [isScoring, setIsScoring] = useState(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const scoringTriggeredRef = useRef(false);

  const {
    data: idea,
    isLoading: ideaLoading,
    error: ideaError,
    refetch: refetchIdea,
  } = useQuery({
    queryKey: ["idea", ideaId],
    queryFn: () => fetchIdea(ideaId!, user!.id),
    enabled: !!ideaId && !!user,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["idea-analysis", ideaId],
    queryFn: () => fetchIdeaAnalysis(ideaId!, user!.id),
    enabled: !!ideaId && !!user,
  });

  // Lazy scoring effect: trigger score-idea-fit when idea loads with missing scores
  useEffect(() => {
    const triggerLazyScoring = async () => {
      // Only score once per idea open (avoid double calls)
      if (scoringTriggeredRef.current) return;
      if (!idea || !ideaId || !user) return;
      if (!needsScoring(idea)) return;
      
      scoringTriggeredRef.current = true;
      setIsScoring(true);
      setScoringError(null);
      
      console.log("useIdeaDetail: triggering lazy scoring via score-idea-fit for", ideaId);
      
      try {
        const result = await invokeScoreIdeaFit(ideaId);
        
        if (result.success) {
          console.log("useIdeaDetail: scoring complete", result.scores);
          // Refresh the idea data to get updated scores
          await refetchIdea();
          // Invalidate related queries
          queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
          queryClient.invalidateQueries({ queryKey: ["idea", ideaId] });
          queryClient.invalidateQueries({ queryKey: ["idea-analysis", ideaId] });
          // Set cooldown after successful scoring
          setCooldown(ideaId);
        }
      } catch (error: any) {
        console.error("useIdeaDetail: lazy scoring failed", error);
        setScoringError(error.message || "Failed to score idea");
      } finally {
        setIsScoring(false);
      }
    };
    
    triggerLazyScoring();
  }, [idea, ideaId, user, refetchIdea, queryClient]);

  // Reset scoring triggered flag when ideaId changes
  useEffect(() => {
    scoringTriggeredRef.current = false;
    setScoringError(null);
  }, [ideaId]);

  // Re-score function (manual trigger with force)
  const reScore = useCallback(async (): Promise<{ success: boolean; cooldownMessage?: string }> => {
    if (!ideaId || !user) {
      return { success: false };
    }
    
    // Check cooldown
    const { canScore, remainingSeconds } = checkCooldown(ideaId);
    if (!canScore) {
      return { 
        success: false, 
        cooldownMessage: `Please wait ${remainingSeconds} seconds before re-scoring.` 
      };
    }
    
    setIsScoring(true);
    setScoringError(null);
    
    try {
      const result = await invokeScoreIdeaFit(ideaId, true); // force=true
      
      if (result.success) {
        console.log("useIdeaDetail: re-score complete", result.scores);
        await refetchIdea();
        queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
        queryClient.invalidateQueries({ queryKey: ["idea", ideaId] });
        queryClient.invalidateQueries({ queryKey: ["idea-analysis", ideaId] });
        setCooldown(ideaId);
        return { success: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error("useIdeaDetail: re-score failed", error);
      setScoringError(error.message || "Failed to re-score idea");
      return { success: false };
    } finally {
      setIsScoring(false);
    }
  }, [ideaId, user, refetchIdea, queryClient]);

  const analyzeIdea = useMutation({
    mutationFn: () => {
      if (!ideaId || !user) throw new Error("No idea ID or user");
      return invokeAnalyzeIdea(ideaId);
    },
    onSuccess: async () => {
      // Award XP for vetting an idea
      if (user?.id && ideaId) {
        await recordXpEvent(user.id, "idea_vetted", 30, { ideaId });
      }
      queryClient.invalidateQueries({ queryKey: ["idea-analysis", ideaId] });
      // Refresh XP summary
      queryClient.invalidateQueries({ queryKey: ["xp", user?.id] });
    },
  });

  const updateIdeaStatus = useMutation({
    mutationFn: (status: string) => {
      if (!ideaId || !user) throw new Error("Missing required data");
      return updateIdeaStatusInDb(ideaId, user.id, status);
    },
    onSuccess: async (_, status) => {
      // Award XP for choosing main idea
      if (status === "chosen" && user?.id && ideaId) {
        await recordXpEvent(user.id, "idea_chosen", 100, { ideaId });
      }
      queryClient.invalidateQueries({ queryKey: ["idea", ideaId] });
      queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
      // Refresh XP summary
      queryClient.invalidateQueries({ queryKey: ["xp", user?.id] });
    },
  });

  return {
    idea,
    analysis,
    isLoading: ideaLoading || analysisLoading,
    isScoring,
    scoringError,
    error: ideaError,
    analyzeIdea,
    updateIdeaStatus,
    refetch: refetchIdea,
    reScore,
  };
};
