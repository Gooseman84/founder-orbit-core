// src/pages/DiscoverSummary.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Lightbulb, Users, Clock, Target, Shield, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FounderPortrait } from "@/components/discover/FounderPortrait";
import { InsightCard, InsightPills } from "@/components/discover/InsightCard";
import type { InterviewInsights } from "@/types/interviewInsights";
import type { CorrectionFields, CorrectionsPayload } from "@/types/corrections";

export default function DiscoverSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [insights, setInsights] = useState<InterviewInsights | null>(null);
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
      const stateInsights = location.state?.insights as InterviewInsights | undefined;
      const stateInterviewId = location.state?.interviewId as string | undefined;
      
      if (stateInsights) {
        setInsights(stateInsights);
        setInterviewId(stateInterviewId || null);
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
          setInsights(data.context_summary as unknown as InterviewInsights);
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

    // Check if any corrections were made
    const hasCorrections = Object.values(corrections).some(v => v !== null) || additionalContext.trim();
    
    if (!hasCorrections) {
      // No corrections, just proceed
      handleConfirm();
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CorrectionsPayload = {
        corrections,
        additionalContext: additionalContext.trim() || null,
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
        
        // Show updated animation
        setShowUpdatedAnimation(true);
        setTimeout(() => {
          setShowUpdatedAnimation(false);
          // Navigate to results with forceRegenerate flag to skip cache
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

  const { extractedInsights, founderSummary, confidenceLevel } = insights;

  // Format constraints for display
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
      {/* Updated animation overlay */}
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

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          <Link
            to="/discover"
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Back to interview"
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
        {isEditMode && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Edit mode
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          {/* Header Section */}
          <div
            className="flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
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

          {/* Founder Portrait (Hero) */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <FounderPortrait summary={founderSummary} className="mb-8" />
          </div>

          {/* Insight Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            {/* Your Edge */}
            <InsightCard
              title="Your Edge"
              icon={Lightbulb}
              confidence={confidenceLevel.insiderKnowledge}
              isEditMode={isEditMode}
              cardKey="insiderKnowledge"
              correctionValue={corrections.insiderKnowledge || ""}
              onCorrectionChange={handleCorrectionChange}
            >
              <InsightPills items={extractedInsights.insiderKnowledge} />
            </InsightCard>

            {/* Your People */}
            <InsightCard
              title="Your People"
              icon={Users}
              confidence={confidenceLevel.customerIntimacy}
              isEditMode={isEditMode}
              cardKey="customerIntimacy"
              correctionValue={corrections.customerIntimacy || ""}
              onCorrectionChange={handleCorrectionChange}
            >
              <InsightPills items={extractedInsights.customerIntimacy} />
            </InsightCard>

            {/* Your Reality */}
            <InsightCard
              title="Your Reality"
              icon={Clock}
              confidence={confidenceLevel.constraints}
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

            {/* Your Target */}
            <InsightCard
              title="Your Target"
              icon={Target}
              confidence={confidenceLevel.financialTarget}
              isEditMode={isEditMode}
              cardKey="financialTarget"
              correctionValue={corrections.financialTarget || ""}
              onCorrectionChange={handleCorrectionChange}
            >
              <p className="text-sm text-foreground/80">
                {extractedInsights.financialTarget.description || "No target specified"}
              </p>
            </InsightCard>

            {/* Your Boundaries (Conditional) */}
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
