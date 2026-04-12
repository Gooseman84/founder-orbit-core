import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, FileText, FlaskConical, ListChecks } from "lucide-react";
import type { Venture } from "@/types/venture";

interface VentureTimelineProps {
  venture: Venture;
}

interface DayActivity {
  date: string;
  checkin: boolean;
  completionStatus?: string;
  taskCount: number;
  completedTaskCount: number;
  evidenceCount: number;
  docsUpdated: number;
}

export function VentureTimeline({ venture }: VentureTimelineProps) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  const startDate = venture.commitment_start_at ? new Date(venture.commitment_start_at) : null;
  const totalDays = venture.commitment_window_days || 30;

  // Generate array of dates for the commitment window
  const windowDates = useMemo(() => {
    if (!startDate) return [];
    const dates: string[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, [startDate, totalDays]);

  const firstDate = windowDates[0];
  const lastDate = windowDates[windowDates.length - 1];

  // Fetch all activity data in parallel
  const { data: checkins } = useQuery({
    queryKey: ["timeline-checkins", venture.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("venture_daily_checkins")
        .select("checkin_date, completion_status")
        .eq("venture_id", venture.id)
        .eq("user_id", user!.id)
        .gte("checkin_date", firstDate)
        .lte("checkin_date", lastDate);
      return data || [];
    },
    enabled: !!user && windowDates.length > 0,
    staleTime: 60_000,
  });

  const { data: dailyTasks } = useQuery({
    queryKey: ["timeline-tasks", venture.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("venture_daily_tasks")
        .select("task_date, tasks")
        .eq("venture_id", venture.id)
        .eq("user_id", user!.id)
        .gte("task_date", firstDate)
        .lte("task_date", lastDate);
      return data || [];
    },
    enabled: !!user && windowDates.length > 0,
    staleTime: 60_000,
  });

  const { data: evidence } = useQuery({
    queryKey: ["timeline-evidence", venture.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("validation_evidence")
        .select("created_at")
        .eq("venture_id", venture.id)
        .eq("user_id", user!.id)
        .gte("created_at", `${firstDate}T00:00:00`)
        .lte("created_at", `${lastDate}T23:59:59`);
      return data || [];
    },
    enabled: !!user && windowDates.length > 0,
    staleTime: 60_000,
  });

  const { data: docs } = useQuery({
    queryKey: ["timeline-docs", venture.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workspace_documents")
        .select("updated_at")
        .eq("venture_id", venture.id)
        .eq("user_id", user!.id)
        .gte("updated_at", `${firstDate}T00:00:00`)
        .lte("updated_at", `${lastDate}T23:59:59`);
      return data || [];
    },
    enabled: !!user && windowDates.length > 0,
    staleTime: 60_000,
  });

  // Build day-by-day activity map
  const dayMap = useMemo(() => {
    const map = new Map<string, DayActivity>();

    for (const date of windowDates) {
      map.set(date, { date, checkin: false, taskCount: 0, completedTaskCount: 0, evidenceCount: 0, docsUpdated: 0 });
    }

    checkins?.forEach((c) => {
      const day = map.get(c.checkin_date);
      if (day) { day.checkin = true; day.completionStatus = c.completion_status; }
    });

    dailyTasks?.forEach((t) => {
      const day = map.get(t.task_date);
      if (day && Array.isArray(t.tasks)) {
        day.taskCount = t.tasks.length;
        day.completedTaskCount = (t.tasks as any[]).filter((tk: any) => tk.completed).length;
      }
    });

    evidence?.forEach((e) => {
      const date = e.created_at.split("T")[0];
      const day = map.get(date);
      if (day) day.evidenceCount++;
    });

    docs?.forEach((d) => {
      const date = d.updated_at.split("T")[0];
      const day = map.get(date);
      if (day) day.docsUpdated++;
    });

    return map;
  }, [windowDates, checkins, dailyTasks, evidence, docs]);

  if (!startDate || windowDates.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];
  const currentDayIndex = windowDates.indexOf(today);
  const progressPct = currentDayIndex >= 0 ? Math.round(((currentDayIndex + 1) / totalDays) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="label-mono">Venture Timeline</span>
        </div>
        <span className="text-xs text-muted-foreground">
          Day {currentDayIndex >= 0 ? currentDayIndex + 1 : "—"} of {totalDays} ({progressPct}%)
        </span>
      </div>

      {/* Timeline dots */}
      <div className="flex gap-[3px] flex-wrap">
        {windowDates.map((date, i) => {
          const day = dayMap.get(date);
          const isToday = date === today;
          const isFuture = date > today;
          const hasActivity = day && (day.checkin || day.taskCount > 0 || day.evidenceCount > 0 || day.docsUpdated > 0);
          const isComplete = day?.completionStatus === "yes";
          const isPartial = day?.completionStatus === "partial";
          const isMissed = !isFuture && !hasActivity && date < today;

          return (
            <button
              key={date}
              onClick={() => !isFuture && day && setSelectedDay(selectedDay?.date === date ? null : day)}
              className={cn(
                "w-[18px] h-[18px] rounded-sm transition-all border text-[8px] font-mono flex items-center justify-center",
                isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isFuture && "bg-muted/30 border-border/30 cursor-default",
                isComplete && "bg-green-500/20 border-green-500/50 text-green-600",
                isPartial && "bg-amber-500/20 border-amber-500/50 text-amber-600",
                isMissed && "bg-muted/50 border-border/50",
                hasActivity && !isComplete && !isPartial && "bg-primary/15 border-primary/40 text-primary",
                !isFuture && "cursor-pointer hover:scale-110",
                selectedDay?.date === date && "ring-2 ring-foreground ring-offset-1 ring-offset-background"
              )}
              title={`${date}${isToday ? " (today)" : ""}`}
              disabled={isFuture}
            >
              {isComplete ? "✓" : isPartial ? "~" : hasActivity ? "•" : ""}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/20 border border-green-500/50" /> Complete</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/50" /> Partial</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary/15 border border-primary/40" /> Activity</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-muted/50 border border-border/50" /> Missed</span>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="card-gold-accent p-3 space-y-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between">
            <span className="label-mono">{new Date(selectedDay.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
            {selectedDay.checkin && (
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded-sm",
                selectedDay.completionStatus === "yes" ? "bg-green-500/10 text-green-600" :
                selectedDay.completionStatus === "partial" ? "bg-amber-500/10 text-amber-600" :
                "bg-red-500/10 text-red-600"
              )}>
                {selectedDay.completionStatus === "yes" ? "Completed" : selectedDay.completionStatus === "partial" ? "Partial" : "Incomplete"}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            {selectedDay.taskCount > 0 && (
              <span className="flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                {selectedDay.completedTaskCount}/{selectedDay.taskCount} tasks
              </span>
            )}
            {selectedDay.evidenceCount > 0 && (
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                {selectedDay.evidenceCount} evidence
              </span>
            )}
            {selectedDay.docsUpdated > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {selectedDay.docsUpdated} docs
              </span>
            )}
            {!selectedDay.checkin && selectedDay.taskCount === 0 && selectedDay.evidenceCount === 0 && selectedDay.docsUpdated === 0 && (
              <span>No activity recorded</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
