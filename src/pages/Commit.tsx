import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import type { CommitmentWindowDays, CommitmentFull } from "@/types/venture";
import { addDays, format } from "date-fns";
import { ArrowLeft, Check, Lock, Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const WINDOW_OPTIONS: { value: CommitmentWindowDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

// Removed: STEPS array — now using FunnelStepper component


interface IdeaRow {
  id: string;
  title: string;
  description: string | null;
}

interface OpportunityScoreRow {
  total_score: number | null;
}

export default function Commit() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ensureVentureForIdea } = useActiveVenture();
  const { transitionTo, activeVenture, isLoading: ventureLoading } = useVentureState();
  const { hasPro, hasFounder } = useFeatureAccess();
  const canUseExtendedDurations = hasPro || hasFounder;

  const [idea, setIdea] = useState<IdeaRow | null>(null);
  const [oppScore, setOppScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [windowDays, setWindowDays] = useState<CommitmentWindowDays>(7);
  const [successMetric, setSuccessMetric] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check if there's already an active executing venture (for a different idea)
  const hasConflictingVenture = activeVenture && activeVenture.venture_state === "executing" && activeVenture.idea_id !== ideaId;

  // Check for active venture on mount and redirect if exists (safety net)
  // Only redirect if the active venture is for a DIFFERENT idea
  useEffect(() => {
    if (activeVenture && !ventureLoading && activeVenture.idea_id !== ideaId) {
      toast.error("You have an active venture. Complete, pivot, or kill it before starting a new one.");
      navigate("/dashboard");
    }
  }, [activeVenture, ventureLoading, navigate, ideaId]);

  // Fetch idea + opportunity score
  useEffect(() => {
    if (!ideaId || !user) return;
    setLoading(true);

    const fetchData = async () => {
      const [ideaRes, scoreRes] = await Promise.all([
        supabase
          .from("ideas")
          .select("id, title, description")
          .eq("id", ideaId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("opportunity_scores")
          .select("total_score")
          .eq("idea_id", ideaId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (ideaRes.error || !ideaRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setIdea(ideaRes.data as IdeaRow);
      if (scoreRes.data) {
        setOppScore((scoreRes.data as OpportunityScoreRow).total_score);
      }
      setLoading(false);
    };

    fetchData();
  }, [ideaId, user]);

  const handleCommit = async () => {
    if (!ideaId || !idea || !successMetric.trim()) {
      toast.error("Please enter your success metric");
      return;
    }

    if (hasConflictingVenture) {
      toast.error("You already have an active venture. Complete or kill it before starting a new one.");
      return;
    }

    setSubmitting(true);
    try {
      const venture = await ensureVentureForIdea(ideaId, idea.title);

      const startDate = new Date();
      const endDate = addDays(startDate, windowDays);

      const commitmentData: CommitmentFull = {
        commitment_window_days: windowDays,
        success_metric: successMetric.trim(),
        commitment_start_at: startDate.toISOString(),
        commitment_end_at: endDate.toISOString(),
      };

      const success = await transitionTo(venture.id, "executing", commitmentData);

      if (success) {
        toast.success("You're committed! Let's build. 🔥");
        navigate(`/blueprint?ventureId=${venture.id}&fresh=1`);
      } else {
        toast.error("This venture is already in progress or cannot be started. Check your active ventures.");
      }
    } catch (err) {
      console.error("Commit error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message.includes("Invalid state transition")) {
        toast.error("You already have an active venture. Complete or kill it before starting a new one.");
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!ideaId) return;
    // Idea is already in the library with candidate status
    toast.success("Idea saved to your library");
    navigate("/ideas");
  };

  if (loading || ventureLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Idea not found</h1>
          <p className="text-muted-foreground">
            This idea doesn't exist or you don't have access to it.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" asChild>
              <Link to="/discover/results">Back to results</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/ideas">Idea Lab</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Active venture warning */}
      {hasConflictingVenture && (
        <div className="w-full bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive text-center">
            You already have an active venture. Complete or kill it before committing to a new one.
          </p>
        </div>
      )}

      {/* Top bar */}
      <div className="w-full px-4 pt-4 sm:pt-6">
        <Link
          to="/discover/results"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-8 sm:py-0">
        <Card className="w-full max-w-lg border-border/60">
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Idea header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
                  {idea?.title}
                </h1>
                {oppScore !== null && (
                  <Badge variant="secondary" className="shrink-0 text-xs font-semibold">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {oppScore}/100
                  </Badge>
                )}
              </div>
              {idea?.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {idea.description}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Commitment window */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Commitment window
              </Label>
              <RadioGroup
                value={String(windowDays)}
                onValueChange={(v) => {
                  const days = Number(v) as CommitmentWindowDays;
                  if (days > 7 && !canUseExtendedDurations) {
                    setShowUpgradeModal(true);
                    return;
                  }
                  setWindowDays(days);
                }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {WINDOW_OPTIONS.map((opt) => {
                  const isLocked = opt.value > 7 && !canUseExtendedDurations;
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-sm",
                        isLocked
                          ? "border-border bg-muted/20 text-muted-foreground/60 cursor-pointer"
                          : windowDays === opt.value
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <RadioGroupItem value={String(opt.value)} className="sr-only" />
                      {opt.label}
                      {isLocked && <Lock className="h-3 w-3 text-muted-foreground/60" />}
                    </label>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Success metric */}
            <div className="space-y-2">
              <Label htmlFor="success-metric" className="text-sm font-medium text-foreground">
                What does success look like at the end of this window?
              </Label>
              <Input
                id="success-metric"
                value={successMetric}
                onChange={(e) => setSuccessMetric(e.target.value)}
                placeholder="e.g., 10 paying customers, MVP launched, $1k MRR"
                className="bg-muted/30"
              />
            </div>

            {/* Commit button */}
            <Button
              variant="gradient"
              size="lg"
              className="w-full text-base"
              onClick={handleCommit}
              disabled={submitting || !successMetric.trim() || !!hasConflictingVenture}
            >
              {submitting ? (
                "Committing…"
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  I'm Committing
                </>
              )}
            </Button>

            {/* Save for later */}
            <div className="text-center">
              <button
                onClick={handleSaveForLater}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Not ready? Save to Idea Lab instead
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Pro Upgrade Modal for locked durations */}
      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
