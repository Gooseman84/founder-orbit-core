import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Target,
  CheckCircle2,
  FileText,
  ClipboardCheck,
  Flame,
  Skull,
  RefreshCw,
  Map,
  Plus,
  Sparkles,
  Loader2,
  AlertCircle,
  Brain,
  Zap,
} from "lucide-react";
import type { Venture } from "@/types/venture";
import { useDailyExecution } from "@/hooks/useDailyExecution";
import { ImplementationKitCard } from "@/components/implementationKit/ImplementationKitCard";
import { VentureDNACard } from "@/components/dashboard/VentureDNACard";
import { MavrikCoachingCard } from "@/components/dashboard/MavrikCoachingCard";
import { FounderPatternCard } from "@/components/patterns/FounderPatternCard";
import { VentureDebugger } from "@/components/venture/VentureDebugger";
import { VentureTimeline } from "@/components/dashboard/VentureTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

interface ExecutionDashboardProps {
  venture: Venture;
}

type MomentState = "STUCK" | "BUILDING_MOMENTUM" | "SCOPE_CREEPING" | "EXECUTION_PARALYSIS" | "APPROACHING_LAUNCH";

const MOMENT_STATE_CONFIG: Record<MomentState, { label: string; borderClass: string; iconClass: string; badgeClass: string }> = {
  STUCK:               { label: "You Seem Stuck",       borderClass: "border-l-amber-500",  iconClass: "text-amber-500",  badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  BUILDING_MOMENTUM:   { label: "Building Momentum",    borderClass: "border-l-green-500",  iconClass: "text-green-500",  badgeClass: "bg-green-50 text-green-700 border-green-200" },
  SCOPE_CREEPING:      { label: "Scope Creep Detected", borderClass: "border-l-orange-500", iconClass: "text-orange-500", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  EXECUTION_PARALYSIS: { label: "Execution Paralysis",  borderClass: "border-l-red-500",    iconClass: "text-red-500",    badgeClass: "bg-red-50 text-red-700 border-red-200" },
  APPROACHING_LAUNCH:  { label: "Approaching Launch",   borderClass: "border-l-primary",    iconClass: "text-primary",    badgeClass: "bg-primary/10 text-primary border-primary/30" },
};

export function ExecutionDashboard({ venture }: ExecutionDashboardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [debuggerOpen, setDebuggerOpen] = useState(false);
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
    refetch: refetchDailyExecution,
  } = useDailyExecution(venture);

  // Auto-generate tasks when dashboard loads and none exist yet for today
  useEffect(() => {
    if (!isLoadingTasks && dailyTasks.length === 0 && !isGeneratingTasks) {
      generateDailyTasks();
    }
  }, [isLoadingTasks, dailyTasks.length, isGeneratingTasks, generateDailyTasks]);

  const completedTasks = dailyTasks.filter((t) => t.completed).length;
  const totalTasks = dailyTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
    if (!shift || shift === "assumption_based") return { text: "Assumption-Based", cls: "text-muted-foreground" };
    if (shift === "early_signal") return { text: "Early Signal", cls: "text-primary" };
    if (shift === "partially_validated") return { text: "Partially Validated", cls: "text-accent" };
    if (shift === "evidence_backed") return { text: "Evidence-Backed", cls: "text-success" };
    return { text: "Not Started", cls: "text-muted-foreground" };
  }, [validationSummary?.confidence_shift]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="eyebrow mb-3">VENTURE COMMAND CENTER</div>
        <h1 className="font-display text-[1.75rem] sm:text-[2.5rem] font-bold leading-tight text-foreground break-words">
          <em className="text-primary not-italic" style={{ fontStyle: "italic" }}>{venture.name}</em>
        </h1>
        <p className="mt-2 text-[0.95rem] font-light text-muted-foreground">
          Your execution dashboard. Stay focused, ship daily.
        </p>
      </div>

      {/* Venture DNA */}
      <VentureDNACard venture={venture} commitmentProgress={commitmentProgress} />

      {/* Mavrik Coaching Card */}
      <MavrikCoachingCard venture={venture} />

      {/* ── TODAY'S FOCUS ZONE ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="eyebrow">Today's Focus</span>
          <div className="flex-1 h-px bg-primary/20" />
        </div>

        {/* Today's Check-in */}
        <div id="todays-checkin">
          <TodaysFocus
            venture={venture}
            hasCheckedInToday={hasCheckedInToday}
            todayCheckin={todayCheckin}
            submitCheckin={submitCheckin}
          />
        </div>

        {/* Today's Tasks */}
        <div id="todays-tasks">
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
            onTaskAdded={refetchDailyExecution}
          />
        </div>
      </div>

      {/* ── VENTURE TOOLS ── */}
      <div className="flex items-center gap-3 pt-2">
        <span className="eyebrow text-muted-foreground">Venture Tools</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Debugger trigger */}
      <div className="border-t border-border mt-2 pt-3 pb-1">
        <button
          onClick={() => setDebuggerOpen(true)}
          className="text-sm text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-1.5 px-2 py-2 min-h-[44px] transition-colors"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Something's not working →
        </button>
        <p className="text-xs text-muted-foreground/60 pl-2 mt-1">
          Mavrik will analyze your venture data to find the real issue
        </p>
      </div>

      <VentureDebugger
        ventureId={venture.id}
        open={debuggerOpen}
        onClose={() => setDebuggerOpen(false)}
      />

      {/* Mavrik Coaching Moment */}
      <MavrikMomentCard ventureId={venture.id} />

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className="card-gold-accent p-4 cursor-pointer flex flex-col items-center text-center gap-1.5 transition-colors hover:bg-secondary"
          onClick={() => navigate(`/blueprint?ventureId=${venture.id}`)}
        >
          <Map className="h-5 w-5 text-primary" />
          <span className="label-mono">Blueprint</span>
          {blueprintDate && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(blueprintDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          {evidenceCount != null && evidenceCount > 0 ? (
            <span className={cn("text-[9px] font-mono", confidenceLabel.cls)}>
              {confidenceLabel.text}
            </span>
          ) : (
            <span className="text-[9px] text-muted-foreground/60">Validate →</span>
          )}
        </div>
        <div
          className="card-gold-accent p-4 cursor-pointer flex flex-col items-center text-center gap-1.5 transition-colors hover:bg-secondary"
          onClick={() => navigate("/workspace")}
        >
          <FileText className="h-5 w-5 text-primary" />
          <span className="label-mono">Workspace</span>
          <span className="text-[10px] text-muted-foreground">
            {docCount ?? 0} doc{(docCount ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          className="card-gold-accent p-4 cursor-pointer flex flex-col items-center text-center gap-1.5 transition-colors hover:bg-secondary"
          onClick={() => navigate("/venture-review")}
        >
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <span className="label-mono">Review</span>
          <span className="text-[10px] text-muted-foreground">End / Pivot</span>
        </div>
      </div>

      {/* Founder Patterns */}
      <FounderPatternCard ventureId={venture.id} />

      {/* Implementation Kit */}
      <ImplementationKitCard ventureId={venture.id} />

      {/* Venture Controls */}
      <VentureControlPanel venture={venture} />
    </div>
  );
}

/* ─── Sub-components ─── */

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
  } | null>(
    // Hydrate from DB-persisted response on mount if already checked in
    todayCheckin?.mavrik_response ?? null
  );
  const { user } = useAuth();

  // Calculate consecutive check-in streak
  const { data: streakDays = 0 } = useQuery({
    queryKey: ["checkin-streak", venture.id, user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("venture_daily_checkins")
        .select("checkin_date")
        .eq("venture_id", venture.id)
        .eq("user_id", user!.id)
        .order("checkin_date", { ascending: false })
        .limit(60);
      if (!data?.length) return 0;
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < data.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = expected.toISOString().split("T")[0];
        if (data[i].checkin_date === expectedStr) streak++;
        else break;
      }
      return streak;
    },
  });

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

    if (!success) {
      toast.error("Check-in failed. Please try again.");
      setSubmitting(false);
      return;
    }

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
        <div className="card-gold-left p-4" style={{ borderLeftColor: "hsl(142 50% 42%)" }}>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-primary" />
            <span className="label-mono">Today's Vibe</span>
            {streakDays > 0 && (
              <span className="label-mono text-primary ml-1">🔥 {streakDays}d</span>
            )}
            <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{todayCheckin.reflection}</p>
        </div>

        {mavrikResponse && (
          <div className="card-gold-accent p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="label-mono-gold">Mavrik</span>
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
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card-gold-accent p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            How are you feeling about <span className="text-primary font-display italic">{venture.name}</span> today?
          </span>
        </div>
        {streakDays > 0 && (
          <span className="label-mono text-primary shrink-0">
            🔥 {streakDays}d streak
          </span>
        )}
      </div>
        <div className="flex gap-2">
        {moods.map(({ emoji, label }) => (
          <button
            key={label}
            onClick={() => setSelectedMood(label)}
            className={cn(
              "flex-1 py-3 min-h-[44px] border text-sm font-medium transition-all",
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
          <button
            className="w-full py-3 px-6 bg-primary text-primary-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Check in
          </button>
        </div>
      )}
    </div>
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
  onTaskAdded,
}: {
  tasks: { id: string; title: string; description: string; why_now?: string; category: string; estimatedMinutes: number; completed: boolean }[];
  isLoading: boolean;
  isGenerating: boolean;
  completedTasks: number;
  totalTasks: number;
  taskProgress: number;
  onToggle: (id: string, completed: boolean) => void;
  onGenerate: () => void;
  ventureId: string;
  ventureName?: string;
  onTaskAdded?: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const handleAddTask = async () => {
    if (!newTask.trim() || !user) return;
    setAdding(true);
    try {
      const manualTask = {
        id: crypto.randomUUID(),
        title: newTask.trim(),
        description: "",
        category: "execution",
        estimatedMinutes: 15,
        completed: false,
      };
      const { data: existing } = await supabase
        .from("venture_daily_tasks")
        .select("tasks")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .eq("task_date", today)
        .maybeSingle();
      const currentTasks = (existing?.tasks as unknown as any[]) || [];
      const updatedTasks = [...currentTasks, manualTask];
      const tasksJson = JSON.parse(JSON.stringify(updatedTasks));
      if (existing) {
        await supabase
          .from("venture_daily_tasks")
          .update({ tasks: tasksJson })
          .eq("venture_id", ventureId)
          .eq("user_id", user.id)
          .eq("task_date", today);
      } else {
        await supabase
          .from("venture_daily_tasks")
          .insert({ user_id: user.id, venture_id: ventureId, task_date: today, tasks: tasksJson });
      }
      setNewTask("");
      onTaskAdded?.();
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
          executionTask: { id: task.id, title: task.title, description: task.description, category: task.category, estimatedMinutes: task.estimatedMinutes, completed: task.completed, ventureId },
        },
      });
    } catch (error) {
      console.error("Error opening workspace:", error);
    } finally {
      setProcessingTaskId(null);
    }
  };

  const categoryColors: Record<string, string> = {
    validation: "text-accent",
    build: "text-primary",
    marketing: "text-success",
    ops: "text-muted-foreground",
  };

  return (
    <div className="card-gold-accent">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="label-mono-gold">Today's Tasks</span>
          </div>
          {totalTasks > 0 && (
            <span className="label-mono">{completedTasks}/{totalTasks}</span>
          )}
        </div>
        {totalTasks > 0 && <Progress value={taskProgress} className="h-1.5 mt-3" />}
      </div>
      <div className="px-5 pb-5 space-y-1">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : totalTasks === 0 ? (
          <div className="text-center py-4">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Mavrik is generating your tasks…</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3">No tasks yet for today</p>
                <button
                  onClick={onGenerate}
                  className="py-3 px-6 bg-primary text-primary-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase inline-flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Tasks
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              const hasContext = !!(task.description || task.why_now);
              return (
              <div
                key={task.id}
                className={cn(
                  "!px-0 !py-2 border-b border-border/40 last:border-0",
                  task.completed && "opacity-50"
                )}
              >
                <div className="flex gap-2.5 items-start">
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={(checked) => onToggle(task.id, !!checked)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <button
                      className={cn("text-sm text-left w-full", task.completed && "line-through text-muted-foreground")}
                      onClick={() => hasContext && setExpandedTaskId(isExpanded ? null : task.id)}
                    >
                      {task.title}
                    </button>
                    <div className="flex items-center gap-2 mt-1">
                      {task.category && (
                        <span className={cn("text-[10px] font-mono uppercase tracking-wider font-medium", categoryColors[task.category] || "text-muted-foreground")}>
                          {task.category}
                        </span>
                      )}
                      {task.estimatedMinutes > 0 && (
                        <span className="text-[10px] text-muted-foreground font-mono">{task.estimatedMinutes}m</span>
                      )}
                      {hasContext && (
                        <button
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
                        >
                          {isExpanded ? "less ↑" : "why? ↓"}
                        </button>
                      )}
                      <button
                        onClick={() => handleWorkOnThis(task)}
                        disabled={processingTaskId === task.id}
                        className="text-[10px] text-primary hover:underline ml-auto flex items-center gap-0.5 disabled:opacity-50 font-mono uppercase tracking-wider"
                      >
                        {processingTaskId === task.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>{task.completed ? "Revisit" : "Work on This"} →</>
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
                        {task.description && <p>{task.description}</p>}
                        {task.why_now && (
                          <p className="text-primary/80 italic">Why now: {task.why_now}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}

            <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task…"
                className="h-8 text-sm border-none shadow-none focus-visible:ring-0 px-0"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                disabled={adding}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Venture Control Panel ─── */

function VentureControlPanel({ venture }: { venture: Venture }) {
  const navigate = useNavigate();

  return (
    <div className="border border-dashed border-muted-foreground/30 p-5">
      <span className="label-mono block mb-3">Change Direction</span>
      <div className="grid grid-cols-3 gap-2">
        <button
          className="flex flex-col items-center gap-1 py-3 min-h-[44px] text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => navigate("/venture-review")}
        >
          <ClipboardCheck className="h-4 w-4" />
          Review
        </button>
        <button
          className="flex flex-col items-center gap-1 py-3 min-h-[44px] text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={() => navigate("/venture-review?action=pivot")}
        >
          <RefreshCw className="h-4 w-4" />
          Pivot
        </button>
        <button
          className="flex flex-col items-center gap-1 py-3 min-h-[44px] text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => navigate("/venture-review?action=kill")}
        >
          <Skull className="h-4 w-4" />
          Kill
        </button>
      </div>
    </div>
  );
}

function MavrikMomentCard({ ventureId }: { ventureId: string }) {
  const { data: momentData, isLoading } = useQuery({
    queryKey: ["founder-moment-state", ventureId],
    queryFn: async () => {
      const { data, error } = await invokeAuthedFunction<{
        state: MomentState;
        stateRationale: string;
        mavrikIntent: string;
      }>("compute-founder-moment-state", { body: { ventureId } });
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!ventureId,
  });

  if (isLoading) {
    return (
      <div className="card-gold-accent p-4 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    );
  }

  if (!momentData?.state) return null;

  const config = MOMENT_STATE_CONFIG[momentData.state] ?? MOMENT_STATE_CONFIG.BUILDING_MOMENTUM;

  return (
    <div className={cn("card-gold-accent p-4 border-l-2 space-y-3", config.borderClass)}>
      <div className="flex items-center gap-2">
        <Brain className={cn("h-4 w-4 shrink-0", config.iconClass)} />
        <span className="label-mono">Mavrik's Read</span>
        <span className={cn("ml-auto text-[10px] font-mono px-2 py-0.5 border rounded-full", config.badgeClass)}>
          {config.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{momentData.stateRationale}</p>
      <div className="border-l-2 border-primary/30 pl-3 py-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-medium text-primary uppercase tracking-wide">Focus</span>
        </div>
        <p className="text-sm text-foreground leading-relaxed">{momentData.mavrikIntent}</p>
      </div>
    </div>
  );
}
