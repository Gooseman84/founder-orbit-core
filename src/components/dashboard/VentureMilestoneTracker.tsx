import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Milestone {
  id: string;
  label: string;
  completed: boolean;
}

interface VentureMilestoneTrackerProps {
  ventureId?: string | null;
  ideaId?: string | null;
}

export function VentureMilestoneTracker({ ventureId, ideaId }: VentureMilestoneTrackerProps) {
  const { user } = useAuth();

  const { data: milestones, isLoading } = useQuery({
    queryKey: ["venture-milestones", user?.id, ventureId, ideaId],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Milestone[]> => {
      const uid = user!.id;

      // Run all checks in parallel
      const [
        interviewRes,
        ideasRes,
        fvsRes,
        ventureRes,
        blueprintRes,
        taskRes,
        evidenceRes,
        kitRes,
      ] = await Promise.all([
        // 1. Interview Complete
        supabase
          .from("founder_interviews")
          .select("id")
          .eq("user_id", uid)
          .eq("status", "completed")
          .limit(1)
          .maybeSingle(),
        // 2. Ideas Generated
        supabase
          .from("ideas")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        // 3. Idea Scored (FVS)
        supabase
          .from("financial_viability_scores")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid),
        // 4. Venture Committed
        supabase
          .from("ventures")
          .select("id")
          .eq("user_id", uid)
          .in("venture_state", ["executing", "reviewed"])
          .limit(1)
          .maybeSingle(),
        // 5. Blueprint Generated
        supabase
          .from("founder_blueprints")
          .select("id")
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle(),
        // 6. First Task Completed
        ventureId
          ? supabase
              .from("venture_daily_tasks")
              .select("tasks")
              .eq("user_id", uid)
              .eq("venture_id", ventureId)
              .limit(10)
          : Promise.resolve({ data: null }),
        // 7. First Validation Evidence
        ventureId
          ? supabase
              .from("validation_evidence")
              .select("id", { count: "exact", head: true })
              .eq("user_id", uid)
              .eq("venture_id", ventureId)
          : Promise.resolve({ count: 0 }),
        // 8. Implementation Kit Generated
        ventureId
          ? supabase
              .from("implementation_kits")
              .select("id")
              .eq("user_id", uid)
              .eq("venture_id", ventureId)
              .eq("status", "complete")
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      // Check if any task has been completed
      let hasCompletedTask = false;
      if (taskRes.data && Array.isArray(taskRes.data)) {
        for (const row of taskRes.data) {
          const tasks = row.tasks as any[];
          if (tasks?.some((t: any) => t.completed)) {
            hasCompletedTask = true;
            break;
          }
        }
      }

      return [
        { id: "interview", label: "Interview Complete", completed: !!interviewRes.data },
        { id: "ideas", label: "Ideas Generated", completed: (ideasRes.count ?? 0) > 0 },
        { id: "scored", label: "Idea Scored", completed: (fvsRes.count ?? 0) > 0 },
        { id: "committed", label: "Venture Committed", completed: !!ventureRes.data },
        { id: "blueprint", label: "Blueprint Generated", completed: !!blueprintRes.data },
        { id: "first_task", label: "First Task Done", completed: hasCompletedTask },
        { id: "evidence", label: "Evidence Logged", completed: ((evidenceRes as any).count ?? 0) > 0 },
        { id: "kit", label: "Implementation Kit", completed: !!kitRes.data },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="card-gold-accent p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (!milestones) return null;

  const completed = milestones.filter((m) => m.completed).length;
  const total = milestones.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="card-gold-accent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="label-mono">Venture Progress</span>
        <span className="text-xs font-mono text-muted-foreground">
          {completed}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* Milestone tick marks */}
        {milestones.map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-background/60"
            style={{ left: `${((i + 1) / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Milestone dots */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center gap-1">
            {m.completed ? (
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
            ) : (
              <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            )}
            <span
              className={cn(
                "text-[10px] font-mono",
                m.completed ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
