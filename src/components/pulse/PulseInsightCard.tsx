import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Lightbulb, Target, Zap } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PulseInsightCardProps {
  pulse: {
    id: string;
    user_id: string;
    energy_level: number;
    stress_level: number;
    emotional_state: string;
    reflection: string;
    ai_insight: string;
    recommended_action: string;
    metadata?: any;
    created_at: string;
  };
  taskId?: string;
}

export const PulseInsightCard = ({ pulse, taskId }: PulseInsightCardProps) => {
  const navigate = useNavigate();

  const xpReward = pulse.metadata?.micro_task?.xp_reward || 5;

  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Your Insight for Today
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Calendar className="h-3 w-3" />
              {format(new Date(pulse.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <span className="text-xs">Energy:</span>
              <span className="font-semibold">{pulse.energy_level}/5</span>
            </Badge>
            <Badge variant="outline" className="gap-1">
              <span className="text-xs">Stress:</span>
              <span className="font-semibold">{pulse.stress_level}/5</span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* AI Insight */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Insight
            </h4>
          </div>
          <p className="text-base leading-relaxed pl-3 border-l-2 border-primary/30">
            {pulse.ai_insight}
          </p>
        </div>

        {/* Recommended Action */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Recommended Action
            </h4>
          </div>
          <p className="text-base leading-relaxed pl-6">
            {pulse.recommended_action}
          </p>
        </div>

        {/* Task Link */}
        {taskId && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Your Next Micro Task</p>
                <p className="text-xs text-muted-foreground">
                  We've created a task based on your pulse check
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  +{xpReward} XP
                </Badge>
                <Button 
                  onClick={() => navigate("/tasks")}
                  size="sm"
                >
                  View Task
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Emotional Context */}
        {pulse.emotional_state && (
          <div className="pt-4 border-t text-xs text-muted-foreground">
            <span className="font-medium">Feeling:</span> {pulse.emotional_state}
            {pulse.reflection && (
              <>
                <span className="mx-2">•</span>
                <span>{pulse.reflection}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
