import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MarketValidationBadgeProps {
  ideaId: string;
  size?: "sm" | "md";
}

export function MarketValidationBadge({ ideaId, size = "sm" }: MarketValidationBadgeProps) {
  const { user } = useAuth();

  const { data: validation } = useQuery({
    queryKey: ["market-validation-badge", ideaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("market_validations")
        .select("validation_score, market_timing")
        .eq("idea_id", ideaId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!ideaId,
    staleTime: 5 * 60 * 1000,
  });

  if (!validation) return null;

  const score = validation.validation_score;
  const timing = validation.market_timing;

  const TimingIcon = timing === "growing" ? TrendingUp : timing === "declining" ? TrendingDown : Minus;
  const timingColor = timing === "growing" ? "text-green-500" : timing === "declining" ? "text-destructive" : "text-muted-foreground";
  const scoreColor = score >= 70 ? "text-green-500" : score >= 40 ? "text-amber-500" : "text-destructive";

  if (size === "sm") {
    return (
      <span className={`font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 border-border bg-transparent inline-flex items-center gap-1 ${scoreColor}`}>
        <TimingIcon className="w-3 h-3" />
        MKT: {score}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 border-border bg-transparent inline-flex items-center gap-1 ${scoreColor}`}>
        <TimingIcon className="w-3 h-3" />
        MARKET: {score}/100
      </span>
      <span className={`font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 border-border bg-transparent ${timingColor}`}>
        {timing}
      </span>
    </div>
  );
}
