import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Calendar, CheckCircle, ArrowUpRight, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Billing = () => {
  const { 
    plan, 
    status, 
    loading, 
    currentPeriodEnd, 
    cancelAt, 
    renewalPeriod,
    isTrialing,
    daysUntilTrialEnd,
    refresh 
  } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle success/cancel redirect from Stripe
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast({
        title: "🎉 Welcome to Pro!",
        description: "Your subscription is now active. Enjoy all the premium features!",
      });
      refresh();
      setSearchParams({});
    } else if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No worries! You can upgrade anytime.",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, refresh, setSearchParams]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>(
        "create-customer-portal",
        { body: {} }
      );

      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast({
        title: "Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
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

  const isPro = plan === "pro" || plan === "founder";
  const isFree = plan === "free";
  const isCancelling = cancelAt !== null;

  const getPlanDisplayName = (planName: string) => {
    switch (planName) {
      case "founder":
        return "TrueBlazer Founder";
      case "pro":
        return "TrueBlazer Pro";
      default:
        return "Free";
    }
  };

  const getStatusBadge = (statusText: string) => {
    if (isTrialing) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" />
          Trial ({daysUntilTrialEnd} days left)
        </Badge>
      );
    }
    if (isCancelling) {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
          <AlertTriangle className="w-3 h-3" />
          Cancels {cancelAt && format(cancelAt, "MMM d, yyyy")}
        </Badge>
      );
    }
    switch (statusText) {
      case "active":
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
      case "past_due":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Past Due</Badge>;
      case "canceled":
        return <Badge variant="destructive">Canceled</Badge>;
      default:
        return <Badge variant="outline">{statusText}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing settings</p>
      </div>

      {/* Trial warning */}
      {isTrialing && daysUntilTrialEnd !== null && daysUntilTrialEnd <= 2 && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Your trial ends in {daysUntilTrialEnd} day{daysUntilTrialEnd !== 1 ? 's' : ''}! 
            Add a payment method to continue enjoying Pro features.
          </AlertDescription>
        </Alert>
      )}

      {/* Past due warning */}
      {status === "past_due" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your payment failed. Please update your payment method to keep your Pro access.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-primary" />
                {getPlanDisplayName(plan)}
              </CardTitle>
              <CardDescription className="mt-2">
                {isFree 
                  ? "You're on the free plan with basic features" 
                  : isTrialing 
                    ? "You're on a 7-day free trial of TrueBlazer Pro"
                    : "You have access to all premium features"}
              </CardDescription>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          {isFree ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Free Plan Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>2 idea generations per day</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>AI-powered idea vetting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Basic task management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Daily pulse checks</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Unlock Pro Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Unlimited idea generations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>All 10 generation modes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Opportunity scoring & comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Market radar & insights</span>
                  </li>
                </ul>
                <Button size="lg" onClick={() => setShowPaywall(true)} className="w-full">
                  Start 7-Day Free Trial
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  No charge until trial ends. Cancel anytime.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Pro Plan Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Unlimited idea generations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>All 10 generation modes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>AI opportunity scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Side-by-side idea comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Market radar signals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Unlimited workspace documents</span>
                  </li>
                </ul>
              </div>

              {/* Billing details */}
              {currentPeriodEnd && !isTrialing && (
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Opening portal...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Manage Subscription
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Update payment methods, view invoices, or cancel your subscription
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PaywallModal 
        featureName="upgrade" 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </div>
  );
};

export default Billing;
