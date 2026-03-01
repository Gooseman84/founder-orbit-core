import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Target,
  Crosshair,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VentureDebuggerProps {
  ventureId: string;
  open: boolean;
  onClose: () => void;
}

interface DiagnosisResult {
  symptomParsing: {
    statedSymptom: string;
    actualProblemType: "root_problem" | "surface_manifestation" | "misdiagnosis";
    reframe: string;
  };
  rootCauseHypotheses: {
    hypothesis: string;
    confidence: "high" | "medium" | "low";
    dataSignal: string;
    ifTrue: string;
  }[];
  primaryRootCause: number;
  intervention: {
    action: string;
    rationale: string;
    timeToResult: string;
    successCriteria: string;
  };
  executableOutput: {
    type: "validation_mission" | "workspace_task";
    title: string;
    description: string;
    estimatedMinutes: number;
    category: string;
    successCriteria: string;
  };
  mavrikNote: string;
}

interface DebuggerResponse {
  diagnosis: DiagnosisResult;
  founderMomentState: string;
  ventureContext: {
    name: string;
    dayInCommitment: number;
    ventureState: string;
  };
}

type UIState = "input" | "loading" | "results";

const LOADING_STEPS = [
  "Parsing your problem...",
  "Analyzing venture signals...",
  "Identifying root cause...",
  "Generating intervention...",
];

export function VentureDebugger({ ventureId, open, onClose }: VentureDebuggerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uiState, setUiState] = useState<UIState>("input");
  const [symptom, setSymptom] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<DebuggerResponse | null>(null);
  const [addingTask, setAddingTask] = useState(false);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setUiState("input");
        setSymptom("");
        setLoadingStep(0);
        setResult(null);
      }, 300);
    }
  }, [open]);

  // Animate loading steps
  useEffect(() => {
    if (uiState !== "loading") return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev >= LOADING_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [uiState]);

  const runDiagnostic = useCallback(async () => {
    if (!symptom.trim()) return;
    setUiState("loading");
    setLoadingStep(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/venture-debugger`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            ventureId,
            symptomDescription: symptom.trim(),
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Diagnostic failed" }));
        throw new Error(err.error || "Diagnostic failed");
      }

      const data: DebuggerResponse = await res.json();
      setResult(data);
      setUiState("results");
    } catch (err) {
      console.error("Venture debugger error:", err);
      toast({
        title: "Diagnostic failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setUiState("input");
    }
  }, [symptom, ventureId, toast]);

  const handleAddTask = useCallback(async () => {
    if (!result || !user) return;
    setAddingTask(true);

    try {
      const output = result.diagnosis.executableOutput;
      const today = new Date().toISOString().split("T")[0];
      const newTask = {
        id: crypto.randomUUID(),
        title: output.title,
        description: output.description,
        category: output.category,
        estimatedMinutes: output.estimatedMinutes,
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
      const updatedTasks = JSON.parse(JSON.stringify([...currentTasks, newTask]));

      if (existing) {
        await supabase
          .from("venture_daily_tasks")
          .update({ tasks: updatedTasks })
          .eq("venture_id", ventureId)
          .eq("user_id", user.id)
          .eq("task_date", today);
      } else {
        await supabase
          .from("venture_daily_tasks")
          .insert({
            user_id: user.id,
            venture_id: ventureId,
            task_date: today,
            tasks: updatedTasks,
          });
      }

      toast({ title: "Added to today's tasks" });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error("Failed to add task:", err);
      toast({ title: "Failed to add task", variant: "destructive" });
    } finally {
      setAddingTask(false);
    }
  }, [result, user, ventureId, onClose, toast]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Crosshair className="h-4 w-4 text-primary" />
            Mavrik Diagnostic Mode
          </SheetTitle>
          {uiState === "input" && (
            <SheetDescription className="text-xs">
              Describe what's not working. Be specific — Mavrik analyzes your
              actual venture data, not just your words.
            </SheetDescription>
          )}
        </SheetHeader>

        {/* ── INPUT STATE ── */}
        {uiState === "input" && (
          <div className="space-y-4 pt-2">
            <TextareaWithVoice
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="Example: I've sent 20 outreach messages and nobody is responding..."
              rows={4}
              className="resize-none text-sm"
            />
            <Button
              className="w-full"
              onClick={runDiagnostic}
              disabled={!symptom.trim()}
            >
              Run Diagnostic
            </Button>
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {uiState === "loading" && (
          <div className="space-y-3 pt-8">
            {LOADING_STEPS.map((step, i) => (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 text-sm transition-opacity duration-300",
                  i <= loadingStep ? "opacity-100" : "opacity-20"
                )}
              >
                {i < loadingStep ? (
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                ) : i === loadingStep ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30 shrink-0" />
                )}
                <span className={cn(i <= loadingStep ? "text-foreground" : "text-muted-foreground")}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── RESULTS STATE ── */}
        {uiState === "results" && result && (
          <div className="space-y-4 pt-2">
            {/* Section A — Mavrik's Read */}
            <Card className="border-muted-foreground/20">
              <CardContent className="py-4 space-y-2">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Mavrik Diagnostic
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.diagnosis.mavrikNote}
                </p>
                {result.diagnosis.symptomParsing.actualProblemType !== "root_problem" ? (
                  <div className="space-y-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                      Reframed
                    </Badge>
                    <p className="text-xs text-foreground">
                      {result.diagnosis.symptomParsing.reframe}
                    </p>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-muted-foreground/30">
                    Confirmed
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Section B — Root Cause Analysis */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Root Causes
              </p>
              {result.diagnosis.rootCauseHypotheses.map((h, i) => {
                const isPrimary = i === result.diagnosis.primaryRootCause;
                const confColor =
                  h.confidence === "high"
                    ? "text-emerald-500 border-emerald-500/30"
                    : h.confidence === "medium"
                    ? "text-amber-500 border-amber-500/30"
                    : "text-muted-foreground border-muted-foreground/30";

                return (
                  <Card
                    key={i}
                    className={cn(
                      "transition-colors",
                      isPrimary ? "border-primary/40 bg-primary/5" : ""
                    )}
                  >
                    <CardContent className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">
                          {h.hypothesis}
                        </p>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", confColor)}>
                          {h.confidence}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{h.dataSignal}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Section C — Intervention */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Intervention
              </p>
              <div className="rounded-lg border bg-secondary/30 p-3 space-y-2">
                <p className="text-sm font-medium leading-snug">
                  {result.diagnosis.intervention.action}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {result.diagnosis.intervention.rationale}
                  </p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>⏱ {result.diagnosis.intervention.timeToResult}</span>
                    <span>✓ {result.diagnosis.intervention.successCriteria}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section D — Accept Task */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                Executable Output
              </p>
              <Card>
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {result.diagnosis.executableOutput.title}
                    </p>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {result.diagnosis.executableOutput.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.diagnosis.executableOutput.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ~{result.diagnosis.executableOutput.estimatedMinutes} min
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={handleAddTask}
                      disabled={addingTask}
                    >
                      {addingTask ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Add to Today's Tasks
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
