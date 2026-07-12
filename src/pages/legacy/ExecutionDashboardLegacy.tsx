// Legacy execution dashboard mount — preserves prior UI for review.
import { useVentureState } from "@/hooks/useVentureState";
import { ExecutionDashboard } from "@/components/dashboard/ExecutionDashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function LegacyExecutionDashboard() {
  const { activeVenture, isLoading } = useVentureState();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!activeVenture) return <div className="p-6">No active venture.</div>;
  return (
    <div>
      <div className="text-xs font-mono uppercase text-muted-foreground mb-4">Legacy view</div>
      <ExecutionDashboard venture={activeVenture} />
    </div>
  );
}
