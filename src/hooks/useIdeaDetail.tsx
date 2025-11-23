import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Idea } from "./useIdeas";

export interface IdeaAnalysis {
  id: string;
  user_id: string;
  idea_id: string;
  niche_score: number | null;
  market_overview: string | null;
  problem_intensity: string | null;
  competition_snapshot: string | null;
  pricing_range: string | null;
  main_risks: any;
  brutal_take: string | null;
  suggested_modifications: string | null;
  created_at: string;
}

export const useIdeaDetail = (ideaId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: idea, isLoading: ideaLoading, error: ideaError } = useQuery({
    queryKey: ["idea", ideaId],
    queryFn: async () => {
      if (!ideaId || !user) return null;
      
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("id", ideaId)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as Idea;
    },
    enabled: !!ideaId && !!user,
  });

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["idea-analysis", ideaId],
    queryFn: async () => {
      if (!ideaId || !user) return null;
      
      const { data, error } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", ideaId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as IdeaAnalysis | null;
    },
    enabled: !!ideaId && !!user,
  });

  const analyzeIdea = useMutation({
    mutationFn: async () => {
      if (!ideaId) throw new Error("No idea ID");
      
      const { data, error } = await supabase.functions.invoke("analyze-idea", {
        body: { idea_id: ideaId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea-analysis", ideaId] });
    },
  });

  const updateIdeaStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!ideaId || !user) throw new Error("Missing required data");
      
      const { data, error } = await supabase
        .from("ideas")
        .update({ status })
        .eq("id", ideaId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
