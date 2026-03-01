// src/pages/IdeaDetail.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIdeaDetail } from "@/hooks/useIdeaDetail";
import { IdeaVettingCard } from "@/components/ideas/IdeaVettingCard";
import { OpportunityScoreCard } from "@/components/opportunity/OpportunityScoreCard";
import { FinancialViabilityScore } from "@/components/opportunity/FinancialViabilityScore";
import { useFinancialViabilityScore } from "@/hooks/useFinancialViabilityScore";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { PaywallModal } from "@/components/billing/PaywallModal";
import { IdeaVariantGenerator } from "@/components/ideas/IdeaVariantGenerator";
import { IdeaOptimizerBar } from "@/components/shared/IdeaOptimizerBar";
import { V6MetricsGrid } from "@/components/shared/V6MetricBadge";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { recordXpEvent } from "@/lib/xpEngine";
import { PainThemesPanel } from "@/components/ideas/PainThemesPanel";
import { NormalizationDetailsPanel } from "@/components/ideas/NormalizationDetailsPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Sparkles, Star, StarOff, Clock, Users, BarChart3, Target, TrendingUp, GitMerge, AlertCircle, Lightbulb, ListChecks, Radio, Upload, MoreVertical, RefreshCw, Rocket, Heart, Lock } from "lucide-react";
import { useVentureState } from "@/hooks/useVentureState";
import { useValidationDisplayProps } from "@/hooks/useValidationDisplayProps";
import { useRef } from "react";
import { PageHelp } from "@/components/shared/PageHelp";

const getComplexityVariant = (complexity: string | null) => {
  switch (complexity?.toLowerCase()) {
    case "low":
      return "secondary";
    case "medium":
      return "default";
    case "high":
      return "destructive";
    default:
      return "outline";
  }
};

const IdeaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { gate, hasPro } = useFeatureAccess();
  const queryClient = useQueryClient();
  const { idea, analysis, isLoading, isScoring, scoringError, analyzeIdea, updateIdeaStatus, refetch, reScore } = useIdeaDetail(id);
  
  // Financial Viability Score hook
  const { 
    score: fvsScore, 
    isLoading: fvsLoading, 
    isCalculating: fvsCalculating, 
    error: fvsError, 
    calculateScore: calculateFVS,
    hasScore: hasFVS 
  } = useFinancialViabilityScore(id);
  
  const [opportunityScore, setOpportunityScore] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [generatingScore, setGeneratingScore] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showFVSPaywall, setShowFVSPaywall] = useState(false);
  const [founderProfile, setFounderProfile] = useState<any>(null);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);
  const [settingNorthStar, setSettingNorthStar] = useState(false);
  const [unsettingNorthStar, setUnsettingNorthStar] = useState(false);
  const { activeVenture: currentActiveVenture } = useVentureState();
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const fvsWasCalculating = useRef(false);

  // Validation display props for FVS (use active venture if idea matches)
  const ventureIdForValidation = currentActiveVenture?.idea_id === id ? currentActiveVenture?.id : null;
  const { confidenceShift, lastValidatedAt, dimensionEvidenceCounts } = useValidationDisplayProps(ventureIdForValidation);

  // Trigger FVS paywall when score finishes calculating for free users
  useEffect(() => {
    if (fvsCalculating) {
      fvsWasCalculating.current = true;
    }
    if (fvsWasCalculating.current && !fvsCalculating && hasFVS && !hasPro) {
      fvsWasCalculating.current = false;
      setShowFVSPaywall(true);
    }
  }, [fvsCalculating, hasFVS, hasPro]);

  // Helpers for null-safe score rendering
  const scoreValue = (v: number | null | undefined) => (typeof v === "number" ? v : 0);
  const scoreLabel = (v: number | null | undefined) => (typeof v === "number" ? `${v}%` : "—");
  const hasScores = (ideaObj: any) => typeof ideaObj?.overall_fit_score === "number";

  // Re-score handler with toast feedback
  const handleReScore = async () => {
    const result = await reScore();
    
    if (result.cooldownMessage) {
      toast({
        title: "Please wait",
        description: result.cooldownMessage,
        variant: "default",
      });
      return;
    }
    
    if (result.success) {
      toast({
        title: "Fit scores updated",
        description: "Scores have been recalculated based on your profile.",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to re-score idea. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVetIdea = async () => {
    try {
      await analyzeIdea.mutateAsync();
      toast({
        title: "Analysis Complete!",
        description: "Your idea has been vetted with market research and viability scoring.",
      });
    } catch (error: any) {
      const errorMessage = error.message?.includes("Rate limit")
        ? "Too many requests. Please wait a moment and try again."
        : error.message?.includes("Payment required")
          ? "AI service requires payment. Please contact support."
          : "Failed to analyze idea. Please try again.";

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMakeMainIdea = async () => {
    try {
      await updateIdeaStatus.mutateAsync("chosen");
      toast({
        title: "Success!",
        description: "This is now your main idea. Redirecting to Blueprint...",
      });
      setTimeout(() => navigate("/blueprint"), 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update idea status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetNorthStar = async () => {
    if (!user || !id) return;
    
    setSettingNorthStar(true);
    try {
      const { data, error } = await invokeAuthedFunction("set-north-star-idea", {
        body: { idea_id: id },
      });

      if (error) throw error;

      toast({
        title: "North Star set",
        description: "Now commit to your venture to start executing.",
      });

      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
      queryClient.invalidateQueries({ queryKey: ["north-star-venture"] });
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
      queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
      refetch();

      // Route to Commit page for Idea Lab flow
      navigate(`/commit/${id}`);

    } catch (error: any) {
      console.error("Error setting North Star:", error);
      const message = error instanceof AuthSessionMissingError 
        ? "Session expired. Please sign in again."
        : error.message || "Failed to set North Star. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSettingNorthStar(false);
    }
  };

  const handleUnsetNorthStar = async () => {
    if (!user || !id) return;
    
    setUnsettingNorthStar(true);
    try {
      const { data, error } = await invokeAuthedFunction("unset-north-star-idea", {
        body: { idea_id: id },
      });

      if (error) throw error;

      toast({
        title: "North Star removed",
        description: "You can choose a new North Star anytime.",
      });

      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
      queryClient.invalidateQueries({ queryKey: ["north-star-venture"] });
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
      queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
      refetch();

    } catch (error: any) {
      console.error("Error unsetting North Star:", error);
      const message = error instanceof AuthSessionMissingError 
        ? "Session expired. Please sign in again."
        : error.message || "Failed to remove North Star. Please try again.";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUnsettingNorthStar(false);
    }
  };

  // Fetch existing opportunity score and founder profile on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !id) return;

      setLoadingScore(true);
      try {
        const [scoreRes, profileRes] = await Promise.all([
          supabase
            .from("opportunity_scores")
            .select("*")
            .eq("user_id", user.id)
            .eq("idea_id", id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("founder_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (scoreRes.error) {
          console.error("Error fetching opportunity score:", scoreRes.error);
        } else {
          setOpportunityScore(scoreRes.data);
        }

        if (profileRes.data) {
          setFounderProfile(profileRes.data);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingScore(false);
      }
    };

    fetchData();
  }, [user, id]);

  const handleGenerateScore = async () => {
    if (!user || !id) return;

    // Check feature access
    if (!gate("opportunity_score")) {
      setShowPaywall(true);
      return;
    }

    setGeneratingScore(true);
    try {
      const { data, error } = await invokeAuthedFunction("generate-opportunity-score", {
        body: { ideaId: id },
      });

      if (error) throw error;

      setOpportunityScore(data);
      
      // Award XP for generating opportunity score
      await recordXpEvent(user.id, "opportunity_scored", 25, { ideaId: id });
      
      toast({
        title: "Score Generated!",
        description: "Opportunity score has been calculated successfully. +25 XP earned!",
      });
    } catch (error: any) {
      let errorMessage = "Failed to generate score. Please try again.";
      
      if (error instanceof AuthSessionMissingError || error?.code === "AUTH_SESSION_MISSING") {
        errorMessage = "Session expired. Please sign in again.";
      } else if (error.message?.includes("Rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("Payment required")) {
        errorMessage = "AI service requires payment. Please contact support.";
      } else if (error.message?.includes("not found")) {
        errorMessage = "Please analyze the idea first before calculating opportunity score.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGeneratingScore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading idea details...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Idea Not Found</h2>
        <p className="text-muted-foreground mb-6">This idea doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate("/ideas")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={() => navigate("/ideas")} className="-ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>

        <div className="flex gap-2 flex-wrap">
           {/* Commit to This — primary CTA when no active venture */}
           {!currentActiveVenture ? (
              <Button
                onClick={() => navigate(`/commit/${id}`)}
                className="gap-2"
                variant="default"
              >
                <Rocket className="w-4 h-4" />
                Commit to This
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSavedToLibrary(true);
                  toast({
                    title: "Saved ✓",
                    description: "This idea is in your library for later.",
                  });
                }}
                className="gap-2"
                variant={savedToLibrary ? "secondary" : "default"}
                disabled={savedToLibrary}
              >
                <Heart className="w-4 h-4" />
                {savedToLibrary ? "Saved ✓" : "Save for Later"}
              </Button>
            )}

          {!analysis && (
            <Button onClick={handleVetIdea} disabled={analyzeIdea.isPending} variant={currentActiveVenture ? "default" : "outline"} className="gap-2">
              {analyzeIdea.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Vet This Idea
                </>
              )}
            </Button>
          )}

          {/* North Star Buttons */}
          {idea.status !== "north_star" ? (
            <Button
              onClick={handleSetNorthStar}
              disabled={settingNorthStar}
              variant="outline"
              className="gap-2"
            >
              {settingNorthStar ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Setting...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Choose as North Star
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUnsetNorthStar}
              disabled={unsettingNorthStar}
              variant="outline"
              className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {unsettingNorthStar ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                  Removing...
                </>
              ) : (
                <>
                  <StarOff className="w-4 h-4" />
                  Unset North Star
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Idea Optimizer Bar */}
      <IdeaOptimizerBar
        ideaId={id!}
        hasAnalysis={!!analysis}
        onRefreshScore={handleGenerateScore}
        isRefreshingScore={generatingScore}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{idea.title}</CardTitle>
                {idea.status === "north_star" && (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 px-2.5 py-1">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    North Star
                  </Badge>
                )}
              </div>
              {idea.business_model_type && (
                <CardDescription className="text-lg font-medium">{idea.business_model_type}</CardDescription>
              )}
            </div>
            {idea.complexity && (
              <Badge variant={getComplexityVariant(idea.complexity)} className="text-sm">
                {idea.complexity} Complexity
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {idea.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{idea.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            {idea.target_customer && (
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Target Customer</h4>
                  <p className="text-sm text-muted-foreground">{idea.target_customer}</p>
                </div>
              </div>
            )}

            {idea.time_to_first_dollar && (
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Time to First Dollar</h4>
                  <p className="text-sm text-muted-foreground">{idea.time_to_first_dollar}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Fit Scores
                {isScoring && (
                  <span className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                    Scoring...
                  </span>
                )}
              </h3>
              
              {/* Kebab menu for re-scoring */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isScoring}>
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Score options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleReScore} disabled={isScoring}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-score fit
                  </DropdownMenuItem>
                  {scoringError && (
                    <DropdownMenuItem onClick={handleReScore} disabled={isScoring}>
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Retry scoring
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Re-scoring is rate-limited.
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isScoring ? (
              <div className="space-y-4 animate-pulse">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Fit</span>
                    <div className="h-4 w-8 bg-muted rounded" />
                  </div>
                  <div className="h-2 bg-muted rounded" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-3 w-6 bg-muted rounded" />
                      </div>
                      <div className="h-1.5 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ) : hasScores(idea) ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Fit</span>
                    <span className="text-sm font-bold">{scoreLabel(idea.overall_fit_score)}</span>
                  </div>
                  <Progress value={scoreValue(idea.overall_fit_score)} className="h-2" />
                </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Passion Fit</span>
                        <span className="text-xs font-semibold">{scoreLabel(idea.passion_fit_score)}</span>
                      </div>
                      <Progress value={scoreValue(idea.passion_fit_score)} className="h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Skill Fit</span>
                        <span className="text-xs font-semibold">{scoreLabel(idea.skill_fit_score)}</span>
                      </div>
                      <Progress value={scoreValue(idea.skill_fit_score)} className="h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Constraint Fit</span>
                        <span className="text-xs font-semibold">{scoreLabel(idea.constraint_fit_score)}</span>
                      </div>
                      <Progress value={scoreValue(idea.constraint_fit_score)} className="h-1.5" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Lifestyle Fit</span>
                        <span className="text-xs font-semibold">{scoreLabel(idea.lifestyle_fit_score)}</span>
                      </div>
                      <Progress value={scoreValue(idea.lifestyle_fit_score)} className="h-1.5" />
                    </div>
                  </div>
              </div>
            ) : (
              <div className="py-4">
                <p className="text-sm text-muted-foreground text-center">
                  This idea hasn't been scored yet. It will score automatically when opened.
                </p>
              </div>
            )}

            {scoringError && (
              <p className="text-xs text-destructive mt-2">
                Couldn't score this idea — try refreshing the page.
              </p>
            )}
          </div>

          {/* Financial Viability Score */}
          <Separator />
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Financial Viability
              {fvsCalculating && (
                <span className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  Calculating...
                </span>
              )}
            </h3>
            
            {fvsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : hasFVS && fvsScore ? (
              <>
                <FinancialViabilityScore
                  score={fvsScore.compositeScore}
                  breakdown={fvsScore.dimensions ? {
                    marketSize: fvsScore.dimensions.marketSize.score,
                    unitEconomics: fvsScore.dimensions.unitEconomics.score,
                    timeToRevenue: fvsScore.dimensions.timeToRevenue.score,
                    competition: fvsScore.dimensions.competitiveDensity.score,
                    capitalRequirements: fvsScore.dimensions.capitalRequirements.score,
                    founderMarketFit: fvsScore.dimensions.founderMarketFit.score,
                  } : undefined}
                  showBreakdown={!!fvsScore.dimensions}
                  size="lg"
                  onUpgradeClick={() => setShowPaywall(true)}
                  confidenceShift={confidenceShift}
                  lastValidatedAt={lastValidatedAt}
                  dimensionEvidenceCounts={dimensionEvidenceCounts}
                />

                {/* Score evaluation confidence chip */}
                {fvsScore.scoreEvaluation && (
                  <div className="flex justify-center mt-2">
                    {fvsScore.scoreEvaluation.consistent && fvsScore.scoreEvaluation.confidence === 'high' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600 border border-green-500/30">
                        Score Verified ✓
                      </span>
                    ) : (fvsScore.scoreEvaluation.consistent === false || (fvsScore.scoreEvaluation.contradictions && fvsScore.scoreEvaluation.contradictions.length > 0)) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30 cursor-help">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Review Score
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
                            {fvsScore.scoreEvaluation.contradictions.map((c, i) => (
                              <p key={i}>• {c.issue}</p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>
                )}
                
                {hasPro ? (
                  <>
                    {fvsScore.summary && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
                        <p className="text-sm text-muted-foreground">{fvsScore.summary}</p>
                        {fvsScore.topRisk && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-destructive">Top Risk: </span>
                              <span className="text-xs text-muted-foreground">{fvsScore.topRisk}</span>
                            </div>
                          </div>
                        )}
                        {fvsScore.topOpportunity && (
                          <div className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-xs font-medium text-green-600">Top Opportunity: </span>
                              <span className="text-xs text-muted-foreground">{fvsScore.topOpportunity}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-4 relative">
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3 blur-sm select-none pointer-events-none" aria-hidden="true">
                      <p className="text-sm text-muted-foreground">This idea scores well on unit economics and time-to-revenue but faces moderate competitive density in its target market...</p>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-destructive">Top Risk: </span>
                          <span className="text-xs text-muted-foreground">Market saturation in adjacent categories could limit growth ceiling...</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-xs font-medium text-green-600">Top Opportunity: </span>
                          <span className="text-xs text-muted-foreground">Strong founder-market fit creates a defensible wedge into an underserved niche...</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-lg">
                      <Lock className="w-5 h-5 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium mb-3">Unlock the full analysis</p>
                      <Button size="sm" onClick={() => setShowFVSPaywall(true)}>
                        Upgrade to Pro — $29/month
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Recalculate button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3 text-xs"
                  onClick={() => calculateFVS({
                    title: idea.title,
                    description: idea.description || undefined,
                    targetCustomer: idea.target_customer || undefined,
                    category: idea.category || undefined,
                    platform: idea.platform || undefined,
                  })}
                  disabled={fvsCalculating}
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${fvsCalculating ? 'animate-spin' : ''}`} />
                  Recalculate
                </Button>
              </>
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-lg border border-dashed">
                <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Get a CFA-grade financial viability analysis for this idea
                </p>
                <Button
                  onClick={() => calculateFVS({
                    title: idea.title,
                    description: idea.description || undefined,
                    targetCustomer: idea.target_customer || undefined,
                    category: idea.category || undefined,
                    platform: idea.platform || undefined,
                  })}
                  disabled={fvsCalculating}
                  size="sm"
                >
                  {fvsCalculating ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Calculate Viability Score
                    </>
                  )}
                </Button>
                {fvsError && (
                  <p className="text-xs text-destructive mt-2">{fvsError}</p>
                )}
              </div>
            )}
          </div>
          {(idea.virality_potential || idea.leverage_score || idea.automation_density || 
            idea.autonomy_level || idea.culture_tailwind || idea.chaos_factor) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  v6 Engine Metrics
                </h3>
                <V6MetricsGrid
                  virality={idea.virality_potential}
                  leverage={idea.leverage_score}
                  automation={idea.automation_density}
                  autonomy={idea.autonomy_level}
                  culture={idea.culture_tailwind}
                  chaos={idea.chaos_factor}
                  shock={idea.shock_factor}
                  size="md"
                />
                {(idea.platform || idea.category || idea.mode) && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <CategoryBadge type="platform" value={idea.platform} size="md" />
                    <CategoryBadge type="category" value={idea.category} size="md" />
                    <ModeBadge mode={idea.mode} size="md" />
                  </div>
                )}
              </div>
            </>
          )}

      {/* Fusion Lineage */}
      {(idea as any).fusion_metadata && ((idea as any).fusion_metadata as any)?.source_titles?.length > 0 && (
        <>
          <Separator />
          <div className="p-4 bg-muted/30 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
              <GitMerge className="w-4 h-4 text-primary" />
              Fusion Lineage
            </h4>
            <p className="text-sm text-muted-foreground">
              {(((idea as any).fusion_metadata as any)?.source_titles || []).join(" + ")} → <span className="text-foreground font-medium">{idea.title}</span>
            </p>
          </div>
        </>
      )}

      {/* Market Signal Details */}
      {(() => {
        const sourceMeta = (idea as any).source_meta as { 
          idea_payload?: { 
            summary?: string; 
            problem?: string; 
            why_it_fits?: string; 
            first_steps?: string[] 
          };
          inferred_pain_themes?: string[];
          domains?: string[];
        } | null;
        const ideaPayload = sourceMeta?.idea_payload;
        const painThemes = sourceMeta?.inferred_pain_themes;
        const domains = sourceMeta?.domains;
        
        if ((idea as any).source_type !== 'market_signal' || !ideaPayload) return null;
        
        return (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary" />
                Market Signal Insights
                {domains && domains.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    from {domains.join(", ")}
                  </span>
                )}
              </h3>

              {/* Problem */}
              {ideaPayload.problem && (
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Problem</h4>
                    <p className="text-sm text-muted-foreground">{ideaPayload.problem}</p>
                  </div>
                </div>
              )}

              {/* Why It Fits */}
              {ideaPayload.why_it_fits && (
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold mb-1">Why This Fits You</h4>
                    <p className="text-sm text-muted-foreground">{ideaPayload.why_it_fits}</p>
                  </div>
                </div>
              )}

              {/* First Steps */}
              {ideaPayload.first_steps && ideaPayload.first_steps.length > 0 && (
                <div className="flex gap-3">
                  <ListChecks className="w-5 h-5 text-accent-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2">First Steps</h4>
                    <ol className="space-y-2">
                      {ideaPayload.first_steps.map((step, idx) => (
                        <li key={idx} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{idx + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Why These Ideas - Pain Themes Panel */}
              {painThemes && painThemes.length > 0 && (
                <PainThemesPanel themes={painThemes} defaultExpanded={true} />
              )}
            </div>
          </>
        );
      })()}

      {/* Imported Idea - Normalization Details */}
      {(idea as any).source_type === 'imported' && (idea as any).normalized && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Imported Idea Analysis</h3>
              {(idea as any).source_meta?.variant_label && (
                <Badge variant="outline" className="text-xs">
                  Variant {(idea as any).source_meta.variant_label}
                </Badge>
              )}
            </div>
            <NormalizationDetailsPanel normalized={(idea as any).normalized} />
          </div>
        </>
      )}
    </CardContent>
      </Card>

      {analysis ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Market Analysis</h2>
            <Button variant="outline" onClick={handleVetIdea} disabled={analyzeIdea.isPending} className="gap-2">
              {analyzeIdea.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Re-analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Re-analyze
                </>
              )}
            </Button>
          </div>
          <IdeaVettingCard analysis={analysis} />
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get AI-powered market research, competition analysis, and viability scoring for this idea.
            </p>
            <Button onClick={handleVetIdea} disabled={analyzeIdea.isPending} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Vet This Idea
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Opportunity Score Section */}
      {loadingScore ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading opportunity score...</p>
            </div>
          </CardContent>
        </Card>
      ) : opportunityScore ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Opportunity Score
            </h2>
            <Button 
              variant="outline" 
              onClick={handleGenerateScore} 
              disabled={generatingScore}
              className="gap-2"
            >
              {generatingScore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
          <OpportunityScoreCard score={opportunityScore} ideaId={id!} />
        </>
      ) : analysis ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Calculate Opportunity Score</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get a comprehensive evaluation of this opportunity based on founder fit, market size, competition, and more.
            </p>
            <Button onClick={handleGenerateScore} disabled={generatingScore} className="gap-2">
              {generatingScore ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Generate Opportunity Score
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Variant Generator Section */}
      {user && founderProfile && (
        <IdeaVariantGenerator
          idea={idea}
          userId={user.id}
          founderProfile={founderProfile}
          onVariantsGenerated={(variants) => setGeneratedVariants((prev) => [...prev, ...variants])}
        />
      )}

      <ProUpgradeModal 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)}
        reasonCode="OPPORTUNITY_SCORE_REQUIRES_PRO"
      />

      {showFVSPaywall && (
        <PaywallModal
          open={showFVSPaywall}
          onClose={() => setShowFVSPaywall(false)}
          trigger="fvs_reveal"
          ideaTitle={idea?.title}
        />
      )}
      <PageHelp
        title="Idea Detail"
        bullets={[
          "Use 'Vet This Idea' to get an AI-powered market analysis with risks, competition, and viability scoring.",
          "Opportunity Score evaluates market size, timing, and founder fit — generate it after vetting.",
          "Financial Viability Score breaks down revenue potential across six dimensions.",
          "Set an idea as your North Star to commit and start building — this creates a venture and Blueprint.",
          "Generate idea variants to explore twists on the same concept with different angles or business models.",
        ]}
      />
    </div>
  );
};

export default IdeaDetail;
