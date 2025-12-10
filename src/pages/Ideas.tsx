// src/pages/Ideas.tsx
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { useScoredFounderIdeas } from "@/hooks/useScoredFounderIdeas";
import { useSaveFounderIdea } from "@/hooks/useSaveFounderIdea";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { IdeaScoredCard } from "@/components/ideas/IdeaScoredCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import { IdeaFilters, IdeaFiltersState } from "@/components/ideas/IdeaFilters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Scale, Sparkles, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";

type SortMode = "fit_desc" | "fit_asc" | "title_asc";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "fit_desc", label: "Highest Fit First" },
  { value: "fit_asc", label: "Lowest Fit First" },
  { value: "title_asc", label: "Alphabetical (Title)" },
];

// Helper to check if idea is v6
function isV6Idea(idea: BusinessIdea | BusinessIdeaV6): idea is BusinessIdeaV6 {
  return "engineVersion" in idea && idea.engineVersion === "v6";
}

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

  const [savedIdeaIds, setSavedIdeaIds] = useState<Set<string>>(new Set());
  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [promotingIdeaId, setPromotingIdeaId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("fit_desc");
  const [filters, setFilters] = useState<IdeaFiltersState>({
    archetypes: [],
    markets: [],
    riskLevels: [],
    timeCommitment: null,
    capitalRequired: null,
  });

  // Derive available filter options
  const { availableArchetypes, availableMarkets } = useMemo(() => {
    const archetypeSet = new Set<string>();
    const marketSet = new Set<string>();

    founderScoredIdeas.forEach(({ idea }) => {
      if (isV6Idea(idea)) {
        archetypeSet.add(idea.category);
      } else if (idea.businessArchetype) {
        archetypeSet.add(idea.businessArchetype);
        idea.markets?.forEach((m) => marketSet.add(m));
      }
    });

    ideas.forEach((idea) => {
      if (idea.business_model_type) archetypeSet.add(idea.business_model_type);
    });

    return {
      availableArchetypes: Array.from(archetypeSet).sort(),
      availableMarkets: Array.from(marketSet).sort(),
    };
  }, [founderScoredIdeas, ideas]);

  // Filter and sort founder ideas
  const filteredFounderIdeas = useMemo(() => {
    const filtered = founderScoredIdeas.filter(({ idea }) => {
      // For v6 ideas, filter by category instead of businessArchetype
      if (isV6Idea(idea)) {
        if (filters.archetypes.length > 0 && !filters.archetypes.includes(idea.category)) {
          return false;
        }
      } else {
        if (filters.archetypes.length > 0 && !filters.archetypes.includes(idea.businessArchetype || "")) {
          return false;
        }
        if (filters.markets.length > 0 && !idea.markets?.some((m) => filters.markets.includes(m))) {
          return false;
        }
        if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(idea.riskLevel || "")) {
          return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "fit_desc":
          return b.scores.overall - a.scores.overall;
        case "fit_asc":
          return a.scores.overall - b.scores.overall;
        case "title_asc":
          return a.idea.title.localeCompare(b.idea.title, undefined, { sensitivity: "base" });
        default:
          return 0;
      }
    });
  }, [founderScoredIdeas, filters, sortMode]);

  const filteredSavedIdeas = useMemo(() => {
    return ideas.filter((idea) => {
      if (filters.archetypes.length > 0 && idea.business_model_type && !filters.archetypes.includes(idea.business_model_type)) {
        return false;
      }
      return true;
    });
  }, [ideas, filters]);

  const handleGenerateIdeas = async () => {
    try {
      await generateIdeas.mutateAsync();
      toast({ title: "Ideas Generated!", description: "Your personalized business ideas are ready." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to generate ideas.", variant: "destructive" });
    }
  };

  const handleGenerateFounderIdeas = async () => {
    try {
      await generateFounderIdeas();
      setSavedIdeaIds(new Set());
    } catch (error: any) {
      toast({ title: "Error", description: error.message ?? "Failed to generate ideas.", variant: "destructive" });
    }
  };

  const handleSaveIdea = async (idea: BusinessIdea | BusinessIdeaV6) => {
    setSavingIdeaId(idea.id);
    // Convert v6 idea to legacy format for saving
    const legacyIdea = isV6Idea(idea) ? convertV6ToLegacy(idea) : idea;
    const success = await saveIdea(legacyIdea);
    setSavingIdeaId(null);
    if (success) {
      setSavedIdeaIds((prev) => new Set(prev).add(idea.id));
      toast({ title: "Saved!", description: "This idea is now in your library." });
    }
  };

  const handlePromoteIdea = async (idea: BusinessIdea | BusinessIdeaV6) => {
    setPromotingIdeaId(idea.id);
    const legacyIdea = isV6Idea(idea) ? convertV6ToLegacy(idea) : idea;
    const result = await promote(legacyIdea);
    setPromotingIdeaId(null);
    if (result) {
      toast({ title: "Blueprint created!", description: `Document + ${result.taskIds.length} tasks created.` });
      navigate(`/workspace/${result.documentId}`);
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
          <p className="text-muted-foreground">{ideas.length} ideas in library</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={handleGenerateFounderIdeas} disabled={isGeneratingFounderIdeas} className="gap-2">
            {isGeneratingFounderIdeas ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate v6 Ideas</>
            )}
          </Button>
          {ideas.length >= 2 && (
            <Button onClick={() => navigate("/ideas/compare")} variant="outline" className="gap-2">
              <Scale className="w-4 h-4" />Compare Ideas
            </Button>
          )}
          <Button onClick={handleGenerateIdeas} disabled={generateIdeas.isPending} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />More Ideas
          </Button>
        </div>
      </div>

      {showFilters && (
        <IdeaFilters filters={filters} onFiltersChange={setFilters} availableArchetypes={availableArchetypes} availableMarkets={availableMarkets} />
      )}

      {filteredFounderIdeas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-semibold">v6 Generated Ideas</h2>
              <p className="text-sm text-muted-foreground">AI-powered ideas from your profile. Save the ones you like.</p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFounderIdeas.map(({ idea, scores }) => (
              <IdeaScoredCard
                key={idea.id}
                idea={idea}
                scores={scores}
                isSaved={savedIdeaIds.has(idea.id)}
                isSaving={isSaving || savingIdeaId === idea.id}
                isPromoting={isPromoting || promotingIdeaId === idea.id}
                onSave={() => handleSaveIdea(idea)}
                onPromote={() => handlePromoteIdea(idea)}
              />
            ))}
          </div>
        </section>
      )}

      {filteredSavedIdeas.length === 0 && ideas.length === 0 ? (
        <EmptyIdeasState onGenerateIdeas={handleGenerateIdeas} isGenerating={generateIdeas.isPending} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSavedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)}
        </div>
      )}
    </div>
  );
};

