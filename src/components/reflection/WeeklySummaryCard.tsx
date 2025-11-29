import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, TrendingUp, TrendingDown, Minus, Trophy, AlertTriangle, Target } from "lucide-react";
import { format } from "date-fns";

interface FocusArea {
  area: string;
  why: string;
  suggested_action: string;
}

interface WeeklySummary {
  week_theme: string;
  story_of_the_week: string;
  top_wins: string[];
  top_constraints: string[];
  focus_areas_next_week: FocusArea[];
  energy_trend: "rising" | "stable" | "declining";
  stress_trend: "rising" | "stable" | "declining";
  encouragement: string;
  week_start: string;
  week_end: string;
  reflection_count: number;
}

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
}

export function WeeklySummaryCard({ summary }: WeeklySummaryCardProps) {
  const getTrendIcon = (trend: string, isStress = false) => {
    if (trend === "rising") {
      return isStress ? (
        <TrendingUp className="h-4 w-4 text-red-500" />
      ) : (
        <TrendingUp className="h-4 w-4 text-green-500" />
      );
    }
    if (trend === "declining") {
      return isStress ? (
        <TrendingDown className="h-4 w-4 text-green-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-orange-500" />
      );
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{summary.week_theme}</CardTitle>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(summary.week_start), "MMM d")} - {format(new Date(summary.week_end), "MMM d, yyyy")}
              <Badge variant="outline" className="ml-2">
                {summary.reflection_count} check-ins
              </Badge>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              Energy {getTrendIcon(summary.energy_trend)}
            </div>
            <div className="flex items-center gap-1">
              Stress {getTrendIcon(summary.stress_trend, true)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Story of the Week */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="leading-relaxed">{summary.story_of_the_week}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Wins */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Wins
            </h4>
            <ul className="space-y-2">
              {summary.top_wins.map((win, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                  {win}
                </li>
              ))}
            </ul>
          </div>

          {/* Top Constraints */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Challenges Faced
            </h4>
            <ul className="space-y-2">
              {summary.top_constraints.map((constraint, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500" />
                  {constraint}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator />

        {/* Focus Areas for Next Week */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 font-semibold">
            <Target className="h-4 w-4 text-primary" />
            Focus Areas for Next Week
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            {summary.focus_areas_next_week.map((focus, index) => (
              <div key={index} className="rounded-lg border p-4">
                <h5 className="font-medium">{focus.area}</h5>
                <p className="mt-1 text-sm text-muted-foreground">{focus.why}</p>
                <p className="mt-2 text-sm font-medium text-primary">{focus.suggested_action}</p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Encouragement */}
        <div className="rounded-lg bg-primary/5 p-4 text-center">
          <p className="text-sm italic">{summary.encouragement}</p>
        </div>
      </CardContent>
    </Card>
  );
}
