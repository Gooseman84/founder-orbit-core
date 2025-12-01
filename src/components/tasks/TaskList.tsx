import { TaskCard } from "./TaskCard";
import { Zap, Target, Inbox } from "lucide-react";

interface Task {
  id: string;
  type?: string | null;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  workspace_document_id?: string | null;
}

interface TaskListProps {
  tasks: Task[];
  onTaskCompleted: (taskId: string) => void;
  onTaskStart?: (taskId: string) => void;
}

export function TaskList({ tasks, onTaskCompleted, onTaskStart }: TaskListProps) {
  const microTasks = tasks.filter((task) => task.type === "micro");
  const questTasks = tasks.filter((task) => task.type === "quest");
  const otherTasks = tasks.filter((task) => task.type !== "micro" && task.type !== "quest");

  // If no tasks at all, show global empty state
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Generate your first set of tasks to start building momentum on your founder journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Micro Tasks Section */}
      {microTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Micro Tasks</h2>
            <span className="text-sm text-muted-foreground">({microTasks.length})</span>
          </div>
          <div className="space-y-3">
            {microTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={onTaskCompleted} onStart={onTaskStart} />
            ))}
          </div>
        </div>
      )}

      {/* Founder Quests Section */}
      {questTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Founder Quests</h2>
            <span className="text-sm text-muted-foreground">({questTasks.length})</span>
          </div>
          <div className="space-y-3">
            {questTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={onTaskCompleted} onStart={onTaskStart} />
            ))}
          </div>
        </div>
      )}

      {/* Other Tasks (fallback for tasks without type) */}
      {otherTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-bold">Other Tasks</h2>
            <span className="text-sm text-muted-foreground">({otherTasks.length})</span>
          </div>
          <div className="space-y-3">
            {otherTasks.map((task) => (
              <TaskCard key={task.id} task={task} onComplete={onTaskCompleted} onStart={onTaskStart} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