// Convert v6 idea to legacy format for saving/promoting
function convertV6ToLegacy(idea: BusinessIdeaV6): BusinessIdea {
  return {
    id: idea.id,
    title: idea.title,
    oneLiner: idea.oneLiner,
    description: idea.description,
    problemStatement: idea.problemStatement,
    targetCustomer: idea.targetCustomer,
    revenueModel: idea.model,
    mvpApproach: idea.mvpApproach,
    goToMarket: idea.goToMarket,
    competitiveAdvantage: idea.whyNow,
    financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
    requiredToolsSkills: idea.aiPattern,
    risksMitigation: "",
    whyItFitsFounder: idea.whyItFitsFounder,
    primaryPassionDomains: [idea.industry],
    primarySkillNeeds: [],
    markets: [idea.industry],
    businessArchetype: idea.category,
    hoursPerWeekMin: 5,
    hoursPerWeekMax: 20,
    capitalRequired: 0,
    riskLevel: idea.difficulty === "easy" ? "low" : idea.difficulty === "hard" ? "high" : "medium",
    timeToFirstRevenueMonths: idea.timeToRevenue === "0-30d" ? 1 : idea.timeToRevenue === "30-90d" ? 3 : 6,
    requiresPublicPersonalBrand: idea.platform !== null,
    requiresTeamSoon: !idea.soloFit,
    requiresCoding: false,
    salesIntensity: 3,
    asyncDepthWork: 3,
    firstSteps: idea.firstSteps,
    category: idea.category,
    mode: idea.mode,
    platform: idea.platform,
    shockFactor: idea.shockFactor,
    viralityPotential: idea.viralityPotential,
    leverageScore: idea.leverageScore,
    automationDensity: idea.automationDensity,
    autonomyLevel: idea.autonomyLevel,
    cultureTailwind: idea.cultureTailwind,
    chaosFactor: idea.chaosFactor,
    engineVersion: idea.engineVersion,
  };
}

export default Ideas;
