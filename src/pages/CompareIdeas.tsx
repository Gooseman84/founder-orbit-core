import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScoreGauge } from "@/components/opportunity/ScoreGauge";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useIdeas } from "@/hooks/useIdeas";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Trophy, ArrowRight, Lock, Lightbulb, ArrowLeft, Users, Clock, 
  Briefcase, ListChecks, AlertCircle, Rocket, CheckCircle 
} from "lucide-react";
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

interface VariantIdea {
  id: string;
  title: string;
  description: string | null;
  target_customer: string | null;
  business_model_type: string | null;
  time_to_first_dollar: string | null;
  complexity: string | null;
  source_meta: {
    variant_label?: string;
    idea_payload?: {
      problem?: string;
      why_it_fits?: string;
      first_steps?: string[];
    };
  } | null;
}

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

// Helper to build winner explanation
function buildWinnerExplanation(params: {
  winner: "A" | "B";
  ideaAId: string;
  ideaBId: string;
  combinedScoreA: number | null;
  combinedScoreB: number | null;
  scoreA: any | null;
  scoreB: any | null;
  fitScoreA: IdeaScoreBreakdown | null;
  fitScoreB: IdeaScoreBreakdown | null;
  opportunityWeight: number;
  fitWeight: number;
  getIdeaTitle: (id: string) => string;
}) {
  const {
    winner,
    ideaAId,
    ideaBId,
    combinedScoreA,
    combinedScoreB,
    scoreA,
    scoreB,
    fitScoreA,
    fitScoreB,
    opportunityWeight,
    fitWeight,
    getIdeaTitle,
  } = params;

  const winnerId = winner === "A" ? ideaAId : ideaBId;
  const loserId = winner === "A" ? ideaBId : ideaAId;

  const winnerTitle = getIdeaTitle(winnerId);
  const loserTitle = getIdeaTitle(loserId);

  const winnerCombined = winner === "A" ? combinedScoreA : combinedScoreB;
  const loserCombined = winner === "A" ? combinedScoreB : combinedScoreA;

  const winnerOpp = winner === "A" ? scoreA?.total_score ?? 0 : scoreB?.total_score ?? 0;
  const loserOpp = winner === "A" ? scoreB?.total_score ?? 0 : scoreA?.total_score ?? 0;

  const winnerFit = winner === "A" ? fitScoreA : fitScoreB;
  const loserFit = winner === "A" ? fitScoreB : fitScoreA;

  const winnerFitOverall = winnerFit?.overall ?? 0;
  const loserFitOverall = loserFit?.overall ?? 0;

  const diffCombined =
    winnerCombined != null && loserCombined != null
      ? Math.round(winnerCombined - loserCombined)
      : null;

  const oppDiff = Math.round(winnerOpp - loserOpp);
  const fitDiff = Math.round(winnerFitOverall - loserFitOverall);

  const oppWeightPct = Math.round(opportunityWeight * 100);
  const fitWeightPct = Math.round(fitWeight * 100);

  const headline = `Why "${winnerTitle}" wins right now`;

  const summaryLines: string[] = [];

  if (diffCombined != null) {
    if (diffCombined >= 5) {
      summaryLines.push(
        `"${winnerTitle}" has a higher overall Decision Score (${Math.round(
          winnerCombined!
        )} vs ${Math.round(loserCombined!)}), given your current weighting of ${oppWeightPct}% opportunity and ${fitWeightPct}% founder fit.`
      );
    } else if (diffCombined > 0) {
      summaryLines.push(
        `"${winnerTitle}" slightly edges out "${loserTitle}" in overall Decision Score (${Math.round(
          winnerCombined!
        )} vs ${Math.round(
          loserCombined!
        )}), based on your mix of opportunity and founder fit.`
      );
    } else {
      summaryLines.push(
        `Both ideas are very close in overall Decision Score. "${winnerTitle}" is currently ahead by a very small margin.`
      );
    }
  }

  const bullets: string[] = [];

  // Opportunity comparison
  if (Math.abs(oppDiff) >= 5) {
    if (oppDiff > 0) {
      bullets.push(
        `"${winnerTitle}" has stronger market opportunity (${Math.round(
          winnerOpp
        )} vs ${Math.round(
          loserOpp
        )}) — bigger or clearer upside if executed well.`
      );
    } else {
      bullets.push(
        `"${loserTitle}" actually has a slightly stronger opportunity score, but your overall weighting and fit tilt the decision toward "${winnerTitle}".`
      );
    }
  }

  // Fit overall comparison
  if (Math.abs(fitDiff) >= 5) {
    if (fitDiff > 0) {
      bullets.push(
        `"${winnerTitle}" is more aligned with your founder profile (${Math.round(
          winnerFitOverall
        )}% vs ${Math.round(
          loserFitOverall
        )}%) — it fits your passions, skills, and constraints better.`
      );
    } else {
      bullets.push(
        `"${loserTitle}" has a slightly better fit score, but the market opportunity advantage of "${winnerTitle}" is currently winning.`
      );
    }
  }

  // Sub-score comparisons
  if (winnerFit && loserFit) {
    const founderDiff = Math.round(winnerFit.founderFit - loserFit.founderFit);
    const constraintsDiff = Math.round(
      winnerFit.constraintsFit - loserFit.constraintsFit
    );
    const marketFitDiff = Math.round(
      winnerFit.marketFit - loserFit.marketFit
    );
    const economicsDiff = Math.round(
      winnerFit.economics - loserFit.economics
    );

    if (Math.abs(founderDiff) >= 7 && founderDiff > 0) {
      bullets.push(
        `"${winnerTitle}" better matches what energizes you (Founder fit is higher), meaning you're more likely to enjoy the day-to-day work.`
      );
    }

    if (Math.abs(constraintsDiff) >= 7 && constraintsDiff > 0) {
      bullets.push(
        `"${winnerTitle}" fits your time, capital, and risk constraints better, making it more realistic to execute with your current situation.`
      );
    }

    if (Math.abs(marketFitDiff) >= 7 && marketFitDiff > 0) {
      bullets.push(
        `"${winnerTitle}" aligns more with markets you already understand or have network in (higher Market fit).`
      );
    }

    if (Math.abs(economicsDiff) >= 7 && economicsDiff > 0) {
      bullets.push(
        `"${winnerTitle}" has more favorable economics for you (capital required vs time to meaningful revenue).`
      );
    }
  }

  // Fallback bullet
  if (bullets.length === 0) {
    bullets.push(
      `"${winnerTitle}" is currently the better overall balance of market upside and personal fit based on your inputs.`
    );
  }

  const closing =
    "Remember: the scores are a decision aid, not a guarantee. Use this as a lens, then check in with your intuition and energy before you commit.";

  return {
    headline,
    summaryLines,
    bullets,
    closing,
  };
}

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

