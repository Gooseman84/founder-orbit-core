import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
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
  confidenceShift?: string;
  lastValidatedAt?: string;
  dimensionEvidenceCounts?: Record<string, number>;
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

// Confidence shift display config
const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  assumption_based: { label: "Assumption-Based", color: "text-muted-foreground bg-muted/50 border-muted-foreground/20" },
  early_signal: { label: "Early Signal", color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30" },
  partially_validated: { label: "Partially Validated", color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  evidence_backed: { label: "Evidence-Backed", color: "text-green-600 bg-green-500/10 border-green-500/30" },
};

// Size configurations
const sizeConfig = {
  sm: { gauge: 100, strokeWidth: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  md: { gauge: 140, strokeWidth: 10, fontSize: "text-3xl", labelSize: "text-sm" },
  lg: { gauge: 180, strokeWidth: 12, fontSize: "text-4xl", labelSize: "text-base" },
};

// Dimension key to label map for evidence tooltip
const DIMENSION_LABELS: Record<string, string> = {
  marketSize: "Market Size",
  unitEconomics: "Unit Economics",
  timeToRevenue: "Time to Revenue",
  competitiveDensity: "Competitive Density",
  capitalRequirements: "Capital Requirements",
  founderMarketFit: "Founder-Market Fit",
};

export function FinancialViabilityScore({
  score,
  breakdown,
  showBreakdown = false,
  size = "md",
  className,
  onUpgradeClick,
  confidenceShift,
  lastValidatedAt,
  dimensionEvidenceCounts,
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
      { axis: "Market Size", value: breakdown.marketSize, key: "marketSize" },
      { axis: "Unit Economics", value: breakdown.unitEconomics, key: "unitEconomics" },
      { axis: "Time to Revenue", value: breakdown.timeToRevenue, key: "timeToRevenue" },
      { axis: "Competition", value: breakdown.competition, key: "competitiveDensity" },
      { axis: "Capital Req.", value: breakdown.capitalRequirements, key: "capitalRequirements" },
      { axis: "Founder Fit", value: breakdown.founderMarketFit, key: "founderMarketFit" },
    ];
  }, [breakdown]);

  const canShowBreakdown = hasPro && showBreakdown && breakdown;
  const confidenceCfg = confidenceShift ? CONFIDENCE_CONFIG[confidenceShift] : null;

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
          {/* Progress circle with smooth transition */}
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
            className="transition-all duration-[600ms] ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(config.fontSize, "font-bold transition-all duration-[600ms]", scoreColors.text)}>
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

      {/* Confidence Badge */}
      {confidenceCfg && (
        <span className={cn(
          "mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border",
          confidenceCfg.color
        )}>
          {confidenceCfg.label}
        </span>
      )}

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
            <>
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
                    <RechartsTooltip 
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

              {/* Dimension bars with evidence indicators */}
              {dimensionEvidenceCounts && (
                <TooltipProvider>
                  <div className="mt-3 space-y-2">
                    {radarData.map((dim) => {
                      const evidenceCount = dimensionEvidenceCounts[dim.key] || 0;
                      return (
                        <div key={dim.key} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-24 text-right shrink-0 truncate">
                            {dim.axis}
                          </span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-[600ms] ease-out"
                              style={{
                                width: `${dim.value}%`,
                                backgroundColor: scoreColors.stroke,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-medium w-6 text-right">{dim.value}</span>
                          {evidenceCount > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center cursor-help shrink-0">
                                  <Info className="w-2.5 h-2.5 text-primary" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="text-xs">
                                Informed by {evidenceCount} evidence {evidenceCount === 1 ? "entry" : "entries"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </>
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

      {/* Last validated timestamp */}
      {lastValidatedAt && (
        <p className="mt-2 text-[10px] text-muted-foreground/70 text-center">
          Last updated from validation: {new Date(lastValidatedAt).toLocaleDateString()}
        </p>
      )}

      {/* Trust Element */}
      <p className="mt-1 text-[10px] text-muted-foreground/70 text-center">
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
