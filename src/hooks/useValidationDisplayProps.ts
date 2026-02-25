import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ValidationDisplayProps {
  confidenceShift: string;
  lastValidatedAt: string | undefined;
  dimensionEvidenceCounts: Record<string, number>;
}

export const useValidationDisplayProps = (ventureId: string | null | undefined): ValidationDisplayProps & { isLoading: boolean } => {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["validation-summary-latest", ventureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_summaries")
        .select("confidence_shift, generated_at")
        .eq("venture_id", ventureId!)
        .eq("user_id", user!.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ventureId && !!user,
  });

  const { data: evidenceCounts, isLoading: evidenceLoading } = useQuery({
    queryKey: ["validation-evidence-counts", ventureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("validation_evidence")
        .select("fvs_dimension")
        .eq("venture_id", ventureId!)
        .eq("user_id", user!.id);
      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row.fvs_dimension) {
          counts[row.fvs_dimension] = (counts[row.fvs_dimension] || 0) + 1;
        }
      }
      return counts;
    },
    enabled: !!ventureId && !!user,
  });

  return {
    confidenceShift: summary?.confidence_shift ?? "assumption_based",
    lastValidatedAt: summary?.generated_at ?? undefined,
    dimensionEvidenceCounts: evidenceCounts ?? {},
    isLoading: summaryLoading || evidenceLoading,
  };
};
