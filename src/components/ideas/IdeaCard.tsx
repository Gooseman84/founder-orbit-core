// src/components/ideas/IdeaCard.tsx
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Idea } from "@/hooks/useIdeas";

interface IdeaCardProps {
  idea: Idea;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-orange-600";
};

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

export const IdeaCard = ({ idea }: IdeaCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => navigate(`/ideas/${idea.id}`)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-xl leading-tight">{idea.title}</CardTitle>
          {idea.complexity && <Badge variant={getComplexityVariant(idea.complexity)}>{idea.complexity}</Badge>}
        </div>
        {idea.business_model_type && (
          <CardDescription className="text-sm font-medium">{idea.business_model_type}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-3">{idea.description || "No description available"}</p>

        {idea.target_customer && (
          <div className="text-sm">
            <span className="text-muted-foreground">Target: </span>
            <span className="font-medium">{idea.target_customer}</span>
          </div>
        )}

        {idea.time_to_first_dollar && (
          <div className="text-sm">
            <span className="text-muted-foreground">Time to first $: </span>
            <span className="font-medium">{idea.time_to_first_dollar}</span>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Fit</span>
            <span className={`font-bold ${getScoreColor(idea.overall_fit_score)}`}>{idea.overall_fit_score || 0}%</span>
          </div>
          <Progress value={idea.overall_fit_score || 0} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-xs">
            <div className="text-muted-foreground">Passion</div>
            <div className="font-medium">{idea.passion_fit_score || 0}%</div>
          </div>
          <div className="text-xs">
            <div className="text-muted-foreground">Skills</div>
            <div className="font-medium">{idea.skill_fit_score || 0}%</div>
          </div>
          <div className="text-xs">
            <div className="text-muted-foreground">Constraints</div>
            <div className="font-medium">{idea.constraint_fit_score || 0}%</div>
          </div>
          <div className="text-xs">
            <div className="text-muted-foreground">Lifestyle</div>
            <div className="font-medium">{idea.lifestyle_fit_score || 0}%</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
