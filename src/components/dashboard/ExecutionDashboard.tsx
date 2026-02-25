import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Target,
  CheckCircle2,
  Circle,
  FileText,
  ClipboardCheck,
  Flame,
  Skull,
  RefreshCw,
  Map,
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { Venture } from "@/types/venture";
import { useDailyExecution } from "@/hooks/useDailyExecution";
import { ImplementationKitCard } from "@/components/implementationKit/ImplementationKitCard";
import { VentureDNACard } from "@/components/dashboard/VentureDNACard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ExecutionDashboardProps {
  venture: Venture;
}

export function ExecutionDashboard({ venture }: ExecutionDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    commitmentProgress,
    dailyTasks,
    isLoadingTasks,
    isGeneratingTasks,
    todayCheckin,
    hasCheckedInToday,
    generateDailyTasks,
    submitCheckin,
    markTaskCompleted,
  } = useDailyExecution(venture);

  const completedTasks = dailyTasks.filter((t) => t.completed).length;
  const totalTasks = dailyTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Workspace doc count
  const { data: docCount } = useQuery({
    queryKey: ["workspace-doc-count", venture.id, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("workspace_documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("venture_id", venture.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
  });

  // Blueprint last updated
  const { data: blueprintDate } = useQuery({
    queryKey: ["blueprint-date", venture.idea_id, user?.id],
    queryFn: async () => {
      if (!user || !venture.idea_id) return null;
      const { data, error } = await supabase
        .from("founder_blueprints")
        .select("updated_at")
        .eq("user_id", user.id)
        .eq("north_star_idea_id", venture.idea_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return data.updated_at;
    },
    enabled: !!user && !!venture.idea_id,
  });

  // Validation status for Blueprint tile
  const { data: validationSummary } = useQuery({
    queryKey: ["validation-status-tile", venture.id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("validation_summaries")
        .select("confidence_shift, recommendation, total_evidence_count, generated_at")
        .eq("venture_id", venture.id)
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user && !!venture.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: evidenceCount } = useQuery({
    queryKey: ["validation-evidence-count-tile", venture.id, user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("validation_evidence")
        .select("*", { count: "exact", head: true })
        .eq("venture_id", venture.id)
        .eq("user_id", user.id);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user && !!venture.id,
    staleTime: 2 * 60 * 1000,
  });

  const confidenceLabel = useMemo(() => {
    const shift = validationSummary?.confidence_shift;
    if (!shift || shift === "assumption_based") return { text: "Assumption-Based", cls: "bg-muted text-muted-foreground" };
    if (shift === "early_signal") return { text: "Early Signal", cls: "bg-amber-500/15 text-amber-500" };
    if (shift === "partially_validated") return { text: "Partially Validated", cls: "bg-blue-500/15 text-blue-400" };
    if (shift === "evidence_backed") return { text: "Evidence-Backed", cls: "bg-emerald-500/15 text-emerald-400" };
    return { text: "Not Started", cls: "bg-muted text-muted-foreground" };
  }, [validationSummary?.confidence_shift]);

  return (
    <div className="space-y-5">
      {/* 1. VENTURE DNA — motivational hero card */}
      <VentureDNACard venture={venture} commitmentProgress={commitmentProgress} />

      {/* 2. TODAY'S FOCUS — inline check-in */}
      <TodaysFocus
        venture={venture}
        hasCheckedInToday={hasCheckedInToday}
        todayCheckin={todayCheckin}
        submitCheckin={submitCheckin}
      />

      {/* 3. TODAY'S TASKS — inline, checkable */}
      <TodaysTasks
        tasks={dailyTasks}
        isLoading={isLoadingTasks}
        isGenerating={isGeneratingTasks}
        completedTasks={completedTasks}
        totalTasks={totalTasks}
        taskProgress={taskProgress}
        onToggle={markTaskCompleted}
        onGenerate={() => generateDailyTasks()}
        ventureId={venture.id}
        ventureName={venture.name}
      />

      {/* 4. QUICK ACCESS cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => navigate(`/blueprint?ventureId=${venture.id}`)}
        >
          <CardContent className="py-4 flex flex-col items-center text-center gap-1.5">
            <Map className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Blueprint</span>
            {blueprintDate && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(blueprintDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
            {/* Validation status pill */}
            {evidenceCount != null && evidenceCount > 0 ? (
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium leading-tight", confidenceLabel.cls)}>
                {confidenceLabel.text}
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground/60">Validate →</span>
            )}
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => navigate("/workspace")}
        >
          <CardContent className="py-4 flex flex-col items-center text-center gap-1.5">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-xs font-medium">Workspace</span>
            <span className="text-[10px] text-muted-foreground">
              {docCount ?? 0} doc{(docCount ?? 0) !== 1 ? "s" : ""}
            </span>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary/40 transition-colors"
          onClick={() => navigate("/venture-review")}
        >
          <CardContent className="py-4 flex flex-col items-center text-center gap-1.5">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium">Review</span>
            <span className="text-[10px] text-muted-foreground">End / Pivot</span>
          </CardContent>
        </Card>
      </div>

      {/* 5. IMPLEMENTATION KIT */}
      <ImplementationKitCard ventureId={venture.id} />

      {/* 6. VENTURE CONTROLS */}
      <VentureControlPanel venture={venture} />
    </div>
  );
}

/* ─── Sub-components ─── */

function VentureHeader({
  venture,
  commitmentProgress,
}: {
  venture: Venture;
  commitmentProgress: ReturnType<typeof useDailyExecution>["commitmentProgress"];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold truncate">{venture.name}</h1>
      </div>
      {venture.success_metric && (
        <p className="text-sm text-muted-foreground ml-7">
          <span className="font-medium">Goal:</span> {venture.success_metric}
        </p>
      )}
      {commitmentProgress && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays}
              </span>
              <Badge variant={commitmentProgress.daysRemaining <= 3 ? "destructive" : "secondary"}>
                {commitmentProgress.daysRemaining} days left
              </Badge>
            </div>
            <Progress value={commitmentProgress.progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TodaysFocus({
  venture,
  hasCheckedInToday,
  todayCheckin,
  submitCheckin,
}: {
  venture: Venture;
  hasCheckedInToday: boolean;
  todayCheckin: ReturnType<typeof useDailyExecution>["todayCheckin"];
  submitCheckin: ReturnType<typeof useDailyExecution>["submitCheckin"];
}) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mavrikResponse, setMavrikResponse] = useState<{
    message: string;
    tomorrowFocus: string;
    tone: string;
    isStagnationIntervention: boolean;
  } | null>(null);
  const { user } = useAuth();

  const moods = [
    { emoji: "🔥", label: "On fire", status: "yes" as const },
    { emoji: "😐", label: "Steady", status: "partial" as const },
    { emoji: "😰", label: "Struggling", status: "no" as const },
  ];

  const handleSubmit = async () => {
    if (!selectedMood) return;
    const mood = moods.find((m) => m.label === selectedMood);
    if (!mood) return;
    setSubmitting(true);

    const success = await submitCheckin({
      completionStatus: mood.status,
      reflection: `${mood.emoji} ${mood.label}${note ? ` — ${note}` : ""}`,
      explanation: note || undefined,
    });

    if (success) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-checkin-response`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                ventureId: venture.id,
                completionStatus: mood.status,
                explanation: note || null,
                reflection: `${mood.emoji} ${mood.label}${note ? ` — ${note}` : ""}`,
              }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.response) setMavrikResponse(data.response);
          }
        }
      } catch (e) {
        console.warn("Mavrik response unavailable:", e);
      }
    }

    setSubmitting(false);
  };

  if (hasCheckedInToday && todayCheckin) {
    return (
      <div className="space-y-3">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Today's Vibe</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{todayCheckin.reflection}</p>
          </CardContent>
        </Card>

        {mavrikResponse && (
          <Card className="border-primary/20">
            <CardContent className="py-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Mavrik</span>
              </div>
              <p className="text-sm text-foreground">{mavrikResponse.message}</p>
              {mavrikResponse.tomorrowFocus && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Tomorrow: </span>
                    {mavrikResponse.tomorrowFocus}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">
            How are you feeling about <span className="text-primary">{venture.name}</span> today?
          </span>
        </div>
        <div className="flex gap-2">
          {moods.map(({ emoji, label }) => (
            <button
              key={label}
              onClick={() => setSelectedMood(label)}
              className={cn(
                "flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                selectedMood === label
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="text-lg">{emoji}</span>
              <span className="block text-[11px] mt-0.5">{label}</span>
            </button>
          ))}
        </div>
        {selectedMood && (
          <div className="space-y-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything on your mind? (optional)"
              className="resize-none text-sm h-16"
            />
            <Button size="sm" className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Check in
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodaysTasks({
  tasks,
  isLoading,
  isGenerating,
  completedTasks,
  totalTasks,
  taskProgress,
  onToggle,
  onGenerate,
  ventureId,
  ventureName,
}: {
  tasks: { id: string; title: string; description: string; category: string; estimatedMinutes: number; completed: boolean }[];
  isLoading: boolean;
  isGenerating: boolean;
  completedTasks: number;
  totalTasks: number;
  taskProgress: number;
  onToggle: (id: string, completed: boolean) => void;
  onGenerate: () => void;
  ventureId: string;
  ventureName?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;
    setAdding(true);
    try {
      await supabase.from("tasks").insert({
        user_id: user.id,
        venture_id: ventureId,
        title: newTask.trim(),
        status: "pending",
        category: "execution",
      });
      setNewTask("");
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleWorkOnThis = async (task: { id: string; title: string; description: string; category: string; estimatedMinutes: number; completed: boolean }) => {
    if (!user || processingTaskId) return;
    setProcessingTaskId(task.id);

    try {
      const { data: existingDoc } = await supabase
        .from("workspace_documents")
        .select("id")
        .eq("user_id", user.id)
        .eq("source_type", "execution_task")
        .eq("source_id", task.id)
        .maybeSingle();

      let targetDocId: string;

      if (existingDoc) {
        targetDocId = existingDoc.id;
      } else {
        const { data: newDoc, error } = await supabase
          .from("workspace_documents")
          .insert({
            user_id: user.id,
            venture_id: ventureId,
            source_type: "execution_task",
            source_id: task.id,
            doc_type: "task-work",
            title: task.title,
            content: `## ${task.title}\n\n**Category:** ${task.category}\n**Estimated Time:** ${task.estimatedMinutes} minutes\n\n### Description\n${task.description}\n\n### Notes\n\n`,
            status: "draft",
            metadata: { taskId: task.id },
          })
          .select()
          .single();

        if (error) throw error;
        targetDocId = newDoc.id;
      }

      navigate(`/workspace/${targetDocId}`, {
        state: {
          executionTask: {
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            estimatedMinutes: task.estimatedMinutes,
            completed: task.completed,
            ventureId,
          },
        },
      });
    } catch (error) {
      console.error("Error opening workspace:", error);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const categoryColors: Record<string, string> = {
    validation: "text-blue-500",
    build: "text-purple-500",
    marketing: "text-green-500",
    ops: "text-orange-500",
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Today's Tasks
          </CardTitle>
          {totalTasks > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedTasks}/{totalTasks}
            </span>
          )}
        </div>
        {totalTasks > 0 && <Progress value={taskProgress} className="h-1.5 mt-2" />}
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : totalTasks === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No tasks yet for today</p>
            <Button size="sm" onClick={onGenerate} disabled={isGenerating} className="gap-1.5">
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate Tasks
            </Button>
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-start gap-2.5 py-2 px-2 rounded-md hover:bg-secondary/50 transition-colors",
                  task.completed && "opacity-50"
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onToggle(task.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm block",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {task.category && (
                      <span className={cn("text-[10px] font-medium", categoryColors[task.category] || "text-muted-foreground")}>
                        {task.category}
                      </span>
                    )}
                    {task.estimatedMinutes > 0 && (
                      <span className="text-[10px] text-muted-foreground">{task.estimatedMinutes}m</span>
                    )}
                    <button
                      onClick={() => handleWorkOnThis(task)}
                      disabled={processingTaskId === task.id}
                      className="text-[10px] text-primary hover:underline ml-auto flex items-center gap-0.5 disabled:opacity-50"
                    >
                      {processingTaskId === task.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          {task.completed ? "Revisit" : "Work on This"} →
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Inline add task */}
            <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task…"
                className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                }}
                disabled={adding}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Venture Control Panel ─── */

interface VentureControlPanelProps {
  venture: Venture;
}

function VentureControlPanel({ venture }: VentureControlPanelProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">Change direction anytime</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-col h-auto py-3 gap-1 text-xs hover:bg-secondary"
          onClick={() => navigate("/venture-review")}
        >
          <ClipboardCheck className="h-4 w-4" />
          Review
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-col h-auto py-3 gap-1 text-xs hover:bg-amber-500/10 hover:text-amber-600"
          onClick={() => navigate("/venture-review?action=pivot")}
        >
          <RefreshCw className="h-4 w-4" />
          Pivot
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-col h-auto py-3 gap-1 text-xs hover:bg-destructive/10 hover:text-destructive"
          onClick={() => navigate("/venture-review?action=kill")}
        >
          <Skull className="h-4 w-4" />
          Kill
        </Button>
      </CardContent>
    </Card>
  );
}
