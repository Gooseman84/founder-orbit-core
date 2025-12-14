import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Lock, Sparkles, Zap, Target, TrendingUp } from "lucide-react";
import { PLAN_ERROR_CODES, type PlanErrorCode } from "@/config/plans";

// Messages for different limit scenarios
const LIMIT_MESSAGES: Record<PlanErrorCode, { title: string; description: string }> = {
  [PLAN_ERROR_CODES.IDEA_LIMIT_REACHED]: {
    title: "Daily idea limit reached",
    description: "You've used your 2 free idea generations for today. Upgrade to Pro for unlimited ideas.",
  },
  [PLAN_ERROR_CODES.MODE_REQUIRES_PRO]: {
    title: "Pro mode required",
    description: "This generation mode is available to Pro users. Unlock all 10 modes with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.LIBRARY_FULL]: {
    title: "Library full",
    description: "You've saved 5 ideas, the maximum for Free users. Upgrade to Pro for unlimited saved ideas.",
  },
  [PLAN_ERROR_CODES.BLUEPRINT_LIMIT]: {
    title: "Blueprint limit reached",
    description: "Free accounts can create 1 blueprint. Upgrade to Pro for unlimited blueprints.",
  },
  [PLAN_ERROR_CODES.FEATURE_REQUIRES_PRO]: {
    title: "Pro feature",
    description: "This feature is available to TrueBlazer Pro users. Unlock the full toolkit today.",
  },
  [PLAN_ERROR_CODES.EXPORT_REQUIRES_PRO]: {
    title: "Export requires Pro",
    description: "Export and download features are available with TrueBlazer Pro.",
  },
};

interface PaywallModalProps {
  featureName: string;
  open: boolean;
  onClose: () => void;
  errorCode?: PlanErrorCode;
  customMessage?: string;
}

export const PaywallModal = ({ featureName, open, onClose, errorCode, customMessage }: PaywallModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (priceId: string) => {
    if (!user) {
      toast.error("Please sign in to upgrade your account.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          userId: user.id,
          priceId,
          successUrl: `${window.location.origin}/billing?status=success`,
          cancelUrl: `${window.location.origin}/billing?status=cancelled`,
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Failed to start checkout. Please try again.");
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No checkout URL returned. Please try again.");
      }
    } catch (err) {
      console.error("Error in handleUpgrade:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const priceMonthly = import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY;
  const priceYearly = import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY;

  // Get message based on error code or use default
  const message = errorCode ? LIMIT_MESSAGES[errorCode] : null;
  const title = message?.title || "Upgrade to TrueBlazer Pro";
  const description = customMessage || message?.description || 
    "Unlock unlimited workspace, Radar insights, and opportunity scoring to accelerate your founder journey.";

  const proFeatures = [
    { icon: Zap, text: "Unlimited idea generations" },
    { icon: Sparkles, text: "All 10 generation modes" },
    { icon: Target, text: "Opportunity scoring & comparison" },
    { icon: TrendingUp, text: "Market radar & insights" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Lock className="w-5 h-5 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Pro features list */}
          <div className="space-y-2 py-3 px-4 bg-muted/50 rounded-lg">
            {proFeatures.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <feature.icon className="w-4 h-4 text-primary" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>

          {!user ? (
            <div className="text-center py-4 text-muted-foreground">
              Please sign in to upgrade your account.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <Button
                  onClick={() => handleUpgrade(priceMonthly)}
                  disabled={loading || !priceMonthly}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pro – $29/month"
                  )}
                </Button>

                <Button
                  onClick={() => handleUpgrade(priceYearly)}
                  disabled={loading || !priceYearly}
                  className="w-full"
                  size="lg"
                  variant="secondary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Pro – $199/year (save 43%)"
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Secure checkout powered by Stripe. Cancel anytime.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
