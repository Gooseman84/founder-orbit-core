// src/pages/Ideas.tsx
import { useState, useMemo, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { MarketDomainViewer } from "@/components/admin/MarketDomainViewer";
import { ImportIdeaModal } from "@/components/ideas/ImportIdeaModal";
import { type SourceTypeFilter } from "@/components/ideas/SourceTypeBadge";
import { GeneratedTab } from "@/components/ideas/GeneratedTab";
import { LibraryTab } from "@/components/ideas/LibraryTab";
import { isV6Idea, convertV6ToLegacy, type SortMode } from "@/components/ideas/ideaUtils";
import { type IdeaFiltersState } from "@/components/ideas/IdeaFilters";
import { type IdeaMode } from "@/components/ideas/ModeSelector";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_ERROR_CODES } from "@/config/plans";
import type { PaywallReasonCode } from "@/config/paywallCopy";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Scale, Sparkles, Lock, TrendingUp, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";
import { PageHelp } from "@/components/shared/PageHelp";

const Ideas = () => {
  const queryClient = useQueryClient();
  const { ideas: libraryIdeas, isLoading } = useIdeas();
  const {
    scoredIdeas: founderScoredIdeas,
    isLoading: isGeneratingFounderIdeas,
    retryableError,
    generate: generateFounderIdeas,
    clearIdeas: clearGeneratedIdeas,
  } = useScoredFounderIdeas();
  const { saveIdea, isSaving, planError: savePlanError, clearPlanError: clearSavePlanError } = useSaveFounderIdea();
  const { promote, isPromoting } = usePromoteIdeaToWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useAnalytics();
  const { hasPro, features: planFeatures } = useFeatureAccess();
  const { canAccessIdeationTools, guardIdeationAccess, activeVenture } = useVentureState();
  const { planError: genPlanError, clearPlanError: clearGenPlanError } = useIdeaSessionStore();
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
  // edgyMode no longer needed — modes consolidated
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [newlyImportedIds, setNewlyImportedIds] = useState<string[]>([]);
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceTypeFilter>("all");
  const [dismissedBannerSession, setDismissedBannerSession] = useState(() => {
    return sessionStorage.getItem("tb-active-venture-banner-dismissed") === "true";
  });

  useEffect(() => {
    if (genPlanError?.code || savePlanError?.code) {
      const errorCode = genPlanError?.code || savePlanError?.code;
      const reasonMap: Record<string, PaywallReasonCode> = {
        [PLAN_ERROR_CODES.IDEA_LIMIT_REACHED]: "IDEA_LIMIT_REACHED",
        [PLAN_ERROR_CODES.MODE_REQUIRES_PRO]: "MODE_REQUIRES_PRO",
        [PLAN_ERROR_CODES.LIBRARY_FULL]: "LIBRARY_FULL_TRIAL",
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

  const handleDismissBanner = () => {
    setDismissedBannerSession(true);
    sessionStorage.setItem("tb-active-venture-banner-dismissed", "true");
  };

  const handleProModeClick = () => {
    setPaywallReasonCode("MODE_REQUIRES_PRO");
    setShowPaywall(true);
  };

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

  const filteredFounderIdeas = useMemo(() => {
    const filtered = founderScoredIdeas.filter(({ idea }) => {
      if (isV6Idea(idea)) {
        if (filters.archetypes.length > 0 && !filters.archetypes.includes(idea.category)) return false;
      } else {
        if (filters.archetypes.length > 0 && !filters.archetypes.includes(idea.businessArchetype || "")) return false;
        if (filters.markets.length > 0 && !idea.markets?.some((m) => filters.markets.includes(m))) return false;
        if (filters.riskLevels.length > 0 && !filters.riskLevels.includes(idea.riskLevel || "")) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      switch (sortMode) {
        case "fit_desc": return b.scores.overall - a.scores.overall;
        case "fit_asc": return a.scores.overall - b.scores.overall;
        case "title_asc": return a.idea.title.localeCompare(b.idea.title, undefined, { sensitivity: "base" });
        default: return 0;
      }
    });
  }, [founderScoredIdeas, filters, sortMode]);

  const filteredLibraryIdeas = useMemo(() => {
    return libraryIdeas.filter((idea) => {
      if (sourceTypeFilter !== "all") {
        const ideaSourceType = (idea as any).source_type || "generated";
        if (ideaSourceType !== sourceTypeFilter) return false;
      }
      if (filters.archetypes.length > 0) {
        const ideaArchetype = idea.category || idea.business_model_type;
        if (ideaArchetype && !filters.archetypes.includes(ideaArchetype)) return false;
      }
      return true;
    });
  }, [libraryIdeas, filters, sourceTypeFilter]);

  const sourceTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: libraryIdeas.length };
    libraryIdeas.forEach((idea) => {
      const st = (idea as any).source_type || "generated";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [libraryIdeas]);

  const handleMarketSignalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    setActiveTab("library");
    setSourceTypeFilter("market_signal");
  };

  const handleImportSuccess = async (ideas: any[]) => {
    const importedIds = ideas.map((idea) => idea.id);
    setNewlyImportedIds(importedIds);
    await queryClient.invalidateQueries({ queryKey: ["ideas", user?.id] });
    setActiveTab("library");
    setSourceTypeFilter("imported");
    if (ideas.length > 0) navigate(`/ideas/${ideas[0].id}`);
  };

  const handleGenerateFounderIdeas = async () => {
    const guardError = guardIdeationAccess();
    if (guardError) {
      toast({ title: "Ideation Locked", description: guardError, variant: "destructive" });
      return;
    }
    if (!hasPro) {
      const { count, error: countErr } = await supabase
        .from("ideas")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("source_type", "generated");
      const totalGenerated = countErr ? 0 : (count ?? 0);
      if (totalGenerated >= planFeatures.maxIdeaGenerationsTotal) {
        setPaywallReasonCode("IDEA_LIMIT_REACHED");
        setShowPaywall(true);
        return;
      }
    }
    try {
      setCurrentMode(selectedMode);
      await generateFounderIdeas({ mode: selectedMode, focus_area: focusArea || undefined });
      track("idea_generated", { mode: selectedMode, focusArea });
      toast({
        title: "Ideas Generated!",
        description: `${selectedMode === "breadth" ? "Standard" : selectedMode.charAt(0).toUpperCase() + selectedMode.slice(1).replace("_", " ")} mode ideas are ready.`,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message ?? "Failed to generate ideas.", variant: "destructive" });
    }
  };

  const ideationDisabled = isGeneratingFounderIdeas || !canAccessIdeationTools;
  const ideationDisabledReason = !canAccessIdeationTools ? "Focus on your current venture" : null;

  const handleClearSession = () => {
    clearGeneratedIdeas();
    toast({ title: "Session Cleared", description: "Generated ideas have been cleared." });
  };

  const handleSaveIdea = async (idea: BusinessIdea | BusinessIdeaV6): Promise<string | null> => {
    if (!hasPro && libraryIdeas.length >= planFeatures.maxSavedIdeas) {
      setPaywallReasonCode("LIBRARY_FULL_TRIAL");
      setShowPaywall(true);
      return null;
    }
    setSavingIdeaId(idea.id);
    const legacyIdea = isV6Idea(idea) ? convertV6ToLegacy(idea) : idea;
    const scoredIdea = founderScoredIdeas.find((si) => si.idea.id === idea.id);
    const fitScores = scoredIdea
      ? {
          overall: scoredIdea.scores.overall,
          passion: scoredIdea.scores.founderFit,
          skill: scoredIdea.scores.marketFit,
          constraints: scoredIdea.scores.constraintsFit,
          lifestyle: scoredIdea.scores.economics,
        }
      : undefined;
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
    const existingDbId = getDbId(idea.id);
    if (isIdeaSaved(idea.id) && existingDbId) {
      navigate(`/ideas/${existingDbId}`);
      setOpeningIdeaId(null);
      return;
    }
    const savedId = await handleSaveIdea(idea);
    setOpeningIdeaId(null);
    if (savedId) navigate(`/ideas/${savedId}`);
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
    const idea = libraryIdeas.find((i) => i.id === ideaId);
    if (!idea) return;
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
      await supabase.from("ideas").update({ status: "candidate" }).eq("user_id", user.id).eq("status", "north_star");
      const { error: updateError } = await supabase.from("ideas").update({ status: "north_star" }).eq("id", ideaId).eq("user_id", user.id);
      if (updateError) throw updateError;
      const idea = libraryIdeas.find((i) => i.id === ideaId);
      if (!idea) throw new Error("Idea not found");
      const { error: blueprintError } = await supabase.from("founder_blueprints").upsert(
        {
          user_id: user.id,
          north_star_idea_id: ideaId,
          north_star_one_liner: idea.description || idea.title,
          target_audience: idea.target_customer || null,
          problem_statement: idea.description || null,
          offer_model: idea.business_model_type || idea.category || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (blueprintError) console.error("Blueprint update failed:", blueprintError);
      const { data: existingVenture } = await supabase.from("ventures").select("id").eq("user_id", user.id).eq("idea_id", ideaId).maybeSingle();
      let ventureId = existingVenture?.id;
      if (!ventureId) {
        const { data: newVenture, error: ventureError } = await supabase
          .from("ventures")
          .insert({ user_id: user.id, idea_id: ideaId, name: idea.title || "My Venture", venture_state: "inactive" })
          .select()
          .single();
        if (ventureError) throw ventureError;
        ventureId = newVenture.id;
      }
      queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
      queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
      toast({ title: "North Star Set!", description: "Now commit to your venture to start executing." });
      navigate(`/commit/${ideaId}`);
    } catch (error: any) {
      console.error("Failed to set North Star:", error);
      toast({ title: "Error", description: error.message || "Failed to set North Star", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <span className="text-primary text-[1.5rem]">◆</span>
          <p className="label-mono">LOADING VENTURES</p>
        </div>
      </div>
    );
  }

  const showFilters = founderScoredIdeas.length > 0 || libraryIdeas.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Info banner when user has an active venture */}
      {activeVenture && !dismissedBannerSession && (
        <div className="card-gold-left p-4 relative">
          <p className="text-[0.85rem] font-light text-foreground pr-8">
            You're currently building <strong className="text-primary">{activeVenture.name}</strong>. Browsing ideas won't affect your active venture.
          </p>
          <button onClick={handleDismissBanner} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Dismiss banner">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Venture state warning */}
      {!canAccessIdeationTools && activeVenture && (
        <div className="card-gold-left p-4 flex items-center gap-3">
          <Lock className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[0.85rem] font-light text-muted-foreground">
            Ideation tools are locked while your venture is in "executing" state. Focus on your current commitment.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="eyebrow mb-2">VENTURE INTELLIGENCE</div>
          <h1 className="font-display text-2xl md:text-[2.5rem] font-bold leading-tight">
            Your <em className="text-primary" style={{ fontStyle: "italic" }}>Ideas</em>
          </h1>
          <p className="text-sm font-light text-muted-foreground mt-1">
            {libraryIdeas.length} saved · {sessionIdeas.length} generated
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              if (!hasPro) { setPaywallReasonCode("FEATURE_REQUIRES_PRO"); setShowPaywall(true); return; }
              setShowImportModal(true);
            }}
            variant="outline"
            size="sm"
            className="gap-2 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10"
            disabled={!canAccessIdeationTools && hasPro}
            title={!hasPro ? "Upgrade to Pro to import ideas" : ideationDisabledReason || undefined}
          >
            {!hasPro && <Lock className="w-3 h-3" />}
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import My Idea</span>
            <span className="sm:hidden">Import</span>
          </Button>
          {libraryIdeas.length >= 2 && (
            <Button
              onClick={() => {
                if (!hasPro) { setPaywallReasonCode("COMPARE_REQUIRES_PRO"); setShowPaywall(true); return; }
                navigate("/ideas/compare");
              }}
              variant="outline"
              size="sm"
              className="gap-2"
              title={!hasPro ? "Pro feature" : undefined}
            >
              {!hasPro && <Lock className="w-3 h-3" />}
              <Scale className="w-4 h-4" />
              <span className="hidden sm:inline">Compare ({libraryIdeas.length})</span>
              <span className="sm:hidden">Compare ({libraryIdeas.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabbed View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("generated")}
            className={`font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2.5 border transition-colors ${
              activeTab === "generated" ? "border-primary/35 text-primary bg-primary/10" : "border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary"
            }`}
          >
            GENERATED ({filteredFounderIdeas.length})
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={`font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-4 py-2.5 border transition-colors ${
              activeTab === "library" ? "border-primary/35 text-primary bg-primary/10" : "border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary"
            }`}
          >
            LIBRARY ({filteredLibraryIdeas.length})
          </button>
        </div>

        <TabsContent value="generated">
          <GeneratedTab
            filteredFounderIdeas={filteredFounderIdeas}
            isGeneratingFounderIdeas={isGeneratingFounderIdeas}
            retryableError={!!retryableError}
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
            focusArea={focusArea}
            setFocusArea={setFocusArea}
            edgyMode={edgyMode}
            hasPro={hasPro}
            sortMode={sortMode}
            setSortMode={setSortMode}
            filters={filters}
            setFilters={setFilters}
            availableArchetypes={availableArchetypes}
            availableMarkets={availableMarkets}
            showFilters={showFilters}
            sessionIdeas={sessionIdeas}
            libraryIdeas={libraryIdeas}
            ideationDisabled={ideationDisabled}
            ideationDisabledReason={ideationDisabledReason}
            onGenerateIdeas={handleGenerateFounderIdeas}
            onClearSession={handleClearSession}
            onProModeClick={handleProModeClick}
            onSaveIdea={handleSaveIdea}
            onPromoteIdea={handlePromoteIdea}
            onViewDetails={handleViewDetails}
            isIdeaSaved={isIdeaSaved}
            isSaving={isSaving}
            savingIdeaId={savingIdeaId}
            isPromoting={isPromoting}
            promotingIdeaId={promotingIdeaId}
            openingIdeaId={openingIdeaId}
            onFusionComplete={(fusedIdea) => {
              toast({ title: "New Fused Idea!", description: `"${fusedIdea.title}" saved to Library.` });
            }}
          />
        </TabsContent>

        <TabsContent value="library">
          <LibraryTab
            filteredLibraryIdeas={filteredLibraryIdeas}
            libraryIdeas={libraryIdeas}
            sourceTypeFilter={sourceTypeFilter}
            setSourceTypeFilter={setSourceTypeFilter}
            sourceTypeCounts={sourceTypeCounts}
            newlyImportedIds={newlyImportedIds}
            setNewlyImportedIds={setNewlyImportedIds}
            filters={filters}
            setFilters={setFilters}
            availableArchetypes={availableArchetypes}
            availableMarkets={availableMarkets}
            showFilters={showFilters}
            hasPro={hasPro}
            activeVenture={activeVenture}
            onSetActiveTab={setActiveTab}
            onPromoteLibraryIdea={handlePromoteLibraryIdea}
            onSetNorthStar={handleSetNorthStar}
          />
        </TabsContent>
      </Tabs>

      <ProUpgradeModal open={showPaywall} onClose={handleClosePaywall} reasonCode={paywallReasonCode} />
      <MarketDomainViewer />
      <ImportIdeaModal open={showImportModal} onOpenChange={setShowImportModal} onSuccess={handleImportSuccess} />
      <PageHelp
        title="Idea Lab"
        bullets={[
          "Switch between 'Generated' and 'Library' tabs — generated ideas are session-only until you save them.",
          "Choose a generation mode (Breadth, Deep Niche, Contrarian, etc.) to control what kind of ideas Mavrik produces.",
          "Use the focus area field to steer generation toward a specific industry, skill, or problem space.",
          "Save ideas to your Library to keep them across sessions, then click any card for deep-dive analysis.",
          "Import your own idea or generate Market Signal ideas based on real community pain points.",
          "Filter and sort ideas by archetype, source type, or fit score to find the best matches quickly.",
          "Use Fusion Lab to combine two saved ideas into a hybrid concept.",
        ]}
      />
    </div>
  );
};

export default Ideas;
