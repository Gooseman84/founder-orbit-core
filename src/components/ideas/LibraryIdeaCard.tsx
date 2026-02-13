// src/components/ideas/LibraryIdeaCard.tsx
// Enhanced card for Library view that shows v6 metrics and market signal details
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Eye, FileText, Trash2, AlertCircle, Lightbulb, ListChecks, Star, Map } from "lucide-react";
import { V6MetricsInline } from "@/components/shared/V6MetricBadge";
import { ModeBadge } from "@/components/shared/ModeBadge";
import { CategoryBadge } from "@/components/shared/CategoryBadge";
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
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-orange-600 dark:text-orange-400";
};

export function LibraryIdeaCard({ idea, onDelete, onPromote, onSetNorthStar, hasActiveVenture = false }: LibraryIdeaCardProps) {
  const navigate = useNavigate();
  const isV6 = idea.engine_version === "v6";
  const isMarketSignal = (idea as any).source_type === "market_signal";
  const isImported = (idea as any).source_type === "imported";
  const isNorthStar = idea.status === "north_star";
  
  // Extract idea_payload and pain themes from source_meta for market signal and imported ideas
  const sourceMeta = (idea as any).source_meta as SourceMeta | null;
  const ideaPayload = sourceMeta?.idea_payload;
  const painThemes = sourceMeta?.inferred_pain_themes;
  const variantLabel = sourceMeta?.variant_label;

  return (
    <Card className={`hover:shadow-lg transition-all duration-200 flex flex-col group hover:border-primary/30 overflow-hidden ${isNorthStar ? 'ring-2 ring-amber-500/40 border-amber-500/30' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
              {idea.title}
            </CardTitle>
            {/* North Star Badge */}
            {isNorthStar && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 px-2 py-0.5">
                <Star className="w-3 h-3 fill-current" />
                North Star
              </Badge>
            )}
            {isV6 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-1">
                <Zap className="w-3 h-3" />v6
              </span>
            )}
            {/* Variant label for imported ideas */}
            {isImported && variantLabel && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400">
                Variant {variantLabel}
              </span>
            )}
            <SourceTypeBadge sourceType={(idea as any).source_type} size="sm" />
          </div>
          <ModeBadge mode={idea.mode} size="sm" />
        </div>
        {(idea.category || idea.business_model_type) && (
          <CardDescription className="text-sm font-medium">
            {idea.category || idea.business_model_type}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Market Signal or Imported enhanced content */}
        {(isMarketSignal || isImported) && ideaPayload ? (
          <div className="space-y-2.5">
            {/* Problem */}
            {ideaPayload.problem && (
              <div className="flex gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">Problem:</span> {ideaPayload.problem}
                </p>
              </div>
            )}
            
            {/* Why it fits */}
            {ideaPayload.why_it_fits && (
              <div className="flex gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">Why it fits:</span> {ideaPayload.why_it_fits}
                </p>
              </div>
            )}
            
            {/* First steps preview */}
            {ideaPayload.first_steps && ideaPayload.first_steps.length > 0 && (
              <div className="flex gap-2">
                <ListChecks className="w-3.5 h-3.5 text-accent-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {ideaPayload.first_steps.length} steps available
                </p>
              </div>
            )}
            
            {/* Pain Themes Toggle */}
            {painThemes && painThemes.length > 0 && (
              <PainThemesPanel themes={painThemes} variant="compact" />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {idea.description || "No description available"}
          </p>
        )}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          <CategoryBadge type="platform" value={idea.platform} size="sm" />
          {idea.target_customer && (
            <CategoryBadge 
              value={idea.target_customer.length > 25 ? idea.target_customer.slice(0, 25) + "..." : idea.target_customer} 
              size="sm" 
            />
          )}
          {idea.time_to_first_dollar && (
            <CategoryBadge value={idea.time_to_first_dollar} size="sm" />
          )}
        </div>

        {/* v6 Metrics */}
        <V6MetricsInline
          virality={idea.virality_potential}
          leverage={idea.leverage_score}
          automation={idea.automation_density}
          size="sm"
        />

        {/* Financial Viability Score */}
        {idea.overall_fit_score != null && idea.overall_fit_score > 0 && (
          <FinancialViabilityScoreInline score={idea.overall_fit_score} />
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 sm:flex gap-2 mt-auto pt-2">
          <Button
            onClick={() => navigate(`/ideas/${idea.id}`)}
            variant={hasActiveVenture ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="truncate">Open</span>
          </Button>
          
          {/* When no active venture: show North Star and Commit actions */}
          {!hasActiveVenture && (
            <>
              {!isNorthStar && onSetNorthStar && (
                <Button
                  onClick={() => onSetNorthStar(idea.id)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                >
                  <Star className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">North Star</span>
                  <span className="sm:hidden truncate">Star</span>
                </Button>
              )}
              
              {isNorthStar && (
                <Button
                  onClick={() => navigate("/north-star")}
                  variant="default"
                  size="sm"
                  className="gap-1.5 bg-amber-500 hover:bg-amber-600"
                >
                  <Map className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline truncate">View North Star</span>
                  <span className="sm:hidden truncate">View</span>
                </Button>
              )}
            </>
          )}
          
          {onPromote && (
            <Button
              onClick={() => onPromote(idea.id)}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline truncate">Workspace</span>
              <span className="sm:hidden truncate">Work</span>
            </Button>
          )}
          
          {onDelete && (
            <Button
              onClick={() => onDelete(idea.id)}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 col-span-2 sm:col-span-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sm:hidden ml-1">Delete</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
