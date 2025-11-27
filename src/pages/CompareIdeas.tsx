import { useState, useEffect } from "react";
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

interface OpportunityScore {
  id: string;
  idea_id: string;
  total_score: number;
  sub_scores: any;
  explanation: string;
  recommendations: any;
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

  // Fetch score for idea A
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

  // Fetch score for idea B
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

  const winner = scoreA && scoreB ? (scoreA.total_score > scoreB.total_score ? "A" : scoreB.total_score > scoreA.total_score ? "B" : null) : null;

  const availableIdeas = ideas.filter((idea) => idea.id !== ideaA && idea.id !== ideaB);

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
        <p className="text-muted-foreground">Select two ideas to compare their opportunity scores side-by-side</p>
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
                  <div className="flex justify-center">
                    <ScoreGauge value={scoreA.total_score} size={180} />
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
                  <div className="flex justify-center">
                    <ScoreGauge value={scoreB.total_score} size={180} />
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
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
