import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVentureState } from "@/hooks/useVentureState";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { ExecutionDashboard } from "@/components/dashboard/ExecutionDashboard";
import { DiscoveryDashboard } from "@/components/dashboard/DiscoveryDashboard";
import { ReEntryModal } from "@/components/dashboard/ReEntryModal";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHelp } from "@/components/shared/PageHelp";

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeVenture, isLoading } = useVentureState();
  const { shouldShowReEntryModal, previousVenture } = useOnboardingGuard();
  const [reEntryDismissed, setReEntryDismissed] = useState(false);

  // During execution or review, show focused execution dashboard
  const isExecuting = activeVenture?.venture_state === "executing" || activeVenture?.venture_state === "reviewed";

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
  return (
    <>
      <ReEntryModal
        isOpen={shouldShowReEntryModal && !reEntryDismissed}
        previousVenture={previousVenture}
        onStartFresh={() => navigate("/discover")}
        onUseExisting={() => navigate("/ideas")}
        onDismiss={() => setReEntryDismissed(true)}
      />
      <DiscoveryDashboard />
      <PageHelp
        title="Dashboard"
        bullets={[
          "Your XP bar tracks progress across all activities — generating ideas, completing tasks, and checking in daily.",
          "The North Star card shows your currently committed venture, or prompts you to choose one.",
          "Quick-action tiles show live stats for Niche Radar signals, workspace docs, and your top opportunity score.",
          "Compare Ideas lets you evaluate two saved ideas side-by-side (Pro feature).",
          "During execution mode, this view switches to a focused command center with daily tasks and check-ins.",
        ]}
      />
    </>
  );
};

export default Dashboard;
