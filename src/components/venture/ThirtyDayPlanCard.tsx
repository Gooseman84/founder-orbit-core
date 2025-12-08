import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle2, Clock, Target, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VenturePlan } from "@/types/venture";

interface VentureTask {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  status: string;
  week_number: number | null;
}

interface ThirtyDayPlanCardProps {
  plan: VenturePlan;
  tasksByWeek: Record<number, VentureTask[]>;
  ventureId: string;
}

const WEEK_THEMES: Record<number, string> = {
  1: "Foundation & Validation",
  2: "Build & Test",
  3: "Launch & Learn",
  4: "Scale & Systematize",
};

const CATEGORY_COLORS: Record<string, string> = {
  validation: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  build: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  marketing: "bg-green-500/10 text-green-700 dark:text-green-400",
  systems: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  ops: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  other: "bg-muted text-muted-foreground",
};

export function ThirtyDayPlanCard({ plan, tasksByWeek, ventureId }: ThirtyDayPlanCardProps) {
  const navigate = useNavigate();

  // Parse AI raw data for week themes
  const aiRaw = plan.ai_raw as {
    weeks?: Array<{ weekNumber: number; theme: string; summary: string }>;
  } | null;

  const getWeekTheme = (weekNum: number) => {
    return aiRaw?.weeks?.find((w) => w.weekNumber === weekNum)?.theme || WEEK_THEMES[weekNum] || `Week ${weekNum}`;
  };

  const getWeekSummary = (weekNum: number) => {
    return aiRaw?.weeks?.find((w) => w.weekNumber === weekNum)?.summary || "";
  };

  const getCompletedCount = (tasks: VentureTask[]) => {
    return tasks.filter((t) => t.status === "completed").length;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            30-Day Execution Plan
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/tasks?venture=${ventureId}`)}
            className="gap-1"
          >
            View All Tasks <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {plan.summary && (
          <p className="text-sm text-muted-foreground mt-2">{plan.summary}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
          <span>Started: {new Date(plan.start_date).toLocaleDateString()}</span>
          <span>Ends: {new Date(plan.end_date).toLocaleDateString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="1" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {[1, 2, 3, 4].map((week) => {
              const tasks = tasksByWeek[week] || [];
              const completed = getCompletedCount(tasks);
              return (
                <TabsTrigger key={week} value={String(week)} className="text-xs">
                  W{week}
                  {tasks.length > 0 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      {completed}/{tasks.length}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {[1, 2, 3, 4].map((week) => {
            const tasks = tasksByWeek[week] || [];
            const theme = getWeekTheme(week);
            const summary = getWeekSummary(week);

            return (
              <TabsContent key={week} value={String(week)} className="mt-4 space-y-3">
                <div className="space-y-1">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {theme}
                  </h4>
                  {summary && (
                    <p className="text-sm text-muted-foreground">{summary}</p>
                  )}
                </div>

                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No tasks for this week yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="mt-0.5">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              task.status === "completed"
                                ? "line-through text-muted-foreground"
                                : ""
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.category && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 ${
                                  CATEGORY_COLORS[task.category] || CATEGORY_COLORS.other
                                }`}
                              >
                                {task.category}
                              </Badge>
                            )}
                            {task.estimated_minutes && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {task.estimated_minutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasks.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        +{tasks.length - 5} more tasks
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
