import { useState } from "react";
import { useBlueprint } from "@/hooks/useBlueprint";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlueprintSkeleton } from "@/components/shared/SkeletonLoaders";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Heart, Target, Briefcase, RefreshCw } from "lucide-react";
import type { PaywallReasonCode } from "@/config/paywallCopy";

const Blueprint = () => {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { plan } = useSubscription();
  const isPro = plan === "pro" || plan === "founder";
  const { blueprint, loading, error, saveUpdates, refresh } = useBlueprint();
  
  // A blueprint row may exist but contain no real data.
  const isEmptyBlueprint =
    blueprint &&
    !blueprint.life_vision &&
    !blueprint.north_star_one_liner &&
    !blueprint.offer_model &&
    !blueprint.distribution_channels &&
    !blueprint.ai_summary;
    
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<PaywallReasonCode>("BLUEPRINT_LIMIT_FREE");

  const handleRefreshWithAI = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("refresh-blueprint", {
        body: { userId: user.id },
      });

      if (fnError) throw fnError;

      await refresh();
      track("blueprint_refreshed");
      toast({ title: "Blueprint refreshed", description: "AI summary and recommendations updated." });
    } catch (err) {
      console.error("Failed to refresh blueprint:", err);
      toast({ title: "Error", description: "Failed to refresh blueprint", variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateBlueprint = async () => {
    if (!user) {
      toast({
        title: "Sign-in required",
        description: "Please log in to generate your Founder Blueprint.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-blueprint", {
        body: { userId: user.id },
      });

      // Check for plan limit error
      if (fnError || data?.code === "BLUEPRINT_LIMIT_FREE") {
        if (data?.code === "BLUEPRINT_LIMIT_FREE") {
          setPaywallReason("BLUEPRINT_LIMIT_FREE");
          setShowPaywall(true);
          track("paywall_shown", { reasonCode: "BLUEPRINT_LIMIT_FREE" });
          return;
        }
        throw fnError;
      }

      await refresh();
      track("blueprint_created");
      toast({
        title: "Blueprint generated",
        description: "We used your profile and chosen idea to build your life + business blueprint.",
      });
    } catch (err: any) {
      // Handle error response with code
      if (err?.message?.includes("BLUEPRINT_LIMIT_FREE") || err?.code === "BLUEPRINT_LIMIT_FREE") {
        setPaywallReason("BLUEPRINT_LIMIT_FREE");
        setShowPaywall(true);
        track("paywall_shown", { reasonCode: "BLUEPRINT_LIMIT_FREE" });
        return;
      }
      console.error("Failed to generate blueprint:", err);
      toast({
        title: "Error",
        description: "Failed to generate blueprint from your profile.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <BlueprintSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!blueprint || isEmptyBlueprint) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create your Founder Blueprint</CardTitle>
            <CardDescription className="text-base">
              Your blueprint combines your life vision with your business strategy into one unified plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={handleGenerateBlueprint} className="w-full" disabled={generating}>
              {generating ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate from my profile
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <ProUpgradeModal
          open={showPaywall}
          onClose={() => setShowPaywall(false)}
          reasonCode={paywallReason}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-hidden">
      {/* Header - stacks on mobile */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">Founder Blueprint</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Your unified life + business strategy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            onClick={handleGenerateBlueprint}
            disabled={generating}
            size="sm"
            className="flex items-center"
          >
            <Sparkles className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : "Generate"}
          </Button>
          <Button
            onClick={handleRefreshWithAI}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* 3-column grid on desktop, single column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-w-0">
        {/* Left Column: Life Blueprint */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500 shrink-0" />
              <CardTitle className="text-lg truncate">Life Blueprint</CardTitle>
            </div>
            <CardDescription>Your personal foundation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <BlueprintField label="Life Vision" value={blueprint.life_vision} />
            <BlueprintField label="Time Horizon" value={blueprint.life_time_horizon} />
            <BlueprintField label="Income Target" value={blueprint.income_target?.toString()} prefix="$" />
            <BlueprintField
              label="Hours/Week Available"
              value={blueprint.time_available_hours_per_week?.toString()}
              suffix="hrs"
            />
            <BlueprintField label="Capital Available" value={blueprint.capital_available?.toString()} prefix="$" />
            <BlueprintField label="Risk Profile" value={blueprint.risk_profile} />
            <BlueprintField label="Non-Negotiables" value={blueprint.non_negotiables} />
            <BlueprintField label="Current Commitments" value={blueprint.current_commitments} />
            <BlueprintField label="Strengths" value={blueprint.strengths} />
            <BlueprintField label="Weaknesses" value={blueprint.weaknesses} />
            <BlueprintField label="Work Style" value={blueprint.preferred_work_style} />
            <BlueprintField label="Energy Pattern" value={blueprint.energy_pattern} />
          </CardContent>
        </Card>

        {/* Center Column: North Star Snapshot */}
        <Card className="border-primary/30 bg-primary/5 min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <CardTitle className="text-lg truncate">North Star Snapshot</CardTitle>
            </div>
            <CardDescription>Your guiding direction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <BlueprintField label="One-Liner" value={blueprint.north_star_one_liner} highlight />
            <BlueprintField label="Target Audience" value={blueprint.target_audience} />
            <BlueprintField label="Problem Statement" value={blueprint.problem_statement} />
            <BlueprintField label="Promise Statement" value={blueprint.promise_statement} />
            <BlueprintField label="Traction Definition" value={blueprint.traction_definition} />
            <BlueprintField label="Validation Stage" value={blueprint.validation_stage} />

            {blueprint.ai_summary && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                <p className="text-sm italic">{blueprint.ai_summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Business Blueprint */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-500 shrink-0" />
              <CardTitle className="text-lg truncate">Business Blueprint</CardTitle>
            </div>
            <CardDescription>Your execution strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-hidden">
            <BlueprintField label="Offer Model" value={blueprint.offer_model} />
            <BlueprintField label="Monetization Strategy" value={blueprint.monetization_strategy} />
            <BlueprintField label="Distribution Channels" value={blueprint.distribution_channels} />
            <BlueprintField label="Unfair Advantage" value={blueprint.unfair_advantage} />
            <BlueprintField label="Runway Notes" value={blueprint.runway_notes} />

            {blueprint.success_metrics && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Success Metrics</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(blueprint.success_metrics, null, 2)}
                </pre>
              </div>
            )}

            {blueprint.focus_quarters && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Focus Quarters</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(blueprint.focus_quarters, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ProUpgradeModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reasonCode={paywallReason}
      />
    </div>
  );
};

interface BlueprintFieldProps {
  label: string;
  value: string | null | undefined;
  prefix?: string;
  suffix?: string;
  highlight?: boolean;
}

const BlueprintField = ({ label, value, prefix, suffix, highlight }: BlueprintFieldProps) => {
  if (!value) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-muted-foreground/50 italic">Not set</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm ${highlight ? "font-semibold text-primary" : ""}`}>
        {prefix}
        {value}
        {suffix}
      </p>
    </div>
  );
};

export default Blueprint;
