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
  Sparkles,
  Zap,
  Target,
  TrendingUp,
  FileText,
  Compass,
  BarChart3,
} from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  trigger: string;
  ideaTitle?: string;
}

export const PaywallModal = ({ open, onClose, trigger, ideaTitle }: PaywallModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe.");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>(
        "create-checkout-session",
        {
          body: {
            plan: "monthly",
            successUrl: `${window.location.origin}/billing?status=success`,
            cancelUrl: `${window.location.origin}${window.location.pathname}`,
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
      setLoading(false);
    }
  };

  const proFeatures = [
    { icon: BarChart3, text: "Full Financial Viability analysis with top risk & opportunity" },
    { icon: FileText, text: "Blueprint with 30-day execution plan and daily tasks" },
    { icon: Compass, text: "Implementation Kit for Lovable, Cursor, or v0" },
    { icon: Sparkles, text: "Mavrik co-pilot check-ins that adapt to your momentum" },
    { icon: Zap, text: "Unlimited idea generation across all 10 modes" },
    { icon: Target, text: "Opportunity scoring, idea comparison & market radar" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">
            {ideaTitle
              ? `Your Financial Viability Score for "${ideaTitle}" is ready.`
              : "Your Financial Viability Score is ready."}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Upgrade to see the full breakdown — including the biggest risk, top opportunity, and what makes this idea financially viable (or not).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              What Pro unlocks
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

          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Unlock Pro — $29/month"
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Secure checkout powered by Stripe. Cancel anytime.
          </p>

          <div className="text-center pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
