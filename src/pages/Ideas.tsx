// src/pages/Ideas.tsx
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { useScoredFounderIdeas } from "@/hooks/useScoredFounderIdeas";
import { useSaveFounderIdea } from "@/hooks/useSaveFounderIdea";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useVentureState } from "@/hooks/useVentureState";
import { useIdeaSessionStore } from "@/store/ideaSessionStore";
import { IdeaScoredCard } from "@/components/ideas/IdeaScoredCard";
import { LibraryIdeaCard } from "@/components/ideas/LibraryIdeaCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import { IdeaFilters, IdeaFiltersState } from "@/components/ideas/IdeaFilters";
import { ModeSelector, type IdeaMode } from "@/components/ideas/ModeSelector";
import { IdeaFusionPanel } from "@/components/ideas/IdeaFusionPanel";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { SkeletonGrid } from "@/components/shared/SkeletonLoaders";
import { MarketDomainViewer } from "@/components/admin/MarketDomainViewer";
import { MarketSignalModal } from "@/components/ideas/MarketSignalModal";
import { ImportIdeaModal } from "@/components/ideas/ImportIdeaModal";
import { SourceTypeBadge, SOURCE_TYPE_FILTERS, type SourceTypeFilter } from "@/components/ideas/SourceTypeBadge";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_ERROR_CODES, type PlanErrorCode } from "@/config/plans";
import type { PaywallReasonCode } from "@/config/paywallCopy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Scale, Sparkles, ArrowUpDown, Library, Combine, Trash2, Target, X, TrendingUp, Upload, AlertTriangle, Lock } from "lucide-react";
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
  const queryClient = useQueryClient();
  const { ideas: libraryIdeas, isLoading } = useIdeas();
  const {
    scoredIdeas: founderScoredIdeas,
    isLoading: isGeneratingFounderIdeas,
    generate: generateFounderIdeas,
    clearIdeas: clearGeneratedIdeas,
  } = useScoredFounderIdeas();
  const { saveIdea, isSaving, planError: savePlanError, clearPlanError: clearSavePlanError } = useSaveFounderIdea();
  const { promote, isPromoting } = usePromoteIdeaToWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { hasPro } = useFeatureAccess();

  // Venture state enforcement
  const { 
    canAccessIdeationTools, 
    guardIdeationAccess, 
    activeVenture 
  } = useVentureState();

  // Plan error from session store
  const { planError: genPlanError, clearPlanError: clearGenPlanError } = useIdeaSessionStore();

  // Session store for tracking saves
  const { 
    sessionIdeas, 
    focusArea, 
    setFocusArea,
    currentMode,
    setCurrentMode,
    markIdeaAsSaved,
    isIdeaSaved,
    getDbId,
  } = useIdeaSessionStore();

  const [savingIdeaId, setSavingIdeaId] = useState<string | null>(null);
  const [promotingIdeaId, setPromotingIdeaId] = useState<string | null>(null);
  const [openingIdeaId, setOpeningIdeaId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("fit_desc");
  const [selectedMode, setSelectedMode] = useState<IdeaMode>(currentMode || "breadth");
  const [edgyMode, setEdgyMode] = useState<string | null>(null);
  const [filters, setFilters] = useState<IdeaFiltersState>({
    archetypes: [],
    markets: [],
    riskLevels: [],
    timeCommitment: null,
    capitalRequired: null,
  });
  const [activeTab, setActiveTab] = useState<string>("generated");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReasonCode, setPaywallReasonCode] = useState<PaywallReasonCode | undefined>();
  const [showMarketSignalModal, setShowMarketSignalModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newlyImportedIds, setNewlyImportedIds] = useState<string[]>([]);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");

  // Show paywall when plan errors occur
  useEffect(() => {
    if (genPlanError?.code || savePlanError?.code) {
      // Map PLAN_ERROR_CODES to PaywallReasonCode
      const errorCode = genPlanError?.code || savePlanError?.code;
      const reasonMap: Record<string, PaywallReasonCode> = {
        [PLAN_ERROR_CODES.IDEA_LIMIT_REACHED]: "IDEA_LIMIT_REACHED",
        [PLAN_ERROR_CODES.MODE_REQUIRES_PRO]: "MODE_REQUIRES_PRO",
        [PLAN_ERROR_CODES.LIBRARY_FULL]: "LIBRARY_FULL_FREE",
      };
      setPaywallReasonCode(reasonMap[errorCode as string] || "IDEA_LIMIT_REACHED");
      setShowPaywall(true);
    }
  }, [genPlanError, savePlanError]);

  const handleClosePaywall = () => {
    setShowPaywall(false);
    setPaywallReasonCode(undefined);
    clearGenPlanError();
    clearSavePlanError();
  };

  const handleProModeClick = (mode: IdeaMode) => {
    setPaywallReasonCode("MODE_REQUIRES_PRO");
    setShowPaywall(true);
  };
  useEffect(() => {
    const fetchEdgyMode = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("founder_profiles")
          .select("edgy_mode")
          .eq("user_id", user.id)
          .single();
        setEdgyMode(data?.edgy_mode ?? null);
      } catch (e) {
        console.error("Error fetching edgy_mode:", e);
      }
    };
    fetchEdgyMode();
  }, [user?.id]);

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

    libraryIdeas.forEach((idea) => {
      if (idea.business_model_type) archetypeSet.add(idea.business_model_type);
      if (idea.category) archetypeSet.add(idea.category);
    });

    return {
      availableArchetypes: Array.from(archetypeSet).sort(),
      availableMarkets: Array.from(marketSet).sort(),
    };
  }, [founderScoredIdeas, libraryIdeas]);

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

  const filteredLibraryIdeas = useMemo(() => {
    return libraryIdeas.filter((idea) => {
      // Source type filter
      if (sourceTypeFilter !== "all") {
        const ideaSourceType = (idea as any).source_type || "generated";
        if (ideaSourceType !== sourceTypeFilter) {
          return false;
        }
      }
      
      if (filters.archetypes.length > 0) {
        const ideaArchetype = idea.category || idea.business_model_type;
        if (ideaArchetype && !filters.archetypes.includes(ideaArchetype)) {
          return false;
        }
      }
      return true;
    });
  }, [libraryIdeas, filters, sourceTypeFilter]);

  // Count ideas by source type for filter badges
  const sourceTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: libraryIdeas.length };
    libraryIdeas.forEach((idea) => {
      const st = (idea as any).source_type || "generated";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [libraryIdeas]);

  const handleMarketSignalSuccess = () => {
    // Refresh library ideas after market signal generation
    queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    setActiveTab("library");
    setSourceTypeFilter("market_signal");
  };

  const handleImportSuccess = (ideas: any[]) => {
    // Track newly imported idea IDs for banner display
    const importedIds = ideas.map((idea) => idea.id);
    setNewlyImportedIds(importedIds);
    
    // Refresh library ideas
    queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    setActiveTab("library");
    setSourceTypeFilter("imported");
    
    // Auto-navigate to first idea after a short delay
    if (ideas.length > 0) {
      setTimeout(() => {
        navigate(`/ideas/${ideas[0].id}`);
      }, 500);
    }
  };

  const handleGenerateFounderIdeas = async () => {
    // Venture state enforcement is handled by button disabled state
    // Double-check guard for programmatic calls
    const guardError = guardIdeationAccess();
    if (guardError) {
      toast({ 
        title: "Ideation Locked", 
        description: guardError, 
        variant: "destructive" 
      });
      return;
    }
    
    // Free tier check: Only allow 1 generation session
    if (!hasPro && sessionIdeas.length > 0) {
      setPaywallReasonCode("IDEA_LIMIT_REACHED");
      setShowPaywall(true);
      return;
    }
    
    try {
      setCurrentMode(selectedMode);
      await generateFounderIdeas({ mode: selectedMode, focus_area: focusArea || undefined });
      track("idea_generated", { mode: selectedMode, focusArea });
      toast({ 
        title: "Ideas Generated!", 
        description: `${selectedMode === "breadth" ? "Standard" : selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1).replace("_", " ")} mode ideas are ready.` 
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message ?? "Failed to generate ideas.", variant: "destructive" });
    }
  };

  // Determine if ideation controls should be disabled
  const ideationDisabled = isGeneratingFounderIdeas || !canAccessIdeationTools;
  const ideationDisabledReason = !canAccessIdeationTools 
    ? "Focus on your current venture" 
    : null;

  const handleClearSession = () => {
    clearGeneratedIdeas();
    toast({ title: "Session Cleared", description: "Generated ideas have been cleared." });
  };

  const handleSaveIdea = async (idea: BusinessIdea | BusinessIdeaV6): Promise<string | null> => {
    // Free tier check: Max 10 ideas in library
    if (!hasPro && libraryIdeas.length >= 10) {
      setPaywallReasonCode("LIBRARY_FULL_FREE");
      setShowPaywall(true);
      return null;
    }
    
    setSavingIdeaId(idea.id);
    // Convert v6 idea to legacy format for saving
    const legacyIdea = isV6Idea(idea) ? convertV6ToLegacy(idea) : idea;
    
    // Find the scores for this idea from founderScoredIdeas
    const scoredIdea = founderScoredIdeas.find(si => si.idea.id === idea.id);
    const fitScores = scoredIdea ? {
      overall: scoredIdea.scores.overall,
      passion: scoredIdea.scores.founderFit, // founderFit evaluates passions/skills
      skill: scoredIdea.scores.marketFit, // marketFit involves skill match for execution
      constraints: scoredIdea.scores.constraintsFit,
      lifestyle: scoredIdea.scores.economics, // economics reflects lifestyle balance
    } : undefined;
    
    const result = await saveIdea(legacyIdea, fitScores);
    setSavingIdeaId(null);
    if (result.success && result.id) {
      markIdeaAsSaved(idea.id, result.id);
      track("idea_saved", { ideaId: result.id, title: idea.title });
      toast({ title: "Saved to Library!", description: "This idea is now in your Ideas → Library." });
      return result.id;
    }
    return null;
  };

  const handleViewDetails = async (idea: BusinessIdea | BusinessIdeaV6) => {
    setOpeningIdeaId(idea.id);
    
    // If already saved, navigate directly using the DB id
    const existingDbId = getDbId(idea.id);
    if (isIdeaSaved(idea.id) && existingDbId) {
      navigate(`/ideas/${existingDbId}`);
      setOpeningIdeaId(null);
      return;
    }
    
    // Save first, then navigate
    const savedId = await handleSaveIdea(idea);
    setOpeningIdeaId(null);
    
    if (savedId) {
      navigate(`/ideas/${savedId}`);
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

  const handlePromoteLibraryIdea = async (ideaId: string) => {
    const idea = libraryIdeas.find(i => i.id === ideaId);
    if (!idea) return;
    
    // Convert DB idea to BusinessIdea format for promote
    const businessIdea: BusinessIdea = {
      id: idea.id,
      title: idea.title,
      oneLiner: idea.description || "",
      description: idea.description || "",
      problemStatement: "",
      targetCustomer: idea.target_customer || "",
      revenueModel: idea.business_model_type || "",
      mvpApproach: "",
      goToMarket: "",
      competitiveAdvantage: "",
      financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
      requiredToolsSkills: "",
      risksMitigation: "",
      whyItFitsFounder: "",
      primaryPassionDomains: [],
      primarySkillNeeds: [],
      markets: [],
      businessArchetype: idea.business_model_type || idea.category || "",
      hoursPerWeekMin: 5,
      hoursPerWeekMax: 20,
      capitalRequired: 0,
      riskLevel: "medium",
      timeToFirstRevenueMonths: 3,
      requiresPublicPersonalBrand: false,
      requiresTeamSoon: false,
      requiresCoding: false,
      salesIntensity: 3,
      asyncDepthWork: 3,
      firstSteps: [],
    };
    
    const result = await promote(businessIdea);
    if (result) {
      toast({ title: "Blueprint created!", description: `Document + ${result.taskIds.length} tasks created.` });
      navigate(`/workspace/${result.documentId}`);
    }
  };

  const handleSetNorthStar = async (ideaId: string) => {
    if (!user) return;
    
    try {
      // 1. Clear any existing North Star
      await supabase
        .from("ideas")
        .update({ status: "candidate" })
        .eq("user_id", user.id)
        .eq("status", "north_star");
      
      // 2. Set this idea as North Star
      const { error: updateError } = await supabase
        .from("ideas")
        .update({ status: "north_star" })
        .eq("id", ideaId)
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
      
      // 3. Get the idea details
      const idea = libraryIdeas.find(i => i.id === ideaId);
      if (!idea) throw new Error("Idea not found");
      
      // 4. Create/update founder_blueprint with idea data
      const { error: blueprintError } = await supabase
        .from("founder_blueprints")
        .upsert({
          user_id: user.id,
          north_star_idea_id: ideaId,
          north_star_one_liner: idea.description || idea.title,
          target_audience: idea.target_customer || null,
          problem_statement: idea.description || null,
          offer_model: idea.business_model_type || idea.category || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });
      
      if (blueprintError) {
        console.error("Blueprint update failed:", blueprintError);
        // Don't fail the whole flow if blueprint update fails
      }
      
      // 5. Ensure venture exists for this idea
      const { data: existingVenture } = await supabase
        .from("ventures")
        .select("id")
        .eq("user_id", user.id)
        .eq("idea_id", ideaId)
        .maybeSingle();
      
      let ventureId = existingVenture?.id;
      
      if (!ventureId) {
        const { data: newVenture, error: ventureError } = await supabase
          .from("ventures")
          .insert({
            user_id: user.id,
            idea_id: ideaId,
            name: idea.title || "My Venture",
            venture_state: "inactive",
          })
          .select()
          .single();
        
        if (ventureError) throw ventureError;
        ventureId = newVenture.id;
      }
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
      queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
      
      toast({ 
        title: "North Star Set!", 
        description: "Navigate to North Star page to see your master prompt." 
      });
      
      // Navigate to North Star page
      navigate("/north-star");
      
    } catch (error: any) {
      console.error("Failed to set North Star:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to set North Star", 
        variant: "destructive" 
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

  const showFilters = founderScoredIdeas.length > 0 || libraryIdeas.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Venture state warning - ideation locked during executing */}
      {!canAccessIdeationTools && activeVenture && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Ideation tools are locked while your venture is in "executing" state. Focus on your current commitment.
          </AlertDescription>
        </Alert>
      )}

      {/* Header - stacks on mobile */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2">Your Business Ideas</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {libraryIdeas.length} saved · {sessionIdeas.length} generated
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowMarketSignalModal(true)} 
            variant="outline" 
            size="sm" 
            className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            disabled={!canAccessIdeationTools || !hasPro}
            title={!hasPro ? "Pro feature" : ideationDisabledReason || undefined}
          >
            {!hasPro && <Lock className="w-3 h-3" />}
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Market Pain</span>
            <span className="sm:hidden">Market</span>
          </Button>
          <Button 
            onClick={() => setShowImportModal(true)} 
            variant="outline" 
            size="sm" 
            className="gap-2 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
            disabled={!canAccessIdeationTools || !hasPro}
            title={!hasPro ? "Pro feature" : ideationDisabledReason || undefined}
          >
            {!hasPro && <Lock className="w-3 h-3" />}
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import My Idea</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button 
            onClick={() => {
              if (!hasPro) {
                setPaywallReasonCode("MODE_REQUIRES_PRO");
                setShowPaywall(true);
                return;
              }
              navigate("/fusion-lab");
            }} 
            variant="outline" 
            size="sm" 
            className="gap-2"
            title={!hasPro ? "Pro feature" : undefined}
          >
            {!hasPro && <Lock className="w-3 h-3" />}
            <Combine className="w-4 h-4" />
            <span className="hidden sm:inline">Fusion Lab</span>
            <span className="sm:hidden">Fusion</span>
          </Button>
          {libraryIdeas.length >= 2 && (
            <Button onClick={() => navigate("/ideas/compare")} variant="outline" size="sm" className="gap-2">
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Compare Ideas</span>
              <span className="sm:hidden">Compare</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabbed View: Generated vs Library */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generated" className="gap-2 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4" />
            <span className="hidden xs:inline">Generated</span> ({filteredFounderIdeas.length})
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2 text-xs sm:text-sm">
            <Library className="w-4 h-4" />
            <span className="hidden xs:inline">Library</span> ({filteredLibraryIdeas.length})
          </TabsTrigger>
        </TabsList>

        {/* Generated (v6) Tab */}
        <TabsContent value="generated" className="space-y-4">
          {/* Mode Selector with Focus Area */}
          <div className="bg-card border border-border rounded-lg p-4">
            <ModeSelector 
              selectedMode={selectedMode} 
              onModeChange={setSelectedMode}
              focusArea={focusArea}
              onFocusAreaChange={setFocusArea}
              edgyMode={edgyMode}
              isPro={hasPro}
              onProModeClick={handleProModeClick}
            />
            
            {/* Active Focus Pill */}
            {focusArea && (
              <div className="mt-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                  <Target className="w-3.5 h-3.5" />
                  <span>Focused on: "{focusArea.length > 30 ? focusArea.slice(0, 30) + "..." : focusArea}"</span>
                  <button 
                    onClick={() => setFocusArea("")}
                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex justify-between items-center gap-2">
              {sessionIdeas.length > 0 && (
                <Button 
                  onClick={handleClearSession} 
                  variant="ghost" 
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Session
                </Button>
              )}
              <div className="flex-1" />
              <Button 
                onClick={handleGenerateFounderIdeas} 
                disabled={ideationDisabled} 
                className="gap-2"
                title={ideationDisabledReason || undefined}
              >
                {isGeneratingFounderIdeas ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generate {selectedMode === "breadth" ? "" : selectedMode.replace("_", " ").charAt(0).toUpperCase() + selectedMode.replace("_", " ").slice(1)} Ideas</>
                )}
              </Button>
            </div>
            
            {/* Free tier limit notice */}
            {!hasPro && sessionIdeas.length > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Free tier: 1 session only. Upgrade to Pro for unlimited generations.
              </p>
            )}
          </div>

          {showFilters && (
            <IdeaFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              availableArchetypes={availableArchetypes} 
              availableMarkets={availableMarkets} 
            />
          )}

          {filteredFounderIdeas.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">v6 Generated Ideas</h2>
                  <p className="text-sm text-muted-foreground">
                    AI-powered ideas from your profile. Save the ones you like to Library.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredFounderIdeas.map(({ idea, scores }) => (
                  <IdeaScoredCard
                    key={idea.id}
                    idea={idea}
                    scores={scores}
                    isSaved={isIdeaSaved(idea.id)}
                    isSaving={isSaving || savingIdeaId === idea.id}
                    isPromoting={isPromoting || promotingIdeaId === idea.id}
                    isOpening={openingIdeaId === idea.id}
                    onSave={() => handleSaveIdea(idea)}
                    onPromote={() => handlePromoteIdea(idea)}
                    onViewDetails={() => handleViewDetails(idea)}
                  />
                ))}
              </div>
            </section>
          ) : (
            <EmptyIdeasState onGenerateIdeas={handleGenerateFounderIdeas} isGenerating={isGeneratingFounderIdeas} />
          )}

          {/* Fusion Panel in Generated tab - Pro only */}
          {hasPro && (libraryIdeas.length + sessionIdeas.length) >= 2 && (
            <IdeaFusionPanel 
              ideas={libraryIdeas} 
              sessionIdeas={sessionIdeas}
              showSessionGroup
              onFusionComplete={(fusedIdea) => {
                toast({ 
                  title: "New Fused Idea!", 
                  description: `"${fusedIdea.title}" saved to Library.` 
                });
              }}
            />
          )}
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          {filteredLibraryIdeas.length === 0 ? (
            <div className="text-center py-12">
              <Library className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your Library is Empty</h3>
              <p className="text-muted-foreground mb-4">
                Save generated ideas, variants, or fused concepts to build your library.
              </p>
              <Button onClick={() => setActiveTab("generated")} variant="outline">
                Go to Generated Ideas
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-semibold">Ideas Library</h2>
                  <p className="text-sm text-muted-foreground">
                    Your saved ideas, variants, and fused concepts. Click to explore.
                  </p>
                  {!hasPro && libraryIdeas.length >= 8 && (
                    <p className="text-xs text-amber-600 mt-1">
                      {libraryIdeas.length}/10 ideas saved. Upgrade to Pro for unlimited storage.
                    </p>
                  )}
                </div>
                {showFilters && (
                  <IdeaFilters 
                    filters={filters} 
                    onFiltersChange={setFilters} 
                    availableArchetypes={availableArchetypes} 
                    availableMarkets={availableMarkets} 
                  />
                )}
              </div>
              
              {/* Source Type Filter Chips */}
              <div className="flex flex-wrap gap-2">
                {SOURCE_TYPE_FILTERS.map((filter) => {
                  const count = sourceTypeCounts[filter.value] || 0;
                  if (filter.value !== "all" && count === 0) return null;
                  return (
                    <Button
                      key={filter.value}
                      variant={sourceTypeFilter === filter.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSourceTypeFilter(filter.value)}
                      className="gap-1.5"
                    >
                      {filter.label}
                      <span className="text-xs opacity-70">({filter.value === "all" ? libraryIdeas.length : count})</span>
                    </Button>
                  );
                })}
              </div>
              
              {/* Newly Imported Ideas Banner */}
              {newlyImportedIds.length > 0 && sourceTypeFilter === "imported" && (
                <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-violet-700 dark:text-violet-300">
                        We generated {newlyImportedIds.length} variants. Pick the one you want to pursue.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Each variant offers a different angle on your original idea.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {newlyImportedIds.length >= 2 && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/ideas/compare?ids=${newlyImportedIds.join(",")}`)}
                        className="gap-2"
                      >
                        <Scale className="w-4 h-4" />
                        Compare Variants
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setNewlyImportedIds([])}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLibraryIdeas.map((idea) => (
                  <LibraryIdeaCard 
                    key={idea.id} 
                    idea={idea} 
                    onPromote={handlePromoteLibraryIdea}
                    onSetNorthStar={handleSetNorthStar}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        open={showPaywall}
        onClose={handleClosePaywall}
        reasonCode={paywallReasonCode}
      />

      {/* Debug: Market Signal Domains (only visible when VITE_DEBUG_MODE=true) */}
      <MarketDomainViewer />

      {/* Market Signal Modal */}
      <MarketSignalModal
        open={showMarketSignalModal}
        onClose={() => setShowMarketSignalModal(false)}
        onSuccess={handleMarketSignalSuccess}
      />

      {/* Import Idea Modal */}
      <ImportIdeaModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onSuccess={handleImportSuccess}
      />
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