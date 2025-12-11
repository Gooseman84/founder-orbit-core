import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, Check, FileText, HelpCircle, Zap, Eye } from "lucide-react";
import type { BusinessIdea, BusinessIdeaV6, isV6Idea as isV6IdeaFn } from "@/types/businessIdea";
import type { IdeaScoreBreakdown } from "@/lib/ideaScoring";

interface IdeaScoredCardProps {
  idea: BusinessIdea | BusinessIdeaV6;
  scores: IdeaScoreBreakdown;
  isSaved: boolean;
  isSaving: boolean;
  isPromoting: boolean;
  isOpening?: boolean;
  onSave: () => void;
  onPromote: () => void;
  onViewDetails?: () => void;
}

// Type guard for v6 ideas
function isV6Idea(idea: BusinessIdea | BusinessIdeaV6): idea is BusinessIdeaV6 {
  const engineVer = (idea as any).engineVersion || (idea as any).engine_version;
  return engineVer === "v6";
}

export function IdeaScoredCard({
  idea,
  scores,
  isSaved,
  isSaving,
  isPromoting,
  isOpening = false,
  onSave,
  onPromote,
  onViewDetails,
}: IdeaScoredCardProps) {
  const fitBadgeClass =
    scores.overall >= 70
      ? "bg-green-500/10 text-green-600"
      : scores.overall >= 50
        ? "bg-yellow-500/10 text-yellow-600"
        : "bg-red-500/10 text-red-600";

  const isV6 = isV6Idea(idea);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3">
      <div className="space-y-2">
        {/* Header: Title + Fit Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold leading-tight">{idea.title}</h2>
            {isV6 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-1">
                <Zap className="w-3 h-3" />
                v6
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${fitBadgeClass}`}>
              Fit: {Math.round(scores.overall)}%
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-sm">
                  <p className="font-medium mb-1">What does this score mean?</p>
                  <p>
                    {isV6 
                      ? "v6 Fit Score combines leverage, automation, virality, and founder alignment."
                      : "Fit Score is based on founder fit, constraints, market fit, and economics."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* One-liner */}
        <p className="text-sm text-muted-foreground">{idea.oneLiner}</p>

        {/* Problem & Target */}
        <p className="text-sm">
          <span className="font-medium">Problem:</span> {idea.problemStatement}
        </p>
        <p className="text-sm">
          <span className="font-medium">Target customer:</span> {idea.targetCustomer}
        </p>

        {/* Tags - adapt based on v6 or legacy */}
        <div className="flex flex-wrap gap-1 mt-2 text-xs">
          {isV6 ? (
            <>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.category}
              </span>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.industry}
              </span>
              {idea.platform && (
                <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {idea.platform}
                </span>
              )}
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.difficulty}
              </span>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.timeToRevenue}
              </span>
            </>
          ) : (
            <>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.businessArchetype}
              </span>
              {idea.markets?.slice(0, 3).map((market) => (
                <span key={market} className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {market}
                </span>
              ))}
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {idea.hoursPerWeekMin}-{idea.hoursPerWeekMax} hrs/week
              </span>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                ${idea.capitalRequired?.toLocaleString() || 0} capital
              </span>
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Risk: {idea.riskLevel}
              </span>
            </>
          )}
        </div>

        {/* Why it fits */}
        <p className="text-sm mt-2">
          <span className="font-medium">Why it fits you:</span>{" "}
          {isV6 ? idea.whyItFitsFounder : idea.whyItFitsFounder}
        </p>

        {/* v6 specific scores */}
        {isV6 && (
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Leverage: {idea.leverageScore}%
            </span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Automation: {idea.automationDensity}%
            </span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">
              Virality: {idea.viralityPotential}%
            </span>
          </div>
        )}

        {/* First steps */}
        <div className="mt-3">
          <p className="text-sm font-medium mb-1">First steps</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {idea.firstSteps?.slice(0, 5).map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2 flex-wrap">
        <Button
          onClick={onSave}
          disabled={isSaved || isSaving}
          variant={isSaved ? "secondary" : "default"}
          size="sm"
          className="flex-1 gap-2 min-w-[80px]"
        >
          {isSaved ? (
            <><Check className="w-4 h-4" />Saved</>
          ) : isSaving ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />Saving...</>
          ) : (
            <><Save className="w-4 h-4" />Save</>
          )}
        </Button>
        {onViewDetails && (
          <Button
            onClick={onViewDetails}
            disabled={isOpening}
            variant="outline"
            size="sm"
            className="flex-1 gap-2 min-w-[80px]"
          >
            {isOpening ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />Opening...</>
            ) : (
              <><Eye className="w-4 h-4" />View Details</>
            )}
          </Button>
        )}
        <Button
          onClick={onPromote}
          disabled={isPromoting}
          variant="outline"
          size="sm"
          className="flex-1 gap-2 min-w-[80px]"
        >
          {isPromoting ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />Creating...</>
          ) : (
            <><FileText className="w-4 h-4" />Workspace</>
          )}
        </Button>
      </div>
    </div>
  );
}
