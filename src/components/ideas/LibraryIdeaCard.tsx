// src/components/ideas/LibraryIdeaCard.tsx
// Enhanced card for Library view that shows v6 metrics when available
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Zap, Eye, FileText, Trash2 } from "lucide-react";
import type { Idea } from "@/hooks/useIdeas";

interface LibraryIdeaCardProps {
  idea: Idea;
  onDelete?: (id: string) => void;
  onPromote?: (id: string) => void;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-orange-600";
};

const getModeLabel = (mode: string | null): string => {
  if (!mode) return "";
  const labels: Record<string, string> = {
    breadth: "Breadth",
    focus: "Focus",
    creator: "Creator",
    automation: "Automation",
    persona: "Persona",
    boundless: "Boundless",
    locker_room: "Locker Room",
    chaos: "Chaos",
    money_printer: "Money Printer",
    memetic: "Memetic",
    fusion: "Fusion",
    variant_chaos: "Variant (Chaos)",
    variant_creator: "Variant (Creator)",
    variant_automation: "Variant (Automation)",
    variant_memetic: "Variant (Memetic)",
  };
  return labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1).replace("_", " ");
};

const getModeVariant = (mode: string | null): "default" | "secondary" | "outline" | "destructive" => {
  if (!mode) return "outline";
  if (mode.includes("chaos") || mode === "locker_room") return "destructive";
  if (mode === "fusion") return "default";
  if (mode.includes("variant")) return "secondary";
  return "outline";
};

export function LibraryIdeaCard({ idea, onDelete, onPromote }: LibraryIdeaCardProps) {
  const navigate = useNavigate();
  const isV6 = idea.engine_version === "v6";

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg leading-tight">{idea.title}</CardTitle>
            {isV6 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-1">
                <Zap className="w-3 h-3" />v6
              </span>
            )}
          </div>
          {idea.mode && (
            <Badge variant={getModeVariant(idea.mode)} className="text-xs shrink-0">
              {getModeLabel(idea.mode)}
            </Badge>
          )}
        </div>
        {(idea.category || idea.business_model_type) && (
          <CardDescription className="text-sm font-medium">
            {idea.category || idea.business_model_type}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {idea.description || "No description available"}
        </p>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1 text-xs">
          {idea.platform && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {idea.platform}
            </span>
          )}
          {idea.target_customer && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground line-clamp-1">
              {idea.target_customer.length > 30 
                ? idea.target_customer.slice(0, 30) + "..." 
                : idea.target_customer}
            </span>
          )}
          {idea.time_to_first_dollar && (
            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {idea.time_to_first_dollar}
            </span>
          )}
        </div>

        {/* v6 Metrics */}
        {isV6 && (idea.leverage_score || idea.automation_density || idea.virality_potential) && (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {idea.leverage_score != null && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                Leverage: {idea.leverage_score}%
              </span>
            )}
            {idea.automation_density != null && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                Automation: {idea.automation_density}%
              </span>
            )}
            {idea.virality_potential != null && (
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
                Virality: {idea.virality_potential}%
              </span>
            )}
          </div>
        )}

        {/* Overall Fit Score */}
        {idea.overall_fit_score != null && idea.overall_fit_score > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Fit</span>
              <span className={`font-bold ${getScoreColor(idea.overall_fit_score)}`}>
                {idea.overall_fit_score}%
              </span>
            </div>
            <Progress value={idea.overall_fit_score} className="h-1.5" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <Button
            onClick={() => navigate(`/ideas/${idea.id}`)}
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Open
          </Button>
          {onPromote && (
            <Button
              onClick={() => onPromote(idea.id)}
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Workspace
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(idea.id)}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}