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
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
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
import { ArrowLeft, Sparkles, Star, StarOff, Clock, Users, BarChart3, Target, TrendingUp, GitMerge, AlertCircle, Lightbulb, ListChecks, Radio, Upload } from "lucide-react";

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
  const { gate } = useFeatureAccess();
  const queryClient = useQueryClient();
  const { idea, analysis, isLoading, analyzeIdea, updateIdeaStatus, refetch } = useIdeaDetail(id);
  
  const [opportunityScore, setOpportunityScore] = useState<any>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [generatingScore, setGeneratingScore] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [founderProfile, setFounderProfile] = useState<any>(null);
  const [generatedVariants, setGeneratedVariants] = useState<any[]>([]);
  const [settingNorthStar, setSettingNorthStar] = useState(false);
  const [unsettingNorthStar, setUnsettingNorthStar] = useState(false);

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
        description: "This is now your main idea. Redirecting to North Star...",
      });
      setTimeout(() => navigate("/north-star"), 1500);
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
        description: "This idea is now your primary focus.",
      });

      // Invalidate all related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
      queryClient.invalidateQueries({ queryKey: ["north-star-venture"] });
      queryClient.invalidateQueries({ queryKey: ["ventures"] });
      queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
      refetch();

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
          {!analysis && (
            <Button onClick={handleVetIdea} disabled={analyzeIdea.isPending} className="gap-2">
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
              variant="default"
              className="gap-2"
            >
              {settingNorthStar ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Fit Scores
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Fit</span>
                  <span className="text-sm font-bold">{idea.overall_fit_score || 0}%</span>
                </div>
                <Progress value={idea.overall_fit_score || 0} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Passion Fit</span>
                    <span className="text-xs font-semibold">{idea.passion_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.passion_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Skill Fit</span>
                    <span className="text-xs font-semibold">{idea.skill_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.skill_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Constraint Fit</span>
                    <span className="text-xs font-semibold">{idea.constraint_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.constraint_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Lifestyle Fit</span>
                    <span className="text-xs font-semibold">{idea.lifestyle_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.lifestyle_fit_score || 0} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>

          {/* V6 Metrics Section */}
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
        reasonCode="IDEA_DETAIL_PRO"
      />
    </div>
  );
};

export default IdeaDetail;
