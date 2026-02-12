// src/components/discover/RecommendationCard.tsx
import { useState } from "react";
import { 
  Target, 
  DollarSign, 
  Clock, 
  Wallet, 
  AlertTriangle, 
  Rocket,
  Bookmark,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FinancialViabilityScore } from "@/components/opportunity/FinancialViabilityScore";
import type { Recommendation } from "@/types/recommendation";

interface RecommendationCardProps {
  recommendation: Recommendation;
  rank: number;
  onCommit: (recommendation: Recommendation) => void;
  onSave: (recommendation: Recommendation) => void;
  isCommitting?: boolean;
  isSaving?: boolean;
}

export function RecommendationCard({
  recommendation,
  rank,
  onCommit,
  onSave,
  isCommitting = false,
  isSaving = false,
}: RecommendationCardProps) {
  const [isExpanded, setIsExpanded] = useState(rank === 1);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-amber-500 text-amber-950";
      case 2:
        return "bg-gray-300 text-gray-700";
      case 3:
        return "bg-amber-700 text-amber-100";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500 text-white";
    if (score >= 60) return "bg-blue-500 text-white";
    if (score >= 40) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Header - Always Visible */}
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Rank Badge */}
            <div
              className={cn(
                "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm",
                getRankColor(rank)
              )}
            >
              #{rank}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name */}
              <h3 className="font-semibold text-lg leading-tight truncate">
                {recommendation.name}
              </h3>
              {/* One-liner */}
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {recommendation.oneLiner}
              </p>
            </div>
          </div>

          {/* Fit Score */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm",
                getScoreColor(recommendation.fitScore)
              )}
            >
              {recommendation.fitScore}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Why This Founder - Most Important Section */}
          <div className="bg-primary/5 rounded-lg p-4 mb-4 border border-primary/10">
            <h4 className="font-medium text-sm text-primary mb-2 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Why this fits you
            </h4>
            <p className="text-sm text-foreground leading-relaxed">
              {recommendation.whyThisFounder}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <DetailItem
              icon={Target}
              label="Target Customer"
              value={recommendation.targetCustomer}
            />
            <DetailItem
              icon={DollarSign}
              label="Revenue Model"
              value={recommendation.revenueModel}
            />
            <DetailItem
              icon={Clock}
              label="Time to Revenue"
              value={recommendation.timeToFirstRevenue}
            />
            <DetailItem
              icon={Wallet}
              label="Capital Needed"
              value={recommendation.capitalRequired}
            />
          </div>

          {/* Key Risk */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                  Key Risk
                </span>
                <p className="text-sm text-amber-900 mt-0.5">
                  {recommendation.keyRisk}
                </p>
              </div>
            </div>
          </div>

          {/* First Step */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Rocket className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  First Step (This Week)
                </span>
                <p className="text-sm text-emerald-900 mt-0.5">
                  {recommendation.firstStep}
                </p>
              </div>
            </div>
          </div>

          {/* Financial Viability Score */}
          <div className="border-t pt-4 mt-2">
            <FinancialViabilityScore
              score={recommendation.fitScore}
              breakdown={{
                marketSize: recommendation.fitBreakdown.marketTiming,
                unitEconomics: recommendation.fitBreakdown.revenueAlignment,
                timeToRevenue: recommendation.fitBreakdown.feasibility,
                competition: 70, // Default estimate
                capitalRequirements: recommendation.fitBreakdown.feasibility,
                founderMarketFit: recommendation.fitBreakdown.founderMarketFit,
              }}
              showBreakdown={true}
              size="md"
            />
          </div>

          {/* Fit Breakdown */}
          <FitBreakdownBar breakdown={recommendation.fitBreakdown} />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={() => onCommit(recommendation)}
              variant="gradient"
              className="flex-1"
              size="lg"
              disabled={isCommitting}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {isCommitting ? "Saving…" : "This is the one"}
            </Button>
            <Button
              onClick={() => onSave(recommendation)}
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={isSaving}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save for Later"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="text-sm font-medium line-clamp-2">{value}</span>
      </div>
    </div>
  );
}

function FitBreakdownBar({
  breakdown,
}: {
  breakdown: Recommendation["fitBreakdown"];
}) {
  const items = [
    { label: "Founder-Market Fit", value: breakdown.founderMarketFit, weight: "40%" },
    { label: "Feasibility", value: breakdown.feasibility, weight: "30%" },
    { label: "Revenue Alignment", value: breakdown.revenueAlignment, weight: "20%" },
    { label: "Market Timing", value: breakdown.marketTiming, weight: "10%" },
  ];

  return (
    <div className="border-t pt-3">
      <p className="text-xs text-muted-foreground mb-2">Fit Score Breakdown</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-28 flex-shrink-0">
              {item.label}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${item.value}%` }}
              />
            </div>
            <span className="text-xs font-medium w-8 text-right">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
