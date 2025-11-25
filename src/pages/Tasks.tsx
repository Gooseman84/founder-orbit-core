import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "@/components/tasks/TaskCard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { recordXpEvent } from "@/lib/xpEngine";
import { Loader2, Sparkles, ListTodo, CheckCircle2, Heart } from "lucide-react";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [checkIn, setCheckIn] = useState({
    whatDid: "",
    whatLearned: "",
    feelings: ""
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchChosenIdea();
    }
  }, [user]);

  const fetchChosenIdea = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ideas')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'chosen')
      .maybeSingle();

    if (!error && data) {
      setChosenIdeaId(data.id);
    }
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
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!user) return;

    if (!chosenIdeaId) {
      toast({
        title: "No Chosen Idea",
        description: "Please choose an idea first before generating tasks.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-micro-tasks', {
        body: { idea_id: chosenIdeaId },
      });

      if (error) throw error;

      toast({
        title: "Tasks Generated!",
        description: `Created ${data.tasks?.length || 0} new tasks for you.`,
      });

      await fetchTasks();
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to generate tasks. Please try again.",
        variant: "destructive",
      });
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
      // Update task status
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Add XP event
      await recordXpEvent(user.id, 'task_complete', task.xp_reward || 10, {
        task_id: taskId,
        task_title: task.title,
        category: task.category,
      });

      toast({
        title: "Task Completed! 🎉",
        description: `You earned ${task.xp_reward || 10} XP!`,
      });

      await fetchTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSaveCheckIn = async () => {
    if (!user) return;

    if (!checkIn.whatDid && !checkIn.whatLearned && !checkIn.feelings) {
      toast({
        title: "Nothing to save",
        description: "Please fill in at least one field before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingCheckIn(true);
    try {
      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          what_did: checkIn.whatDid || null,
          what_learned: checkIn.whatLearned || null,
          feelings: checkIn.feelings || null,
        });

      if (error) throw error;

      // Award XP for daily check-in
      await recordXpEvent(user.id, 'daily_check_in', 5, {
        has_what_did: !!checkIn.whatDid,
        has_what_learned: !!checkIn.whatLearned,
        has_feelings: !!checkIn.feelings,
      });

      toast({
        title: "Check-in saved! 🎉",
        description: "You earned 5 XP for reflecting on your day.",
      });

      // Clear form
      setCheckIn({ whatDid: "", whatLearned: "", feelings: "" });
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast({
        title: "Error",
        description: "Failed to save check-in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCheckIn(false);
    }
  };

  const openTasks = tasks.filter(t => t.status === 'open');
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
          <p className="text-muted-foreground mt-1">
            Complete micro-tasks to build momentum and earn XP
          </p>
        </div>
        <Button 
          onClick={handleGenerateTasks}
          disabled={isGenerating || !chosenIdeaId}
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Today's Tasks
            </>
          )}
        </Button>
      </div>

      {!chosenIdeaId && (
        <Alert>
          <AlertDescription>
            You need to choose an idea first before generating tasks. Visit the{' '}
            <a href="/ideas" className="underline font-medium">Ideas page</a> to select one.
          </AlertDescription>
        </Alert>
      )}

      {/* Daily Check-In Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Daily Check-In
          </CardTitle>
          <CardDescription>
            Take a moment to reflect on your day and track your progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="what-did">What did you do today?</Label>
            <Textarea
              id="what-did"
              placeholder="Tasks you completed, meetings you attended, progress you made..."
              value={checkIn.whatDid}
              onChange={(e) => setCheckIn(prev => ({ ...prev, whatDid: e.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="what-learned">What did you learn?</Label>
            <Textarea
              id="what-learned"
              placeholder="New insights, feedback received, mistakes to avoid..."
              value={checkIn.whatLearned}
              onChange={(e) => setCheckIn(prev => ({ ...prev, whatLearned: e.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feelings">What felt good or bad?</Label>
            <Textarea
              id="feelings"
              placeholder="Wins to celebrate, challenges that frustrated you, energy levels..."
              value={checkIn.feelings}
              onChange={(e) => setCheckIn(prev => ({ ...prev, feelings: e.target.value }))}
              rows={3}
              maxLength={1000}
            />
          </div>

          <Button 
            onClick={handleSaveCheckIn}
            disabled={isSavingCheckIn}
            className="w-full"
          >
            {isSavingCheckIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Heart className="mr-2 h-4 w-4" />
                Summarize my day
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="open" className="w-full">
        <TabsList>
          <TabsTrigger value="open" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            Open Tasks ({openTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-6">
          {openTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Open Tasks</h3>
              <p className="text-muted-foreground mb-4">
                {chosenIdeaId 
                  ? "Generate some tasks to get started on your founder journey!"
                  : "Choose an idea first, then generate tasks to begin."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {openTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                  isCompleting={completingTaskId === task.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Completed Tasks Yet</h3>
              <p className="text-muted-foreground">
                Complete some tasks to see them here!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleCompleteTask}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tasks;
