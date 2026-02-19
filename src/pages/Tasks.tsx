import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVentureState } from "@/hooks/useVentureState";
import { useDailyExecution } from "@/hooks/useDailyExecution";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useImplementationKitByBlueprint } from "@/hooks/useImplementationKit";
import { useToast } from "@/hooks/use-toast";
import { VentureContextHeader } from "@/components/tasks/VentureContextHeader";
import { ExecutionTaskCard } from "@/components/tasks/ExecutionTaskCard";
import { DailyCheckinForm } from "@/components/tasks/DailyCheckinForm";
import { ImplementationKitStatus } from "@/components/implementationKit/ImplementationKitStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Inbox, Plus, Calendar } from "lucide-react";

type CheckinPayload = {
  completionStatus: "yes" | "partial" | "no";
  explanation?: string;
  reflection: string;
};

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeVenture, isLoading: ventureLoading } = useVentureState();
  const { blueprint } = useBlueprint();
  const { data: implementationKit } = useImplementationKitByBlueprint(blueprint?.id);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  const {
    commitmentProgress,
    dailyTasks,
    isLoadingTasks,
    isGeneratingTasks,
    generateDailyTasksError,
    todayCheckin,
    hasCheckedInToday,
    allTasksCompleted,
    generateDailyTasks,
    submitCheckin,
    markTaskCompleted,
  } = useDailyExecution(activeVenture);

  // Redirect if not in executing state - with specific messages per state
  useEffect(() => {
    if (ventureLoading) return;
    
    // No active venture
    if (!activeVenture) {
      toast({
        title: "No Active Venture",
        description: "Set a North Star idea and start a commitment to access Tasks.",
      });
      navigate("/dashboard", { replace: true });
      return;
    }

    const state = activeVenture.venture_state;

    // Reviewed state - commitment ended
    if (state === "reviewed") {
      toast({
        title: "Commitment Ended",
        description: "Complete your Venture Review to proceed.",
      });
      navigate("/venture-review", { replace: true });
      return;
    }

    // Any other non-executing state
    if (state !== "executing") {
      toast({
        title: "Section Locked",
        description: "Tasks are only available while executing a venture.",
      });
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [activeVenture, ventureLoading, navigate, toast]);

  // Check if commitment window has ended
  const windowEnded = commitmentProgress?.isComplete;

  useEffect(() => {
    if (windowEnded && activeVenture) {
      toast({
        title: "Commitment Window Complete",
        description: "Your commitment period has ended. Time to review!",
      });
      navigate("/venture-review", { replace: true });
    }
  }, [windowEnded, activeVenture, navigate, toast]);

  // Auto-generate tasks if none exist for today
  useEffect(() => {
    if (!isLoadingTasks && dailyTasks.length === 0 && !isGeneratingTasks && activeVenture && activeVenture.venture_state === "executing") {
      generateDailyTasks();
    }
  }, [isLoadingTasks, dailyTasks.length, isGeneratingTasks, activeVenture, generateDailyTasks]);

  const handleCheckinSubmit = async (data: CheckinPayload) => {
    setIsSubmittingCheckin(true);
    const success = await submitCheckin(data);
    setIsSubmittingCheckin(false);
    if (success) {
      toast({ title: "Check-in submitted!", description: "Great work today." });
    }
    return success;
  };

  // Handler for generating more tasks (append mode)
  // Note: We allow generating more tasks even after check-in if all tasks are complete.
  // This enables "power mode" where users can keep executing without being speed-limited.
  const handleGenerateMoreTasks = async () => {
    await generateDailyTasks({ append: true });
    
    // Show error toast if rate limited
    if (generateDailyTasksError?.includes("enough tasks for today")) {
      toast({
        title: "Task Limit Reached",
        description: generateDailyTasksError,
        variant: "destructive",
      });
    }
  };

  // Show loading while venture state is being determined
  if (ventureLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not executing, show nothing (redirect will happen)
  if (!activeVenture || activeVenture.venture_state !== "executing") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine if "Generate more tasks" button should be shown
  // Conditions: executing state + tasks exist + all completed
  // We allow this even after check-in so users aren't speed-limited
  const showGenerateMoreButton = 
    activeVenture.venture_state === "executing" &&
    dailyTasks.length > 0 &&
    allTasksCompleted &&
    !isGeneratingTasks;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Venture Context Header */}
      <VentureContextHeader venture={activeVenture} commitmentProgress={commitmentProgress} />

      {/* Implementation Kit Link - Only show if complete */}
      {implementationKit?.status === 'complete' && (
        <ImplementationKitStatus
          blueprintId={blueprint?.id}
          ventureId={activeVenture?.id}
          showGenerateButton={false}
          compact={true}
        />
      )}

      {/* Today's Tasks Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Today's Focus
          </CardTitle>
          {dailyTasks.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} complete
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingTasks || isGeneratingTasks ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-muted-foreground">
                {isGeneratingTasks ? "Generating tasks..." : "Loading..."}
              </span>
            </div>
          ) : generateDailyTasksError && dailyTasks.length === 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{generateDailyTasksError}</AlertDescription>
            </Alert>
          ) : dailyTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tasks for today yet.</p>
              <Button onClick={() => generateDailyTasks()} className="mt-4" disabled={isGeneratingTasks}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Tasks
              </Button>
            </div>
          ) : (
            <>
              {dailyTasks.map((task) => (
                <ExecutionTaskCard
                  key={task.id}
                  task={task}
                  ventureId={activeVenture?.id}
                  ventureName={activeVenture?.name}
                  onToggle={(completed) => markTaskCompleted(task.id, completed)}
                  disabled={false} // Allow toggling even after check-in for corrections
                />
              ))}
              
              {/* Generate More Tasks Button - appears when all tasks are complete */}
              {showGenerateMoreButton && (
                <div className="pt-4 border-t border-border/50">
                  <Button 
                    onClick={handleGenerateMoreTasks} 
                    variant="outline" 
                    className="w-full"
                    disabled={isGeneratingTasks}
                  >
                    {isGeneratingTasks ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Generate More Tasks
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Keep executing — no need to wait for tomorrow
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Rate limit error toast display */}
      {generateDailyTasksError && dailyTasks.length > 0 && (
        <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            {generateDailyTasksError}
          </AlertDescription>
        </Alert>
      )}

      {/* Daily Check-in Section */}
      {hasCheckedInToday ? (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium">Today's check-in complete</p>
                <p className="text-sm text-muted-foreground">
                  Status: {todayCheckin?.completion_status === "yes" ? "Completed" : 
                          todayCheckin?.completion_status === "partial" ? "Partially completed" : "Not completed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : allTasksCompleted ? (
        <DailyCheckinForm onSubmit={handleCheckinSubmit} isSubmitting={isSubmittingCheckin} />
      ) : (
        <Card className="border-border/50">
          <CardContent className="py-6 text-center text-muted-foreground">
            <p>Complete all tasks to unlock today's check-in.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tasks;
