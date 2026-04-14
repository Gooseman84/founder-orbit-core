// supabase/functions/_shared/getCompoundedContext.ts
// Fetches the latest compounded founder context snapshot for a venture.
// Returns null if no snapshot exists yet.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface CompoundedSnapshot {
  executionProfile: {
    completionRate7d: number;
    completionRate30d: number;
    avgEnergyLevel: number | null;
    avgStressLevel: number | null;
    energyTrend: "rising" | "falling" | "stable" | "unknown";
    topCategories: string[];
    weakCategories: string[];
  };
  validatedLearnings: string[];
  activeBlockers: string[];
  behavioralFlags: string[];
  marketIntelligence: {
    strongDemandSignals: string[];
    competitorCount: number;
    timingAssessment: string;
  };
  founderStrengths: string[];
  routingSignal: any | null;
  snapshotSummary: string;
}

export async function getCompoundedContext(
  supabase: SupabaseClient,
  userId: string,
  ventureId: string
): Promise<CompoundedSnapshot | null> {
  const { data } = await supabase
    .from("founder_context_snapshots")
    .select("snapshot")
    .eq("user_id", userId)
    .eq("venture_id", ventureId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.snapshot as CompoundedSnapshot) ?? null;
}

export function formatSnapshotForPrompt(snapshot: CompoundedSnapshot): string {
  const ep = snapshot.executionProfile;
  return `## FOUNDER INTELLIGENCE SNAPSHOT (pre-computed)
- Task Completion: ${Math.round(ep.completionRate7d * 100)}% (7d), ${Math.round(ep.completionRate30d * 100)}% (30d)
- Energy: ${ep.avgEnergyLevel ?? "unknown"}/5 (trend: ${ep.energyTrend})
- Stress: ${ep.avgStressLevel ?? "unknown"}/5
- Strong Categories: ${ep.topCategories.join(", ") || "none yet"}
- Weak Categories: ${ep.weakCategories.join(", ") || "none yet"}
- Active Blockers: ${snapshot.activeBlockers.join(" | ") || "none"}
- Behavioral Flags: ${snapshot.behavioralFlags.join(", ") || "none"}
- Validated Learnings: ${snapshot.validatedLearnings.length > 0 ? snapshot.validatedLearnings.map(l => `"${l}"`).join("; ") : "none yet"}
- Market Signals: ${snapshot.marketIntelligence.strongDemandSignals.join(", ") || "none"} (${snapshot.marketIntelligence.competitorCount} competitors, timing: ${snapshot.marketIntelligence.timingAssessment})
- Summary: ${snapshot.snapshotSummary}`;
}
