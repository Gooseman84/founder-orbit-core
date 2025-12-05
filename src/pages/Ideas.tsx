// src/pages/Ideas.tsx
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { useFounderIdeas } from "@/hooks/useFounderIdeas";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import { RefreshCw, Scale, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Ideas = () => {
  const { ideas, isLoading, generateIdeas } = useIdeas();
  const {
    ideas: founderIdeas,
    isPending: isGeneratingFounderIdeas,
    generate: generateFounderIdeas,
  } = useFounderIdeas();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleGenerateIdeas = async () => {
    try {
      await generateIdeas.mutateAsync();
      toast({
        title: "Ideas Generated!",
        description: "Your personalized business ideas are ready.",
      });
    } catch (error: any) {
      if (error.message?.includes("profile not found") || error.message?.includes("complete onboarding")) {
        toast({
          title: "Onboarding Required",
          description: "Please complete your onboarding profile first.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/onboarding"), 1500);
        return;
      }

      const errorMessage = error.message?.includes("Rate limit")
        ? "Too many requests. Please wait a moment and try again."
        : error.message?.includes("Payment required")
          ? "AI service requires payment. Please contact support."
          : "Failed to generate ideas. Please try again.";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleGenerateFounderIdeas = async () => {
    try {
      await generateFounderIdeas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message ?? "Failed to generate founder-aligned ideas.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your ideas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Business Ideas</h1>
          <p className="text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"} generated based on your profile
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={handleGenerateFounderIdeas} disabled={isGeneratingFounderIdeas} className="gap-2">
            {isGeneratingFounderIdeas ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating My Ideas...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate My Business Ideas
              </>
            )}
          </Button>
          {ideas.length >= 2 && (
            <Button onClick={() => navigate("/ideas/compare")} variant="outline" className="gap-2">
              <Scale className="w-4 h-4" />
              Compare Ideas
            </Button>
          )}
          <Button onClick={handleGenerateIdeas} disabled={generateIdeas.isPending} className="gap-2">
            {generateIdeas.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Generate More Ideas
              </>
            )}
          </Button>
        </div>
      </div>

      {founderIdeas.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold">Founder-aligned ideas (this session)</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              These ideas are generated from your full founder profile and dynamic interview context. They are not yet
              saved to your library.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {founderIdeas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">{idea.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{idea.oneLiner}</p>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Problem:</span> {idea.problemStatement}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Target customer:</span> {idea.targetCustomer}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Archetype: {idea.businessArchetype}
                    </span>
                    {idea.markets.slice(0, 3).map((market) => (
                      <span key={market} className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        {market}
                      </span>
                    ))}
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {idea.hoursPerWeekMin}-{idea.hoursPerWeekMax} hrs/week
                    </span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      ${""}
                      {idea.capitalRequired.toLocaleString()} starting capital
                    </span>
                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      Risk: {idea.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm mt-2">
                    <span className="font-medium">Why it fits you:</span> {idea.whyItFitsFounder}
                  </p>
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">First steps</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {idea.firstSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <details className="mt-2 text-sm text-muted-foreground">
                  <summary className="cursor-pointer select-none font-medium text-foreground">
                    View execution details
                  </summary>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-medium text-foreground">MVP approach:</span> {idea.mvpApproach}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Go-to-market:</span> {idea.goToMarket}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Revenue model:</span> {idea.revenueModel}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Financial trajectory (3/6/12 months):</span>{" "}
                      {idea.financialTrajectory.month3} / {idea.financialTrajectory.month6} / {" "}
                      {idea.financialTrajectory.month12}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Risks & mitigation:</span> {idea.risksMitigation}
                    </p>
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      {ideas.length === 0 ? (
        <EmptyIdeasState onGenerateIdeas={handleGenerateIdeas} isGenerating={generateIdeas.isPending} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Ideas;
