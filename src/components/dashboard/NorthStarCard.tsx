import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ArrowRight, Briefcase, Sparkles } from "lucide-react";
import { useIdeas, type Idea } from "@/hooks/useIdeas";
import { usePromoteIdeaToWorkspace } from "@/hooks/usePromoteIdeaToWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { BusinessIdea } from "@/types/businessIdea";

export function NorthStarCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ideas, isLoading } = useIdeas();
  const { promote, isPromoting } = usePromoteIdeaToWorkspace();

  const northStarIdea = ideas.find((idea) => idea.status === "north_star");

  const convertToBusinessIdea = (idea: Idea): BusinessIdea => {
    const sourceMeta = idea.source_meta as any;
    const ideaPayload = sourceMeta?.idea_payload;

    return {
      id: idea.id,
      title: idea.title,
      oneLiner: idea.description || "",
      description: idea.description || "",
      problemStatement: ideaPayload?.problem || "",
      targetCustomer: idea.target_customer || ideaPayload?.target_customer || "",
      revenueModel: idea.business_model_type || "",
      mvpApproach: ideaPayload?.mvp_approach || "",
      goToMarket: ideaPayload?.go_to_market || "",
      competitiveAdvantage: ideaPayload?.competitive_advantage || "",
      financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
      requiredToolsSkills: "",
      risksMitigation: "",
      whyItFitsFounder: ideaPayload?.why_it_fits || "",
      primaryPassionDomains: [],
      primarySkillNeeds: [],
      markets: [],
      businessArchetype: idea.business_model_type || idea.category || "",
      hoursPerWeekMin: 5,
      hoursPerWeekMax: 20,
      capitalRequired: 0,
      riskLevel: "medium",
      timeToFirstRevenueMonths: 3,
      requiresPublicPersonalBrand: false,
      requiresTeamSoon: false,
      requiresCoding: false,
      salesIntensity: 3,
      asyncDepthWork: 3,
      firstSteps: ideaPayload?.first_steps || [],
    };
  };

  const handlePromote = async () => {
    if (!northStarIdea || !user) return;
    try {
      const businessIdea = convertToBusinessIdea(northStarIdea);
      const result = await promote(businessIdea, true);
      if (result) {
        const taskCount = Array.isArray(result?.taskIds) ? result.taskIds.length : 0;
        toast({
          title: "Promoted to Workspace",
          description: taskCount > 0 ? `Blueprint + ${taskCount} tasks created.` : "Blueprint created.",
        });
        queryClient.invalidateQueries({ queryKey: ["workspace-documents"] });
        queryClient.invalidateQueries({ queryKey: ["ideas", user.id] });
        navigate(result?.documentId ? `/workspace/${result.documentId}` : "/workspace");
      }
    } catch (error) {
      console.error("Error promoting idea:", error);
      toast({
        variant: "destructive",
        title: "Promotion failed",
        description: error instanceof Error ? error.message : "Could not promote idea to workspace.",
      });
    }
  };

  const getWhyItMatters = (idea: Idea): string => {
    const sourceMeta = idea.source_meta as any;
    const whyItFits = sourceMeta?.idea_payload?.why_it_fits;
    if (whyItFits && typeof whyItFits === "string") {
      return whyItFits.length > 160 ? whyItFits.slice(0, 157) + "..." : whyItFits;
    }
    if (idea.description) {
      return idea.description.length > 160 ? idea.description.slice(0, 157) + "..." : idea.description;
    }
    return "Your chosen direction for building something meaningful.";
  };

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
      <div className="card-gold-accent p-6">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-60 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!northStarIdea) {
    return (
      <div className="card-gold-accent p-6">
        <div className="flex items-center gap-2 mb-1">
          <Star className="h-5 w-5 text-muted-foreground" />
          <span className="label-mono-gold">North Star</span>
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          Your guiding idea — the one you're betting on
        </p>
        <div className="text-center py-8">
          <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            You haven't chosen a North Star yet. Pick one idea to focus on.
          </p>
          <button
            onClick={() => navigate("/ideas")}
            className="py-3 px-6 bg-primary text-primary-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Pick a North Star
          </button>
        </div>
      </div>
    );
  }

  const firstSteps = getFirstSteps(northStarIdea);

  return (
    <div className="card-gold-accent p-6">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <h3 className="font-display text-xl font-bold text-foreground">{northStarIdea.title}</h3>
          </div>
          <span className="badge-gold">
            <Star className="h-3 w-3 inline mr-1" />
            North Star
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{getWhyItMatters(northStarIdea)}</p>

      {/* Next Steps */}
      {firstSteps.length > 0 && (
        <div className="mb-4">
          <span className="label-mono mb-2 block">Next Steps</span>
          <ul className="space-y-2">
            {firstSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary text-xs flex items-center justify-center font-mono font-medium">
                  {index + 1}
                </span>
                <span className="line-clamp-1 text-foreground">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA Row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          className="flex-1 py-3 px-6 border border-border text-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase flex items-center justify-center gap-2 transition-colors hover:bg-secondary"
          onClick={() => navigate(`/ideas/${northStarIdea.id}`)}
        >
          Open Idea
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          className="flex-1 py-3 px-6 bg-primary text-primary-foreground font-sans font-medium text-[0.85rem] tracking-[0.06em] uppercase flex items-center justify-center gap-2 transition-colors hover:brightness-110 disabled:opacity-50"
          onClick={handlePromote}
          disabled={!northStarIdea || isPromoting}
        >
          <Briefcase className="h-4 w-4" />
          {isPromoting ? "Promoting..." : "Promote to Workspace"}
        </button>
      </div>
    </div>
  );
}
