import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscription } from "@/hooks/useSubscription";
import { useVentureState } from "@/hooks/useVentureState";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { recordXpEvent } from "@/lib/xpEngine";
import { useQueryClient } from "@tanstack/react-query";
import { SkeletonGrid } from "@/components/shared/SkeletonLoaders";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { ProBadge } from "@/components/billing/ProBadge";
import { Loader2, Sparkles, ListTodo, CheckCircle2, Activity, ArrowRight, Filter, Lock, AlertTriangle } from "lucide-react";
import type { PaywallReasonCode } from "@/config/paywallCopy";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  workspace_document_id?: string | null;
  venture_id?: string | null;
}

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refresh: refreshXp } = useXP();
  const { track } = useAnalytics();
  const { plan } = useSubscription();
  const isPro = plan === "pro" || plan === "founder";
  const queryClient = useQueryClient();
  
  // Venture state enforcement
  const { 
    canGenerateTasks, 
    guardTaskGeneration, 
    activeVenture,
    isLoading: ventureStateLoading 
  } = useVentureState();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ventures, setVentures] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);
  const [selectedVentureId, setSelectedVentureId] = useState<string | "all">("all");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReasonCode>("MULTI_BLUEPRINT_TASKS");

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchChosenIdea();
      fetchVentures();
    }
  }, [user]);

  const fetchVentures = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ventures")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setVentures(data);
  };

  const fetchChosenIdea = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ideas")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "chosen")
      .maybeSingle();
    if (data) setChosenIdeaId(data.id);
  };

  const fetchTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast({ title: "Error", description: "Failed to load tasks.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks based on selected venture
  const filteredTasks = useMemo(() => {
    if (selectedVentureId === "all") return tasks;
    return tasks.filter(t => t.venture_id === selectedVentureId);
  }, [tasks, selectedVentureId]);

  // Check if user has multiple ventures (multi-blueprint scenario)
  const hasMultipleVentures = ventures.length > 1;

  const handleVentureFilterChange = (ventureId: string) => {
    // If FREE user tries to filter across ventures, show paywall
    if (!isPro && ventureId === "all" && hasMultipleVentures) {
      setPaywallReason("MULTI_BLUEPRINT_TASKS");
      setShowPaywall(true);
      track("paywall_shown", { reasonCode: "MULTI_BLUEPRINT_TASKS" });
      return;
    }
    setSelectedVentureId(ventureId);
  };

  const handleGenerateTasks = async () => {
    // Venture state enforcement is handled by button disabled state
    // Double-check guard for programmatic calls
    const guardError = guardTaskGeneration();
    if (guardError) {
      toast({ 
        title: "Cannot Generate Tasks", 
        description: guardError, 
        variant: "destructive" 
      });
      return;
    }
    
    if (!user || !chosenIdeaId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ tasks?: any[] }>("generate-micro-tasks", {});
      if (error) throw error;
      track("task_generated", { count: data.tasks?.length || 0 });
      toast({ title: "Tasks Generated!", description: `Created ${data.tasks?.length || 0} new tasks.` });
      await fetchTasks();
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setCompletingTaskId(taskId);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId)
        .eq("user_id", user.id);
      if (error) throw error;
      const xpAmount = task.xp_reward || 10;
      await recordXpEvent(user.id, "task_completed", xpAmount, { taskId, task_title: task.title });
      track("task_completed", { taskId, xpAmount, title: task.title });
      queryClient.invalidateQueries({ queryKey: ["xp", user.id] });
      await refreshXp();
      toast({ title: "Task Completed! 🎉", description: `You earned ${xpAmount} XP!` });
      await fetchTasks();
    } catch (error) {
      console.error("Error completing task:", error);
      toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" });
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleOpenTaskInWorkspace = async (task: Task) => {
    if (!user) return;

    try {
      let docId = task.workspace_document_id;

      // 1) If no linked doc yet, create one from this task
      if (!docId) {
        const initialContent = [
          `# Task: ${task.title}`,
          "",
          task.description ? `**Description:** ${task.description}` : "",
          task.estimated_minutes ? `**Estimated Time:** ${task.estimated_minutes} minutes` : "",
          task.category ? `**Category:** ${task.category}` : "",
          "",
          "---",
          "",
          "Use this space to think through this task:",
          '- What does "done" look like for this?',
          "- What decisions do I need to make?",
          "- What drafts or experiments should I create?",
        ]
          .filter(Boolean)
          .join("\n");

        const { data: docInsert, error: docError } = await supabase
          .from("workspace_documents")
          .insert({
            user_id: user.id,
            title: task.title,
            doc_type: task.category || "task",
            source_type: "task",
            content: initialContent,
            linked_task_id: task.id,
          })
          .select("id")
          .single();

        if (docError) throw docError;
        docId = docInsert.id;

        // 2) Update task to reference this doc
        const { error: taskUpdateError } = await supabase
          .from("tasks")
          .update({ workspace_document_id: docId })
          .eq("id", task.id)
          .eq("user_id", user.id);

        if (taskUpdateError) throw taskUpdateError;

        // Update local state so UI is in sync
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, workspace_document_id: docId } : t)));
      }

      if (!docId) {
        throw new Error("Failed to determine workspace document id");
      }

      // 3) Navigate to workspace with taskContext in state
      navigate(`/workspace/${docId}`, {
        state: {
          taskContext: {
            id: task.id,
            title: task.title,
            description: task.description,
            estimated_minutes: task.estimated_minutes,
            xp_reward: task.xp_reward,
            category: task.category,
          },
        },
      });
    } catch (error) {
      console.error("Error opening task in workspace:", error);
      toast({
        title: "Error",
        description: "Failed to open this task in the workspace.",
        variant: "destructive",
      });
    }
  };

  const openTasks = filteredTasks.filter((t) => t.status !== "completed");
  const completedTasks = filteredTasks.filter((t) => t.status === "completed");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine if generate button should be disabled and why
  const generateDisabled = isGenerating || !chosenIdeaId || !canGenerateTasks;
  const generateDisabledReason = !canGenerateTasks 
    ? (activeVenture 
        ? `Venture is in "${activeVenture.venture_state}" state` 
        : "No active venture")
    : !chosenIdeaId 
      ? "Choose an idea first" 
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold">Founder Quests</h1>
          <p className="text-muted-foreground mt-1">Complete micro-tasks to build momentum and earn XP</p>
        </div>
        <Button 
          onClick={handleGenerateTasks} 
          disabled={generateDisabled} 
          size="lg"
          title={generateDisabledReason || undefined}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Today's Tasks
            </>
          )}
        </Button>
      </div>

      {/* Venture state warning */}
      {!canGenerateTasks && activeVenture && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Task generation is only available when your venture is in "executing" state. 
            Current state: <span className="font-semibold">{activeVenture.venture_state}</span>
          </AlertDescription>
        </Alert>
      )}

      {!chosenIdeaId && (
        <Alert>
          <AlertDescription>
            You need to choose an idea first. Visit the{" "}
            <a href="/ideas" className="underline font-medium">
              Ideas page
            </a>{" "}
            to select one.
          </AlertDescription>
        </Alert>
      )}

      {/* Multi-Blueprint Filter (Pro feature) */}
      {hasMultipleVentures && (
        <Card className="border-border/50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Blueprint:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={selectedVentureId === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleVentureFilterChange("all")}
                  className="gap-1"
                >
                  All Blueprints
                  {!isPro && <ProBadge variant="icon" size="sm" locked />}
                </Button>
                {ventures.slice(0, isPro ? ventures.length : 1).map((venture) => (
                  <Button
                    key={venture.id}
                    variant={selectedVentureId === venture.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVentureId(venture.id)}
                  >
                    {venture.name}
                  </Button>
                ))}
                {!isPro && ventures.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaywallReason("MULTI_BLUEPRINT_TASKS");
                      setShowPaywall(true);
                      track("locked_feature_clicked", { feature: "multi_blueprint_tasks" });
                    }}
                    className="gap-1 opacity-60"
                  >
                    <Lock className="h-3 w-3" />
                    +{ventures.length - 1} more
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Pulse Link */}
      <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Daily Pulse & Check-In</p>
              <p className="text-sm text-muted-foreground">Reflect on your day and get AI insights</p>
            </div>
          </div>
          <Button onClick={() => navigate("/daily-reflection")} variant="outline" className="gap-2">
            Start Check-In <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Open Tasks ({openTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-6">
          <TaskList tasks={openTasks} onTaskCompleted={handleCompleteTask} />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <TaskList tasks={completedTasks} onTaskCompleted={handleCompleteTask} />
        </TabsContent>
      </Tabs>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reasonCode={paywallReason}
      />
    </div>
  );
};

export default Tasks;
