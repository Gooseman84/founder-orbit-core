import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScoreGauge } from "@/components/opportunity/ScoreGauge";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { useIdeas } from "@/hooks/useIdeas";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessIdea } from "@/types/businessIdea";
import type { FounderProfile } from "@/types/founderProfile";
import { scoreIdeaForFounder, type IdeaScoreBreakdown } from "@/lib/ideaScoring";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface OpportunityScore {
  id: string;
  idea_id: string;
  total_score: number;
  sub_scores: any;
  explanation: string;
  recommendations: any;
}

// Weight mode type for combined score calculation
type WeightMode = "balanced" | "opportunity_heavy" | "fit_heavy";

function computeCombinedScore(
  opportunityScore: number | null | undefined,
  fitScore: number | null | undefined,
  opportunityWeight: number,
  fitWeight: number
): number | null {
  if (opportunityScore == null && fitScore == null) return null;

  const opp = opportunityScore ?? 0;
  const fit = fitScore ?? 0;

  const totalWeight = opportunityWeight + fitWeight || 1;

  const combined = (opp * opportunityWeight + fit * fitWeight) / totalWeight;
  return combined;
}

// Adapter: convert saved idea to BusinessIdea shape for scoring
function adaptIdeaToBusinessIdea(raw: any): BusinessIdea | null {
  if (!raw) return null;

  return {
    id: raw.id,
    title: raw.title ?? "Untitled idea",
    oneLiner: raw.one_liner ?? raw.subtitle ?? raw.summary ?? "",
    description: raw.description ?? raw.full_description ?? "",
    problemStatement: raw.problem_statement ?? raw.problem ?? "",
    targetCustomer: raw.target_customer ?? raw.icp ?? "",
    revenueModel: raw.revenue_model ?? raw.monetization ?? "",
    mvpApproach: raw.mvp_approach ?? "",
    goToMarket: raw.go_to_market ?? "",
    competitiveAdvantage: raw.competitive_advantage ?? "",

    financialTrajectory: {
      month3: raw.financial_month3 ?? "",
      month6: raw.financial_month6 ?? "",
      month12: raw.financial_month12 ?? "",
      mrrCeiling: raw.mrr_ceiling ?? "",
    },

    requiredToolsSkills: raw.required_tools_skills ?? "",
    risksMitigation: raw.risks_mitigation ?? "",
    whyItFitsFounder: raw.why_it_fits_founder ?? raw.why_this_idea ?? "",

    primaryPassionDomains: raw.primary_passion_domains ?? [],
    primarySkillNeeds: raw.primary_skill_needs ?? [],
    markets: raw.markets ?? raw.tags ?? [],
    businessArchetype: raw.businessArchetype ?? raw.business_model_type ?? "unspecified",

    hoursPerWeekMin: raw.hours_per_week_min ?? 5,
    hoursPerWeekMax: raw.hours_per_week_max ?? 20,
    capitalRequired: raw.capital_required ?? 0,
    riskLevel: (raw.risk_level as any) ?? "medium",
    timeToFirstRevenueMonths: raw.time_to_first_revenue_months ?? 3,

    requiresPublicPersonalBrand: raw.requires_public_personal_brand ?? false,
    requiresTeamSoon: raw.requires_team_soon ?? false,
    requiresCoding: raw.requires_coding ?? false,
    salesIntensity: (raw.sales_intensity as any) ?? 3,
    asyncDepthWork: (raw.async_depth_work as any) ?? 3,

    firstSteps: raw.first_steps ?? [],
  };
}

