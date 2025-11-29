import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { supabase } from "@/integrations/supabase/client";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { recordXpEvent } from "@/lib/xpEngine";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, ListTodo, CheckCircle2, Activity, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refresh: refreshXp } = useXP();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchChosenIdea();
    }
  }, [user]);

  const fetchChosenIdea = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'chosen')
      .maybeSingle();
    if (data) setChosenIdeaId(data.id);
  };

  const fetchTasks = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({ title: "Error", description: "Failed to load tasks.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!user || !chosenIdeaId) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-micro-tasks', {
        body: { userId: user.id },
      });
      if (error) throw error;
      toast({ title: "Tasks Generated!", description: `Created ${data.tasks?.length || 0} new tasks.` });
      await fetchTasks();
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    setCompletingTaskId(taskId);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('user_id', user.id);
      if (error) throw error;
      const xpAmount = task.xp_reward || 10;
      await recordXpEvent(user.id, 'task_completed', xpAmount, { taskId, task_title: task.title });
      queryClient.invalidateQueries({ queryKey: ["xp", user.id] });
      await refreshXp();
      toast({ title: "Task Completed! 🎉", description: `You earned ${xpAmount} XP!` });
      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" });
    } finally {
      setCompletingTaskId(null);
    }
  };

  const openTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Founder Quests</h1>
          <p className="text-muted-foreground mt-1">Complete micro-tasks to build momentum and earn XP</p>
        </div>
        <Button onClick={handleGenerateTasks} disabled={isGenerating || !chosenIdeaId} size="lg">
          {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Today's Tasks</>}
        </Button>
      </div>

      {!chosenIdeaId && (
        <Alert>
          <AlertDescription>
            You need to choose an idea first. Visit the <a href="/ideas" className="underline font-medium">Ideas page</a> to select one.
          </AlertDescription>
        </Alert>
      )}

      {/* Daily Pulse Link */}
      <Card className="border-primary/20 bg-gradient-to-r from-background to-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Daily Pulse & Check-In</p>
              <p className="text-sm text-muted-foreground">Reflect on your day and get AI insights</p>
            </div>
          </div>
          <Button onClick={() => navigate("/daily-reflection")} variant="outline" className="gap-2">
            Start Check-In <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />Open Tasks ({openTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-6">
          <TaskList tasks={openTasks} onTaskCompleted={handleCompleteTask} />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
          <TaskList tasks={completedTasks} onTaskCompleted={handleCompleteTask} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tasks;
