import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, Users, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ChosenIdeaCardProps {
  idea: any | null;
  analysis: any | null;
  loading?: boolean;
}

export function ChosenIdeaCard({ idea, analysis, loading }: ChosenIdeaCardProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Chosen Idea & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!idea) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Chosen Idea & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm mb-4">
            No idea selected as your North Star yet.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/ideas")}>
            Explore Ideas
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Chosen Idea & Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Idea Title & Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{idea.title}</h3>
            {idea.overall_fit_score && (
              <Badge variant="default" className="text-xs">
                Fit: {idea.overall_fit_score}/100
              </Badge>
            )}
          </div>
          {idea.description && (
            <p className="text-sm text-muted-foreground">{idea.description}</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Target Customer</p>
              <p className="text-sm">{idea.target_customer || "Not defined"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Business Model</p>
              <p className="text-sm capitalize">{idea.business_model_type?.replace(/_/g, " ") || "Not defined"}</p>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        {analysis && (
          <div className="pt-3 border-t border-border space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Latest Analysis
            </h4>

            {analysis.niche_score && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Niche Score:</span>
                <Badge variant={analysis.niche_score >= 70 ? "default" : "secondary"}>
                  {analysis.niche_score}/100
                </Badge>
              </div>
            )}

            {analysis.market_insight && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Market Insight</p>
                <p className="text-sm">{analysis.market_insight}</p>
              </div>
            )}

            {analysis.elevator_pitch && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Elevator Pitch</p>
                <p className="text-sm italic">"{analysis.elevator_pitch}"</p>
              </div>
            )}

            {analysis.biggest_risks?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Top Risks
                </p>
                <ul className="text-sm space-y-1">
                  {analysis.biggest_risks.slice(0, 3).map((risk: string, i: number) => (
                    <li key={i} className="text-muted-foreground">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => navigate(`/ideas/${idea.id}`)}
        >
          View Full Details
        </Button>
      </CardContent>
    </Card>
  );
}
