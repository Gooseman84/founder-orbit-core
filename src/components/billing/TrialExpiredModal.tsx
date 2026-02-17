import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, 
  Clock, 
  Sparkles, 
  Zap, 
  Target, 
  TrendingUp, 
  FileText,
  Compass,
  BarChart3
} from "lucide-react";

interface TrialExpiredModalProps {
  open: boolean;
  onDismiss: () => void;
}

export const TrialExpiredModal = ({ open, onDismiss }: TrialExpiredModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    if (!user) {
      toast.error("Please sign in to subscribe.");
      navigate("/auth");
      return;
    }

    setLoading(plan);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>(
        "create-checkout-session",
        {
          body: {
            plan,
            successUrl: `${window.location.origin}/billing?status=success`,
            cancelUrl: `${window.location.origin}/billing?status=cancelled`,
          },
        }
      );

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      console.error("Error in handleUpgrade:", err);
      if (err instanceof AuthSessionMissingError) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const proFeatures = [
    { icon: Zap, text: "Unlimited idea generation — explore every angle" },
    { icon: Sparkles, text: "Cross-industry opportunities from your expertise" },
    { icon: Target, text: "CFA-level Financial Viability Scores" },
    { icon: TrendingUp, text: "Full Blueprint with 30-day execution plan" },
    { icon: Compass, text: "Implementation Kit for Lovable, Cursor, or v0" },
    { icon: FileText, text: "AI workspace that writes in your domain language" },
    { icon: BarChart3, text: "Market radar, idea fusion & comparison tools" },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <Clock className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">
            Your 7-Day Trial Has Ended
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            You've seen what Mavrik found in your expertise. Don't lose that momentum — unlock the full toolkit to go from clarity to execution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* What you're missing */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              What you're missing
            </p>
            <div className="grid gap-2 py-3 px-4 bg-muted/50 rounded-lg">
              {proFeatures.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <feature.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => handleUpgrade("monthly")}
              disabled={loading !== null}
              className="w-full"
              size="lg"
            >
              {loading === "monthly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe to Pro – $29/month"
              )}
            </Button>

            <Button
              onClick={() => handleUpgrade("yearly")}
              disabled={loading !== null}
              className="w-full"
              size="lg"
              variant="secondary"
            >
              {loading === "yearly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  View yearly pricing – $199/year 
                  <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                    Save 43%
                  </span>
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Secure checkout powered by Stripe. Cancel anytime.
          </p>

          {/* Dismiss link */}
          <div className="text-center pt-2 border-t border-border">
            <button
              onClick={onDismiss}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              I'll continue with limited access
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
