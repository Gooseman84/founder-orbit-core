// src/components/discover/ExploreIdeaModal.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Rocket, Bookmark, AlertTriangle, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useNorthStarVenture } from "@/hooks/useNorthStarVenture";
import { supabase } from "@/integrations/supabase/client";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import type { Recommendation } from "@/types/recommendation";

interface ExploreIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: Recommendation | null;
  interviewId: string;
  recommendationIndex: number;
  onSaved?: () => void;
}

export function ExploreIdeaModal({
  isOpen,
  onClose,
  recommendation,
  interviewId,
  recommendationIndex,
  onSaved,
}: ExploreIdeaModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPro, hasFounder } = useFeatureAccess();
  const { northStarVenture, northStarIdeaTitle } = useNorthStarVenture();
  
  const [isExploring, setIsExploring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!recommendation) return null;

  const hasActiveVenture = !!northStarVenture;
  const isPaidUser = hasPro || hasFounder;

  // Check if trial user has already explored an idea (trial = 1 explore)
  const checkTrialExploreLimit = async (): Promise<boolean> => {
    if (isPaidUser) return true; // Pro users have no limit
    
    if (!user) return false;

    const { count, error } = await supabase
      .from("ideas")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source_type", "generated")
      .eq("status", "active");

    if (error) {
      console.error("Error checking explore limit:", error);
      return true; // Allow on error, better UX
    }

    // Trial users can explore 1 idea
    return (count ?? 0) < 1;
  };

  const createIdeaEntry = async (status: "active" | "candidate") => {
    if (!user) throw new Error("Not authenticated");

    const sourceMeta = {
      source: "mavrik_recommendation",
      interviewId,
      recommendationIndex,
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
    };

    const { data, error } = await supabase
      .from("ideas")
      .insert([{
        user_id: user.id,
        title: recommendation.name,
        description: recommendation.oneLiner,
        source_type: "generated" as const,
        source_meta: sourceMeta,
        overall_fit_score: recommendation.fitScore,
        target_customer: recommendation.targetCustomer,
        status,
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const handleExplore = async () => {
    if (!user) return;

    // Check trial limit for exploring
    const canExplore = await checkTrialExploreLimit();
    if (!canExplore) {
      setShowUpgrade(true);
      return;
    }

    setIsExploring(true);
    try {
      const idea = await createIdeaEntry("active");
      
      toast({
        title: "Idea added to library",
        description: `"${recommendation.name}" is ready for exploration.`,
      });

      onClose();
      
      // Navigate to idea detail page
      navigate(`/ideas/${idea.id}`);
    } catch (error: any) {
      console.error("Error exploring idea:", error);
      toast({
        title: "Failed to add idea",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExploring(false);
    }
  };

  const handleSaveOnly = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await createIdeaEntry("candidate");
      
      toast({
        title: "Idea saved",
        description: `"${recommendation.name}" has been added to your library.`,
      });

      onSaved?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving idea:", error);
      toast({
        title: "Failed to save idea",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Ready to explore {recommendation.name}?
            </DialogTitle>
            <DialogDescription className="pt-2">
              This will add <strong>{recommendation.name}</strong> to your idea library 
              where you can dive deeper with blueprints, niche radar, and the full 
              TrueBlazer toolkit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Active venture warning */}
            {hasActiveVenture && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm text-foreground">
                      You currently have an active venture: <strong>{northStarIdeaTitle || "Your current venture"}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      TrueBlazer's one-venture-at-a-time philosophy means you'll need to 
                      complete or archive it before committing to a new one. You can still 
                      save this idea to explore later.
                    </p>
                    <Link 
                      to="/dashboard" 
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                    >
                      Go to current venture
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2">
              {hasActiveVenture ? (
                // When there's an active venture, only allow saving
                <Button
                  onClick={handleSaveOnly}
                  disabled={isSaving}
                  className="w-full"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save to Library"}
                </Button>
              ) : (
                // No active venture - show both options
                <>
                  <Button
                    onClick={handleExplore}
                    disabled={isExploring || isSaving}
                    variant="gradient"
                    className="w-full"
                  >
                    <Rocket className="h-4 w-4 mr-2" />
                    {isExploring ? "Adding..." : "Add to Library & Start Exploring"}
                  </Button>
                  <Button
                    onClick={handleSaveOnly}
                    disabled={isExploring || isSaving}
                    variant="outline"
                    className="w-full"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save to Library Only"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pro upgrade modal for trial limit */}
      <ProUpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reasonCode="FEATURE_REQUIRES_PRO"
        context={{
          featureLabel: "Explore more ideas",
          headline: "Want to explore more ideas?",
          description: "Trial users can explore one Mavrik recommendation. Upgrade to Pro for unlimited access.",
        }}
      />
    </>
  );
}
