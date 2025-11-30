import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

// The ai_suggested_task from the edge function uses { title, notes }
interface AISuggestedTask {
  title?: string;
  notes?: string;
}

interface DailyReflection {
  id: string;
  reflection_date: string;
  energy_level: number;
  stress_level: number;
  mood_tags: string[];
  ai_summary: string;
  ai_theme: string;
  ai_micro_actions: string[] | null; // Array of strings from edge function
  ai_suggested_task: AISuggestedTask | null;
}

interface DailyReflectionInsightsProps {
  reflection: DailyReflection;
  onAcceptTask?: (task: { title: string; description: string; xp_reward: number; type: string }) => void;
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

  const handleAcceptTask = () => {
    if (onAcceptTask && reflection.ai_suggested_task?.title) {
      onAcceptTask({
        title: reflection.ai_suggested_task.title,
        description: reflection.ai_suggested_task.notes || "",
        xp_reward: 10,
        type: "micro",
      });
    }
  };

  // Normalize micro_actions to always be an array of strings
  const microActions = Array.isArray(reflection.ai_micro_actions) 
    ? reflection.ai_micro_actions 
    : [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Summary of Your Day
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

        {/* Micro Actions - now handles string[] */}
        {microActions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Micro Tweaks for Tomorrow</h4>
            <ul className="space-y-2">
              {microActions.map((action, index) => (
                <li key={index} className="flex items-start gap-3 rounded-md border p-3">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {index + 1}
                  </div>
                  <p className="flex-1 text-sm">{action}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Task */}
        {reflection.ai_suggested_task?.title && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Suggested Task</h4>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{reflection.ai_suggested_task.title}</p>
                    {reflection.ai_suggested_task.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {reflection.ai_suggested_task.notes}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        micro
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        +10 XP
                      </Badge>
                    </div>
                  </div>
                  {onAcceptTask && (
                    <Button
                      size="sm"
                      variant={taskAccepted ? "secondary" : "default"}
                      onClick={handleAcceptTask}
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
                          Add to My Tasks
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
