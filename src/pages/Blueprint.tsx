import { useState, useEffect, useCallback, useRef } from "react";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useVentureBlueprint } from "@/hooks/useVentureBlueprint";
import { useVenturePlans } from "@/hooks/useVenturePlans";
import { useVentureTasks } from "@/hooks/useVentureTasks";

import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useVentureState } from "@/hooks/useVentureState";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlueprintSkeleton } from "@/components/shared/SkeletonLoaders";
import { FunnelStepper } from "@/components/shared/FunnelStepper";
import { FinancialViabilityScore } from "@/components/opportunity/FinancialViabilityScore";
import { BusinessBlueprint } from "@/components/blueprint/BusinessBlueprint";
import { NetworkAdvantageCard } from "@/components/blueprint/NetworkAdvantageCard";
import { BlueprintGenerationAnimation } from "@/components/blueprint/BlueprintGenerationAnimation";

import { GenerateKitButton, TechStackDialog } from "@/components/implementationKit";
import { useImplementationKitByBlueprint, useCreateImplementationKit } from "@/hooks/useImplementationKit";
import { MainLayout } from "@/components/layout/MainLayout";
import { ValidationSection } from "@/components/validation/ValidationSection";
import { EditBlueprintDrawer } from "@/components/blueprint/EditBlueprintDrawer";
import { VentureDNASection } from "@/components/blueprint/VentureDNASection";
import { MavrikAssessmentCard } from "@/components/blueprint/MavrikAssessmentCard";
import { useValidationDisplayProps } from "@/hooks/useValidationDisplayProps";
import { useFinancialViabilityScore } from "@/hooks/useFinancialViabilityScore";
import {
  Target,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  ClipboardList,
  BarChart3,
  Check,
  Calendar,
  FileDown,
  Lock,
  ChevronRight,
} from "lucide-react";
import { exportBlueprintToPdf } from "@/lib/blueprintPdfExport";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RevenueStackBriefCard } from "@/components/implementationKit/RevenueStackBriefCard";

import { cn } from "@/lib/utils";
import type { CommitmentWindowDays, Venture, VentureState } from "@/types/venture";
import type { TechStack } from "@/types/implementationKit";
import type { FounderBlueprint } from "@/types/blueprint";
import { PageHelp } from "@/components/shared/PageHelp";

