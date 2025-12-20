// src/hooks/useIdeas.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { recordXpEvent } from "@/lib/xpEngine";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

export interface Idea {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  business_model_type: string | null;
  target_customer: string | null;
  time_to_first_dollar: string | null;
  complexity: string | null;
  passion_fit_score: number | null;
  skill_fit_score: number | null;
  constraint_fit_score: number | null;
  lifestyle_fit_score: number | null;
  overall_fit_score: number | null;
  status: string | null;
  created_at: string;
  // V6 fields
  category: string | null;
  platform: string | null;
  mode: string | null;
  engine_version: string | null;
  shock_factor: number | null;
  virality_potential: number | null;
  leverage_score: number | null;
  automation_density: number | null;
  autonomy_level: number | null;
  culture_tailwind: number | null;
  chaos_factor: number | null;
  // Multi-source fields
  source_type: string | null;
  source_meta: any;
  normalized: any;
  parent_idea_ids: string[] | null;
}

const fetchIdeas = async (userId: string): Promise<Idea[]> => {
  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const invokeGenerateIdeas = async () => {
  const { data, error } = await invokeAuthedFunction<{ ideas?: any[] }>("generate-ideas", {});

  if (error) throw error;
  return data;
};

export const useIdeas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: ideas = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ideas", user?.id],
    queryFn: () => fetchIdeas(user!.id),
    enabled: !!user,
  });

  const generateIdeas = useMutation({
    mutationFn: () => {
      if (!user?.id) {
        return Promise.reject(new Error("You must be logged in to generate ideas"));
      }
      return invokeGenerateIdeas();
    },
    onSuccess: async (data) => {
      // Award XP for generating ideas
      if (user?.id && data?.ideas) {
        await recordXpEvent(user.id, "idea_generated", 20, { 
          ideasCount: data.ideas.length 
        });
      }
      queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
      // Also refresh XP summary
      queryClient.invalidateQueries({ queryKey: ["xp", user?.id] });
    },
  });

  return {
    ideas,
    isLoading,
    error,
    generateIdeas,
  };
};
