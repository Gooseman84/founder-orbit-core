import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getPaywallCopy, type PaywallReasonCode } from "@/config/paywallCopy";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { 
  Loader2, 
  Sparkles, 
  Zap, 
  Target, 
  Infinity,
  Rocket,
  CheckCircle,
  Crown,
  X
} from "lucide-react";

const PRO_FEATURES = [
  { icon: Infinity, text: "Unlimited idea generations", highlight: true },
  { icon: Sparkles, text: "All 10 generation modes (Chaos, Memetic, Fusion...)" },
  { icon: Target, text: "Unlimited saved ideas & Blueprints" },
  { icon: Rocket, text: "Full Blueprint breakdowns & Workspace" },
  { icon: Zap, text: "Tasks, Quests, Daily Pulse & exports" },
];

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reasonCode?: PaywallReasonCode | string;
  context?: Record<string, unknown>;
}

export function ProUpgradeModal({ open, onClose, reasonCode, context }: ProUpgradeModalProps) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  // Get dynamic copy based on reasonCode
  const copy = getPaywallCopy(reasonCode);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade your account.");
      return;
    }

    setLoading(true);
    track("upgrade_clicked", { reasonCode, plan: selectedPlan, ...context });

    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>("create-checkout-session", {
        body: {
          plan: selectedPlan, // "monthly" or "yearly" - edge function reads price ID from secrets
          successUrl: `${window.location.origin}/billing?status=success`,
          cancelUrl: `${window.location.origin}/billing?status=cancelled`,
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Failed to start checkout. Please try again.");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.url) {
        track("checkout_started", { reasonCode, plan: selectedPlan });
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      console.error("Error in handleUpgrade:", err);
      if (err instanceof AuthSessionMissingError) {
        toast.error("Session expired. Please sign in again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Track paywall shown
  useState(() => {
    if (open && reasonCode) {
      track("paywall_shown", { reasonCode, ...context });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-card">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header with gradient */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary/20 ring-1 ring-primary/30">
              <Crown className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              TrueBlazer Pro
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{copy.headline}</h2>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {copy.subhead}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5">
          {/* Features list */}
          <div className="space-y-2.5">
            {PRO_FEATURES.map((feature, i) => (
              <div 
                key={i} 
                className={`flex items-center gap-3 text-sm ${
                  feature.highlight ? "text-foreground font-medium" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1 rounded-md ${feature.highlight ? "bg-primary/20" : "bg-muted"}`}>
                  <feature.icon className={`w-4 h-4 ${feature.highlight ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Pricing toggle */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                selectedPlan === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all relative ${
                selectedPlan === "yearly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-1 text-[10px] font-bold text-primary bg-primary/20 px-1.5 py-0.5 rounded-full">
                -43%
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center py-2">
            {selectedPlan === "yearly" ? (
              <div>
                <span className="text-3xl font-bold">$199</span>
                <span className="text-muted-foreground">/year</span>
                <p className="text-xs text-muted-foreground mt-1">
                  That's just $16.58/month
                </p>
              </div>
            ) : (
              <div>
                <span className="text-3xl font-bold">$29</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            )}
          </div>

          {!user ? (
            <div className="text-center py-4 text-muted-foreground">
              Please sign in to upgrade your account.
            </div>
          ) : (
            <>
              {/* CTA Button */}
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                size="lg"
                className="w-full h-12 text-base font-semibold btn-gradient rounded-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    {copy.cta}
                  </>
                )}
              </Button>

              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span>{copy.microcopy || "Cancel anytime"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span>Secure checkout</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
