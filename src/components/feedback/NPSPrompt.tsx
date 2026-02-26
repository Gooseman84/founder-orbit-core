import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NPSPromptProps {
  open: boolean;
  onClose: () => void;
}

const PLACEHOLDERS: Record<string, string> = {
  low: "What would make TrueBlazer more valuable for you?",
  mid: "What would push this to a 10 for you?",
  high: "What's been most valuable so far?",
};

function getScoreColor(n: number) {
  if (n <= 6) return "bg-red-500/15 text-red-400 border-red-500/40 hover:bg-red-500/25";
  if (n <= 8) return "bg-yellow-500/15 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/25";
  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25";
}

function getSelectedColor(n: number) {
  if (n <= 6) return "bg-red-500 text-white border-red-500";
  if (n <= 8) return "bg-yellow-500 text-white border-yellow-500";
  return "bg-emerald-500 text-white border-emerald-500";
}

export function NPSPrompt({ open, onClose }: NPSPromptProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { venture } = useActiveVenture();

  if (!open) return null;

  const placeholderKey = score == null ? "mid" : score <= 6 ? "low" : score <= 8 ? "mid" : "high";

  const handleSubmit = async () => {
    if (score == null) return;
    setSubmitting(true);
    try {
      const { error } = await invokeAuthedFunction("submit-feedback", {
        body: {
          feedback_type: "nps",
          nps_score: score,
          message: comment.trim() || null,
          page_url: window.location.href,
          venture_id: venture?.id || null,
        },
      });
      if (error) throw error;
      toast({ title: "Thank you — this directly shapes what we build next." });
      onClose();
    } catch {
      toast({ title: "Could not send feedback. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setSubmitting(true);
    try {
      await invokeAuthedFunction("submit-feedback", {
        body: {
          feedback_type: "nps",
          nps_score: null,
          message: "skipped",
          page_url: window.location.href,
          venture_id: venture?.id || null,
        },
      });
    } catch {
      // Silently fail on skip — still dismiss
    }
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleSkip} />
      <div className={cn(
        "relative w-full bg-card border border-border shadow-xl p-6",
        "md:max-w-lg md:rounded-xl",
        "rounded-t-xl md:rounded-b-xl",
        "animate-in slide-in-from-bottom-4 fade-in duration-200"
      )}>
        {/* Close */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">
            Quick question while it's fresh
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            You just got your first Mavrik Assessment. How was it?
          </p>
        </div>

        {/* NPS Question */}
        <p className="text-sm font-medium text-foreground mb-3">
          How likely are you to recommend TrueBlazer to another founder?
        </p>

        <div className="grid grid-cols-10 gap-1 mb-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setScore(score === n ? null : n)}
              className={cn(
                "aspect-square flex items-center justify-center rounded-md border text-sm font-medium transition-all",
                score === n ? getSelectedColor(n) : getScoreColor(n)
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-5">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>

        {/* Comment — appears after score selection */}
        {score != null && (
          <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Anything specific you'd like to share?
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder={PLACEHOLDERS[placeholderKey]}
              className="min-h-[70px] resize-none text-sm"
              maxLength={500}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={score == null || submitting}
            className="flex-1"
          >
            {submitting ? "Sending…" : "Submit"}
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
