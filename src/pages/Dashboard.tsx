import { useVentureState } from "@/hooks/useVentureState";
import { ExecutionDashboard } from "@/components/dashboard/ExecutionDashboard";
import { DiscoveryDashboard } from "@/components/dashboard/DiscoveryDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { activeVenture, isLoading } = useVentureState();
  
  // During execution, show focused execution dashboard
  const isExecuting = activeVenture?.venture_state === "executing";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Execution mode: focused command center
  if (isExecuting && activeVenture) {
    return <ExecutionDashboard venture={activeVenture} />;
  }

  // Discovery mode: full dashboard with exploration
  return <DiscoveryDashboard />;
};

export default Dashboard;
