import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, Loader2, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { toast } from "sonner";

const PRO_FEATURES = [
  "Unlimited idea generation (all modes)",
  "Niche Radar market signals",
  "Fusion Lab idea combinations",
  "Advanced analytics & insights",
  "Priority AI processing",
  "Full workspace access",
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  reason?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature = "this feature",
  reason,
}: UpgradeModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string }>(
        "create-checkout-session",
        {
          body: {
            plan: selectedPlan,
            successUrl: `${window.location.origin}/billing?status=success`,
            cancelUrl: `${window.location.origin}/billing?status=cancelled`,
          },
        }
      );

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center">
            {reason || `${feature} requires a Pro subscription. Unlock unlimited access and advanced features!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Toggle */}
          <div className="flex justify-center gap-2">
            <Button
              variant={selectedPlan === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlan("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={selectedPlan === "yearly" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPlan("yearly")}
            >
              Yearly
              <span className="ml-1 text-xs text-green-500">Save 20%</span>
            </Button>
          </div>

          {/* Price Display */}
          <div className="text-center">
            <span className="text-3xl font-bold">
              ${selectedPlan === "monthly" ? "29" : "279"}
            </span>
            <span className="text-muted-foreground">
              /{selectedPlan === "monthly" ? "month" : "year"}
            </span>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            {PRO_FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleUpgrade}
            disabled={loading || !user}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Start 7-Day Free Trial
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            7-day free trial • Cancel anytime • No credit card required
          </p>

          <Button variant="ghost" className="w-full" onClick={onClose}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
