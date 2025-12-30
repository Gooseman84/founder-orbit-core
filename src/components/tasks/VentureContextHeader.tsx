import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, TrendingUp } from "lucide-react";
import type { Venture } from "@/types/venture";

interface VentureContextHeaderProps {
  venture: Venture;
  commitmentProgress: {
    currentDay: number;
    totalDays: number;
    daysRemaining: number;
    progressPercent: number;
  } | null;
}

export function VentureContextHeader({ venture, commitmentProgress }: VentureContextHeaderProps) {
  return (
    <Card className="border-primary/30 bg-gradient-to-r from-background to-primary/5">
      <CardContent className="py-5">
        <div className="space-y-4">
          {/* Venture Name */}
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{venture.name}</h2>
          </div>

          {/* Success Metric */}
          {venture.success_metric && (
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium">Success Metric</p>
                <p className="text-sm font-medium">{venture.success_metric}</p>
              </div>
            </div>
          )}

          {/* Commitment Progress */}
          {commitmentProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Day {commitmentProgress.currentDay} of {commitmentProgress.totalDays}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {commitmentProgress.daysRemaining} days remaining
                </span>
              </div>
              <Progress value={commitmentProgress.progressPercent} className="h-2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
