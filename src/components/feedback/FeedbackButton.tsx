import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const HIDDEN_ROUTES = ["/", "/auth", "/onboarding", "/reset-password", "/terms", "/privacy"];

type Sentiment = "frustrated" | "neutral" | "delighted";

const sentimentOptions: { value: Sentiment; emoji: string; label: string }[] = [
  { value: "frustrated", emoji: "😤", label: "Frustrated" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "delighted", emoji: "😊", label: "Delighted" },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const { venture } = useActiveVenture();

  if (!user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname === r)) return null;

  const canSubmit = sentiment || message.trim().length > 0;

  const resetForm = () => {
    setSentiment(null);
    setMessage("");
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await invokeAuthedFunction("submit-feedback", {
        body: {
          feedback_type: "floating",
          sentiment,
          message: message.trim() || null,
          page_url: window.location.href,
          venture_id: venture?.id || null,
        },
      });
      if (error) throw error;
      toast({ title: "Thanks — we read every message." });
      handleClose();
    } catch {
      toast({ title: "Could not send feedback. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6",
          "flex items-center gap-2 rounded-full px-3 py-2.5 md:px-4",
          "bg-secondary text-secondary-foreground shadow-md",
          "hover:bg-secondary/80 transition-colors",
          "border border-border/50",
          open && "hidden"
        )}
        aria-label="Send feedback"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden md:inline text-sm font-medium">Feedback</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 md:p-6">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleClose}
          />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-xl p-5 mb-14 md:mb-0 animate-in slide-in-from-bottom-4 fade-in duration-200">
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close feedback"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-semibold text-foreground mb-3">
              Share your feedback
            </h3>

            {/* Sentiment */}
            <div className="flex gap-2 mb-4">
              {sentimentOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setSentiment(sentiment === opt.value ? null : opt.value)
                  }
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all",
                    sentiment === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <div className="mb-3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                What's on your mind?
              </label>
              <Textarea
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value.slice(0, 500))
                }
                placeholder="Something broken? Something you loved? Tell us."
                className="min-h-[80px] resize-none text-sm"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">
                {message.length}/500
              </p>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full"
              size="sm"
            >
              {submitting ? "Sending…" : "Send Feedback"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
