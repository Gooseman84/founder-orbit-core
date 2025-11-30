import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Clock, Flame, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { formatDistanceToNow, isWithinInterval, subDays } from "date-fns";

interface ExecutionPatternsCardProps {
  tasks: any[];
  streakData: any | null;
  xpTotal: number;
  loading?: boolean;
}

export function ExecutionPatternsCard({ tasks, streakData, xpTotal, loading }: ExecutionPatternsCardProps) {
  const patterns = useMemo(() => {
    if (!tasks?.length) return null;

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    const completedTasks = tasks.filter(t => t.status === "completed");
    const recentCompleted = completedTasks.filter(t => 
      t.completed_at && isWithinInterval(new Date(t.completed_at), { start: sevenDaysAgo, end: now })
    );

    // Category breakdown
    const categoryCounts: Record<string, number> = {};
    recentCompleted.forEach(t => {
      const cat = t.category || t.type || "uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    // Pending tasks
    const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");

    return {
      totalCompleted: completedTasks.length,
      recentCompleted: recentCompleted.length,
      topCategories,
      pendingCount: pendingTasks.length,
      latestTask: completedTasks[0],
    };
  }, [tasks]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Execution Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          Execution Patterns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-accent/50 text-center">
            <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-xl font-bold">{streakData?.current_streak || 0}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/50 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{patterns?.recentCompleted || 0}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/50 text-center">
            <CheckSquare className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{patterns?.totalCompleted || 0}</p>
            <p className="text-xs text-muted-foreground">All Time</p>
          </div>
        </div>

        {/* XP */}
        <div className="p-3 rounded-lg border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total XP Earned</span>
            <Badge variant="default" className="text-sm font-bold">{xpTotal.toLocaleString()} XP</Badge>
          </div>
        </div>

        {/* Top Categories */}
        {patterns?.topCategories && patterns.topCategories.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Task Categories (This Week)</p>
            <div className="space-y-2">
              {patterns.topCategories.map(([cat, count], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{cat.replace(/_/g, " ")}</span>
                  <Badge variant="secondary" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {patterns?.pendingCount !== undefined && patterns.pendingCount > 0 && (
          <div className="pt-2 border-t border-border flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {patterns.pendingCount} tasks pending
            </span>
          </div>
        )}

        {/* Latest Task */}
        {patterns?.latestTask && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Last Completed</p>
            <p className="text-sm">{patterns.latestTask.title}</p>
            {patterns.latestTask.completed_at && (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(patterns.latestTask.completed_at), { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
