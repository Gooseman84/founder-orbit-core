import { useState, useEffect, useCallback } from "react";
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

import { cn } from "@/lib/utils";
import type { CommitmentWindowDays, Venture, VentureState } from "@/types/venture";
import type { TechStack } from "@/types/implementationKit";
import type { FounderBlueprint } from "@/types/blueprint";

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
        setVentureError("no_venture_id");
        setVentureLoading(false);
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
    if (blueprint || generatedBlueprint || isGenerating || generationFailed) return;

    // No blueprint exists — trigger generation
    setIsGenerating(true);

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
          // Show reveal animation for fresh visits
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

      // Compute FVS
      const fvsScore = displayBlueprint.income_target
        ? Math.min(85, 50 + (displayBlueprint.income_target / 10000) * 10)
        : 65;
      const fvsBreakdown = {
        marketSize: 70,
        unitEconomics: displayBlueprint.income_target ? Math.min(90, 60 + (displayBlueprint.income_target / 20000) * 30) : 60,
        timeToRevenue: displayBlueprint.time_available_hours_per_week ? Math.min(85, 40 + displayBlueprint.time_available_hours_per_week * 2) : 55,
        competition: 65,
        capitalRequirements: displayBlueprint.capital_available ? Math.min(90, 50 + Math.log10(displayBlueprint.capital_available + 1) * 15) : 50,
        founderMarketFit: 75,
      };

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

  // Generation failed state — show retry button instead of looping
  if (generationFailed && !isGenerating && !displayBlueprint) {
    return renderWrapper(isFreshVisit, (
      <div className="container mx-auto py-8 px-4 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="text-destructive text-lg font-semibold">Blueprint generation failed</p>
        <p className="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
        <Button
          onClick={() => setGenerationFailed(false)}
          variant="default"
        >
          Retry Blueprint Generation
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
        <Alert className="mb-6 border-primary/30 bg-primary/5">
          <ClipboardList className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span className="font-medium">Execution Mode:</span>
            Your commitment is locked. Complete or end your current commitment to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Your Blueprint</h1>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownloadPdf}
            disabled={pdfExporting || !displayBlueprint}
          >
            {pdfExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Generating PDF…</span>
              </>
            ) : pdfSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span className="hidden sm:inline">Downloaded ✓</span>
              </>
            ) : (
              <>
                {!hasPro && <Lock className="h-3 w-3" />}
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Download PDF</span>
              </>
            )}
          </Button>
        </div>
        <p className="text-muted-foreground text-center">
          {isReadOnly
            ? "Reference your plan while building."
            : "This is where thinking ends and building begins."}
        </p>
      </div>

      {/* AI Narrative Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">What you're building — and why it makes sense</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{narrativeSummary}</p>
        </CardContent>
      </Card>

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
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Financial Viability</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <FinancialViabilityScore
              score={displayBlueprint.income_target ? Math.min(85, 50 + (displayBlueprint.income_target / 10000) * 10) : 65}
              breakdown={{
                marketSize: 70,
                unitEconomics: displayBlueprint.income_target ? Math.min(90, 60 + (displayBlueprint.income_target / 20000) * 30) : 60,
                timeToRevenue: displayBlueprint.time_available_hours_per_week ? Math.min(85, 40 + displayBlueprint.time_available_hours_per_week * 2) : 55,
                competition: 65,
                capitalRequirements: displayBlueprint.capital_available ? Math.min(90, 50 + Math.log10(displayBlueprint.capital_available + 1) * 15) : 50,
                founderMarketFit: 75,
              }}
              showBreakdown
              size="md"
              confidenceShift={confidenceShift}
              lastValidatedAt={lastValidatedAt}
              dimensionEvidenceCounts={dimensionEvidenceCounts}
            />
          </CardContent>
        </Card>
      )}

      {/* Venture DNA — Master Prompt Section */}
      {venture?.idea_id && (
        <VentureDNASection ideaId={venture.idea_id} ventureId={venture.id} />
      )}

      {/* Link to Execution Plan */}
      <Card className="mb-6 mt-10 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={() => navigate("/tasks")}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">30-Day Execution Plan</p>
                <p className="text-sm text-muted-foreground">
                  {latestPlan
                    ? `${Object.values(tasksByWeek).flat().filter((t: any) => t.status === 'completed').length} of ${Object.values(tasksByWeek).flat().length} tasks completed`
                    : "Generate your personalized 30-day roadmap"
                  }
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Validate Your Assumptions */}
      {venture && (
        <div className="mb-6 mt-6">
          <ValidationSection ventureId={venture.id} />
        </div>
      )}

      {/* Mavrik Assessment */}
      {venture && <MavrikAssessmentCard ventureId={venture.id} />}

      {/* ─── Start Building CTA ─── */}
      <div className="mt-10 mb-4">
        <Button
          size="lg"
          className="w-full text-base"
          onClick={() => navigate("/dashboard")}
        >
          Start Building →
        </Button>
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
            await supabase.from("founder_blueprints").update(data as any).eq("id", displayBlueprint.id);
            setEditSection(null);
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
    </div>
  );

  return renderWrapper(isFreshVisit, content);
};

// Wrap in MainLayout for return visits, bare for fresh visits
function renderWrapper(isFresh: boolean, children: React.ReactNode) {
  if (isFresh) {
    return <div className="min-h-screen bg-background">{children}</div>;
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
