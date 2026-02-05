import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Calendar, CheckCircle, ArrowUpRight, Clock, AlertTriangle, Loader2, XCircle, RefreshCw } from "lucide-react";
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
  const { isTrialExpired, isLockedOut } = useFeatureAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle success/cancel redirect from Stripe
  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      // Sync subscription from Stripe before showing success
      setSyncLoading(true);
      invokeAuthedFunction("sync-subscription", { body: {} })
        .then(() => {
          toast({
            title: "🎉 Welcome to Pro!",
            description: "Your subscription is now active. Enjoy all the premium features!",
          });
          refresh();
        })
        .catch((err) => {
          console.error("Sync error:", err);
          toast({
            title: "Subscription activated",
            description: "Your payment was successful. Refreshing your status...",
          });
          refresh();
        })
        .finally(() => {
          setSyncLoading(false);
          setSearchParams({});
      });
    } else if (status === "cancelled") {
      toast({
        title: "Checkout cancelled",
        description: "No worries! You can upgrade anytime.",
      });
      setSearchParams({});
    }
  }, [searchParams, toast, refresh, setSearchParams]);

  const syncSubscription = async () => {
    setSyncLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ synced?: boolean; error?: string }>(
        "sync-subscription",
        { body: {} }
      );

      if (error) throw error;

      if (data?.synced) {
        toast({
          title: "Subscription synced",
          description: "Your subscription status has been updated.",
        });
        refresh();
      } else {
        toast({
          title: "No changes",
          description: "Your subscription is already up to date.",
        });
      }
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: "Unable to sync subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncLoading(false);
    }
  };

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

  if (syncLoading) {
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

  // Determine subscription states
  const isPaidAndActive = (plan === "pro" || plan === "founder") && status === "active" && !isTrialing;
  const isCancelling = cancelAt !== null;

  const getPlanDisplayName = () => {
    if (isPaidAndActive) {
      return plan === "founder" ? "TrueBlazer Founder" : "TrueBlazer Pro";
    }
    if (isTrialing) {
      return "TrueBlazer Pro Trial";
    }
    if (isTrialExpired || isLockedOut) {
      return "Trial Ended";
    }
    return "Trial";
  };

  const getStatusBadge = () => {
    if (isPaidAndActive && !isCancelling) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Active
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
    if (isTrialing && daysUntilTrialEnd !== null) {
      return (
        <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
          <Clock className="w-3 h-3" />
          {daysUntilTrialEnd} {daysUntilTrialEnd === 1 ? 'day' : 'days'} remaining
        </Badge>
      );
    }
    if (isTrialExpired || isLockedOut) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      );
    }
    if (status === "past_due") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Past Due
        </Badge>
      );
    }
    return null;
  };

  const getDescription = () => {
    if (isPaidAndActive) {
      return "You have full access to all premium features.";
    }
    if (isTrialing) {
      return "You're enjoying a 7-day trial of TrueBlazer Pro. All premium features are unlocked!";
    }
    if (isTrialExpired || isLockedOut) {
      return "Your trial has ended. Subscribe to Pro to continue using premium features.";
    }
    return "Start your founder journey with TrueBlazer.";
  };

  // Show upgrade section for expired trials
  const showUpgradeSection = isTrialExpired || isLockedOut;
  // Show pro features for: active trial, paid active, or cancelling
  const showProSection = isTrialing || isPaidAndActive || isCancelling;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing settings</p>
      </div>

      {/* Trial ending warning */}
      {isTrialing && daysUntilTrialEnd !== null && daysUntilTrialEnd <= 2 && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            Your trial ends in {daysUntilTrialEnd} day{daysUntilTrialEnd !== 1 ? 's' : ''}! 
            Upgrade now to keep your Pro features.
          </AlertDescription>
        </Alert>
      )}

      {/* Trial expired alert */}
      {(isTrialExpired || isLockedOut) && (
        <Alert className="border-destructive bg-destructive/10">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            Your trial has ended. Subscribe now to regain access to Pro features.
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
                {getPlanDisplayName()}
              </CardTitle>
              <CardDescription className="mt-2">
                {getDescription()}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          {showUpgradeSection && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Regain Pro Features</h3>
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
                <Button size="lg" onClick={() => setShowUpgradeModal(true)} className="w-full">
                  Subscribe to Pro – $29/month
                </Button>
              </div>
            </div>
          )}

          {showProSection && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">
                  {isTrialing ? "Your Trial Includes" : "Pro Plan Features"}
                </h3>
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

              {/* Billing details - only show for paid subscriptions, not trials */}
              {currentPeriodEnd && !isTrialing && isPaidAndActive && (
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

              {/* Trial end date info */}
              {isTrialing && currentPeriodEnd && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Trial ends:</span>
                    <span className="font-medium text-primary">{format(currentPeriodEnd, "MMMM d, yyyy")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upgrade to Pro before your trial ends to keep full access.
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                {isTrialing ? (
                  <>
                    <Button 
                      size="lg" 
                      className="w-full gap-2"
                      onClick={() => setShowUpgradeModal(true)}
                    >
                      Upgrade to Pro – $29/month
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      {daysUntilTrialEnd !== null && daysUntilTrialEnd > 0 
                        ? `Or continue your trial (${daysUntilTrialEnd} day${daysUntilTrialEnd !== 1 ? 's' : ''} left)`
                        : "Your trial is ending soon"}
                    </p>
                  </>
                ) : (
                  <>
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
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-2 text-muted-foreground"
                      onClick={syncSubscription}
                      disabled={syncLoading}
                    >
                      {syncLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          Refresh subscription status
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProUpgradeModal 
        open={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        reasonCode={isTrialExpired ? "TRIAL_EXPIRED" : undefined}
      />
    </div>
  );
};

export default Billing;
