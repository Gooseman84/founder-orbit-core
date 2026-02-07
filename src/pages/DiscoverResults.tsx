// src/pages/DiscoverResults.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Info } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { DiscoverResultsLoading } from "@/components/discover/DiscoverResultsLoading";
import { RecommendationCard } from "@/components/discover/RecommendationCard";
import { RegeneratePanel } from "@/components/discover/RegeneratePanel";
import { ExploreIdeaModal } from "@/components/discover/ExploreIdeaModal";
import type { Recommendation, GenerationResult } from "@/types/recommendation";

export default function DiscoverResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generationNotes, setGenerationNotes] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [interviewDate, setInterviewDate] = useState<Date | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Explore modal state
  const [exploreModalOpen, setExploreModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(0);

  // Get interviewId from location state or fetch from DB
  const fetchInterviewId = useCallback(async (): Promise<string | null> => {
    // Check location state first
    const stateInterviewId = location.state?.interviewId as string | undefined;
    if (stateInterviewId) {
      return stateInterviewId;
    }

    // Fetch from database
    if (!user) return null;

    const { data, error } = await supabase
      .from("founder_interviews")
      .select("id, updated_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    setInterviewDate(new Date(data.updated_at));
    return data.id;
  }, [user, location.state]);

  // Check for cached results
  const fetchCachedResults = useCallback(async (interviewId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("personalized_recommendations")
      .select("*")
      .eq("interview_id", interviewId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    // We have cached results
    setRecommendations(data.recommendations as unknown as Recommendation[]);
    setGenerationNotes(data.generation_notes);
    return true;
  }, []);

  // Generate new recommendations
  const generateRecommendations = useCallback(async (interviewId: string, additionalContext?: string) => {
    const { data, error } = await invokeAuthedFunction<GenerationResult>("generate-personalized-ideas", {
      body: {
        interviewId,
        additionalContext,
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.success || !data.recommendations) {
      throw new Error(data?.error || "Failed to generate recommendations");
    }

    setRecommendations(data.recommendations);
    setGenerationNotes(data.generationNotes || null);
  }, []);

  // Initial load
  useEffect(() => {
    if (!user) return;

    const loadResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get interview ID
        const id = await fetchInterviewId();
        if (!id) {
          toast({
            title: "No interview found",
            description: "Please complete the Mavrik interview first.",
            variant: "destructive",
          });
          navigate("/discover");
          return;
        }

        setInterviewId(id);

        // Fetch interview date if not already set
        if (!interviewDate) {
          const { data: interview } = await supabase
            .from("founder_interviews")
            .select("updated_at")
            .eq("id", id)
            .single();
          
          if (interview?.updated_at) {
            setInterviewDate(new Date(interview.updated_at));
          }
        }

        // Check for cached results
        const hasCached = await fetchCachedResults(id);
        
        if (!hasCached) {
          // Generate new recommendations
          await generateRecommendations(id);
        }
      } catch (e: any) {
        console.error("DiscoverResults: failed to load", e);
        setError(e?.message || "Failed to load recommendations");
        toast({
          title: "Failed to load recommendations",
          description: e?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, [user?.id]);

  // Handle regeneration with feedback
  const handleRegenerate = async (feedback: string) => {
    if (!interviewId) return;

    setIsRegenerating(true);
    setError(null);

    try {
      // First, apply the feedback as a correction to the interview context
      await invokeAuthedFunction("mavrik-apply-corrections", {
        body: {
          interviewId,
          corrections: {
            corrections: {
              insiderKnowledge: null,
              customerIntimacy: null,
              constraints: null,
              financialTarget: null,
              hardNoFilters: null,
            },
            additionalContext: feedback,
          },
        },
      });

      // Then regenerate ideas
      await generateRecommendations(interviewId, feedback);

      toast({
        title: "Ideas regenerated",
        description: "New recommendations based on your feedback.",
      });
    } catch (e: any) {
      console.error("Failed to regenerate:", e);
      toast({
        title: "Failed to regenerate",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle "Explore This Idea" - opens confirmation modal
  const handleExplore = (recommendation: Recommendation) => {
    const index = recommendations.findIndex(r => r.name === recommendation.name);
    setSelectedRecommendation(recommendation);
    setSelectedRecommendationIndex(index >= 0 ? index : 0);
    setExploreModalOpen(true);
  };

  // Handle "Save for Later"
  const handleSave = async (recommendation: Recommendation) => {
    if (!user) return;

    setSavingId(recommendation.name);

    try {
      const { error } = await supabase.from("ideas").insert([{
        user_id: user.id,
        title: recommendation.name,
        description: recommendation.oneLiner,
        source_type: "generated" as const,
        source_meta: {
          source: "mavrik_recommendation",
          whyThisFounder: recommendation.whyThisFounder,
          targetCustomer: recommendation.targetCustomer,
          revenueModel: recommendation.revenueModel,
          timeToFirstRevenue: recommendation.timeToFirstRevenue,
          capitalRequired: recommendation.capitalRequired,
          fitScore: recommendation.fitScore,
          fitBreakdown: {
            founderMarketFit: recommendation.fitBreakdown.founderMarketFit,
            feasibility: recommendation.fitBreakdown.feasibility,
            revenueAlignment: recommendation.fitBreakdown.revenueAlignment,
            marketTiming: recommendation.fitBreakdown.marketTiming,
          },
          keyRisk: recommendation.keyRisk,
          firstStep: recommendation.firstStep,
        },
        overall_fit_score: recommendation.fitScore,
        status: "candidate",
      }]);

      if (error) throw error;

      toast({
        title: "Idea saved",
        description: `"${recommendation.name}" has been added to your idea library.`,
      });
    } catch (e: any) {
      console.error("Failed to save idea:", e);
      toast({
        title: "Failed to save",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            to="/discover/summary"
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Back to summary"
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

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-8">
        {isLoading ? (
          <DiscoverResultsLoading />
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Info className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-primary underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
            {/* Generation Notes Banner */}
            {generationNotes && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-6 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{generationNotes}</p>
              </div>
            )}

            {/* Header */}
            <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Your Personalized Venture Ideas
              </h1>
              <p className="text-muted-foreground">
                Ranked by how well they fit your unique profile
              </p>
              {interviewDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Based on your interview with Mavrik on{" "}
                  {format(interviewDate, "MMMM d, yyyy")}
                </p>
              )}
            </div>

            {/* Recommendation Cards */}
            <div className="space-y-4 mb-8">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.name}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <RecommendationCard
                    recommendation={rec}
                    rank={index + 1}
                    onExplore={handleExplore}
                    onSave={handleSave}
                    isSaving={savingId === rec.name}
                  />
                </div>
              ))}
            </div>

            {/* Regenerate Panel */}
            <RegeneratePanel
              onRegenerate={handleRegenerate}
              isRegenerating={isRegenerating}
              className="mt-8"
            />
          </div>
        )}
      </main>

      {/* Explore Idea Modal */}
      <ExploreIdeaModal
        isOpen={exploreModalOpen}
        onClose={() => {
          setExploreModalOpen(false);
          setSelectedRecommendation(null);
        }}
        recommendation={selectedRecommendation}
        interviewId={interviewId || ""}
        recommendationIndex={selectedRecommendationIndex}
        onSaved={() => {
          toast({
            title: "Idea saved",
            description: "You can find it in your idea library.",
          });
        }}
      />
    </div>
  );
}
