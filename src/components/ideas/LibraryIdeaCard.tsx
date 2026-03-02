import { useNavigate } from "react-router-dom";
import { Eye, FileText, Trash2, Star, Map } from "lucide-react";
import { V6MetricsInline } from "@/components/shared/V6MetricBadge";
import { SourceTypeBadge } from "@/components/ideas/SourceTypeBadge";
import { PainThemesPanel } from "@/components/ideas/PainThemesPanel";
import { FinancialViabilityScoreInline } from "@/components/opportunity/FinancialViabilityScore";
import type { Idea } from "@/hooks/useIdeas";

interface LibraryIdeaCardProps {
  idea: Idea;
  onDelete?: (id: string) => void;
  onPromote?: (id: string) => void;
  onSetNorthStar?: (id: string) => void;
  hasActiveVenture?: boolean;
}

interface IdeaPayload {
  summary?: string;
  problem?: string;
  why_it_fits?: string;
  first_steps?: string[];
}

interface SourceMeta {
  idea_payload?: IdeaPayload;
  inferred_pain_themes?: string[];
  variant_label?: string;
  import_source?: string;
  source?: string;
  whyThisFounder?: string;
  is_pattern_transfer?: boolean;
  why_it_fits?: string;
}

export function LibraryIdeaCard({ idea, onDelete, onPromote, onSetNorthStar, hasActiveVenture = false }: LibraryIdeaCardProps) {
  const navigate = useNavigate();
  const isNorthStar = idea.status === "north_star";
  const sourceMeta = (idea as any).source_meta as SourceMeta | null;
  const ideaPayload = sourceMeta?.idea_payload;
  const painThemes = sourceMeta?.inferred_pain_themes;

  return (
    <div
      className={`relative flex flex-col justify-between p-7 border transition-all duration-200 group cursor-pointer ${
        isNorthStar
          ? "border-primary/50"
          : "border-border hover:border-l-2 hover:border-l-primary hover:bg-secondary"
      }`}
      style={{ background: isNorthStar ? undefined : "hsl(240 12% 7%)" }}
      onClick={() => navigate(`/ideas/${idea.id}`)}
    >
      {/* Active venture top accent */}
      {isNorthStar && (
        <>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-transparent" />
          <span className="absolute top-3 right-3 bg-primary text-primary-foreground font-mono-tb text-[0.6rem] uppercase tracking-wider px-2.5 py-1">
            ACTIVE VENTURE
          </span>
        </>
      )}

      {/* Title + badges */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="text-[0.95rem] font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
            {idea.title}
          </h3>
          <SourceTypeBadge sourceType={(idea as any).source_type} size="sm" />
        </div>

        {/* Category / model badge */}
        {(idea.category || idea.business_model_type) && (
          <span className="badge-gold">
            {idea.category || idea.business_model_type}
          </span>
        )}
      </div>

      {/* Content */}
      {ideaPayload?.problem ? (
        <div className="space-y-1.5 mb-3">
          <p className="text-[0.82rem] font-light text-muted-foreground line-clamp-2">
            <span className="text-foreground font-medium">Problem:</span> {ideaPayload.problem}
          </p>
          {ideaPayload.why_it_fits && (
            <p className="text-[0.82rem] font-light text-muted-foreground line-clamp-2">
              <span className="text-foreground font-medium">Fit:</span> {ideaPayload.why_it_fits}
            </p>
          )}
          {painThemes && painThemes.length > 0 && (
            <PainThemesPanel themes={painThemes} variant="compact" />
          )}
        </div>
      ) : (
        <p className="text-[0.82rem] font-light text-muted-foreground line-clamp-2 mb-3" style={{ lineHeight: "1.55" }}>
          {idea.description || "No description available"}
        </p>
      )}

      {/* Score badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {idea.overall_fit_score != null && idea.overall_fit_score > 0 && (
          <span className="badge-gold">
            FIT: {idea.overall_fit_score}%
          </span>
        )}
        {idea.time_to_first_dollar && (
          <span className="font-mono-tb text-[0.62rem] uppercase border px-2 py-0.5 text-muted-foreground border-border bg-transparent">
            {idea.time_to_first_dollar}
          </span>
        )}
      </div>

      {/* V6 Metrics */}
      <V6MetricsInline
        virality={idea.virality_potential}
        leverage={idea.leverage_score}
        automation={idea.automation_density}
        size="sm"
      />

      {/* FVS inline */}
      {idea.overall_fit_score != null && idea.overall_fit_score > 0 && (
        <div className="mt-2">
          <FinancialViabilityScoreInline score={idea.overall_fit_score} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => navigate(`/ideas/${idea.id}`)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90"
        >
          <Eye className="w-3.5 h-3.5" />
          OPEN
        </button>

        {!hasActiveVenture && !isNorthStar && onSetNorthStar && (
          <button
            onClick={() => onSetNorthStar(idea.id)}
            className="flex items-center gap-1.5 border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-colors hover:text-foreground hover:bg-secondary"
          >
            <Star className="w-3.5 h-3.5" />
            STAR
          </button>
        )}

        {isNorthStar && (
          <button
            onClick={() => navigate("/north-star")}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-opacity hover:opacity-90"
          >
            <Map className="w-3.5 h-3.5" />
            VIEW
          </button>
        )}

        {onPromote && (
          <button
            onClick={() => onPromote(idea.id)}
            className="flex items-center gap-1.5 border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-4 py-2.5 transition-colors hover:text-foreground hover:bg-secondary"
          >
            <FileText className="w-3.5 h-3.5" />
            WORK
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(idea.id)}
            className="flex items-center gap-1.5 text-destructive font-medium text-[0.78rem] uppercase px-3 py-2.5 transition-colors hover:bg-destructive/10 ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