const CompareIdeas = () => {
  const [searchParams] = useSearchParams();
  const { ideas } = useIdeas();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { gate } = useFeatureAccess();

  // Variant comparison mode (when ?ids= is present)
  const idsParam = searchParams.get("ids");
  const variantIds = idsParam?.split(",").filter(Boolean) || [];
  const isVariantMode = variantIds.length > 0;

  const [variants, setVariants] = useState<VariantIdea[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const [ideaA, setIdeaA] = useState<string>("");
  const [ideaB, setIdeaB] = useState<string>("");
  const [scoreA, setScoreA] = useState<OpportunityScore | null>(null);
  const [scoreB, setScoreB] = useState<OpportunityScore | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [pickingWinner, setPickingWinner] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

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

  // Fetch variants when in variant mode
  useEffect(() => {
    const fetchVariants = async () => {
      if (!user || !isVariantMode || variantIds.length === 0) {
        setVariantsLoading(false);
        return;
      }

      setVariantsLoading(true);
      try {
        const { data, error } = await supabase
          .from("ideas")
          .select("id, title, description, target_customer, business_model_type, time_to_first_dollar, complexity, source_meta")
          .in("id", variantIds)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Sort by variant label (A, B, C)
        const sorted = (data || []).sort((a, b) => {
          const labelA = (a.source_meta as any)?.variant_label || "Z";
          const labelB = (b.source_meta as any)?.variant_label || "Z";
          return labelA.localeCompare(labelB);
        });
        
        setVariants(sorted as VariantIdea[]);
      } catch (error) {
        console.error("Error fetching variants:", error);
        toast({
          title: "Error",
          description: "Failed to load variants",
          variant: "destructive",
        });
      } finally {
        setVariantsLoading(false);
      }
    };

    fetchVariants();
  }, [user, isVariantMode, variantIds.join(",")]);

  // Handle promoting a variant to workspace
  const handlePromoteVariant = async (variant: VariantIdea) => {
    if (!user) return;
    
    setPromotingId(variant.id);
    try {
      const ideaPayload = variant.source_meta?.idea_payload;
      
      const ideaForPromotion = {
        id: variant.id,
        title: variant.title,
        oneLiner: variant.description || "",
        description: variant.description || "",
        problemStatement: ideaPayload?.problem || "",
        targetCustomer: variant.target_customer || "",
        revenueModel: variant.business_model_type || "",
        mvpApproach: "",
        goToMarket: "",
        competitiveAdvantage: "",
        financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
        requiredToolsSkills: "",
        risksMitigation: "",
        whyItFitsFounder: ideaPayload?.why_it_fits || "",
        primaryPassionDomains: [],
        primarySkillNeeds: [],
        markets: [],
        businessArchetype: variant.business_model_type || "unspecified",
        hoursPerWeekMin: 5,
        hoursPerWeekMax: 20,
        capitalRequired: 0,
        riskLevel: "medium" as const,
        timeToFirstRevenueMonths: 1,
        requiresPublicPersonalBrand: false,
        requiresTeamSoon: false,
        requiresCoding: false,
        salesIntensity: 3 as const,
        asyncDepthWork: 3 as const,
        firstSteps: ideaPayload?.first_steps || [],
      };

      const { data, error } = await supabase.functions.invoke(
        "promote-idea-to-workspace",
        {
          body: { idea: ideaForPromotion, createTasks: true, userId: user.id },
        }
      );

      if (error) throw error;

      toast({
        title: "Promoted to Workspace!",
        description: `"${variant.title}" is now in your workspace with starter tasks.`,
      });

      if (data?.documentId) {
        navigate(`/workspace/${data.documentId}`);
      } else {
        navigate("/workspace");
      }
    } catch (error) {
      console.error("Promote error:", error);
      toast({
        title: "Error",
        description: "Failed to promote to workspace",
        variant: "destructive",
      });
    } finally {
      setPromotingId(null);
    }
  };

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

  // Check if v6 scores are present
  const hasV6Scores = useMemo(() => {
    if (!scoreA?.sub_scores && !scoreB?.sub_scores) return false;
    const subsA = scoreA?.sub_scores as any;
    const subsB = scoreB?.sub_scores as any;
    return (subsA?.virality !== undefined) || (subsB?.virality !== undefined);
  }, [scoreA, scoreB]);

  // Comparison chart data
  const comparisonChartData = useMemo(() => {
    if (!scoreA || !scoreB || !fitScoreA || !fitScoreB) return [];

    const coreData = [
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

    return coreData;
  }, [scoreA, scoreB, fitScoreA, fitScoreB]);

  // V6 comparison chart data (leverage & virality)
  const v6ComparisonChartData = useMemo(() => {
    if (!scoreA || !scoreB || !hasV6Scores) return [];

    const subsA = scoreA.sub_scores as any;
    const subsB = scoreB.sub_scores as any;

    return [
      {
        metric: "Virality",
        ideaA: subsA?.virality ?? 0,
        ideaB: subsB?.virality ?? 0,
      },
      {
        metric: "Leverage",
        ideaA: subsA?.leverage ?? 0,
        ideaB: subsB?.leverage ?? 0,
      },
      {
        metric: "Automation",
        ideaA: subsA?.automation_density ?? 0,
        ideaB: subsB?.automation_density ?? 0,
      },
      {
        metric: "Autonomy",
        ideaA: subsA?.autonomy_level ?? 0,
        ideaB: subsB?.autonomy_level ?? 0,
      },
      {
        metric: "Culture",
        ideaA: subsA?.culture_tailwinds ?? 0,
        ideaB: subsB?.culture_tailwinds ?? 0,
      },
    ];
  }, [scoreA, scoreB, hasV6Scores]);

  // Winner explanation memo
  const winnerExplanation = useMemo(() => {
    if (!winner || !ideaA || !ideaB) return null;

    return buildWinnerExplanation({
      winner,
      ideaAId: ideaA,
      ideaBId: ideaB,
      combinedScoreA,
      combinedScoreB,
      scoreA,
      scoreB,
      fitScoreA,
      fitScoreB,
      opportunityWeight,
      fitWeight,
      getIdeaTitle,
    });
  }, [
    winner,
    ideaA,
    ideaB,
    combinedScoreA,
    combinedScoreB,
    scoreA,
    scoreB,
    fitScoreA,
    fitScoreB,
    opportunityWeight,
    fitWeight,
    getIdeaTitle,
  ]);

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

  // VARIANT COMPARISON MODE - when ?ids= param is present
  if (isVariantMode) {
    if (variantsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading variants...</p>
          </div>
        </div>
      );
    }

    if (variants.length === 0) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">No Variants Found</h2>
          <p className="text-muted-foreground mb-6">The requested variants could not be found.</p>
          <Button onClick={() => navigate("/ideas")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ideas
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <Button variant="ghost" onClick={() => navigate("/ideas")} className="-ml-2 mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Ideas
            </Button>
            <h1 className="text-3xl font-bold">Compare Variants</h1>
            <p className="text-muted-foreground mt-1">
              Review your imported idea variants side-by-side and pick the best one to pursue.
            </p>
          </div>
        </div>

        <div className={`grid gap-6 ${variants.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {variants.map((variant) => {
            const ideaPayload = variant.source_meta?.idea_payload;
            const variantLabel = variant.source_meta?.variant_label;
            
            return (
              <Card key={variant.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {variantLabel && (
                        <Badge variant="outline" className="mb-2 text-xs font-semibold">
                          Variant {variantLabel}
                        </Badge>
                      )}
                      <CardTitle className="text-xl leading-tight">{variant.title}</CardTitle>
                    </div>
                    {variant.complexity && (
                      <Badge variant={getComplexityVariant(variant.complexity)} className="text-xs flex-shrink-0">
                        {variant.complexity}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col space-y-4">
                  {/* Problem */}
                  {ideaPayload?.problem && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        Problem
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{ideaPayload.problem}</p>
                    </div>
                  )}

                  {/* Target Customer */}
                  {variant.target_customer && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Users className="w-4 h-4 text-primary" />
                        Target Customer
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{variant.target_customer}</p>
                    </div>
                  )}

                  {/* Why It Fits */}
                  {ideaPayload?.why_it_fits && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Lightbulb className="w-4 h-4 text-accent-foreground" />
                        Why It Fits You
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ideaPayload.why_it_fits}</p>
                    </div>
                  )}

                  <Separator />

                  {/* Business Model + Time + Complexity */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {variant.business_model_type && (
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          Model
                        </div>
                        <p className="font-medium capitalize">{variant.business_model_type}</p>
                      </div>
                    )}
                    {variant.time_to_first_dollar && (
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          Time to $
                        </div>
                        <p className="font-medium">{variant.time_to_first_dollar}</p>
                      </div>
                    )}
                  </div>

                  {/* First Steps */}
                  {ideaPayload?.first_steps && ideaPayload.first_steps.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ListChecks className="w-4 h-4 text-primary" />
                        First Steps
                      </div>
                      <ol className="space-y-1.5">
                        {ideaPayload.first_steps.slice(0, 3).map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Spacer to push CTA to bottom */}
                  <div className="flex-1" />

                  {/* CTA */}
                  <Button 
                    onClick={() => handlePromoteVariant(variant)} 
                    disabled={promotingId === variant.id}
                    className="w-full mt-4 gap-2"
                  >
                    {promotingId === variant.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Promoting...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" />
                        Promote to Workspace
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

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

        {/* V6 Leverage & Virality Comparison Chart */}
        {v6ComparisonChartData.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-primary">⚡</span>
                V6 Leverage & Virality
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare automation, virality, and hands-off potential.
              </p>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={v6ComparisonChartData}
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

        {/* Why This Idea Wins Button + Dialog */}
        {winner && winnerExplanation && (
          <div className="mt-6 flex justify-center">
            <Dialog open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsExplanationOpen(true)}
              >
                <Lightbulb className="w-4 h-4" />
                Why this idea wins
              </Button>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>{winnerExplanation.headline}</DialogTitle>
                  <DialogDescription>
                    Based on your current weighting of opportunity vs founder fit.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  {winnerExplanation.summaryLines.map((line, idx) => (
                    <p key={idx} className="text-muted-foreground">
                      {line}
                    </p>
                  ))}

                  <div>
                    <h4 className="font-semibold mb-2 text-sm">
                      Key reasons this idea stands out:
                    </h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {winnerExplanation.bullets.map((b, idx) => (
                        <li key={idx}>{b}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {winnerExplanation.closing}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
