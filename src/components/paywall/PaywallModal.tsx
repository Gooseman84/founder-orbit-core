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
import { Loader2 } from "lucide-react";

interface PaywallModalProps {
  featureName: string;
  open: boolean;
  onClose: () => void;
}

export const PaywallModal = ({ featureName, open, onClose }: PaywallModalProps) => {
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Upgrade to TrueBlazer Pro</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Unlock unlimited workspace, Radar insights, and opportunity scoring to accelerate your
            founder journey.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
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
                    "Pro – Monthly"
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
                    "Pro – Yearly (save more)"
                  )}
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Secure checkout powered by Stripe.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
