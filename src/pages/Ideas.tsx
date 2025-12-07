// src/pages/Ideas.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { useScoredFounderIdeas, type ScoredIdea } from "@/hooks/useScoredFounderIdeas";
import { useSaveFounderIdea } from "@/hooks/useSaveFounderIdea";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import {
  IdeaFilters,
  IdeaFiltersState,
  filterByTime,
  filterByCapital,
} from "@/components/ideas/IdeaFilters";
import { RefreshCw, Scale, Sparkles, Save, Check, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BusinessIdea } from "@/types/businessIdea";
import { Progress } from "@/components/ui/progress";

const Ideas = () => {
  const { ideas, isLoading, generateIdeas } = useIdeas();
  const {
    scoredIdeas: founderScoredIdeas,
    isLoading: isGeneratingFounderIdeas,
    generate: generateFounderIdeas,
  } = useScoredFounderIdeas();
  const { saveIdea, isSaving } = useSaveFounderIdea();
  const { promote, isPromoting } = usePromoteIdeaToWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Track which ideas have been saved
  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set());
  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [promotingIdeaId, setPromotingIdeaId] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<IdeaFiltersState>({
    archetypes: [],
    markets: [],
    riskLevels: [],
    timeCommitment: null,
    capitalRequired: null,
  });

  // Derive available filter options from all ideas
  const { availableArchetypes, availableMarkets } = useMemo(() => {
    const archetypeSet = new Set<string>();
    const marketSet = new Set<string>();

    // From founder ideas (now wrapped in ScoredIdea)
    founderScoredIdeas.forEach(({ idea }) => {
      if (idea.businessArchetype) archetypeSet.add(idea.businessArchetype);
      idea.markets?.forEach((m) => marketSet.add(m));
    });

    // From saved ideas (they have different structure)
    ideas.forEach((idea) => {
      if (idea.business_model_type) archetypeSet.add(idea.business_model_type);
    });

    return {
      availableArchetypes: Array.from(archetypeSet).sort(),
      availableMarkets: Array.from(marketSet).sort(),
    };
  }, [founderScoredIdeas, ideas]);

  // Filter founder ideas (now ScoredIdea[])
  const filteredFounderIdeas = useMemo(() => {
    return founderScoredIdeas.filter(({ idea }) => {
      // Archetype filter
      if (
        filters.archetypes.length > 0 &&
        !filters.archetypes.includes(idea.businessArchetype)
      ) {
        return false;
      }

      // Market filter
      if (
        filters.markets.length > 0 &&
        !idea.markets?.some((m) => filters.markets.includes(m))
      ) {
        return false;
      }

      // Risk filter
      if (
        filters.riskLevels.length > 0 &&
        !filters.riskLevels.includes(idea.riskLevel)
      ) {
        return false;
      }

      // Time filter
      if (
        !filterByTime(
          idea.hoursPerWeekMin,
          idea.hoursPerWeekMax,
          filters.timeCommitment
        )
      ) {
        return false;
      }

      // Capital filter
      if (!filterByCapital(idea.capitalRequired, filters.capitalRequired)) {
        return false;
      }

      return true;
    });
  }, [founderScoredIdeas, filters]);

  // Filter saved ideas
  const filteredSavedIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      // Archetype filter (saved ideas use business_model_type)
      if (
        filters.archetypes.length > 0 &&
        idea.business_model_type &&
        !filters.archetypes.includes(idea.business_model_type)
      ) {
        return false;
      }

      // Risk filter - saved ideas don't have riskLevel, skip
      // Time filter - saved ideas use time_to_first_dollar string, skip
      // Capital filter - saved ideas don't have capitalRequired, skip
      // Market filter - saved ideas don't have markets array, skip

      return true;
    });
  }, [ideas, filters]);

  const handleGenerateIdeas = async () => {
    try {
      await generateIdeas.mutateAsync();
      toast({
        title: "Ideas Generated!",
        description: "Your personalized business ideas are ready.",
      });
    } catch (error: any) {
      if (
        error.message?.includes("profile not found") ||
        error.message?.includes("complete onboarding")
      ) {
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
      // Reset saved tracking when generating new ideas
      setSavedIdeaIds(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message ?? "Failed to generate founder-aligned ideas.",
        variant: "destructive",
      });
    }
  };

  const handleSaveIdea = async (idea: BusinessIdea) => {
    setSavingIdeaId(idea.id);
    const success = await saveIdea(idea);
    setSavingIdeaId(null);

    if (success) {
      setSavedIdeaIds((prev) => new Set(prev).add(idea.id));
      toast({
        title: "Saved!",
        description: "This idea is now in your library.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to save idea. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePromoteIdea = async (idea: BusinessIdea) => {
    setPromotingIdeaId(idea.id);
    const result = await promote(idea);
    setPromotingIdeaId(null);

    if (result) {
      toast({
        title: "Blueprint created!",
        description: `Workspace document + ${result.taskIds.length} starter tasks created.`,
      });
      navigate(`/workspace/${result.documentId}`);
    } else {
      toast({
        title: "Error",
        description: "Failed to create blueprint. Please try again.",
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

  const showFilters = founderScoredIdeas.length > 0 || ideas.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Business Ideas</h1>
          <p className="text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"} generated
            based on your profile
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={handleGenerateFounderIdeas}
            disabled={isGeneratingFounderIdeas}
            className="gap-2"
          >
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
            <Button
              onClick={() => navigate("/ideas/compare")}
              variant="outline"
              className="gap-2"
            >
              <Scale className="w-4 h-4" />
              Compare Ideas
            </Button>
          )}
          <Button
            onClick={handleGenerateIdeas}
            disabled={generateIdeas.isPending}
            className="gap-2"
          >
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

      {/* Filter Bar */}
      {showFilters && (
        <IdeaFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableArchetypes={availableArchetypes}
          availableMarkets={availableMarkets}
        />
      )}

      {filteredFounderIdeas.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-semibold">
              Founder-aligned ideas (this session)
              {filteredFounderIdeas.length !== founderScoredIdeas.length && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({filteredFounderIdeas.length} of {founderScoredIdeas.length} shown)
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              These ideas are generated from your full founder profile and
              dynamic interview context. Save the ones you like to your library.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFounderIdeas.map(({ idea, scores }) => {
              const isSaved = savedIdeaIds.has(idea.id);
              const isCurrentlySaving = savingIdeaId === idea.id;

              return (
                <div
                  key={idea.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    {/* Fit Score Badge */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold leading-tight">
                        {idea.title}
                      </h2>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        scores.overall >= 70 
                          ? "bg-green-500/10 text-green-600" 
                          : scores.overall >= 50 
                            ? "bg-yellow-500/10 text-yellow-600" 
                            : "bg-red-500/10 text-red-600"
                      }`}>
                        Fit: {Math.round(scores.overall)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {idea.oneLiner}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Problem:</span>{" "}
                      {idea.problemStatement}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Target customer:</span>{" "}
                      {idea.targetCustomer}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                        Archetype: {idea.businessArchetype}
                      </span>
                      {idea.markets.slice(0, 3).map((market) => (
                        <span
                          key={market}
                          className="px-2 py-1 rounded-full bg-muted text-muted-foreground"
                        >
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
                      <span className="font-medium">Why it fits you:</span>{" "}
                      {idea.whyItFitsFounder}
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
                        <span className="font-medium text-foreground">
                          MVP approach:
                        </span>{" "}
                        {idea.mvpApproach}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Go-to-market:
                        </span>{" "}
                        {idea.goToMarket}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Revenue model:
                        </span>{" "}
                        {idea.revenueModel}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Financial trajectory (3/6/12 months):
                        </span>{" "}
                        {idea.financialTrajectory.month3} /{" "}
                        {idea.financialTrajectory.month6} /{" "}
                        {idea.financialTrajectory.month12}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Risks & mitigation:
                        </span>{" "}
                        {idea.risksMitigation}
                      </p>
                    </div>
                    {/* Score Breakdown */}
                    <div className="mt-4 pt-3 border-t border-border">
                      <p className="font-medium text-foreground mb-2">Fit Score Breakdown</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Founder fit</span>
                          <span className="font-medium">{Math.round(scores.founderFit)}%</span>
                        </div>
                        <Progress value={scores.founderFit} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs">
                          <span>Constraints fit</span>
                          <span className="font-medium">{Math.round(scores.constraintsFit)}%</span>
                        </div>
                        <Progress value={scores.constraintsFit} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs">
                          <span>Market fit</span>
                          <span className="font-medium">{Math.round(scores.marketFit)}%</span>
                        </div>
                        <Progress value={scores.marketFit} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs">
                          <span>Economics</span>
                          <span className="font-medium">{Math.round(scores.economics)}%</span>
                        </div>
                        <Progress value={scores.economics} className="h-1.5" />
                      </div>
                    </div>
                  </details>

                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleSaveIdea(idea)}
                      disabled={isSaved || isCurrentlySaving || isSaving}
                      variant={isSaved ? "secondary" : "default"}
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved
                        </>
                      ) : isCurrentlySaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePromoteIdea(idea)}
                      disabled={promotingIdeaId === idea.id || isPromoting}
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      {promotingIdeaId === idea.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Open in Workspace
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {filteredSavedIdeas.length === 0 && ideas.length === 0 ? (
        <EmptyIdeasState
          onGenerateIdeas={handleGenerateIdeas}
          isGenerating={generateIdeas.isPending}
        />
      ) : filteredSavedIdeas.length === 0 && ideas.length > 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No saved ideas match your current filters.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSavedIdeas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Ideas;
