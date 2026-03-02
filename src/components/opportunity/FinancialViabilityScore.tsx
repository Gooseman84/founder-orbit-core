import { useState, useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Lock } from "lucide-react";

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

// Score verdict text
const getVerdict = (score: number) => {
  if (score >= 80) return "This venture shows exceptional financial promise.";
  if (score >= 60) return "A promising opportunity with strong fundamentals.";
  if (score >= 40) return "Viable with focused execution and validation.";
  if (score >= 20) return "Significant financial headwinds identified.";
  return "Reconsider the financial model before proceeding.";
};

const DIMENSIONS = [
  { key: "marketSize", label: "MARKET SIZE" },
  { key: "unitEconomics", label: "UNIT ECONOMICS" },
  { key: "timeToRevenue", label: "TIME TO REV" },
  { key: "competition", label: "COMPETITION" },
  { key: "capitalRequirements", label: "CAPITAL REQ" },
  { key: "founderMarketFit", label: "FOUNDER FIT" },
] as const;

const DIMENSION_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  marketSize: {
    title: "Market Size",
    description: "Total addressable market depth and growth trajectory. Evaluates whether the market can sustain meaningful revenue at scale.",
  },
  unitEconomics: {
    title: "Unit Economics",
    description: "Gross margin structure, customer acquisition cost relative to lifetime value, and path to profitable unit economics.",
  },
  timeToRevenue: {
    title: "Time to Revenue",
    description: "Speed from launch to first dollar. Shorter cycles reduce burn and validate demand faster.",
  },
  competition: {
    title: "Competitive Density",
    description: "Market saturation, barrier strength, and differentiation potential. Lower density signals more opportunity.",
  },
  capitalRequirements: {
    title: "Capital Requirements",
    description: "Upfront investment needed relative to founder resources. Lower requirements improve risk-adjusted returns.",
  },
  founderMarketFit: {
    title: "Founder-Market Fit",
    description: "Alignment between your skills, network, and domain expertise with the target market's demands.",
  },
};

// Confidence shift display config
const CONFIDENCE_CONFIG: Record<string, { label: string }> = {
  assumption_based: { label: "ASSUMPTION-BASED" },
  early_signal: { label: "EARLY SIGNAL" },
  partially_validated: { label: "PARTIALLY VALIDATED" },
  evidence_backed: { label: "EVIDENCE-BACKED" },
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
  const [animatedScore, setAnimatedScore] = useState(0);
  const [barsVisible, setBarsVisible] = useState(false);
  const hasAnimated = useRef(false);

  // Animate score counting up
  useEffect(() => {
    if (hasAnimated.current || score <= 0) return;
    hasAnimated.current = true;

    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setBarsVisible(true);
      }
    };

    requestAnimationFrame(tick);
  }, [score]);

  const canShowBreakdown = hasPro && showBreakdown && breakdown;
  const confidenceCfg = confidenceShift ? CONFIDENCE_CONFIG[confidenceShift] : null;

  // Convert score to /10 for display
  const displayScore = (animatedScore / 10).toFixed(1);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Radial glow background */}
      <div
        className="relative w-full flex flex-col items-center py-12"
        style={{
          background: "radial-gradient(circle at center, hsl(43 52% 54% / 0.08) 0%, transparent 60%)",
        }}
      >
        {/* Eyebrow */}
        <span className="label-mono-gold mb-6 tracking-[0.2em]">
          FINANCIAL VIABILITY SCORE™
        </span>

        {/* Animated score */}
        <div className="flex items-baseline gap-1">
          <span className="font-display font-black text-[4.5rem] sm:text-[6rem] md:text-[8rem] leading-none text-foreground transition-all duration-300">
            {displayScore}
          </span>
          <span className="font-display text-[2rem] sm:text-[3rem] text-muted-foreground">
            /10
          </span>
        </div>

        {/* Verdict */}
        <p className="mt-4 text-[1.1rem] font-light italic text-muted-foreground text-center max-w-md">
          {getVerdict(score)}
        </p>

        {/* Confidence badge */}
        {confidenceCfg && (
          <span className="badge-gold mt-4">
            {confidenceCfg.label}
          </span>
        )}
      </div>

      {/* Score card with dimension bars */}
      {showBreakdown && (
        <div className="w-full mt-8">
          {canShowBreakdown ? (
            <div className="card-gold-accent p-4 sm:p-10">
              {/* Dimension bars */}
              <div className="space-y-3">
                {DIMENSIONS.map((dim, i) => {
                  const value = breakdown[dim.key as keyof typeof breakdown] ?? 0;
                  return (
                    <div key={dim.key} className="flex items-center gap-2 sm:gap-4">
                      <span className="label-mono w-[90px] sm:w-[140px] shrink-0 text-right text-[0.55rem] sm:text-[0.65rem]">
                        {dim.label}
                      </span>
                      <div
                        className="flex-1 h-[3px] overflow-hidden"
                        style={{ background: "hsl(40 15% 93% / 0.06)" }}
                      >
                        <div
                          className="h-full bg-primary"
                          style={{
                            transformOrigin: "left",
                            transform: barsVisible ? `scaleX(${value / 100})` : "scaleX(0)",
                            transition: `transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 0.1}s`,
                          }}
                        />
                      </div>
                      <span className="font-mono-tb text-[0.65rem] text-primary w-7 text-right">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dimension explanation cards */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                {DIMENSIONS.map((dim) => {
                  const desc = DIMENSION_DESCRIPTIONS[dim.key];
                  const evidenceCount = dimensionEvidenceCounts?.[dim.key] || 0;
                  return (
                    <div
                      key={dim.key}
                      className="card-gold-left p-5"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[0.85rem] font-medium text-foreground">
                          {desc.title}
                        </span>
                        {evidenceCount > 0 && (
                          <span className="label-mono">
                            {evidenceCount} {evidenceCount === 1 ? "signal" : "signals"}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.78rem] font-light text-muted-foreground leading-relaxed">
                        {desc.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Locked state for trial users */
            <div
              className="w-full flex flex-col items-center justify-center border border-dashed py-12 px-6"
              style={{
                borderColor: "hsl(240 10% 14%)",
                background: "hsl(240 12% 7%)",
              }}
            >
              <Lock className="w-5 h-5 text-muted-foreground mb-3" />
              <p className="label-mono mb-4">DIMENSION BREAKDOWN LOCKED</p>
              {onUpgradeClick && (
                <button
                  onClick={onUpgradeClick}
                  className="w-full max-w-sm py-4 bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:opacity-90"
                >
                  Unlock Full Analysis
                </button>
              )}
              <p className="label-mono mt-4 text-center">
                BUILT WITH CFA-LEVEL METHODOLOGY · 7-DAY FREE TRIAL
              </p>
            </div>
          )}
        </div>
      )}

      {/* Last validated timestamp */}
      {lastValidatedAt && (
        <p className="mt-4 label-mono text-center">
          Last updated from validation: {new Date(lastValidatedAt).toLocaleDateString()}
        </p>
      )}

      {/* Trust element */}
      <p className="mt-2 label-mono text-center">
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
  const displayScore = (score / 10).toFixed(1);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-bold text-primary">
          {displayScore}
        </span>
        <span className="font-display text-sm text-muted-foreground">/10</span>
      </div>
      <div className="flex flex-col">
        <span className="label-mono-gold">FVS</span>
      </div>
    </div>
  );
}
