import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ArrowRight, Briefcase, Sparkles } from "lucide-react";
import { useIdeas, type Idea } from "@/hooks/useIdeas";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export function NorthStarCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { ideas, isLoading } = useIdeas();
  const { promote, isPromoting } = usePromoteIdeaToWorkspace();
  
  // Find the North Star idea
  const northStarIdea = ideas.find((idea) => idea.status === "north_star");

  const handlePromote = async () => {
    if (!northStarIdea || !user) return;

    // Build the BusinessIdea payload from Idea
    const ideaPayload = {
      id: northStarIdea.id,
      title: northStarIdea.title,
      description: northStarIdea.description || "",
      business_model_type: northStarIdea.business_model_type,
      target_customer: northStarIdea.target_customer,
      time_to_first_dollar: northStarIdea.time_to_first_dollar,
      complexity: northStarIdea.complexity,
      first_steps: getFirstSteps(northStarIdea),
    };

    const result = await promote(ideaPayload as any, true);

    if (result) {
      toast({
        title: "Promoted to Workspace",
        description: "Your North Star idea is now in your Workspace with starter tasks.",
      });
      queryClient.invalidateQueries({ queryKey: ["workspace-documents"] });
      navigate("/workspace");
    }
  };

  // Extract "why it fits" or description
  const getWhyItMatters = (idea: Idea): string => {
    const sourceMeta = idea.source_meta as any;
    const whyItFits = sourceMeta?.idea_payload?.why_it_fits;
    if (whyItFits && typeof whyItFits === "string") {
      return whyItFits.length > 160 ? whyItFits.slice(0, 157) + "..." : whyItFits;
    }
    if (idea.description) {
      return idea.description.length > 160 
        ? idea.description.slice(0, 157) + "..." 
        : idea.description;
    }
    return "Your chosen direction for building something meaningful.";
  };

  // Extract first steps from source_meta
  const getFirstSteps = (idea: Idea): string[] => {
    const sourceMeta = idea.source_meta as any;
    const firstSteps = sourceMeta?.idea_payload?.first_steps;
    if (Array.isArray(firstSteps) && firstSteps.length > 0) {
      return firstSteps.slice(0, 3);
    }
    return [];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state - no North Star
  if (!northStarIdea) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-muted-foreground" />
            North Star
          </CardTitle>
          <CardDescription>
            Your guiding idea — the one you're betting on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              You haven't chosen a North Star yet. Pick one idea to focus on.
            </p>
            <Button onClick={() => navigate("/ideas")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Pick a North Star
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstSteps = getFirstSteps(northStarIdea);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              {northStarIdea.title}
            </CardTitle>
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              North Star
            </Badge>
          </div>
        </div>
        <CardDescription className="mt-2">
          {getWhyItMatters(northStarIdea)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Steps */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Next Steps</p>
          {firstSteps.length > 0 ? (
            <ul className="space-y-1.5">
              {firstSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="line-clamp-1">{step}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No next steps yet — promote to Workspace to generate tasks.
            </p>
          )}
        </div>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={() => navigate(`/idea/${northStarIdea.id}`)}
          >
            Open Idea
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            className="flex-1 gap-2"
            onClick={handlePromote}
            disabled={isPromoting}
          >
            <Briefcase className="h-4 w-4" />
            {isPromoting ? "Promoting..." : "Promote to Workspace"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
