import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useVentureState } from "@/hooks/useVentureState";
import { useDailyExecution } from "@/hooks/useDailyExecution";
import { useToast } from "@/hooks/use-toast";
import { VentureContextHeader } from "@/components/tasks/VentureContextHeader";
import { ExecutionTaskCard } from "@/components/tasks/ExecutionTaskCard";
import { DailyCheckinForm } from "@/components/tasks/DailyCheckinForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Inbox } from "lucide-react";

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeVenture, isLoading: ventureLoading } = useVentureState();

  // Redirect if not in executing state
  useEffect(() => {
    if (!ventureLoading && (!activeVenture || activeVenture.venture_state !== "executing")) {
      toast({
        title: "Section Locked",
        description: "Tasks are only available while executing a venture.",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [activeVenture, ventureLoading, navigate, toast]);

  const {
    commitmentProgress,
    dailyTasks,
    isLoadingTasks,
    isGeneratingTasks,
    generateDailyTasksError,
    todayCheckin,
    hasCheckedInToday,
    generateDailyTasks,
    submitCheckin,
    markTaskCompleted,
  } = useDailyExecution(activeVenture);

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
    if (!isLoadingTasks && dailyTasks.length === 0 && !isGeneratingTasks && activeVenture) {
      generateDailyTasks();
    }
  }, [isLoadingTasks, dailyTasks.length, isGeneratingTasks, activeVenture, generateDailyTasks]);

  if (ventureLoading || !activeVenture) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTasksCompleted = dailyTasks.length > 0 && dailyTasks.every(t => t.completed);
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);

  const handleCheckinSubmit = async (data: Parameters<typeof submitCheckin>[0]) => {
    setIsSubmittingCheckin(true);
    const success = await submitCheckin(data);
    setIsSubmittingCheckin(false);
    if (success) {
      toast({ title: "Check-in submitted!", description: "Great work today." });
    }
    return success;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Venture Context Header */}
      <VentureContextHeader venture={activeVenture} commitmentProgress={commitmentProgress} />

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
                {isGeneratingTasks ? "Generating today's tasks..." : "Loading..."}
              </span>
            </div>
          ) : generateDailyTasksError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{generateDailyTasksError}</AlertDescription>
            </Alert>
          ) : dailyTasks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tasks for today yet.</p>
              <Button onClick={generateDailyTasks} className="mt-4" disabled={isGeneratingTasks}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Tasks
              </Button>
            </div>
          ) : (
            dailyTasks.map((task) => (
              <ExecutionTaskCard
                key={task.id}
                task={task}
                onToggle={(completed) => markTaskCompleted(task.id, completed)}
                disabled={hasCheckedInToday}
              />
            ))
          )}
        </CardContent>
      </Card>

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

// Need to add useState import
import { useState } from "react";

export default Tasks;
