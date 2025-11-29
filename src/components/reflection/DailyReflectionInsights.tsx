import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Clock, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface MicroAction {
  title: string;
  description: string;
  estimated_minutes: number;
}

interface SuggestedTask {
  title: string;
  description: string;
  xp_reward: number;
  type: "micro" | "quest";
}

interface DailyReflection {
  id: string;
  reflection_date: string;
  energy_level: number;
  stress_level: number;
  mood_tags: string[];
  ai_summary: string;
  ai_theme: string;
  ai_micro_actions: MicroAction[];
  ai_suggested_task: SuggestedTask | null;
}

interface DailyReflectionInsightsProps {
  reflection: DailyReflection;
  onAcceptTask?: (task: SuggestedTask) => void;
  taskAccepted?: boolean;
}

export function DailyReflectionInsights({ 
  reflection, 
  onAcceptTask,
  taskAccepted = false 
}: DailyReflectionInsightsProps) {
  const getEnergyColor = (level: number) => {
    if (level <= 2) return "text-orange-500";
    if (level >= 4) return "text-green-500";
    return "text-yellow-500";
  };

  const getStressColor = (level: number) => {
    if (level >= 4) return "text-red-500";
    if (level <= 2) return "text-green-500";
    return "text-yellow-500";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Your Daily Insights
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {format(new Date(reflection.reflection_date), "MMMM d, yyyy")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Badge */}
        {reflection.ai_theme && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Theme of the Day:</span>
            <Badge variant="secondary" className="text-sm font-medium">
              {reflection.ai_theme}
            </Badge>
          </div>
        )}

        {/* Energy & Stress Summary */}
        <div className="flex gap-4 text-sm">
          <span>
            Energy: <span className={getEnergyColor(reflection.energy_level)}>{reflection.energy_level}/5</span>
          </span>
          <span>
            Stress: <span className={getStressColor(reflection.stress_level)}>{reflection.stress_level}/5</span>
          </span>
          {reflection.mood_tags?.length > 0 && (
            <span className="text-muted-foreground">
              Mood: {reflection.mood_tags.join(", ")}
            </span>
          )}
        </div>

        {/* AI Summary */}
        {reflection.ai_summary && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm leading-relaxed">{reflection.ai_summary}</p>
          </div>
        )}

        <Separator />

        {/* Micro Actions */}
        {reflection.ai_micro_actions && reflection.ai_micro_actions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Tomorrow's Micro Actions</h4>
            <ul className="space-y-2">
              {reflection.ai_micro_actions.map((action, index) => (
                <li key={index} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      ~{action.estimated_minutes} min
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Task */}
        {reflection.ai_suggested_task && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Suggested Task</h4>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{reflection.ai_suggested_task.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reflection.ai_suggested_task.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {reflection.ai_suggested_task.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        +{reflection.ai_suggested_task.xp_reward} XP
                      </Badge>
                    </div>
                  </div>
                  {onAcceptTask && (
                    <Button
                      size="sm"
                      variant={taskAccepted ? "secondary" : "default"}
                      onClick={() => onAcceptTask(reflection.ai_suggested_task!)}
                      disabled={taskAccepted}
                    >
                      {taskAccepted ? (
                        <>
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 h-4 w-4" />
                          Add to Tasks
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
