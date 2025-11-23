import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IdeaAnalysis } from "@/hooks/useIdeaDetail";
import { AlertTriangle, TrendingUp, Users, DollarSign, Target } from "lucide-react";

interface IdeaVettingCardProps {
  analysis: IdeaAnalysis;
}

export const IdeaVettingCard = ({ analysis }: IdeaVettingCardProps) => {
  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return "Not scored";
    if (score >= 90) return "Exceptional";
    if (score >= 70) return "Solid";
    if (score >= 50) return "Possible";
    if (score >= 30) return "Challenging";
    return "Not Recommended";
  };

  const risks = Array.isArray(analysis.main_risks) 
    ? analysis.main_risks 
    : typeof analysis.main_risks === 'string' 
      ? JSON.parse(analysis.main_risks)
      : [];

  return (
    <div className="space-y-6">
      {/* Niche Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Viability Assessment</span>
            <Badge variant={analysis.niche_score && analysis.niche_score >= 70 ? "default" : "destructive"}>
              {getScoreLabel(analysis.niche_score)}
            </Badge>
          </CardTitle>
          <CardDescription>Overall viability score for this business idea</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">Niche Score</span>
            <span className={`text-3xl font-bold ${getScoreColor(analysis.niche_score)}`}>
              {analysis.niche_score || 0}/100
            </span>
          </div>
          <Progress value={analysis.niche_score || 0} className="h-3" />
        </CardContent>
      </Card>

      {/* Brutal Take */}
      {analysis.brutal_take && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">The Brutal Truth</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            {analysis.brutal_take}
          </AlertDescription>
        </Alert>
      )}

      {/* Market Analysis Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {analysis.market_overview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.market_overview}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.problem_intensity && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Problem Intensity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.problem_intensity}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.competition_snapshot && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Competition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.competition_snapshot}
              </p>
            </CardContent>
          </Card>
        )}

        {analysis.pricing_range && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Pricing Range
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.pricing_range}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Risks */}
      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Main Risks</CardTitle>
            <CardDescription>Key threats to consider before pursuing this idea</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {risks.map((risk: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{risk}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Suggested Modifications */}
      {analysis.suggested_modifications && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Suggested Improvements</CardTitle>
            <CardDescription>Actionable changes to increase success odds</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">
              {analysis.suggested_modifications}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
