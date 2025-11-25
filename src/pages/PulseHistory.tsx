import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PulseInsightCard } from "@/components/pulse/PulseInsightCard";
import { ArrowLeft, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface PulseCheck {
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
}

export default function PulseHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pulseChecks, setPulseChecks] = useState<PulseCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [taskIds, setTaskIds] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPulseHistory = async () => {
      if (!user?.id) return;

      try {
        const { data: pulses, error } = await supabase
          .from("pulse_checks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching pulse history:", error);
          return;
        }

        setPulseChecks(pulses || []);

        // Fetch associated tasks for each pulse
        if (pulses && pulses.length > 0) {
          const { data: tasks } = await supabase
            .from("tasks")
            .select("id, metadata")
            .eq("user_id", user.id)
            .not("metadata", "is", null);

          if (tasks) {
            const taskMap: Record<string, string> = {};
            tasks.forEach((task) => {
              if (task.metadata && typeof task.metadata === 'object' && !Array.isArray(task.metadata)) {
                const metadata = task.metadata as Record<string, any>;
                const pulseCheckId = metadata.pulse_check_id;
                if (pulseCheckId && typeof pulseCheckId === 'string') {
                  taskMap[pulseCheckId] = task.id;
                }
              }
            });
            setTaskIds(taskMap);
          }
        }
      } catch (error) {
        console.error("Error fetching pulse history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPulseHistory();
  }, [user?.id]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/pulse")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Pulse Check History</h1>
          <p className="text-muted-foreground mt-1">
            Review your past check-ins and track your progress
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {pulseChecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            <div>
              <p className="text-2xl font-bold">{pulseChecks.length}</p>
              <p className="text-sm text-muted-foreground">Total Check-ins</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(pulseChecks.reduce((sum, p) => sum + p.energy_level, 0) / pulseChecks.length).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Avg Energy</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(pulseChecks.reduce((sum, p) => sum + p.stress_level, 0) / pulseChecks.length).toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">Avg Stress</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pulse Check List */}
      {pulseChecks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No pulse checks yet</p>
            <Button onClick={() => navigate("/pulse")}>
              Complete Your First Pulse Check
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pulseChecks.map((pulse) => (
            <div key={pulse.id}>
              {expandedId === pulse.id ? (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpand(pulse.id)}
                    className="gap-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Collapse
                  </Button>
                  <PulseInsightCard pulse={pulse} taskId={taskIds[pulse.id]} />
                </div>
              ) : (
                <Card 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => toggleExpand(pulse.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(pulse.created_at), "EEEE, MMMM d, yyyy")}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {format(new Date(pulse.created_at), "h:mm a")}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="gap-1 text-xs">
                          <span>Energy:</span>
                          <span className="font-semibold">{pulse.energy_level}/5</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <span>Stress:</span>
                          <span className="font-semibold">{pulse.stress_level}/5</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Feeling
                      </p>
                      <p className="text-sm">{pulse.emotional_state}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Insight Preview
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pulse.ai_insight}
                      </p>
                    </div>
                    <div className="pt-2 flex items-center justify-between border-t">
                      <span className="text-xs text-muted-foreground">
                        Click to view full details
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
