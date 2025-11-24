// src/components/ideas/IdeaVettingCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IdeaAnalysis } from "@/hooks/useIdeaDetail";
import { AlertTriangle, TrendingUp, Users, DollarSign, Target } from "lucide-react";

interface IdeaVettingCardProps {
  analysis: IdeaAnalysis;
}

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

const parseRisks = (risks: any): string[] => {
  if (Array.isArray(risks)) return risks;
  if (typeof risks === "string") {
    try {
      return JSON.parse(risks);
    } catch {
      return [];
    }
  }
  return [];
};

export const IdeaVettingCard = ({ analysis }: IdeaVettingCardProps) => {
  const risks = parseRisks(analysis.biggest_risks);
  const advantages = parseRisks(analysis.unfair_advantages);
  const recommendations = parseRisks(analysis.recommendations);

  return (
    <div className="space-y-6">
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

      {analysis.brutal_honesty && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-bold">The Brutal Truth</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">{analysis.brutal_honesty}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {analysis.market_insight && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Market Insight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.market_insight}</p>
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
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.problem_intensity}</p>
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
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.competition_snapshot}</p>
            </CardContent>
          </Card>
        )}

        {analysis.pricing_power && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Pricing Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.pricing_power}</p>
            </CardContent>
          </Card>
        )}

        {analysis.success_likelihood && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Success Likelihood
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{analysis.success_likelihood}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {risks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Biggest Risks</CardTitle>
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

      {advantages.length > 0 && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Unfair Advantages</CardTitle>
            <CardDescription>Unique strengths that give you an edge</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {advantages.map((advantage: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{advantage}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Recommendations</CardTitle>
            <CardDescription>Actionable steps to increase success odds</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis.ideal_customer_profile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Ideal Customer Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.ideal_customer_profile}</p>
          </CardContent>
        </Card>
      )}

      {analysis.elevator_pitch && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Elevator Pitch</CardTitle>
            <CardDescription>One-line pitch for this business idea</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium leading-relaxed">{analysis.elevator_pitch}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
