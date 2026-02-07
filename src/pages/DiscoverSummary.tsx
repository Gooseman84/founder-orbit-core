// src/pages/DiscoverSummary.tsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Lightbulb, Users, Clock, Target, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FounderPortrait } from "@/components/discover/FounderPortrait";
import { InsightCard, InsightPills } from "@/components/discover/InsightCard";
import type { InterviewInsights } from "@/types/interviewInsights";

export default function DiscoverSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [insights, setInsights] = useState<InterviewInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Your Founder Profile | TrueBlazer";
  }, []);

  // Try to get insights from navigation state first, then fetch from DB
  useEffect(() => {
    if (!user) return;

    const loadInsights = async () => {
      // Check if insights were passed via navigation state
      const stateInsights = location.state?.insights as InterviewInsights | undefined;
      if (stateInsights) {
        setInsights(stateInsights);
        setIsLoading(false);
        return;
      }

      // Fetch from database
      try {
        const { data, error } = await supabase
          .from("founder_interviews")
          .select("context_summary")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data?.context_summary) {
          setInsights(data.context_summary as unknown as InterviewInsights);
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
    // Navigate to idea generation
    navigate("/discover/results", { state: { insights } });
  };

  const handleClarify = () => {
    // TODO: Implement clarification flow (Prompt 4)
    toast({
      title: "Coming soon",
      description: "Clarification feature will be available soon.",
    });
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
                Here's What I Learned About You
              </h1>
              <p className="text-sm text-muted-foreground">
                Based on our conversation
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
            >
              <InsightPills items={extractedInsights.insiderKnowledge} />
            </InsightCard>

            {/* Your People */}
            <InsightCard
              title="Your People"
              icon={Users}
              confidence={confidenceLevel.customerIntimacy}
            >
              <InsightPills items={extractedInsights.customerIntimacy} />
            </InsightCard>

            {/* Your Reality */}
            <InsightCard
              title="Your Reality"
              icon={Clock}
              confidence={confidenceLevel.constraints}
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
            >
              <p className="text-sm text-foreground/80">
                {extractedInsights.financialTarget.description || "No target specified"}
              </p>
            </InsightCard>

            {/* Your Boundaries (Conditional) */}
            {extractedInsights.hardNoFilters && 
             extractedInsights.hardNoFilters.length > 0 && (
              <InsightCard
                title="Your Boundaries"
                icon={Shield}
                className="sm:col-span-2"
              >
                <InsightPills items={extractedInsights.hardNoFilters} />
              </InsightCard>
            )}
          </div>
        </div>
      </main>

      {/* CTA Section - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t px-4 py-4 pb-safe">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
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
        </div>
      </div>
    </div>
  );
}
