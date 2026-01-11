import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyPulseModule } from "./DailyPulseModule";
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  FileText, 
  ClipboardCheck,
  Flame,
  ArrowRight,
  RefreshCw,
  Skull
} from "lucide-react";
import type { Venture } from "@/types/venture";
import { useDailyExecution } from "@/hooks/useDailyExecution";

interface ExecutionDashboardProps {
  venture: Venture;
}

export function ExecutionDashboard({ venture }: ExecutionDashboardProps) {
  const navigate = useNavigate();
  const {
    commitmentProgress,
    dailyTasks,
    isLoadingTasks,
    todayCheckin,
    hasCheckedInToday,
  } = useDailyExecution(venture);

  const completedTasks = dailyTasks.filter(t => t.completed).length;
  const totalTasks = dailyTasks.length;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Venture Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold truncate">{venture.name}</h1>
        </div>
        {venture.success_metric && (
          <p className="text-sm text-muted-foreground ml-7">
            <span className="font-medium">Goal:</span> {venture.success_metric}
          </p>
        )}
      </div>

      {/* Commitment Progress */}
      {commitmentProgress && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="py-4">
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

      {/* Quick Actions Grid */}
      <div className="grid gap-3 grid-cols-2">
        {/* Today's Tasks */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/tasks")}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Today's Tasks</span>
            </div>
            {isLoadingTasks ? (
              <Skeleton className="h-8 w-full" />
            ) : totalTasks > 0 ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{completedTasks}</span>
                  <span className="text-sm text-muted-foreground">/ {totalTasks}</span>
                </div>
                <Progress value={taskProgress} className="h-1.5" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            )}
          </CardContent>
        </Card>

        {/* Check-in Status */}
        <Card 
          className="cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate("/tasks")}
        >
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className={`h-4 w-4 ${hasCheckedInToday ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Daily Check-in</span>
            </div>
            {hasCheckedInToday ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Complete</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Circle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Pulse Module */}
      <DailyPulseModule />

      {/* Venture Control Panel - Always Visible */}
      <VentureControlPanel venture={venture} />
    </div>
  );
}

interface VentureControlPanelProps {
  venture: Venture;
}

function VentureControlPanel({ venture }: VentureControlPanelProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">
          Change direction anytime
        </CardDescription>
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
