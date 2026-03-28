// src/pages/DiscoverSummary.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Lightbulb, Users, Clock, Target, Shield, Check, Award, Zap, GitBranch } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { normalizeInterviewInsights, NormalizedInterviewData, AuthorityAssessment } from "@/lib/normalizeInterviewInsights";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FunnelStepper } from "@/components/shared/FunnelStepper";
import { FounderPortrait } from "@/components/discover/FounderPortrait";
import { InsightCard, InsightPills } from "@/components/discover/InsightCard";
import type { CorrectionFields, CorrectionsPayload } from "@/types/corrections";

function AuthorityTierBadge({ tier, tierLabel }: { tier: 1 | 2 | 3; tierLabel: string }) {
  const config = {
    1: { label: "TIER 1 — Borrowed Authority", className: "bg-orange-100 text-orange-700 border-orange-200" },
    2: { label: "TIER 2 — Operational Authority", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    3: { label: "TIER 3 — Earned Authority", className: "bg-green-100 text-green-700 border-green-200" },
  }[tier];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
      <Award className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function AuthorityCard({
  auth,
  isEditMode,
  challengeValue,
  onChallengeChange,
}: {
  auth: AuthorityAssessment;
  isEditMode: boolean;
  challengeValue: string;
  onChallengeChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mavrik's Assessment</p>
          <AuthorityTierBadge tier={auth.tier} tierLabel={auth.tierLabel} />
        </div>
        <Award className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-1" />
      </div>

      <p className="text-sm text-foreground/85 leading-relaxed">{auth.defensibilitySummary}</p>

      {auth.earnedAuthorityEvidence.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Evidence of earned authority</p>
          <div className="flex flex-wrap gap-1.5">
            {auth.earnedAuthorityEvidence.map((e, i) => (
              <span key={i} className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {auth.consensusDeviation && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">What you know that consensus misses</p>
          <p className="text-sm text-foreground/85 italic">"{auth.consensusDeviation}"</p>
        </div>
      )}

      {auth.tier === 1 && auth.borrowedAuthorityFlags.length > 0 && (
        <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Areas to strengthen</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {auth.borrowedAuthorityFlags.map((f, i) => (
              <span key={i} className="inline-block px-2.5 py-1 bg-white text-orange-700 text-xs rounded-full border border-orange-200">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {isEditMode && (
        <div className="space-y-2 pt-2 border-t">
          <label className="text-xs font-medium text-muted-foreground">Challenge this assessment</label>
          <Textarea
            value={challengeValue}
            onChange={(e) => onChallengeChange(e.target.value)}
            placeholder="Disagree with Mavrik's tier? Tell me what I missed about your real-world experience..."
            className="min-h-[80px] resize-none text-sm"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}

function DomainCard({ insights }: { insights: NormalizedInterviewData }) {
  const { extractedInsights } = insights;
  const depthLabel: Record<string, string> = {
    native: "Native — Deep insider knowledge",
    informed: "Informed — Solid operational exposure",
    tourist: "Tourist — Observational understanding",
  };
  const depth = extractedInsights.ventureIntelligence.workflowDepthLevel;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Domain</p>
        <Zap className="h-4 w-4 text-muted-foreground/50" />
      </div>
      {depth && depth !== "tourist" && (
        <Badge variant="secondary" className="text-xs">{depthLabel[depth] || depth}</Badge>
      )}
      {depth === "tourist" && (
        <Badge variant="outline" className="text-xs text-muted-foreground">{depthLabel[depth]}</Badge>
      )}
      <InsightPills items={extractedInsights.domainExpertise} />
      {extractedInsights.insiderKnowledge.length > 0 && (
        <div className="pt-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">Insider knowledge signals</p>
          <InsightPills items={extractedInsights.insiderKnowledge.slice(0, 4)} />
        </div>
      )}
    </div>
  );
}

function CustomerCard({ insights }: { insights: NormalizedInterviewData }) {
  const { extractedInsights } = insights;
  const { customerPain } = extractedInsights;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Customer</p>
        <Users className="h-4 w-4 text-muted-foreground/50" />
      </div>
      {customerPain.targetRole && (
        <p className="text-sm font-medium text-foreground">{customerPain.targetRole}</p>
      )}
      {customerPain.specificProblem && (
        <p className="text-sm text-foreground/75 leading-relaxed">{customerPain.specificProblem}</p>
      )}
      {customerPain.painPoints.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Pain points</p>
          <InsightPills items={customerPain.painPoints.slice(0, 3)} />
        </div>
      )}
    </div>
  );
}

function TransferablePatternsCard({ patterns }: { patterns: NormalizedInterviewData["extractedInsights"]["transferablePatterns"] }) {
  if (!patterns || patterns.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transferable Patterns</p>
          <p className="text-xs text-muted-foreground mt-0.5">Adjacent opportunities Mavrik identified</p>
        </div>
        <GitBranch className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <div className="space-y-3">
        {patterns.map((p, i) => {
          const skill = p.coreSkill || p.abstractSkill || "";
          const source = p.sourceIndustry || p.sourceContext || "";
          const targets = p.targetIndustries || p.adjacentIndustries || [];
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-primary mt-0.5">→</span>
              <span className="text-foreground/80">
                <span className="font-medium">{skill}</span>
                {source && <span className="text-muted-foreground"> from {source}</span>}
                {targets.length > 0 && (
                  <span className="text-muted-foreground"> → applicable in {targets.join(", ")}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DiscoverSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [insights, setInsights] = useState<NormalizedInterviewData | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionFields>({
    insiderKnowledge: null,
    customerIntimacy: null,
    constraints: null,
    financialTarget: null,
    hardNoFilters: null,
  });
  const [authorityChallenge, setAuthorityChallenge] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUpdatedAnimation, setShowUpdatedAnimation] = useState(false);

  useEffect(() => {
    document.title = "Your Founder Profile | TrueBlazer";
  }, []);

  // Try to get insights from navigation state first, then fetch from DB
  useEffect(() => {
    if (!user) return;

    const loadInsights = async () => {
      // Check if insights were passed via navigation state
      const stateInsights = location.state?.insights as any | undefined;
      const stateInterviewId = location.state?.interviewId as string | undefined;

      if (stateInsights) {
        setInsights(normalizeInterviewInsights(stateInsights));

        if (stateInterviewId) {
          setInterviewId(stateInterviewId);
        } else {
          const { data } = await supabase
            .from("founder_interviews")
            .select("id")
            .eq("user_id", user.id)
            .eq("status", "completed")
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setInterviewId(data?.id || null);
        }
        setIsLoading(false);
        return;
      }

      // Fetch from database
      try {
        const { data, error } = await supabase
          .from("founder_interviews")
          .select("id, context_summary")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data?.context_summary) {
          setInsights(normalizeInterviewInsights(data.context_summary));
          setInterviewId(data.id);
        } else {
          toast({
            title: "No interview found",
            description: "Please complete the Mavrik interview first.",
            variant: "destructive",
          });
          navigate("/discover");
        }
      } catch (e: any) {
        console.error("DiscoverSummary: failed to load insights", e);
        toast({
          title: "Failed to load profile",
          description: e?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInsights();
  }, [user?.id, location.state, navigate, toast]);

  const handleConfirm = () => {
    navigate("/discover/results", { state: { insights, interviewId } });
  };

  const handleClarify = () => {
    setIsEditMode(true);
  };

  const handleCancelCorrections = () => {
    setIsEditMode(false);
    setCorrections({
      insiderKnowledge: null,
      customerIntimacy: null,
      constraints: null,
      financialTarget: null,
      hardNoFilters: null,
    });
    setAuthorityChallenge("");
    setAdditionalContext("");
  };

  const handleCorrectionChange = (key: string, value: string | null) => {
    setCorrections(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmitCorrections = async () => {
    if (!interviewId) {
      toast({
        title: "Error",
        description: "Interview ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const hasCorrections = Object.values(corrections).some(v => v !== null)
      || additionalContext.trim()
      || authorityChallenge.trim();

    if (!hasCorrections) {
      handleConfirm();
      return;
    }

    setIsSubmitting(true);

    try {
      // Merge authority challenge into additionalContext for mavrik-apply-corrections
      const fullAdditionalContext = [
        authorityChallenge.trim() ? `Authority challenge: ${authorityChallenge.trim()}` : "",
        additionalContext.trim(),
      ].filter(Boolean).join("\n\n") || null;

      const payload: CorrectionsPayload = {
        corrections,
        additionalContext: fullAdditionalContext,
      };

      const { data, error } = await invokeAuthedFunction("mavrik-apply-corrections", {
        body: {
          interviewId,
          corrections: payload,
        },
      });

      if (error) throw error;

      if (data?.insights) {
        setInsights(data.insights);

        setShowUpdatedAnimation(true);
        setTimeout(() => {
          setShowUpdatedAnimation(false);
          navigate("/discover/results", {
            state: { insights: data.insights, interviewId, forceRegenerate: true }
          });
        }, 1500);
      } else {
        throw new Error("No updated insights returned");
      }
    } catch (e: any) {
      console.error("Failed to apply corrections:", e);
      toast({
        title: "Failed to apply corrections",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              to="/discover"
              className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Compass className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold text-lg">TrueBlazer</span>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return null;
  }

  const { extractedInsights, founderSummary, confidenceLevel, authorityAssessment } = insights;

  if (!extractedInsights || !confidenceLevel) {
    navigate("/discover");
    return null;
  }

  const useNewLayout = authorityAssessment !== null;

  // Map "none" to undefined for InsightCard compatibility (legacy layout only)
  const conf = (level: string | undefined): "high" | "medium" | "low" | undefined =>
    level === "none" ? undefined : (level as "high" | "medium" | "low" | undefined);

  const formatConstraints = () => {
    const parts: string[] = [];
    const c = extractedInsights.constraints;

    if (c.hoursPerWeek !== "unclear") {
      parts.push(`${c.hoursPerWeek} hours/week available`);
    }
    if (c.availableCapital) {
      parts.push(`${c.availableCapital} capital available`);
    }
    if (c.timeline) {
      parts.push(`Timeline: ${c.timeline}`);
    }

    return parts.length > 0 ? parts.join(" • ") : "No constraints specified";
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <FunnelStepper currentStep="summary" />

      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          to="/discover"
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to discover"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <span className="font-semibold text-lg">TrueBlazer</span>
        <div className="w-8" />
      </header>

      {showUpdatedAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3 animate-scale-in">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium">Updated!</p>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Compass className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">
                {isEditMode ? "Make Your Corrections" : "Here's What I Learned About You"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditMode ? "Edit any card or add context below" : "Based on our conversation"}
              </p>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <FounderPortrait summary={founderSummary} className="mb-8" />
          </div>

          {useNewLayout ? (
            /* ── NEW SCHEMA LAYOUT ─────────────────────────────────── */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              {/* Zone 1: Authority Tier (full width) */}
              <AuthorityCard
                auth={authorityAssessment!}
                isEditMode={isEditMode}
                challengeValue={authorityChallenge}
                onChallengeChange={setAuthorityChallenge}
              />

              {/* Zone 2: Domain + Customer (2 columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DomainCard insights={insights} />
                <CustomerCard insights={insights} />
              </div>

              {/* Zone 3: Transferable Patterns (conditional) */}
              <TransferablePatternsCard patterns={extractedInsights.transferablePatterns} />
            </div>
          ) : (
            /* ── LEGACY SCHEMA LAYOUT ──────────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <InsightCard
                title="Your Edge"
                icon={Lightbulb}
                confidence={conf(confidenceLevel.insiderKnowledge)}
                isEditMode={isEditMode}
                cardKey="insiderKnowledge"
                correctionValue={corrections.insiderKnowledge || ""}
                onCorrectionChange={handleCorrectionChange}
              >
                <InsightPills items={extractedInsights.insiderKnowledge} />
              </InsightCard>

              <InsightCard
                title="Your People"
                icon={Users}
                confidence={conf(confidenceLevel.customerIntimacy)}
                isEditMode={isEditMode}
                cardKey="customerIntimacy"
                correctionValue={corrections.customerIntimacy || ""}
                onCorrectionChange={handleCorrectionChange}
              >
                <InsightPills items={extractedInsights.customerIntimacy} />
              </InsightCard>

              <InsightCard
                title="Your Reality"
                icon={Clock}
                confidence={conf(confidenceLevel.constraints)}
                isEditMode={isEditMode}
                cardKey="constraints"
                correctionValue={corrections.constraints || ""}
                onCorrectionChange={handleCorrectionChange}
              >
                <p className="text-sm text-foreground/80">{formatConstraints()}</p>
                {extractedInsights.constraints.otherConstraints &&
                 extractedInsights.constraints.otherConstraints.length > 0 && (
                  <div className="mt-2">
                    <InsightPills items={extractedInsights.constraints.otherConstraints} />
                  </div>
                )}
              </InsightCard>

              <InsightCard
                title="Your Target"
                icon={Target}
                confidence={conf(confidenceLevel.financialTarget)}
                isEditMode={isEditMode}
                cardKey="financialTarget"
                correctionValue={corrections.financialTarget || ""}
                onCorrectionChange={handleCorrectionChange}
              >
                <p className="text-sm text-foreground/80">
                  {extractedInsights.financialTarget.description || "No target specified"}
                </p>
              </InsightCard>

              {(extractedInsights.hardNoFilters &&
               extractedInsights.hardNoFilters.length > 0) || isEditMode ? (
                <InsightCard
                  title="Your Boundaries"
                  icon={Shield}
                  className="sm:col-span-2"
                  isEditMode={isEditMode}
                  cardKey="hardNoFilters"
                  correctionValue={corrections.hardNoFilters || ""}
                  onCorrectionChange={handleCorrectionChange}
                >
                  {extractedInsights.hardNoFilters && extractedInsights.hardNoFilters.length > 0 ? (
                    <InsightPills items={extractedInsights.hardNoFilters} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No boundaries specified</p>
                  )}
                </InsightCard>
              ) : null}
            </div>
          )}

          {/* General correction area - only in edit mode */}
          {isEditMode && (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <label className="block text-sm font-medium mb-2">
                Anything else I should know?
              </label>
              <Textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="Add context, correct assumptions, or tell me what I missed..."
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>
          )}
        </div>
      </main>

      {/* CTA Section - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-4 pb-safe">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {isEditMode ? (
            <>
              <Button
                onClick={handleSubmitCorrections}
                size="lg"
                variant="gradient"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update & show me ideas"
                )}
              </Button>
              <button
                onClick={handleCancelCorrections}
                disabled={isSubmitting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
              >
                Cancel corrections
              </button>
            </>
          ) : (
            <>
              <Button
                onClick={handleConfirm}
                size="lg"
                variant="gradient"
                className="w-full"
              >
                That's me — show me ideas
              </Button>
              <button
                onClick={handleClarify}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Not quite — let me clarify
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
