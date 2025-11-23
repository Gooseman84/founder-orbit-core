import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIdeaDetail } from "@/hooks/useIdeaDetail";
import { IdeaVettingCard } from "@/components/ideas/IdeaVettingCard";
import { 
  ArrowLeft, 
  Sparkles, 
  Star, 
  Clock, 
  Target, 
  Users, 
  Briefcase,
  BarChart3 
} from "lucide-react";

const IdeaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { idea, analysis, isLoading, analyzeIdea, updateIdeaStatus } = useIdeaDetail(id);

  const handleVetIdea = async () => {
    try {
      await analyzeIdea.mutateAsync();
      toast({
        title: "Analysis Complete!",
        description: "Your idea has been vetted with market research and viability scoring.",
      });
    } catch (error: any) {
      console.error("Error analyzing idea:", error);
      
      let errorMessage = "Failed to analyze idea. Please try again.";
      
      if (error.message?.includes("Rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("Payment required")) {
        errorMessage = "AI service requires payment. Please contact support.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMakeMainIdea = async () => {
    try {
      await updateIdeaStatus.mutateAsync("chosen");
      toast({
        title: "Success!",
        description: "This is now your main idea. Redirecting to North Star...",
      });
      setTimeout(() => navigate("/north-star"), 1500);
    } catch (error: any) {
      console.error("Error updating idea status:", error);
      toast({
        title: "Error",
        description: "Failed to update idea status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading idea details...</p>
        </div>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Idea Not Found</h2>
        <p className="text-muted-foreground mb-6">This idea doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate("/ideas")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Button variant="ghost" onClick={() => navigate("/ideas")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>

        <div className="flex gap-2">
          {!analysis && (
            <Button
              onClick={handleVetIdea}
              disabled={analyzeIdea.isPending}
              className="gap-2"
            >
              {analyzeIdea.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Vet This Idea
                </>
              )}
            </Button>
          )}

          {idea.status !== "chosen" && (
            <Button
              onClick={handleMakeMainIdea}
              disabled={updateIdeaStatus.isPending}
              variant="default"
              className="gap-2"
            >
              {updateIdeaStatus.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Make This My Main Idea
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Idea Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-3xl">{idea.title}</CardTitle>
              {idea.business_model_type && (
                <CardDescription className="text-lg font-medium">
                  {idea.business_model_type}
                </CardDescription>
              )}
            </div>
            {idea.complexity && (
              <Badge variant={getComplexityVariant(idea.complexity)} className="text-sm">
                {idea.complexity} Complexity
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {idea.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{idea.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid md:grid-cols-2 gap-6">
            {idea.target_customer && (
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Target Customer</h4>
                  <p className="text-sm text-muted-foreground">{idea.target_customer}</p>
                </div>
              </div>
            )}

            {idea.time_to_first_dollar && (
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">Time to First Dollar</h4>
                  <p className="text-sm text-muted-foreground">{idea.time_to_first_dollar}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Fit Scores */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Fit Scores
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Fit</span>
                  <span className="text-sm font-bold">{idea.overall_fit_score || 0}%</span>
                </div>
                <Progress value={idea.overall_fit_score || 0} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Passion Fit</span>
                    <span className="text-xs font-semibold">{idea.passion_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.passion_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Skill Fit</span>
                    <span className="text-xs font-semibold">{idea.skill_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.skill_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Constraint Fit</span>
                    <span className="text-xs font-semibold">{idea.constraint_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.constraint_fit_score || 0} className="h-1.5" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Lifestyle Fit</span>
                    <span className="text-xs font-semibold">{idea.lifestyle_fit_score || 0}%</span>
                  </div>
                  <Progress value={idea.lifestyle_fit_score || 0} className="h-1.5" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Market Analysis</h2>
            <Button
              variant="outline"
              onClick={handleVetIdea}
              disabled={analyzeIdea.isPending}
              className="gap-2"
            >
              {analyzeIdea.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Re-analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Re-analyze
                </>
              )}
            </Button>
          </div>
          <IdeaVettingCard analysis={analysis} />
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Get AI-powered market research, competition analysis, and viability scoring for this idea.
            </p>
            <Button onClick={handleVetIdea} disabled={analyzeIdea.isPending} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Vet This Idea
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IdeaDetail;
