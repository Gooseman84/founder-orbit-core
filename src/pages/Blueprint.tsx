import { useBlueprint } from "@/hooks/useBlueprint";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Heart, Target, Briefcase } from "lucide-react";

const Blueprint = () => {
  const { blueprint, loading, error, saveUpdates } = useBlueprint();

  const handleGenerateBlueprint = async () => {
    try {
      await saveUpdates({
        status: "draft",
        version: 1,
      });
    } catch (err) {
      console.error("Failed to create blueprint:", err);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
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

  if (!blueprint) {
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
            <Button size="lg" onClick={handleGenerateBlueprint} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate from my profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Founder Blueprint</h1>
        <p className="text-muted-foreground mt-1">
          Your unified life + business strategy
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Life Blueprint */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              <CardTitle className="text-lg">Life Blueprint</CardTitle>
            </div>
            <CardDescription>Your personal foundation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BlueprintField label="Life Vision" value={blueprint.life_vision} />
            <BlueprintField label="Time Horizon" value={blueprint.life_time_horizon} />
            <BlueprintField label="Income Target" value={blueprint.income_target?.toString()} prefix="$" />
            <BlueprintField label="Hours/Week Available" value={blueprint.time_available_hours_per_week?.toString()} suffix="hrs" />
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
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">North Star Snapshot</CardTitle>
            </div>
            <CardDescription>Your guiding direction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Business Blueprint</CardTitle>
            </div>
            <CardDescription>Your execution strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        {prefix}{value}{suffix}
      </p>
    </div>
  );
};

export default Blueprint;
