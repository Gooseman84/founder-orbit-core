import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText, TrendingUp, Users, Zap, Shield, Target, Wind, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface OpportunityScore {
  id: string;
  total_score: number;
  sub_scores: {
    founder_fit: number;
    market_size: number;
    pain_intensity: number;
    competition: number;
    difficulty: number;
    tailwinds: number;
  };
  explanation: string;
  recommendations: string[];
  created_at: string;
}

interface OpportunityScoreCardProps {
  score: OpportunityScore;
  ideaId: string;
}

export function OpportunityScoreCard({ score, ideaId }: OpportunityScoreCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    if (!user?.id) return;

    setDownloading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/opportunity-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            ideaId: ideaId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get the blob from response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `opportunity-report-${ideaId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded!",
        description: "Your opportunity report has been downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Error downloading report:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download opportunity report.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getScoreColor = (value: number) => {
    if (value >= 70) return "text-green-600";
    if (value >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (value: number) => {
    if (value >= 70) return "bg-green-600";
    if (value >= 40) return "bg-yellow-600";
    return "bg-red-600";
  };

  const subScoreItems = [
    {
      label: "Founder Fit",
      value: score.sub_scores.founder_fit,
      icon: Target,
      description: "Alignment with your skills and passions",
    },
    {
      label: "Market Size",
      value: score.sub_scores.market_size,
      icon: TrendingUp,
      description: "Total addressable market opportunity",
    },
    {
      label: "Pain Intensity",
      value: score.sub_scores.pain_intensity,
      icon: Zap,
      description: "Urgency and willingness to pay",
    },
    {
      label: "Competition",
      value: score.sub_scores.competition,
      icon: Users,
      description: "Lower competition = higher score",
    },
    {
      label: "Difficulty",
      value: score.sub_scores.difficulty,
      icon: Shield,
      description: "Lower difficulty = higher score",
    },
    {
      label: "Tailwinds",
      value: score.sub_scores.tailwinds,
      icon: Wind,
      description: "Favorable industry and tech trends",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opportunity Score Analysis</CardTitle>
        <CardDescription>
          Comprehensive evaluation based on multiple success factors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Score Gauge */}
        <div className="flex flex-col items-center justify-center p-6 bg-secondary/20 rounded-lg">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Circular background */}
            <svg className="absolute inset-0 transform -rotate-90" width="160" height="160">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(score.total_score / 100) * 440} 440`}
                className={getScoreColor(score.total_score)}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(score.total_score)}`}>
                {score.total_score}
              </div>
              <div className="text-sm text-muted-foreground">out of 100</div>
            </div>
          </div>
          <p className="mt-4 text-sm font-medium text-center">
            {score.total_score >= 70
              ? "Strong Opportunity"
              : score.total_score >= 40
              ? "Moderate Opportunity"
              : "Weak Opportunity"}
          </p>
        </div>

        {/* Sub-scores */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Score Breakdown</h3>
          {subScoreItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(item.value)}`}>
                    {item.value}/100
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all ${getScoreBackground(
                      item.value
                    )}`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Analysis</h3>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <p className="text-sm leading-relaxed">{score.explanation}</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Recommendations</h3>
          <ul className="space-y-2">
            {score.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-2" />
                <span className="text-sm leading-relaxed">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download Report Button */}
        <div className="pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleDownloadReport}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Opportunity Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
