import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Calendar, CheckCircle, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useToast } from "@/hooks/use-toast";

const Billing = () => {
  const { plan, status, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const { toast } = useToast();

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
    switch (statusText) {
      case "active":
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
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
                    <span>Unlimited idea generation</span>
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
                    <span>Opportunity scoring for data-driven decisions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Compare ideas side-by-side</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Niche radar for market insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowUpRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Unlimited workspace documents</span>
                  </li>
                </ul>
                <Button size="lg" onClick={() => setShowPaywall(true)} className="w-full">
                  Upgrade to Pro
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Pro Plan Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>Everything in Free, plus:</span>
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

              <Separator />

              <div className="space-y-3">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={async () => {
                    try {
                      const { data, error } = await invokeAuthedFunction<{ url?: string }>("create-customer-portal", {
                        body: {},
                      });

                      if (error) throw error;
                      if (data?.url) {
                        window.location.href = data.url;
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to open billing portal. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Subscription
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
