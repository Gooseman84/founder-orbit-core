import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useAuth } from "@/hooks/useAuth";
import { useVentureState } from "@/hooks/useVentureState";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { BlueprintSkeleton } from "@/components/shared/SkeletonLoaders";
import { toast } from "@/hooks/use-toast";
import { 
  Target, 
  AlertTriangle, 
  ArrowLeft, 
  Rocket,
  Clock,
  Loader2
} from "lucide-react";
import type { CommitmentWindowDays, CommitmentDraft, CommitmentFull, Venture, VentureState } from "@/types/venture";

const Blueprint = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { blueprint, loading: blueprintLoading } = useBlueprint();
  const { activeVenture, isLoading: ventureLoading, transitionTo } = useVentureState();
  
  // Local state to find inactive venture if no active one
  const [inactiveVenture, setInactiveVenture] = useState<Venture | null>(null);
  const [inactiveLoading, setInactiveLoading] = useState(true);
  
  // Form state
  const [windowDays, setWindowDays] = useState<CommitmentWindowDays>(30);
  const [successMetric, setSuccessMetric] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Fetch inactive venture if no active venture exists
  useEffect(() => {
    async function fetchInactiveVenture() {
      if (!user || activeVenture) {
        setInactiveLoading(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from("ventures")
          .select("*")
          .eq("user_id", user.id)
          .eq("venture_state", "inactive")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) {
          setInactiveVenture({
            ...data,
            venture_state: data.venture_state as VentureState,
            commitment_window_days: data.commitment_window_days as CommitmentWindowDays | null,
          } as Venture);
        }
      } catch (err) {
        console.error("Failed to fetch inactive venture:", err);
      } finally {
        setInactiveLoading(false);
      }
    }
    
    if (!ventureLoading) {
      fetchInactiveVenture();
    }
  }, [user, activeVenture, ventureLoading]);

  // Get venture state - either from active venture or inactive one we're about to commit
  const currentVenture = activeVenture ?? inactiveVenture;
  const ventureState = currentVenture?.venture_state ?? "inactive";
  const ventureId = currentVenture?.id;

  // State-based redirects
  useEffect(() => {
    if (ventureLoading || inactiveLoading) return;
    
    if (ventureState === "executing") {
      navigate("/tasks", { replace: true });
    } else if (ventureState === "reviewed") {
      navigate("/venture-review", { replace: true });
    } else if (ventureState === "killed") {
      navigate("/ideas", { replace: true });
    }
  }, [ventureState, ventureLoading, inactiveLoading, navigate]);

  // Pre-fill form if venture already has commitment data
  useEffect(() => {
    if (activeVenture?.commitment_window_days) {
      setWindowDays(activeVenture.commitment_window_days);
    }
    if (activeVenture?.success_metric) {
      setSuccessMetric(activeVenture.success_metric);
    }
  }, [activeVenture]);

  const isFormValid = windowDays && successMetric.trim().length > 0 && acknowledged;

  const handleCommitAndStart = async () => {
    if (!ventureId || !isFormValid) return;

    setIsCommitting(true);
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + windowDays);

      if (ventureState === "inactive") {
        // Two-step: inactive → committed → executing
        const draftData: CommitmentDraft = {
          commitment_window_days: windowDays,
          success_metric: successMetric.trim(),
        };
        
        const committedSuccess = await transitionTo(ventureId, "committed", draftData);
        if (!committedSuccess) {
          throw new Error("Failed to transition to committed state");
        }

        // Now transition to executing
        const fullData: CommitmentFull = {
          ...draftData,
          commitment_start_at: now.toISOString(),
          commitment_end_at: endDate.toISOString(),
        };

        const executingSuccess = await transitionTo(ventureId, "executing", fullData);
        if (!executingSuccess) {
          throw new Error("Failed to start execution");
        }
      } else if (ventureState === "committed") {
        // Single step: committed → executing
        const fullData: CommitmentFull = {
          commitment_window_days: windowDays,
          success_metric: successMetric.trim(),
          commitment_start_at: now.toISOString(),
          commitment_end_at: endDate.toISOString(),
        };

        const success = await transitionTo(ventureId, "executing", fullData);
        if (!success) {
          throw new Error("Failed to start execution");
        }
      }

      toast({
        title: "Execution started!",
        description: `Your ${windowDays}-day commitment begins now.`,
      });

      navigate("/tasks");
    } catch (err) {
      console.error("Commit error:", err);
      toast({
        title: "Failed to start execution",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCommitting(false);
    }
  };

  const handleNotReady = () => {
    navigate("/ideas");
  };

  // Loading state
  if (blueprintLoading || ventureLoading || inactiveLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <BlueprintSkeleton />
      </div>
    );
  }

  // No venture to commit to
  if (!ventureId) {
    return (
      <div className="container mx-auto py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>No Venture Selected</CardTitle>
            <CardDescription>
              Choose an idea and create a venture before accessing the Blueprint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/ideas")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Ideas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate AI narrative from blueprint data
  const narrativeSummary = generateNarrativeSummary(blueprint, currentVenture?.name);
  const misalignmentCallouts = generateMisalignmentCallouts(blueprint);

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Your Blueprint</h1>
        <p className="text-muted-foreground">
          This is where thinking ends and building begins.
        </p>
      </div>

      {/* AI Narrative Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What you're building — and why it makes sense</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {narrativeSummary}
          </p>
        </CardContent>
      </Card>

      {/* Misalignment Callouts */}
      {misalignmentCallouts.length > 0 && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">What you need to be honest about</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {misalignmentCallouts.map((callout, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-500 mt-1">•</span>
                  <span className="text-muted-foreground">{callout}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Commitment Inputs */}
      <Card className="mb-6 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Commitment</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Commitment Window */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Commitment Window</Label>
            <div className="grid grid-cols-3 gap-3">
              {([14, 30, 90] as CommitmentWindowDays[]).map((days) => (
                <Button
                  key={days}
                  type="button"
                  variant={windowDays === days ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setWindowDays(days)}
                >
                  {days} days
                </Button>
              ))}
            </div>
          </div>

          {/* Success Metric */}
          <div className="space-y-2">
            <Label htmlFor="success-metric" className="text-sm font-medium">
              Success Metric
            </Label>
            <Input
              id="success-metric"
              placeholder="e.g., 5 paying customers, $1000 revenue, 100 signups..."
              value={successMetric}
              onChange={(e) => setSuccessMetric(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              How will you know this worked? Be specific.
            </p>
          </div>

          {/* Acknowledgment */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <label 
              htmlFor="acknowledge" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I understand that once execution starts, this plan locks. I'm committing 
              to focus on this venture for the next {windowDays} days.
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          size="lg"
          className="w-full"
          disabled={!isFormValid || isCommitting}
          onClick={handleCommitAndStart}
        >
          {isCommitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting execution...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Commit & Start Execution
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={handleNotReady}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          I'm not ready to commit yet
        </Button>
      </div>

      {/* Validation hint */}
      {!isFormValid && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
            {!successMetric.trim() && <span>• Enter a success metric</span>}
            {!acknowledged && <span>• Acknowledge the commitment</span>}
          </p>
        </div>
      )}
    </div>
  );
};

// Helper: Generate narrative summary from blueprint
function generateNarrativeSummary(
  blueprint: any,
  ventureName?: string
): string {
  if (!blueprint) {
    return "Your venture is ready for commitment. Define your success criteria and begin execution.";
  }

  const parts: string[] = [];

  if (ventureName) {
    parts.push(`You're building ${ventureName}.`);
  }

  if (blueprint.north_star_one_liner) {
    parts.push(blueprint.north_star_one_liner);
  }

  if (blueprint.target_audience && blueprint.problem_statement) {
    parts.push(`You're solving "${blueprint.problem_statement}" for ${blueprint.target_audience}.`);
  } else if (blueprint.target_audience) {
    parts.push(`Your target audience is ${blueprint.target_audience}.`);
  }

  if (blueprint.offer_model) {
    parts.push(`Your offer model: ${blueprint.offer_model}.`);
  }

  if (blueprint.time_available_hours_per_week) {
    parts.push(`You have ${blueprint.time_available_hours_per_week} hours/week to invest.`);
  }

  if (parts.length === 0) {
    return "Complete your profile and choose an idea to see your personalized blueprint summary.";
  }

  return parts.join(" ");
}

// Helper: Generate misalignment callouts from blueprint
function generateMisalignmentCallouts(blueprint: any): string[] {
  const callouts: string[] = [];

  if (!blueprint) return callouts;

  // Time constraint warning
  if (blueprint.time_available_hours_per_week && blueprint.time_available_hours_per_week < 10) {
    callouts.push(
      `You only have ${blueprint.time_available_hours_per_week} hours/week. Ambitious ventures need focused execution windows.`
    );
  }

  // Capital warning
  if (blueprint.capital_available !== null && blueprint.capital_available < 500) {
    callouts.push(
      "Limited capital means you need to validate before building. Prioritize customer conversations."
    );
  }

  // Risk profile warning
  if (blueprint.risk_profile === "conservative") {
    callouts.push(
      "Your conservative risk profile may conflict with the experimentation needed for early ventures."
    );
  }

  // Missing critical elements
  if (!blueprint.target_audience) {
    callouts.push("You haven't defined your target audience. This needs clarity before execution.");
  }

  if (!blueprint.problem_statement) {
    callouts.push("No clear problem statement. What pain are you solving?");
  }

  // Weaknesses acknowledgment
  if (blueprint.weaknesses) {
    callouts.push(`Your self-identified weakness: "${blueprint.weaknesses}". Plan around it.`);
  }

  return callouts.slice(0, 5); // Max 5 callouts
}

export default Blueprint;
