// src/pages/Ideas.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { useScoredFounderIdeas, type ScoredIdea } from "@/hooks/useScoredFounderIdeas";
import { useSaveFounderIdea } from "@/hooks/useSaveFounderIdea";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { IdeaScoredCard } from "@/components/ideas/IdeaScoredCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import {
  IdeaFilters,
  IdeaFiltersState,
  filterByTime,
  filterByCapital,
} from "@/components/ideas/IdeaFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Scale, Sparkles, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BusinessIdea } from "@/types/businessIdea";

type SortMode = "fit_desc" | "fit_asc" | "title_asc" | "capital_asc";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "fit_desc", label: "Highest Fit First" },
  { value: "fit_asc", label: "Lowest Fit First" },
  { value: "title_asc", label: "Alphabetical (Title)" },
  { value: "capital_asc", label: "Capital Required (Low → High)" },
];

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

  // Sort mode state
  const [sortMode, setSortMode] = useState<SortMode>("fit_desc");

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
    const filtered = founderScoredIdeas.filter(({ idea }) => {
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

    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "fit_desc":
          return b.scores.overall - a.scores.overall;
        case "fit_asc":
          return a.scores.overall - b.scores.overall;
        case "title_asc":
          return a.idea.title.localeCompare(b.idea.title, undefined, { sensitivity: "base" });
        case "capital_asc":
          return a.idea.capitalRequired - b.idea.capitalRequired;
        default:
          return 0;
      }
    });
  }, [founderScoredIdeas, filters, sortMode]);

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
          <div className="flex items-start justify-between gap-4 flex-wrap">
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
            
            {/* Sorting Control */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFounderIdeas.map(({ idea, scores }) => {
              const isSaved = savedIdeaIds.has(idea.id);
              const isCurrentlySaving = savingIdeaId === idea.id;
              const isCurrentlyPromoting = promotingIdeaId === idea.id;

              return (
                <IdeaScoredCard
                  key={idea.id}
                  idea={idea}
                  scores={scores}
                  isSaved={isSaved}
                  isSaving={isSaving || isCurrentlySaving}
                  isPromoting={isPromoting || isCurrentlyPromoting}
                  onSave={() => handleSaveIdea(idea)}
                  onPromote={() => handlePromoteIdea(idea)}
                />
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
