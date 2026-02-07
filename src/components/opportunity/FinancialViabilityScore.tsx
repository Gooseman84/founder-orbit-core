import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

interface FinancialViabilityScoreProps {
  score: number; // 0-100
  breakdown?: {
    marketSize: number;
    unitEconomics: number;
    timeToRevenue: number;
    competition: number;
    capitalRequirements: number;
    founderMarketFit: number;
  };
  showBreakdown?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  onUpgradeClick?: () => void;
}

// Get score color based on value
const getScoreColor = (score: number) => {
  if (score >= 61) return { text: "text-green-600", bg: "bg-green-600", stroke: "#16a34a" };
  if (score >= 31) return { text: "text-amber-600", bg: "bg-amber-600", stroke: "#d97706" };
  return { text: "text-red-600", bg: "bg-red-600", stroke: "#dc2626" };
};

// Get badge text and style based on score
const getScoreBadge = (score: number) => {
  if (score >= 80) return { text: "Strong opportunity", className: "bg-green-500/10 text-green-600 border-green-500/30" };
  if (score >= 60) return { text: "Promising with caveats", className: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
  if (score >= 40) return { text: "Needs validation", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" };
  if (score >= 20) return { text: "Significant risks", className: "bg-orange-500/10 text-orange-600 border-orange-500/30" };
  return { text: "Reconsider this direction", className: "bg-red-500/10 text-red-600 border-red-500/30" };
};

// Size configurations
const sizeConfig = {
  sm: { gauge: 100, strokeWidth: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  md: { gauge: 140, strokeWidth: 10, fontSize: "text-3xl", labelSize: "text-sm" },
  lg: { gauge: 180, strokeWidth: 12, fontSize: "text-4xl", labelSize: "text-base" },
};

export function FinancialViabilityScore({
  score,
  breakdown,
  showBreakdown = false,
  size = "md",
  className,
  onUpgradeClick,
}: FinancialViabilityScoreProps) {
  const { hasPro } = useFeatureAccess();
  const config = sizeConfig[size];
  const scoreColors = getScoreColor(score);
  const badge = getScoreBadge(score);

  // Calculate gauge parameters
  const radius = (config.gauge - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!breakdown) return [];
    return [
      { axis: "Market Size", value: breakdown.marketSize },
      { axis: "Unit Economics", value: breakdown.unitEconomics },
      { axis: "Time to Revenue", value: breakdown.timeToRevenue },
      { axis: "Competition", value: breakdown.competition },
      { axis: "Capital Req.", value: breakdown.capitalRequirements },
      { axis: "Founder Fit", value: breakdown.founderMarketFit },
    ];
  }, [breakdown]);

  const canShowBreakdown = hasPro && showBreakdown && breakdown;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Circular Gauge */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.gauge, height: config.gauge }}
      >
        <svg
          className="absolute inset-0 transform -rotate-90"
          width={config.gauge}
          height={config.gauge}
        >
          {/* Background circle */}
          <circle
            cx={config.gauge / 2}
            cy={config.gauge / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            fill="none"
            className="text-muted opacity-20"
          />
          {/* Progress circle */}
          <circle
            cx={config.gauge / 2}
            cy={config.gauge / 2}
            r={radius}
            stroke={scoreColors.stroke}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(config.fontSize, "font-bold", scoreColors.text)}>
            {Math.round(score)}
          </span>
          <span className={cn(config.labelSize, "text-muted-foreground")}>
            / 100
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="mt-2 text-sm font-medium text-center text-muted-foreground">
        Financial Viability Score
      </p>

      {/* Badge */}
      <span className={cn(
        "mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        badge.className
      )}>
        {badge.text}
      </span>

      {/* Radar Chart Breakdown (Pro only) */}
      {showBreakdown && breakdown && (
        <div className="mt-4 w-full">
          {canShowBreakdown ? (
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="axis" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <PolarRadiusAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 8 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke={scoreColors.stroke}
                    fill={scoreColors.stroke}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px"
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // Locked state for trial users
            <div className="relative mt-2">
              <div className="w-full h-36 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 backdrop-blur-sm">
                <div className="text-center space-y-2">
                  <Lock className="w-5 h-5 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Upgrade to see full breakdown
                  </p>
                  {onUpgradeClick && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onUpgradeClick}
                      className="text-xs h-7"
                    >
                      Upgrade to Pro
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trust Element */}
      <p className="mt-3 text-[10px] text-muted-foreground/70 text-center">
        Scored using CFA-grade financial analysis
      </p>
    </div>
  );
}

// Compact inline version for cards
export function FinancialViabilityScoreInline({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const scoreColors = getScoreColor(score);
  const badge = getScoreBadge(score);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2",
        scoreColors.text,
        score >= 61 ? "border-green-500/30" : score >= 31 ? "border-amber-500/30" : "border-red-500/30"
      )}>
        {Math.round(score)}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium">Financial Viability</span>
        <span className={cn("text-[10px]", badge.className.includes("green") ? "text-green-600" : badge.className.includes("blue") ? "text-blue-600" : badge.className.includes("amber") ? "text-amber-600" : "text-red-600")}>
          {badge.text}
        </span>
      </div>
    </div>
  );
}