const CompareIdeas = () => {
  const { ideas } = useIdeas();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { gate } = useFeatureAccess();

  const [ideaA, setIdeaA] = useState<string>("");
  const [ideaB, setIdeaB] = useState<string>("");
  const [scoreA, setScoreA] = useState<OpportunityScore | null>(null);
  const [scoreB, setScoreB] = useState<OpportunityScore | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [pickingWinner, setPickingWinner] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Founder profile state
  const [founderProfile, setFounderProfile] = useState<FounderProfile | null>(null);
  const [founderProfileLoading, setFounderProfileLoading] = useState(false);
  const [founderProfileError, setFounderProfileError] = useState<Error | null>(null);

  // Fit score state
  const [fitScoreA, setFitScoreA] = useState<IdeaScoreBreakdown | null>(null);
  const [fitScoreB, setFitScoreB] = useState<IdeaScoreBreakdown | null>(null);
  const [fitLoadingA, setFitLoadingA] = useState(false);

  // Weight mode state for combined score
  const [weightMode, setWeightMode] = useState<WeightMode>("balanced");

  // Derive numeric weights from weight mode
  const { opportunityWeight, fitWeight } = useMemo(() => {
    switch (weightMode) {
      case "opportunity_heavy":
        return { opportunityWeight: 0.7, fitWeight: 0.3 };
      case "fit_heavy":
        return { opportunityWeight: 0.3, fitWeight: 0.7 };
      case "balanced":
      default:
        return { opportunityWeight: 0.5, fitWeight: 0.5 };
    }
  }, [weightMode]);
  const [fitLoadingB, setFitLoadingB] = useState(false);

  // Load founder profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      setFounderProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("founder_profiles")
          .select("profile")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setFounderProfile(data?.profile as unknown as FounderProfile);
      } catch (e: any) {
        console.error("Error loading founder profile for compare", e);
        setFounderProfileError(e instanceof Error ? e : new Error("Failed to load founder profile"));
      } finally {
        setFounderProfileLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  // Fetch opportunity score for idea A
  useEffect(() => {
    if (!ideaA || !user?.id) return;

    const fetchScoreA = async () => {
      setLoadingA(true);
      try {
        const { data, error } = await supabase
          .from("opportunity_scores")
          .select("*")
          .eq("idea_id", ideaA)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setScoreA(data);
      } catch (error) {
        console.error("Error fetching score A:", error);
        setScoreA(null);
      } finally {
        setLoadingA(false);
      }
    };

    fetchScoreA();
  }, [ideaA, user?.id]);

  // Fetch opportunity score for idea B
  useEffect(() => {
    if (!ideaB || !user?.id) return;

    const fetchScoreB = async () => {
      setLoadingB(true);
      try {
        const { data, error } = await supabase
          .from("opportunity_scores")
          .select("*")
          .eq("idea_id", ideaB)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setScoreB(data);
      } catch (error) {
        console.error("Error fetching score B:", error);
        setScoreB(null);
      } finally {
        setLoadingB(false);
      }
    };

    fetchScoreB();
  }, [ideaB, user?.id]);

  // Compute Fit Score for idea A
  useEffect(() => {
    if (!ideaA || !founderProfile || ideas.length === 0) {
      setFitScoreA(null);
      return;
    }

    const rawIdea = ideas.find((i) => i.id === ideaA);
    const adapted = adaptIdeaToBusinessIdea(rawIdea);
    if (!adapted) {
      setFitScoreA(null);
      return;
    }

    setFitLoadingA(true);
    try {
      const scores = scoreIdeaForFounder(adapted, founderProfile);
      setFitScoreA(scores);
    } catch (e) {
      console.error("Error scoring idea A for founder fit", e);
      setFitScoreA(null);
    } finally {
      setFitLoadingA(false);
    }
  }, [ideaA, founderProfile, ideas]);

  // Compute Fit Score for idea B
  useEffect(() => {
    if (!ideaB || !founderProfile || ideas.length === 0) {
      setFitScoreB(null);
      return;
    }

    const rawIdea = ideas.find((i) => i.id === ideaB);
    const adapted = adaptIdeaToBusinessIdea(rawIdea);
    if (!adapted) {
      setFitScoreB(null);
      return;
    }

    setFitLoadingB(true);
    try {
      const scores = scoreIdeaForFounder(adapted, founderProfile);
      setFitScoreB(scores);
    } catch (e) {
      console.error("Error scoring idea B for founder fit", e);
      setFitScoreB(null);
    } finally {
      setFitLoadingB(false);
    }
  }, [ideaB, founderProfile, ideas]);

  const handlePickWinner = async (winnerId: string) => {
    if (!user?.id) return;

    setPickingWinner(true);
    try {
      // Set all other ideas to 'candidate'
      const { error: resetError } = await supabase
        .from("ideas")
        .update({ status: "candidate" })
        .eq("user_id", user.id)
        .neq("id", winnerId);

      if (resetError) throw resetError;

      // Set winner to 'chosen'
      const { error: updateError } = await supabase
        .from("ideas")
        .update({ status: "chosen" })
        .eq("id", winnerId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Winner Selected!",
        description: "Your chosen idea has been updated. Redirecting to North Star...",
      });

      setTimeout(() => navigate("/north-star"), 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update chosen idea.",
        variant: "destructive",
      });
    } finally {
      setPickingWinner(false);
    }
  };

  const getIdeaTitle = (ideaId: string) => {
    return ideas.find((i) => i.id === ideaId)?.title || "Unknown Idea";
  };

  // Compute combined scores for A and B
  const combinedScoreA = useMemo(
    () =>
      computeCombinedScore(
        scoreA?.total_score ?? null,
        fitScoreA?.overall ?? null,
        opportunityWeight,
        fitWeight
      ),
    [scoreA?.total_score, fitScoreA?.overall, opportunityWeight, fitWeight]
  );

  const combinedScoreB = useMemo(
    () =>
      computeCombinedScore(
        scoreB?.total_score ?? null,
        fitScoreB?.overall ?? null,
        opportunityWeight,
        fitWeight
      ),
    [scoreB?.total_score, fitScoreB?.overall, opportunityWeight, fitWeight]
  );

  // Winner based on combined score (falls back to opportunity score)
  const winner =
    combinedScoreA != null && combinedScoreB != null
      ? combinedScoreA > combinedScoreB
        ? "A"
        : combinedScoreB > combinedScoreA
          ? "B"
          : null
      : scoreA && scoreB
        ? scoreA.total_score > scoreB.total_score
          ? "A"
          : scoreB.total_score > scoreA.total_score
            ? "B"
            : null
        : null;

  // Comparison chart data
  const comparisonChartData = useMemo(() => {
    if (!scoreA || !scoreB || !fitScoreA || !fitScoreB) return [];

    return [
      {
        metric: "Opportunity",
        ideaA: scoreA.total_score ?? 0,
        ideaB: scoreB.total_score ?? 0,
      },
      {
        metric: "Fit (Overall)",
        ideaA: fitScoreA.overall ?? 0,
        ideaB: fitScoreB.overall ?? 0,
      },
      {
        metric: "Founder fit",
        ideaA: fitScoreA.founderFit ?? 0,
        ideaB: fitScoreB.founderFit ?? 0,
      },
      {
        metric: "Constraints",
        ideaA: fitScoreA.constraintsFit ?? 0,
        ideaB: fitScoreB.constraintsFit ?? 0,
      },
      {
        metric: "Market fit",
        ideaA: fitScoreA.marketFit ?? 0,
        ideaB: fitScoreB.marketFit ?? 0,
      },
      {
        metric: "Economics",
        ideaA: fitScoreA.economics ?? 0,
        ideaB: fitScoreB.economics ?? 0,
      },
    ];
  }, [scoreA, scoreB, fitScoreA, fitScoreB]);

  // Fit Score breakdown component
  const FitScoreSection = ({ 
    fitScore, 
    fitLoading, 
    showProfilePrompt 
  }: { 
    fitScore: IdeaScoreBreakdown | null; 
    fitLoading: boolean;
    showProfilePrompt: boolean;
  }) => (
    <div className="space-y-3 pt-4 border-t border-border">
      <h4 className="font-semibold text-sm flex items-center justify-between">
        <span>Founder Fit Score</span>
        {fitLoading && <span className="text-xs text-muted-foreground">Calculating...</span>}
      </h4>

      {fitScore ? (
        <>
          <div className="flex justify-center">
            <ScoreGauge value={fitScore.overall} size={140} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
            <div>
              <div className="flex justify-between mb-1">
                <span>Founder fit</span>
                <span className="font-medium">{Math.round(fitScore.founderFit)}%</span>
              </div>
              <Progress value={fitScore.founderFit} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Constraints</span>
                <span className="font-medium">{Math.round(fitScore.constraintsFit)}%</span>
              </div>
              <Progress value={fitScore.constraintsFit} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Market fit</span>
                <span className="font-medium">{Math.round(fitScore.marketFit)}%</span>
              </div>
              <Progress value={fitScore.marketFit} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Economics</span>
                <span className="font-medium">{Math.round(fitScore.economics)}%</span>
              </div>
              <Progress value={fitScore.economics} className="h-1.5" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Fit Score is based on your passions & skills, time and capital constraints, markets you know,
            and how quickly this idea can realistically make money for you.
          </p>
        </>
      ) : showProfilePrompt ? (
        <p className="text-xs text-muted-foreground">
          Complete your founder profile to see a personalized Fit Score for this idea.
        </p>
      ) : null}
    </div>
  );

  // Feature gating - show promotional view if user doesn't have access
  if (!gate("compare_engine")) {
    return (
      <div className="space-y-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Lock className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Compare Ideas is a Pro Feature</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Unlock side-by-side opportunity score comparisons to make data-driven decisions about which idea to pursue.
          </p>
          
          <div className="space-y-4 mb-8">
            <Card className="text-left">
              <CardContent className="pt-6">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>Compare opportunity scores side-by-side</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>See detailed sub-score breakdowns</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>Get AI-powered recommendations for each idea</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Trophy className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>Make confident decisions with data</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" onClick={() => setShowPaywall(true)} className="gap-2">
            <Lock className="w-4 h-4" />
            Upgrade to Pro
          </Button>
        </div>

        <PaywallModal 
          featureName="compare_engine" 
          open={showPaywall} 
          onClose={() => setShowPaywall(false)} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Compare Ideas</h1>
        <p className="text-muted-foreground">Select two ideas to compare their opportunity and founder fit scores side-by-side.</p>
        
        {/* Weight Mode Control */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Tune how much weight to give market opportunity vs your personal fit.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Decision weight:</span>
            <Select
              value={weightMode}
              onValueChange={(v) => setWeightMode(v as WeightMode)}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">
                  Balanced (50% opp / 50% fit)
                </SelectItem>
                <SelectItem value="opportunity_heavy">
                  Opportunity-heavy (70% / 30%)
                </SelectItem>
                <SelectItem value="fit_heavy">
                  Fit-heavy (30% / 70%)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Idea A</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={ideaA} onValueChange={setIdeaA}>
              <SelectTrigger>
                <SelectValue placeholder="Select first idea" />
              </SelectTrigger>
              <SelectContent>
                {ideas
                  .filter((idea) => idea.id !== ideaB)
                  .map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Idea B</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={ideaB} onValueChange={setIdeaB}>
              <SelectTrigger>
                <SelectValue placeholder="Select second idea" />
              </SelectTrigger>
              <SelectContent>
                {ideas
                  .filter((idea) => idea.id !== ideaA)
                  .map((idea) => (
                    <SelectItem key={idea.id} value={idea.id}>
                      {idea.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Display */}
      {ideaA && ideaB && (
        <>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Idea A Score */}
          <Card className={cn("relative", winner === "A" && "ring-2 ring-primary shadow-lg")}>
            {winner === "A" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Winner
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{getIdeaTitle(ideaA)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingA ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : scoreA ? (
                <>
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Opportunity Score</h4>
                    <div className="flex justify-center">
                      <ScoreGauge value={scoreA.total_score} size={180} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Sub-Scores</h4>
                    {scoreA.sub_scores && typeof scoreA.sub_scores === 'object' && Object.entries(scoreA.sub_scores as Record<string, number>).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <Progress value={Number(value)} className="h-2" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Top Recommendations</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {Array.isArray(scoreA.recommendations) && scoreA.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                        <li key={idx}>• {String(rec)}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Founder Fit Score Section */}
                  <FitScoreSection 
                    fitScore={fitScoreA} 
                    fitLoading={fitLoadingA}
                    showProfilePrompt={!founderProfile && !founderProfileLoading}
                  />

                  {/* Combined Decision Score */}
                  {combinedScoreA != null && (
                    <div className="mt-4 space-y-1 text-sm pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Combined Decision Score</span>
                        <span className="font-bold text-lg">
                          {Math.round(combinedScoreA)} / 100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This blends the market opportunity score and your personal founder fit score 
                        ({Math.round(opportunityWeight * 100)}% opportunity, {Math.round(fitWeight * 100)}% fit).
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => handlePickWinner(ideaA)}
                    disabled={pickingWinner}
                    className="w-full"
                    variant={winner === "A" ? "default" : "outline"}
                  >
                    {pickingWinner ? "Selecting..." : "Pick This Idea"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No opportunity score found for this idea.</p>
                  <p className="text-sm mt-2">Generate a score from the idea detail page first.</p>
                  
                  {/* Still show Fit Score even without Opportunity Score */}
                  <FitScoreSection 
                    fitScore={fitScoreA} 
                    fitLoading={fitLoadingA}
                    showProfilePrompt={!founderProfile && !founderProfileLoading}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Idea B Score */}
          <Card className={cn("relative", winner === "B" && "ring-2 ring-primary shadow-lg")}>
            {winner === "B" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                Winner
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{getIdeaTitle(ideaB)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingB ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : scoreB ? (
                <>
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Opportunity Score</h4>
                    <div className="flex justify-center">
                      <ScoreGauge value={scoreB.total_score} size={180} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Sub-Scores</h4>
                    {scoreB.sub_scores && typeof scoreB.sub_scores === 'object' && Object.entries(scoreB.sub_scores as Record<string, number>).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key.replace(/_/g, " ")}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                        <Progress value={Number(value)} className="h-2" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Top Recommendations</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      {Array.isArray(scoreB.recommendations) && scoreB.recommendations.slice(0, 3).map((rec: any, idx: number) => (
                        <li key={idx}>• {String(rec)}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Founder Fit Score Section */}
                  <FitScoreSection 
                    fitScore={fitScoreB} 
                    fitLoading={fitLoadingB}
                    showProfilePrompt={!founderProfile && !founderProfileLoading}
                  />

                  {/* Combined Decision Score */}
                  {combinedScoreB != null && (
                    <div className="mt-4 space-y-1 text-sm pt-4 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Combined Decision Score</span>
                        <span className="font-bold text-lg">
                          {Math.round(combinedScoreB)} / 100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This blends the market opportunity score and your personal founder fit score 
                        ({Math.round(opportunityWeight * 100)}% opportunity, {Math.round(fitWeight * 100)}% fit).
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => handlePickWinner(ideaB)}
                    disabled={pickingWinner}
                    className="w-full"
                    variant={winner === "B" ? "default" : "outline"}
                  >
                    {pickingWinner ? "Selecting..." : "Pick This Idea"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No opportunity score found for this idea.</p>
                  <p className="text-sm mt-2">Generate a score from the idea detail page first.</p>
                  
                  {/* Still show Fit Score even without Opportunity Score */}
                  <FitScoreSection 
                    fitScore={fitScoreB} 
                    fitLoading={fitLoadingB}
                    showProfilePrompt={!founderProfile && !founderProfileLoading}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Visual Comparison Chart */}
        {comparisonChartData.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Visual Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare overall opportunity and founder fit across both ideas.
              </p>
            </CardHeader>
            <CardContent>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonChartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="metric" 
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="ideaA" 
                      name={getIdeaTitle(ideaA)} 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="ideaB" 
                      name={getIdeaTitle(ideaB)} 
                      fill="hsl(var(--muted-foreground))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        </>
      )}

      {(!ideaA || !ideaB) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select two ideas above to compare their opportunity scores
          </CardContent>
        </Card>
      )}

      <PaywallModal 
        featureName="compare_engine" 
        open={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </div>
  );
};

export default CompareIdeas;
