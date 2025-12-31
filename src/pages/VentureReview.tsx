import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useVentureState } from "@/hooks/useVentureState";
import { useVentureReviewStats } from "@/hooks/useVentureReviewStats";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowRight,
  RotateCcw,
  Skull,
  Loader2,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

type DecisionAction = "continue" | "pivot" | "kill";

const VentureReview = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { activeVenture, isLoading: ventureLoading } = useVentureState();
  const { data: stats, isLoading: statsLoading } = useVentureReviewStats(activeVenture);

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<DecisionAction | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allow access during executing OR reviewed states (users can always review/pivot/kill)
  useEffect(() => {
    if (ventureLoading) return;

    if (!activeVenture) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Only allow access if in executing or reviewed state
    const allowedStates = ["executing", "reviewed"];
    if (!allowedStates.includes(activeVenture.venture_state)) {
      toast({
        title: "No Active Venture",
        description: "You need an active venture to access this page.",
      });
      navigate("/dashboard", { replace: true });
    }
  }, [activeVenture, ventureLoading, navigate, toast]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["ventures"] });
    queryClient.invalidateQueries({ queryKey: ["north-star-venture"] });
    queryClient.invalidateQueries({ queryKey: ["active-venture"] });
    queryClient.invalidateQueries({ queryKey: ["venture-state"] });
  };

  const handleContinue = async () => {
    if (!activeVenture) return;
    setIsSubmitting(true);

    try {
      const { error } = await invokeAuthedFunction("venture-review-decision", {
        body: { ventureId: activeVenture.id, action: "continue" },
      });

      if (error) throw error;

      toast({ title: "Commitment Renewed", description: "Starting a new execution window." });
      invalidateQueries();
      navigate("/tasks");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to continue venture",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!activeVenture || !pendingAction) return;
    if ((pendingAction === "pivot" || pendingAction === "kill") && reason.trim().length === 0) {
      toast({ title: "Reason Required", description: "Please provide a reason.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await invokeAuthedFunction("venture-review-decision", {
        body: { ventureId: activeVenture.id, action: pendingAction, reason: reason.trim() },
      });

      if (error) throw error;

      if (pendingAction === "pivot") {
        toast({ title: "Venture Pivoted", description: "Returning to Blueprint to refine your approach." });
        invalidateQueries();
        navigate(`/blueprint`);
      } else if (pendingAction === "kill") {
        toast({ title: "Venture Killed", description: "This venture has been archived." });
        invalidateQueries();
        navigate("/north-star");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to process decision",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setModalOpen(false);
      setPendingAction(null);
      setReason("");
    }
  };

  const openModal = (action: DecisionAction) => {
    setPendingAction(action);
    setReason("");
    setModalOpen(true);
  };

  if (ventureLoading || !activeVenture) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const startDate = activeVenture.commitment_start_at
    ? format(new Date(activeVenture.commitment_start_at), "MMM d, yyyy")
    : "N/A";
  const endDate = activeVenture.commitment_end_at
    ? format(new Date(activeVenture.commitment_end_at), "MMM d, yyyy")
    : "N/A";
  const daysPassed = activeVenture.commitment_start_at && activeVenture.commitment_end_at
    ? differenceInDays(new Date(activeVenture.commitment_end_at), new Date(activeVenture.commitment_start_at))
    : 0;

  // Show different header based on state
  const isReviewRequired = activeVenture.venture_state === "reviewed";

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge 
          variant="outline" 
          className={isReviewRequired 
            ? "border-amber-500 text-amber-600" 
            : "border-primary text-primary"
          }
        >
          {isReviewRequired ? "Review Required" : "Venture Controls"}
        </Badge>
        <h1 className="text-2xl font-bold">{activeVenture.name}</h1>
        <p className="text-muted-foreground">{activeVenture.success_metric}</p>
      </div>

      {/* Commitment Window */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Commitment Window
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Period</span>
            <span>{startDate} → {endDate}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Duration</span>
            <span>{activeVenture.commitment_window_days || daysPassed} days</span>
          </div>
        </CardContent>
      </Card>

      {/* Execution Stats */}
      {statsLoading ? (
        <Card>
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : stats ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Execution Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.tasksCompleted}/{stats.totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.completionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.checkinDays}/{stats.totalDays}</p>
                <p className="text-xs text-muted-foreground">Check-in Days</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{stats.checkinRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Check-in Rate</p>
              </div>
            </div>

            <Separator />

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{stats.yesCount} Yes</span>
              </div>
              <div className="flex items-center gap-1">
                <MinusCircle className="h-4 w-4 text-amber-500" />
                <span>{stats.partialCount} Partial</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>{stats.noCount} No</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent Reflections */}
      {stats && stats.recentCheckins.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Recent Reflections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentCheckins.map((checkin) => (
              <div key={checkin.id} className="border-l-2 border-muted pl-3 py-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {format(new Date(checkin.checkin_date), "MMM d")}
                  </span>
                  {checkin.completion_status === "yes" && (
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      Completed
                    </Badge>
                  )}
                  {checkin.completion_status === "partial" && (
                    <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">
                      Partial
                    </Badge>
                  )}
                  {checkin.completion_status === "no" && (
                    <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                      Blocked
                    </Badge>
                  )}
                </div>
                {checkin.reflection && (
                  <p className="text-sm mt-1">{checkin.reflection}</p>
                )}
                {(checkin.completion_status === "partial" || checkin.completion_status === "no") && checkin.explanation && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{checkin.explanation}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Decision Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-center">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Continue — Start New Commitment
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => openModal("pivot")}
              disabled={isSubmitting}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Pivot
            </Button>
            <Button
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => openModal("kill")}
              disabled={isSubmitting}
            >
              <Skull className="h-4 w-4 mr-2" />
              Kill
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pivot/Kill Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingAction === "pivot" ? "Pivot Venture" : "Kill Venture"}
            </DialogTitle>
            <DialogDescription>
              {pendingAction === "pivot"
                ? "You'll return to your Blueprint to refine your approach. Why are you pivoting?"
                : "This venture will be permanently archived. Why are you killing it?"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Brief reason (required, max 200 chars)"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            className="min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground text-right">{reason.length}/200</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={pendingAction === "kill" ? "destructive" : "default"}
              onClick={handleConfirmAction}
              disabled={isSubmitting || reason.trim().length === 0}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm {pendingAction === "pivot" ? "Pivot" : "Kill"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VentureReview;
