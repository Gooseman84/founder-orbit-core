// src/hooks/useIdeaDetail.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Idea } from "./useIdeas";

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
  const { data, error } = await supabase.functions.invoke("analyze-idea", {
    body: { ideaId },
  });

  if (error) throw error;
  return data;
};

const updateIdeaStatusInDb = async (ideaId: string, userId: string, status: string): Promise<Idea> => {
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

export const useIdeaDetail = (ideaId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: idea,
    isLoading: ideaLoading,
    error: ideaError,
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

  const analyzeIdea = useMutation({
    mutationFn: () => {
      if (!ideaId) throw new Error("No idea ID");
      return invokeAnalyzeIdea(ideaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea-analysis", ideaId] });
    },
  });

  const updateIdeaStatus = useMutation({
    mutationFn: (status: string) => {
      if (!ideaId || !user) throw new Error("Missing required data");
      return updateIdeaStatusInDb(ideaId, user.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea", ideaId] });
      queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    },
  });

  return {
    idea,
    analysis,
    isLoading: ideaLoading || analysisLoading,
    error: ideaError,
    analyzeIdea,
    updateIdeaStatus,
  };
};
