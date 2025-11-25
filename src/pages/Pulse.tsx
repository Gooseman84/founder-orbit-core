import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { PulseForm } from "@/components/pulse/PulseForm";
import { PulseInsightCard } from "@/components/pulse/PulseInsightCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { recordXpEvent } from "@/lib/xpEngine";
import { History, Loader2 } from "lucide-react";

export default function Pulse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshXP } = useXP();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [latestPulse, setLatestPulse] = useState<any>(null);
  const [latestTaskId, setLatestTaskId] = useState<string | undefined>();

  // Fetch latest pulse check on load
  useEffect(() => {
    const fetchLatestPulse = async () => {
      if (!user?.id) return;

      try {
        const { data: pulse, error } = await supabase
          .from("pulse_checks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching pulse check:", error);
          return;
        }

        if (pulse) {
          setLatestPulse(pulse);

          // Try to find associated task
          const { data: task } = await supabase
            .from("tasks")
            .select("id")
            .eq("user_id", user.id)
            .contains("metadata", { pulse_check_id: pulse.id })
            .maybeSingle();

          if (task) {
            setLatestTaskId(task.id);
          }
        }
      } catch (error) {
        console.error("Error fetching latest pulse:", error);
      } finally {
        setIsFetching(false);
      }
    };

    fetchLatestPulse();
  }, [user?.id]);

  const handleSubmit = async (data: {
    energy_level: number;
    stress_level: number;
    emotional_state: string;
    reflection: string;
  }) => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to complete a pulse check.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call generate-pulse-check edge function
      const { data: result, error } = await supabase.functions.invoke(
        "generate-pulse-check",
        {
          body: {
            userId: user.id,
            ...data,
          },
        }
      );

      if (error) {
        console.error("Error generating pulse check:", error);
        
        // Handle specific error types
        if (error.message?.includes("Rate limit")) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a few moments.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message?.includes("Payment required")) {
          toast({
            title: "Credits needed",
            description: "Please add credits to your workspace to continue.",
            variant: "destructive",
          });
          return;
        }

        throw error;
      }

      if (!result?.pulseCheck) {
        throw new Error("No pulse check data returned");
      }

      console.log("Pulse check generated:", result.pulseCheck.id);

      // Update state with new pulse check and task
      setLatestPulse(result.pulseCheck);
      setLatestTaskId(result.task?.id);

      // Award XP for completing pulse check
      await recordXpEvent(
        user.id,
        "pulse_completed",
        15,
        { pulseId: result.pulseCheck.id }
      );

      // Refresh XP display
      refreshXP();

      toast({
        title: "Pulse check complete",
        description: "Your insights and micro task have been generated. You earned 15 XP!",
      });

    } catch (error) {
      console.error("Error in pulse check submission:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process pulse check. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Pulse Check</h1>
          <p className="text-muted-foreground mt-1">
            Check in with yourself and get personalized insights
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/pulse/history")}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          View History
        </Button>
      </div>

      {/* Latest Pulse Insight (if exists) */}
      {latestPulse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Latest Check-In</h2>
          </div>
          <PulseInsightCard pulse={latestPulse} taskId={latestTaskId} />
        </div>
      )}

      {/* Pulse Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {latestPulse ? "New Pulse Check" : "Start Your First Pulse Check"}
          </h2>
        </div>
        <PulseForm onSubmit={handleSubmit} isLoading={isLoading} />
      </div>

      {/* Info Section */}
      {!latestPulse && (
        <div className="bg-muted/50 rounded-lg p-6 space-y-2">
          <h3 className="font-semibold">What is a Pulse Check?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A daily pulse check helps you reflect on your emotional state, energy levels, 
            and progress. Our AI coach analyzes your check-in and provides personalized 
            insights, recommended actions, and a micro task to help you move forward.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Complete pulse checks regularly to build momentum and earn XP!
          </p>
        </div>
      )}
    </div>
  );
}
