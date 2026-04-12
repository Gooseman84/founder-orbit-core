import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Quote,
  Shield,
  ChevronDown,
  ExternalLink,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import type { MarketValidationResult } from "@/hooks/useMarketValidation";

interface MarketValidationCardProps {
  result: MarketValidationResult | null;
  isValidating: boolean;
  error: string | null;
  onValidate: () => void;
  ideaTitle: string;
}

const timingConfig = {
  growing: { icon: TrendingUp, label: "Growing", color: "text-green-600", bg: "bg-green-500/10 border-green-500/30" },
  stable: { icon: Minus, label: "Stable", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
  declining: { icon: TrendingDown, label: "Declining", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

export const MarketValidationCard = ({
  result,
  isValidating,
  error,
  onValidate,
  ideaTitle,
}: MarketValidationCardProps) => {
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [showSignals, setShowSignals] = useState(true);

  if (!result && !isValidating) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Globe className="w-10 h-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold mb-1">Real-Time Market Validation</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Search Reddit, G2, forums, and the web for real demand signals and competitors.
          </p>
          <Button onClick={onValidate} disabled={isValidating} className="gap-2">
            <Sparkles className="w-4 h-4" />
            Validate Market
          </Button>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (isValidating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
          <p className="text-sm text-muted-foreground">Searching the real web for market evidence...</p>
          <p className="text-xs text-muted-foreground mt-1">This takes 10-15 seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const timing = timingConfig[result.market_timing];
  const TimingIcon = timing.icon;
  const scoreColor =
    result.validation_score >= 70
      ? "text-green-600"
      : result.validation_score >= 40
        ? "text-amber-600"
        : "text-destructive";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Market Validation
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onValidate} disabled={isValidating} className="text-xs gap-1.5">
            <Sparkles className="w-3 h-3" />
            Re-validate
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Score + Timing row */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Market Evidence Score</span>
              <span className={`text-lg font-bold ${scoreColor}`}>{result.validation_score}/100</span>
            </div>
            <Progress value={result.validation_score} className="h-2" />
          </div>
          <Badge variant="outline" className={`${timing.bg} gap-1.5 shrink-0`}>
            <TimingIcon className={`w-3.5 h-3.5 ${timing.color}`} />
            <span className={timing.color}>{timing.label}</span>
          </Badge>
        </div>

        {/* Reality check */}
        {result.reality_check && (
          <div className="p-3 bg-muted/40 rounded-lg">
            <p className="text-sm text-muted-foreground leading-relaxed">{result.reality_check}</p>
          </div>
        )}

        <Separator />

        {/* Demand Signals */}
        <Collapsible open={showSignals} onOpenChange={setShowSignals}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Quote className="w-4 h-4 text-primary" />
              Demand Signals ({result.demand_signals.length})
            </h4>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSignals ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {result.demand_signals.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <AlertTriangle className="w-4 h-4" />
                No strong demand signals found — this could mean the market is untested.
              </div>
            ) : (
              result.demand_signals.map((signal, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{signal.source}</Badge>
                  </div>
                  <p className="text-sm italic text-muted-foreground">"{signal.quote}"</p>
                  <p className="text-xs text-muted-foreground">{signal.relevance}</p>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Competitor Landscape */}
        <Collapsible open={showCompetitors} onOpenChange={setShowCompetitors}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Competitors ({result.competitor_landscape.length})
            </h4>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCompetitors ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3">
            {result.competitor_landscape.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No direct competitors found — potential blue ocean.</p>
            ) : (
              result.competitor_landscape.map((comp, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{comp.name}</span>
                    {comp.pricing && (
                      <span className="text-[10px] text-muted-foreground">{comp.pricing}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{comp.what_they_do}</p>
                  <p className="text-xs text-destructive/80">Weakness: {comp.weakness}</p>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Sources */}
        {result.sources.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Sources ({result.sources.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {result.sources.map((url, i) => {
                  let domain = url;
                  try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      {domain}
                    </a>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
