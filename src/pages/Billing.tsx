import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, CheckCircle, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

const Billing = () => {
  const { 
    plan, 
    status, 
    loading, 
    currentPeriodEnd, 
    cancelAt, 
    renewalPeriod,
    refresh 
  } = useSubscription();
  const { hasPro } = useFeatureAccess();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle success/cancel redirect from Stripe
  useEffect(() => {
    const s = searchParams.get("status");
    if (s === "success") {
      setSyncLoading(true);
      invokeAuthedFunction<{ synced?: boolean; error?: string }>("sync-subscription", { body: {} })
        .then(({ data, error }) => {
          if (error) {
            console.error("Sync error:", error);
            toast({ title: "Payment received", description: "We received your payment but couldn't confirm access yet. Please click 'Refresh subscription status' below.", variant: "default" });
          } else if (data?.synced) {
            toast({ title: "🎉 Welcome to Pro!", description: "Your subscription is now active. Enjoy all the premium features!" });
          } else {
            toast({ title: "Payment processing", description: "Your payment is being processed. Please click 'Refresh subscription status' in a moment.", variant: "default" });
          }
          refresh();
        })
        .catch((err) => {
          console.error("Sync call failed:", err);
          toast({ title: "Payment received", description: "We received your payment but couldn't sync your status. Please click 'Refresh subscription status'.", variant: "default" });
          refresh();
        })
        .finally(() => {
          setSyncLoading(false);
          setSearchParams({});
        });
    } else if (s === "cancelled") {
      toast({ title: "Checkout cancelled", description: "No worries! You can upgrade anytime." });
      setSearchParams({});
    }
  }, [searchParams, toast, refresh, setSearchParams]);

  const syncSubscription = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ synced?: boolean; error?: string }>("sync-subscription", { body: {} });
      if (error) throw error;
      if (data?.synced) {
        toast({ title: "Subscription synced", description: "Your subscription status has been updated." });
        refresh();
      } else {
        toast({ title: "No changes", description: "Your subscription is already up to date." });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({ title: "Sync failed", description: "Unable to sync subscription. Please try again.", variant: "destructive" });
    } finally {
      setSyncLoading(false);
    }
  };

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>("create-customer-portal", { body: {} });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({ title: "Error", description: "Failed to open billing portal. Please try again.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async (planType: "monthly" | "annual") => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to subscribe.", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setCheckoutLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>("create-checkout-session", {
        body: {
          plan: planType,
          successUrl: `${window.location.origin}/billing?status=success`,
          cancelUrl: `${window.location.origin}/billing`,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Error", description: "No checkout URL returned. Please try again.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Checkout error:", err);
      if (err instanceof AuthSessionMissingError) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        navigate("/auth");
      } else {
        toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading || syncLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">Manage your subscription and billing settings</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelling = cancelAt !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing settings</p>
      </div>

      {/* Past due warning */}
      {status === "past_due" && (
        <div className="border border-destructive bg-destructive/10 rounded-lg p-4 flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">Your payment failed. Please update your payment method to keep your Pro access.</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-primary" />
                {hasPro
                  ? plan === "founder" ? "TrueBlazer Founder" : "TrueBlazer Pro"
                  : "Free Plan"}
              </CardTitle>
              <CardDescription className="mt-2">
                {hasPro
                  ? "You have full access to all premium features."
                  : "Upgrade to Pro to unlock all features and accelerate your venture."}
              </CardDescription>
            </div>
            {hasPro && !isCancelling && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </Badge>
            )}
            {isCancelling && (
              <Badge variant="outline" className="gap-1 border-destructive/60 text-destructive">
                Cancels {cancelAt && format(cancelAt, "MMM d, yyyy")}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          {hasPro ? (
            /* ── Pro / Founder active ── */
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Pro Plan Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Unlimited idea generations",
                    "All 10 generation modes",
                    "AI opportunity scoring",
                    "Side-by-side idea comparison",
                    "Market radar signals",
                    "Unlimited workspace documents",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {currentPeriodEnd && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Next billing date:</span>
                    <span className="font-medium">{format(currentPeriodEnd, "MMMM d, yyyy")}</span>
                  </div>
                  {renewalPeriod && (
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Billing cycle:</span>
                      <span className="font-medium capitalize">{renewalPeriod}ly</span>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Opening portal...</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Manage Subscription</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Update payment methods, view invoices, or cancel your subscription
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={syncSubscription}
                  disabled={syncLoading}
                >
                  {syncLoading ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Syncing...</>
                  ) : (
                    <><RefreshCw className="w-3 h-3" /> Refresh subscription status</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Free plan ── */
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Upgrade to Pro</h3>
                <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                  {[
                    "Unlimited idea generations",
                    "All 10 generation modes",
                    "Opportunity scoring & comparison",
                    "Market radar & insights",
                    "Full Financial Viability analysis",
                    "Blueprint, Implementation Kit & 30-day plan",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => handleCheckout("monthly")}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    "Upgrade to Pro — $29/month"
                  )}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => handleCheckout("annual")}
                  disabled={checkoutLoading}
                >
                  {checkoutLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    "Or save with annual — $199/year"
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3">
                  Secure checkout powered by Stripe. Cancel anytime.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
