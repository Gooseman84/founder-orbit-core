import { Save, Check, FileText, Eye } from "lucide-react";
import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";
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
  const isV6 = isV6Idea(idea);

  return (
    <div className="relative flex flex-col justify-between p-5 sm:p-7 border border-border transition-all duration-200 group hover:bg-secondary hover:border-l-2 hover:border-l-primary" style={{ background: "hsl(240 12% 7%)" }}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[0.95rem] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
            {idea.title}
          </h2>
          <span className="badge-gold shrink-0">
            FIT: {Math.round(scores.overall)}%
          </span>
        </div>

        {/* One-liner */}
        <p className="text-[0.82rem] font-light text-muted-foreground line-clamp-2" style={{ lineHeight: "1.55" }}>
          {idea.oneLiner}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {isV6 ? (
            <>
              <span className="badge-gold">{idea.category}</span>
              <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                {idea.industry}
              </span>
              {idea.platform && (
                <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                  {idea.platform}
                </span>
              )}
              <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                {idea.difficulty}
              </span>
              <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                {idea.timeToRevenue}
              </span>
            </>
          ) : (
            <>
              <span className="badge-gold">{idea.businessArchetype}</span>
              {idea.markets?.slice(0, 2).map((market) => (
                <span key={market} className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                  {market}
                </span>
              ))}
              <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                {idea.hoursPerWeekMin}-{idea.hoursPerWeekMax} HRS/WK
              </span>
              <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
                RISK: {idea.riskLevel}
              </span>
            </>
          )}
        </div>

        {/* v6 scores */}
        {isV6 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="badge-gold">LEVERAGE: {idea.leverageScore}%</span>
            <span className="badge-gold">AUTO: {idea.automationDensity}%</span>
            <span className="badge-gold">VIRAL: {idea.viralityPotential}%</span>
          </div>
        )}

        {/* Why it fits */}
        <p className="text-[0.82rem] font-light text-muted-foreground" style={{ lineHeight: "1.55" }}>
          <span className="text-foreground font-medium">Fit: </span>
          {idea.whyItFitsFounder}
        </p>

        {/* First steps */}
        {idea.firstSteps && idea.firstSteps.length > 0 && (
          <div>
            <span className="label-mono mb-1.5 block">FIRST STEPS</span>
            <ul className="space-y-1">
              {idea.firstSteps.slice(0, 3).map((step, i) => (
                <li key={i} className="text-[0.82rem] font-light text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">—</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
        <button
          onClick={onSave}
          disabled={isSaved || isSaving}
          className={`flex items-center gap-1.5 font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-all ${
            isSaved
              ? "bg-secondary text-muted-foreground cursor-default"
              : "bg-primary text-primary-foreground hover:opacity-90"
          } disabled:opacity-50`}
        >
          {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {isSaved ? "SAVED" : isSaving ? "..." : "SAVE"}
        </button>

        {onViewDetails && (
          <button
            onClick={onViewDetails}
            disabled={isOpening}
            className="flex items-center gap-1.5 border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5" />
            {isOpening ? "..." : "DETAILS"}
          </button>
        )}

        <button
          onClick={onPromote}
          disabled={isPromoting}
          className="flex items-center gap-1.5 border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-50"
        >
          <FileText className="w-3.5 h-3.5" />
          {isPromoting ? "..." : "WORKSPACE"}
        </button>
      </div>
    </div>
  );
}
