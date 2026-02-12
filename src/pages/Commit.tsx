import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { useVentureState } from "@/hooks/useVentureState";
import { useAuth } from "@/hooks/useAuth";
import type { CommitmentWindowDays, CommitmentFull } from "@/types/venture";
import { addDays, format } from "date-fns";
import { ArrowLeft, Check, Rocket, Sparkles } from "lucide-react";
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

const STEPS = [
  { label: "Interview", done: true },
  { label: "Profile", done: true },
  { label: "Ideas", done: true },
  { label: "Commit", active: true },
  { label: "Blueprint", done: false },
  { label: "Build", done: false },
];

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
  const { transitionTo } = useVentureState();

  const [idea, setIdea] = useState<IdeaRow | null>(null);
  const [oppScore, setOppScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [windowDays, setWindowDays] = useState<CommitmentWindowDays>(30);
  const [successMetric, setSuccessMetric] = useState("");

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
          .single(),
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
        toast.error("Idea not found");
        navigate("/ideas");
        return;
      }

      setIdea(ideaRes.data as IdeaRow);
      if (scoreRes.data) {
        setOppScore((scoreRes.data as OpportunityScoreRow).total_score);
      }
      setLoading(false);
    };

    fetchData();
  }, [ideaId, user, navigate]);

  const handleCommit = async () => {
    if (!ideaId || !idea || !successMetric.trim()) {
      toast.error("Please enter your success metric");
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
        navigate(`/blueprint?ventureId=${venture.id}`);
      } else {
        toast.error("Failed to start execution. Please try again.");
      }
    } catch (err) {
      console.error("Commit error:", err);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      {/* Progress stepper */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    step.done && "bg-primary/20 text-primary",
                    step.active && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
                    !step.done && !step.active && "bg-muted text-muted-foreground"
                  )}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs mt-1 text-center",
                    step.active ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-4 sm:w-8 mx-1",
                    i < STEPS.findIndex((s) => s.active)
                      ? "bg-primary/40"
                      : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
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
                onValueChange={(v) => setWindowDays(Number(v) as CommitmentWindowDays)}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {WINDOW_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors text-sm",
                      windowDays === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <RadioGroupItem value={String(opt.value)} className="sr-only" />
                    {opt.label}
                  </label>
                ))}
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
              disabled={submitting || !successMetric.trim()}
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
    </div>
  );
}