const Blueprint = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ventureIdParam = searchParams.get("ventureId");
  const isFreshVisit = searchParams.get("fresh") === "1";

  const { user } = useAuth();
  const { hasPro } = useFeatureAccess();
  const { transitionTo } = useVentureState();
  const { toast } = useToast();

  // Venture state
  const [venture, setVenture] = useState<Venture | null>(null);
  const [ventureLoading, setVentureLoading] = useState(true);
  const [ventureError, setVentureError] = useState<string | null>(null);

  // Blueprint scoped to venture's idea
  const { blueprint, loading: blueprintLoading, error: blueprintError } = useVentureBlueprint(venture?.idea_id);

  // Auto-generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<FounderBlueprint | null>(null);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // The blueprint to display (generated or fetched)
  const displayBlueprint = generatedBlueprint || blueprint;

  // 30-Day Plan hooks (for summary card link)
  const { latestPlan } = useVenturePlans(venture?.id ?? null);
  const { tasksByWeek } = useVentureTasks(venture?.id ?? null);

  // Implementation Kit state
  const [showTechStackDialog, setShowTechStackDialog] = useState(false);
  const { data: existingKit, isLoading: kitLoading } = useImplementationKitByBlueprint(displayBlueprint?.id);
  const createKit = useCreateImplementationKit();

  // Edit drawer state
  const [editSection, setEditSection] = useState<string | null>(null);

  // Validation display props for FVS
  const { confidenceShift, lastValidatedAt, dimensionEvidenceCounts } = useValidationDisplayProps(venture?.id);

  // Real Financial Viability Score from DB
  const {
    score: fvsData,
    isLoading: fvsLoading,
    isCalculating: fvsCalculating,
    hasScore: hasFvsScore,
    calculateScore: calculateFvs,
    error: fvsError,
  } = useFinancialViabilityScore(venture?.idea_id ?? undefined);

  // PDF export state
  const [pdfExporting, setPdfExporting] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [showExportPaywall, setShowExportPaywall] = useState(false);

  // Handle tech stack submission
  const handleGenerateKit = (techStack: TechStack) => {
    if (!displayBlueprint?.id || !venture?.id) return;
    createKit.mutate(
      { blueprintId: displayBlueprint.id, ventureId: venture.id, techStack },
      { onSuccess: () => setShowTechStackDialog(false) }
    );
  };

  // Fetch venture by ID from URL param
  useEffect(() => {
    async function fetchVenture() {
      if (!user) {
        setVentureLoading(false);
        return;
      }
      if (!ventureIdParam) {
        // Auto-lookup most recent active venture
        const { data: activeV } = await supabase
          .from("ventures")
          .select("id")
          .eq("user_id", user.id)
          .eq("venture_state", "executing")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeV?.id) {
          navigate(`/blueprint?ventureId=${activeV.id}`, { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
        return;
      }
      try {
        setVentureLoading(true);
        setVentureError(null);
        const { data, error } = await supabase
          .from("ventures")
          .select("*")
          .eq("id", ventureIdParam)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          setVentureError("venture_not_found");
          return;
        }
        setVenture({
          ...data,
          venture_state: data.venture_state as VentureState,
          commitment_window_days: data.commitment_window_days as CommitmentWindowDays | null,
        } as Venture);
      } catch (err) {
        console.error("Failed to fetch venture:", err);
        setVentureError("fetch_error");
      } finally {
        setVentureLoading(false);
      }
    }
    fetchVenture();
  }, [user, ventureIdParam]);

  // Redirect killed ventures
  useEffect(() => {
    if (ventureLoading || !venture) return;
    if (venture.venture_state === "killed") {
      navigate("/ideas", { replace: true });
    }
  }, [venture, ventureLoading, navigate]);

  // Auto-generate blueprint when none exists
  useEffect(() => {
    if (ventureLoading || blueprintLoading) return;
    if (!venture || !user) return;
    if (blueprint || generatedBlueprint || isGenerating) return;
    if (generationFailed && retryCountRef.current >= MAX_RETRIES) return;

    // No blueprint exists — trigger generation
    setIsGenerating(true);
    retryCountRef.current += 1;

    (async () => {
      try {
        const { data, error } = await invokeAuthedFunction<any>(
          "generate-blueprint",
          { body: { ideaId: venture.idea_id } }
        );
        if (error) throw error;
        const blueprintResult: FounderBlueprint | null = data?.blueprint ?? data ?? null;
        if (blueprintResult) {
          setGeneratedBlueprint(blueprintResult);
          retryCountRef.current = 0;
          if (isFreshVisit) {
            setShowReveal(true);
            setTimeout(() => setShowReveal(false), 800);
          }
        }
      } catch (err) {
        console.error("Blueprint generation failed:", err);
        setGenerationFailed(true);
        toast({
          title: "Blueprint generation failed",
          description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [ventureLoading, blueprintLoading, venture, user, blueprint, generatedBlueprint, isGenerating, generationFailed, isFreshVisit, toast]);

  const isReadOnly = venture?.venture_state === "executing" || venture?.venture_state === "reviewed";

  // Auto-trigger FVS calculation when blueprint is ready but no score exists
  const fvsAutoTriggeredRef = useRef(false);
  useEffect(() => {
    if (fvsAutoTriggeredRef.current) return;
    if (fvsLoading || hasFvsScore || fvsCalculating) return;
    if (!displayBlueprint || !venture) return;

    fvsAutoTriggeredRef.current = true;
    calculateFvs({
      title: displayBlueprint.north_star_one_liner || venture.name,
      description: displayBlueprint.promise_statement || undefined,
      targetCustomer: displayBlueprint.target_audience || undefined,
      revenueModel: displayBlueprint.monetization_strategy || undefined,
      blueprintData: displayBlueprint as unknown as Record<string, unknown>,
    }).catch(() => {
      // Reset so the manual retry button in the FVS section works
      fvsAutoTriggeredRef.current = false;
    });
  }, [fvsLoading, hasFvsScore, fvsCalculating, displayBlueprint, venture, calculateFvs]);

  // Handle PDF download
  const handleDownloadPdf = async () => {
    if (!hasPro) {
      setShowExportPaywall(true);
      return;
    }
    if (!venture || !displayBlueprint) return;

    setPdfExporting(true);
    try {
      // Fetch strategy prompt
      let strategyPrompt: string | null = null;
      if (user) {
        const { data: promptData } = await supabase
          .from("master_prompts")
          .select("prompt_body")
          .eq("user_id", user.id)
          .eq("idea_id", venture.idea_id!)
          .eq("platform_mode", "strategy")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        strategyPrompt = promptData?.prompt_body ?? null;
      }

      // Use real FVS data from DB
      const fvsScore = fvsData?.compositeScore ?? 0;
      const dims = fvsData?.dimensions;
      const fvsBreakdown = dims ? {
        marketSize: dims.marketSize.score,
        unitEconomics: dims.unitEconomics.score,
        timeToRevenue: dims.timeToRevenue.score,
        competition: dims.competitiveDensity.score,
        capitalRequirements: dims.capitalRequirements.score,
        founderMarketFit: dims.founderMarketFit.score,
      } : undefined;

      // Map tasks
      const pdfTasks: Record<number, Array<{ title: string; status?: string }>> = {};
      if (tasksByWeek) {
        for (const [week, tasks] of Object.entries(tasksByWeek)) {
          pdfTasks[Number(week)] = (tasks as any[]).map((t: any) => ({
            title: t.title || t.name || "Untitled task",
            status: t.status,
          }));
        }
      }

      exportBlueprintToPdf({
        venture: {
          name: venture.name,
          success_metric: venture.success_metric,
          commitment_window_days: venture.commitment_window_days,
        },
        blueprint: displayBlueprint,
        founderName: user?.user_metadata?.full_name || user?.email?.split("@")[0],
        strategyPrompt,
        fvsScore,
        fvsBreakdown,
        tasksByWeek: Object.keys(pdfTasks).length > 0 ? pdfTasks : undefined,
        hasImplementationKit: !!existingKit,
      });

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 2000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast({
        title: "Failed to generate PDF",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setPdfExporting(false);
    }
  };

  // Loading state
  if (ventureLoading || blueprintLoading) {
    return renderWrapper(isFreshVisit, (
      <div className="container mx-auto py-8 px-4">
        <BlueprintSkeleton />
      </div>
    ));
  }

  // Generating state
  if (isGenerating) {
    return renderWrapper(true, (
      <div className="container mx-auto py-8 px-4">
        <BlueprintGenerationAnimation isGenerating />
      </div>
    ));
  }

  // Generation failed state
  if (generationFailed && !isGenerating && !displayBlueprint) {
    const maxRetriesReached = retryCountRef.current >= MAX_RETRIES;
    return renderWrapper(isFreshVisit, (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="h-10 w-10 text-destructive/70" />
        <p className="text-destructive text-lg font-semibold">Blueprint generation failed</p>
        <p className="text-muted-foreground text-sm text-center max-w-md">
          {maxRetriesReached
            ? "Multiple attempts failed. Check your connection or try refreshing the page."
            : "Something went wrong. Please try again."}
        </p>
        <Button
          onClick={() => {
            if (maxRetriesReached) {
              // Full reset for manual retry after max attempts
              retryCountRef.current = 0;
            }
            setGenerationFailed(false);
          }}
          variant="default"
        >
          Try Again
        </Button>
      </div>
    ));
  }

  // No venture
  if (ventureError || !venture) {
    return renderWrapper(false, (
      <div className="container mx-auto py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>No Venture Selected</CardTitle>
            <CardDescription>
              {ventureError === "no_venture_id"
                ? "Select an idea and create a venture to access the Blueprint."
                : ventureError === "venture_not_found"
                ? "This venture doesn't exist or you don't have access to it."
                : "Choose an idea and create a venture before accessing the Blueprint."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/ideas")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Ideas
            </Button>
          </CardContent>
        </Card>
      </div>
    ));
  }

  // Generate narrative helpers
  const narrativeSummary = generateNarrativeSummary(displayBlueprint, venture.name);
  const misalignmentCallouts = generateMisalignmentCallouts(displayBlueprint);

  const content = (
    <div className={cn(
      "container mx-auto py-8 px-4 max-w-3xl",
      showReveal && "animate-fade-in"
    )}>
      {/* Fresh visit FunnelStepper header */}
      {isFreshVisit && (
        <div className="mb-8">
          <FunnelStepper currentStep="blueprint" />
        </div>
      )}

      {/* Read-only Mode Banner */}
      {isReadOnly && (
        <div className="card-gold-left p-4 mb-6 flex items-center gap-3">
          <ClipboardList className="h-4 w-4 text-primary shrink-0" />
          <p className="text-[0.85rem] font-light text-muted-foreground">
            <span className="text-foreground font-medium">Execution Mode:</span> Your commitment is locked. Complete or end your current commitment to make changes.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-3">
          <div className="min-w-0">
            <div className="eyebrow mb-2">VENTURE BLUEPRINT</div>
            <h1 className="font-display text-xl sm:text-2xl md:text-[2.5rem] font-bold leading-tight break-words">
              <em className="text-primary" style={{ fontStyle: "italic" }}>{venture.name}</em>
            </h1>
            {displayBlueprint?.updated_at && (
              <p className="label-mono mt-2">
                LAST UPDATED {new Date(displayBlueprint.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
              </p>
            )}
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfExporting || !displayBlueprint}
            className="badge-gold flex items-center gap-1.5 px-3.5 py-1.5 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {pdfExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pdfSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <>
                {!hasPro && <Lock className="h-3 w-3" />}
                <FileDown className="h-3.5 w-3.5" />
              </>
            )}
            {pdfExporting ? "GENERATING…" : pdfSuccess ? "DOWNLOADED ✓" : "EXPORT PDF"}
          </button>
        </div>
      </div>

      {/* North Star Statement */}
      {displayBlueprint?.north_star_one_liner && (
        <div className="relative mb-8 border-l-4 border-primary pl-6 py-2">
          <span className="absolute -top-3 -left-2 font-display text-[3rem] text-primary/30 leading-none pointer-events-none select-none">"</span>
          <p className="font-display italic text-[1.3rem] text-foreground leading-[1.5]">
            {displayBlueprint.north_star_one_liner}
          </p>
        </div>
      )}

      {/* AI Narrative Summary */}
      <div className="border border-border bg-card mb-6">
        <div className="px-6 py-4 border-b border-border">
          <span className="label-mono-gold">VENTURE SUMMARY</span>
        </div>
        <div className="p-6">
          <p className="text-sm font-light text-muted-foreground leading-relaxed">{narrativeSummary}</p>
        </div>
      </div>

      {/* Business Blueprint sections */}
      {displayBlueprint && (
        <div className="mb-6">
          <BusinessBlueprint blueprint={displayBlueprint} onEditSection={setEditSection} />
        </div>
      )}

      {/* Network Advantage Card */}
      {displayBlueprint && (displayBlueprint as any).network_advantage && (
        <div className="mb-6">
          <NetworkAdvantageCard networkAdvantage={(displayBlueprint as any).network_advantage} />
        </div>
      )}

      {/* Financial Viability Score Card */}
      {displayBlueprint && (
        <div className="card-gold-accent mb-6">
          <div className="px-6 py-4 border-b border-border">
            <span className="label-mono-gold">FINANCIAL VIABILITY SCORE™</span>
          </div>
          <div className="p-6">
            {(fvsLoading || fvsCalculating) ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <span className="text-primary text-[1.5rem]">◆</span>
                <p className="label-mono">{fvsCalculating ? "ANALYZING FINANCIAL VIABILITY" : "LOADING SCORE"}</p>
              </div>
            ) : hasFvsScore && fvsData ? (
              <FinancialViabilityScore
                score={fvsData.compositeScore}
                breakdown={fvsData.dimensions ? {
                  marketSize: fvsData.dimensions.marketSize.score,
                  unitEconomics: fvsData.dimensions.unitEconomics.score,
                  timeToRevenue: fvsData.dimensions.timeToRevenue.score,
                  competition: fvsData.dimensions.competitiveDensity.score,
                  capitalRequirements: fvsData.dimensions.capitalRequirements.score,
                  founderMarketFit: fvsData.dimensions.founderMarketFit.score,
                } : undefined}
                showBreakdown
                size="md"
                confidenceShift={confidenceShift}
                lastValidatedAt={lastValidatedAt}
                dimensionEvidenceCounts={dimensionEvidenceCounts}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-6">
                <span className="text-primary text-[1.5rem]">◆</span>
                <p className="text-sm font-light text-muted-foreground text-center">
                  {fvsError || "Unable to generate score. Try again later."}
                </p>
                <button
                  onClick={() => {
                    fvsAutoTriggeredRef.current = false;
                    calculateFvs({
                      title: displayBlueprint.north_star_one_liner || venture.name,
                      description: displayBlueprint.promise_statement || undefined,
                      targetCustomer: displayBlueprint.target_audience || undefined,
                      revenueModel: displayBlueprint.monetization_strategy || undefined,
                      blueprintData: displayBlueprint as unknown as Record<string, unknown>,
                    });
                  }}
                  className="badge-gold px-4 py-1.5 hover:opacity-80 transition-opacity"
                >
                  RETRY
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Venture DNA — Master Prompt Section */}
      {venture?.idea_id && (
        <VentureDNASection ideaId={venture.idea_id} ventureId={venture.id} />
      )}

      {/* Link to Execution Plan */}
      <div
        className="card-gold-left mb-6 mt-10 cursor-pointer"
        onClick={() => navigate("/tasks")}
      >
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[0.95rem] font-medium text-foreground">30-Day Execution Plan</p>
              <p className="text-[0.82rem] font-light text-muted-foreground">
                {latestPlan
                  ? `${Object.values(tasksByWeek).flat().filter((t: any) => t.status === 'completed').length} of ${Object.values(tasksByWeek).flat().length} tasks completed`
                  : "Generate your personalized 30-day roadmap"
                }
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      {/* Validate Your Assumptions */}
      {venture && (
        <div className="mb-6 mt-6">
          <ValidationSection ventureId={venture.id} />
        </div>
      )}

      {/* Revenue Stack Brief */}
      {venture && (
        <div className="mb-6">
          <RevenueStackBriefCard ventureId={venture.id} />
        </div>
      )}

      {/* Mavrik Assessment */}
      {venture && <MavrikAssessmentCard ventureId={venture.id} />}

      {/* ─── Start Building CTA ─── */}
      <div className="mt-10 mb-4">
        <button
          className="w-full bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase py-4 transition-opacity hover:opacity-90"
          onClick={() => navigate("/dashboard")}
        >
          START BUILDING →
        </button>
      </div>

      {/* Tech Stack Dialog */}
      <TechStackDialog
        open={showTechStackDialog}
        onOpenChange={setShowTechStackDialog}
        onSubmit={handleGenerateKit}
        isGenerating={createKit.isPending}
      />

      {/* Edit Blueprint Drawer */}
      {displayBlueprint && editSection && (
        <EditBlueprintDrawer
          open={!!editSection}
          onClose={() => setEditSection(null)}
          blueprint={displayBlueprint}
          section={editSection as "life" | "business" | "northstar" | "traction"}
          onSave={async (data) => {
            if (!displayBlueprint?.id) return;
            const { error } = await supabase
              .from("founder_blueprints" as any)
              .update(data as any)
              .eq("id", displayBlueprint.id);
            if (error) {
              console.error("Blueprint save error:", error);
              toast({ title: "Failed to save", description: error.message, variant: "destructive" });
              return;
            }
            // Update local state so UI reflects changes immediately
            const updated = { ...displayBlueprint, ...data } as FounderBlueprint;
            setGeneratedBlueprint(updated);
            setEditSection(null);
            toast({ title: "Blueprint updated", description: "Your changes have been saved." });
          }}
        />
      )}

      {/* Export Paywall Modal */}
      <PaywallModal
        featureName="Blueprint PDF Export"
        open={showExportPaywall}
        onClose={() => setShowExportPaywall(false)}
        errorCode="EXPORT_REQUIRES_PRO"
      />
      <PageHelp
        title="Your Blueprint"
        bullets={[
          "The Blueprint is your AI-generated execution plan — it maps your idea to a concrete strategy.",
          "Financial Viability Score breaks down revenue potential across market size, unit economics, and founder fit.",
          "Use the Validation section to log real-world evidence and shift your confidence from assumptions to data.",
          "The Mavrik Assessment summarizes your venture's strengths, risks, and recommended next steps.",
          "Download a PDF export of your full Blueprint (Pro feature) to share or reference offline.",
          "Generate an Implementation Kit to get architecture specs and a coding-ready project plan.",
        ]}
      />
    </div>
  );

  return renderWrapper(isFreshVisit, content);
};

// Wrap in MainLayout for return visits, bare for fresh visits
function renderWrapper(isFresh: boolean, children: React.ReactNode) {
  if (isFresh) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {children}
        <MobileBottomNav />
      </div>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

// Helper: Generate AI narrative summary
function generateNarrativeSummary(blueprint: FounderBlueprint | null | undefined, ventureName: string): string {
  if (!blueprint) return "Loading your venture narrative...";

  const parts = [
    blueprint.promise_statement || "A focused venture",
    blueprint.target_audience && `targeting ${blueprint.target_audience}`,
    blueprint.offer_model && `via ${blueprint.offer_model}`,
    blueprint.monetization_strategy && `monetized through ${blueprint.monetization_strategy}`,
  ]
    .filter(Boolean)
    .join(" ");

  return parts || "Your venture is uniquely positioned for success.";
}

// Helper: Generate misalignment callouts
function generateMisalignmentCallouts(blueprint: FounderBlueprint | null | undefined): string[] {
  if (!blueprint) return [];

  const callouts: string[] = [];

  if (!blueprint.time_available_hours_per_week || blueprint.time_available_hours_per_week < 20) {
    callouts.push(
      `You have limited hours available (${blueprint.time_available_hours_per_week || 0}hrs/week) — this venture will require serious focus.`
    );
  }

  if (blueprint.capital_available && blueprint.capital_available < 5000) {
    callouts.push(
      `Your capital is tight (${blueprint.capital_available}) — focus on revenue-first strategies.`
    );
  }

  if (blueprint.risk_profile === "low" && blueprint.monetization_strategy?.includes("high-risk")) {
    callouts.push("Your risk profile is conservative, but this monetization approach carries risk.");
  }

  return callouts;
}

export default Blueprint;
