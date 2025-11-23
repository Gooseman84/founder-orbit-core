import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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
}

export const useIdeas = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ideas = [], isLoading, error } = useQuery({
    queryKey: ["ideas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("ideas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Idea[];
    },
    enabled: !!user,
  });

  const generateIdeas = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-ideas", {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    },
  });

  return {
    ideas,
    isLoading,
    error,
    generateIdeas,
  };
};
