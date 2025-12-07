import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, Check, FileText, HelpCircle } from "lucide-react";
import type { BusinessIdea } from "@/types/businessIdea";
import type { IdeaScoreBreakdown } from "@/lib/ideaScoring";

interface IdeaScoredCardProps {
  idea: BusinessIdea;
  scores: IdeaScoreBreakdown;
  isSaved: boolean;
  isSaving: boolean;
  isPromoting: boolean;
  onSave: () => void;
  onPromote: () => void;
}

const SCORE_EXPLANATIONS = {
  founderFit: "How well this idea matches your passions, skills, and preferred business archetypes.",
  constraintsFit: "How realistic this is given your time, capital, risk tolerance, and urgency.",
  marketFit: "How much it aligns with markets you already understand and your existing networks.",
  economics: "How reasonable the capital requirements and time-to-revenue profile is.",
};

export function IdeaScoredCard({
  idea,
  scores,
  isSaved,
  isSaving,
  isPromoting,
  onSave,
  onPromote,
}: IdeaScoredCardProps) {
  const fitBadgeClass =
    scores.overall >= 70
      ? "bg-green-500/10 text-green-600"
      : scores.overall >= 50
        ? "bg-yellow-500/10 text-yellow-600"
        : "bg-red-500/10 text-red-600";

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between gap-3">
      <div className="space-y-2">
        {/* Header: Title + Fit Badge */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold leading-tight">{idea.title}</h2>
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
                    Fit Score is a 0–100 score based on: founder fit (passions & skills),
                    constraints (time, capital, risk), market fit (markets you know), and
                    economics (capital & time to revenue). It's not perfect, but it helps
                    you compare which ideas are more aligned with your reality.
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

        {/* Tags: Archetype, Markets, Time, Capital, Risk */}
        <div className="flex flex-wrap gap-1 mt-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
            Archetype: {idea.businessArchetype}
          </span>
          {idea.markets.slice(0, 3).map((market) => (
            <span
              key={market}
              className="px-2 py-1 rounded-full bg-muted text-muted-foreground"
            >
              {market}
            </span>
          ))}
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {idea.hoursPerWeekMin}-{idea.hoursPerWeekMax} hrs/week
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
            ${idea.capitalRequired.toLocaleString()} starting capital
          </span>
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
            Risk: {idea.riskLevel}
          </span>
        </div>

        {/* Why it fits */}
        <p className="text-sm mt-2">
          <span className="font-medium">Why it fits you:</span> {idea.whyItFitsFounder}
        </p>

        {/* First steps */}
        <div className="mt-3">
          <p className="text-sm font-medium mb-1">First steps</p>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {idea.firstSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Execution details */}
      <details className="mt-2 text-sm text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          View execution details
        </summary>
        <div className="mt-2 space-y-1">
          <p>
            <span className="font-medium text-foreground">MVP approach:</span>{" "}
            {idea.mvpApproach}
          </p>
          <p>
            <span className="font-medium text-foreground">Go-to-market:</span>{" "}
            {idea.goToMarket}
          </p>
          <p>
            <span className="font-medium text-foreground">Revenue model:</span>{" "}
            {idea.revenueModel}
          </p>
          <p>
            <span className="font-medium text-foreground">
              Financial trajectory (3/6/12 months):
            </span>{" "}
            {idea.financialTrajectory.month3} / {idea.financialTrajectory.month6} /{" "}
            {idea.financialTrajectory.month12}
          </p>
          <p>
            <span className="font-medium text-foreground">Risks & mitigation:</span>{" "}
            {idea.risksMitigation}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="mt-4 pt-3 border-t border-border">
          <p className="font-medium text-foreground mb-2">Fit Score Breakdown</p>
          <div className="space-y-3">
            <ScoreRow
              label="Founder fit"
              value={scores.founderFit}
              explanation={SCORE_EXPLANATIONS.founderFit}
            />
            <ScoreRow
              label="Constraints fit"
              value={scores.constraintsFit}
              explanation={SCORE_EXPLANATIONS.constraintsFit}
            />
            <ScoreRow
              label="Market fit"
              value={scores.marketFit}
              explanation={SCORE_EXPLANATIONS.marketFit}
            />
            <ScoreRow
              label="Economics"
              value={scores.economics}
              explanation={SCORE_EXPLANATIONS.economics}
            />
          </div>
        </div>
      </details>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-2">
        <Button
          onClick={onSave}
          disabled={isSaved || isSaving}
          variant={isSaved ? "secondary" : "default"}
          size="sm"
          className="flex-1 gap-2"
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          )}
        </Button>
        <Button
          onClick={onPromote}
          disabled={isPromoting}
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
        >
          {isPromoting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Open in Workspace
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  explanation,
}: {
  label: string;
  value: number;
  explanation: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help underline decoration-dotted underline-offset-2">
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-sm">
              {explanation}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="font-medium">{Math.round(value)}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
