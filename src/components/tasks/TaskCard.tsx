import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Trophy } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  status: string;
  completed_at: string | null;
}

interface TaskCardProps {
  task: Task;
  onComplete: (taskId: string) => void;
  isCompleting?: boolean;
}

const CATEGORY_STYLES: Record<string, { variant: "default" | "secondary" | "outline" | "destructive", icon?: string }> = {
  Research: { variant: "secondary" },
  Validation: { variant: "default" },
  Planning: { variant: "outline" },
  Building: { variant: "default" },
  Marketing: { variant: "secondary" },
  Operations: { variant: "outline" },
};

export const TaskCard = ({ task, onComplete, isCompleting = false }: TaskCardProps) => {
  const categoryStyle = CATEGORY_STYLES[task.category || ''] || { variant: "outline" as const };
  const isCompleted = task.status === 'completed';

  return (
    <Card className={`transition-all ${isCompleted ? 'opacity-60 border-muted' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex items-start gap-2">
            {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />}
            <span className={isCompleted ? 'line-through text-muted-foreground' : ''}>
              {task.title}
            </span>
          </CardTitle>
          {task.category && (
            <Badge variant={categoryStyle.variant} className="flex-shrink-0">
              {task.category}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      {task.description && (
        <CardContent className="pb-3">
          <p className={`text-sm ${isCompleted ? 'text-muted-foreground' : 'text-foreground/80'}`}>
            {task.description}
          </p>
        </CardContent>
      )}
      
      <CardFooter className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {task.estimated_minutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{task.estimated_minutes} min</span>
            </div>
          )}
          {task.xp_reward && (
            <div className="flex items-center gap-1 font-medium">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600">{task.xp_reward} XP</span>
            </div>
          )}
        </div>
        
        {!isCompleted && (
          <Button 
            onClick={() => onComplete(task.id)}
            disabled={isCompleting}
            size="sm"
            variant="default"
          >
            {isCompleting ? 'Completing...' : 'Mark Complete'}
          </Button>
        )}
        
        {isCompleted && task.completed_at && (
          <span className="text-xs text-muted-foreground">
            Completed {new Date(task.completed_at).toLocaleDateString()}
          </span>
        )}
      </CardFooter>
    </Card>
  );
};
