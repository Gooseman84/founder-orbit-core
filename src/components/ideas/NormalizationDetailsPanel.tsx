import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Users, 
  AlertTriangle, 
  Lightbulb, 
  DollarSign, 
  Rocket, 
  HelpCircle,
  CheckCircle,
  Shield
} from "lucide-react";

interface NormalizedData {
  one_liner?: string;
  icp?: {
    primary_buyer?: string;
    end_user?: string;
    industry?: string;
    company_size?: string;
  };
  pain?: {
    problem?: string;
    trigger?: string;
    cost_of_inaction?: string;
  };
  alternatives?: string[];
  uvp?: string;
  business_model?: {
    type?: string;
    pricing_guess?: string;
    why_plausible?: string;
  };
  mvp?: {
    in_scope?: string[];
    out_of_scope?: string[];
  };
  founder_fit?: {
    why_you?: string;
    unfair_advantages?: string[];
  };
  assumptions_ranked?: Array<{
    assumption?: string;
    risk?: "high" | "medium" | "low";
  }>;
  open_questions?: string[];
  confidence?: {
    one_liner?: "high" | "medium" | "low";
    icp?: "high" | "medium" | "low";
    pricing?: "high" | "medium" | "low";
    mvp?: "high" | "medium" | "low";
  };
}

interface NormalizationDetailsPanelProps {
  normalized: NormalizedData;
  defaultExpanded?: boolean;
}

const getRiskVariant = (risk: string | undefined) => {
  switch (risk?.toLowerCase()) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
};

const getConfidenceVariant = (confidence: string | undefined) => {
  switch (confidence?.toLowerCase()) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
    default:
      return "outline";
  }
};

export function NormalizationDetailsPanel({ normalized, defaultExpanded = false }: NormalizationDetailsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  if (!normalized || Object.keys(normalized).length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-lg bg-muted/20">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <span className="font-semibold">Normalization Details</span>
          <Badge variant="secondary" className="text-xs">AI Analysis</Badge>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-5">
        {/* One Liner */}
        {normalized.one_liner && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-medium text-primary">&quot;{normalized.one_liner}&quot;</p>
          </div>
        )}

        {/* ICP Section */}
        {normalized.icp && Object.values(normalized.icp).some(v => v) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Ideal Customer Profile
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {normalized.icp.primary_buyer && (
                <div>
                  <span className="text-muted-foreground">Primary Buyer:</span>
                  <p className="font-medium">{normalized.icp.primary_buyer}</p>
                </div>
              )}
              {normalized.icp.end_user && (
                <div>
                  <span className="text-muted-foreground">End User:</span>
                  <p className="font-medium">{normalized.icp.end_user}</p>
                </div>
              )}
              {normalized.icp.industry && (
                <div>
                  <span className="text-muted-foreground">Industry:</span>
                  <p className="font-medium">{normalized.icp.industry}</p>
                </div>
              )}
              {normalized.icp.company_size && (
                <div>
                  <span className="text-muted-foreground">Company Size:</span>
                  <p className="font-medium">{normalized.icp.company_size}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pain Section */}
        {normalized.pain && Object.values(normalized.pain).some(v => v) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Pain Points
            </h4>
            <div className="space-y-2 text-sm">
              {normalized.pain.problem && (
                <div>
                  <span className="text-muted-foreground">Problem:</span>
                  <p className="font-medium">{normalized.pain.problem}</p>
                </div>
              )}
              {normalized.pain.trigger && (
                <div>
                  <span className="text-muted-foreground">Trigger:</span>
                  <p className="font-medium">{normalized.pain.trigger}</p>
                </div>
              )}
              {normalized.pain.cost_of_inaction && (
                <div>
                  <span className="text-muted-foreground">Cost of Inaction:</span>
                  <p className="font-medium">{normalized.pain.cost_of_inaction}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UVP */}
        {normalized.uvp && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent-foreground" />
              Unique Value Proposition
            </h4>
            <p className="text-sm">{normalized.uvp}</p>
          </div>
        )}

        {/* Business Model */}
        {normalized.business_model && Object.values(normalized.business_model).some(v => v) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Business Model
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {normalized.business_model.type && (
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{normalized.business_model.type}</p>
                </div>
              )}
              {normalized.business_model.pricing_guess && (
                <div>
                  <span className="text-muted-foreground">Pricing:</span>
                  <p className="font-medium">{normalized.business_model.pricing_guess}</p>
                </div>
              )}
            </div>
            {normalized.business_model.why_plausible && (
              <p className="text-sm text-muted-foreground italic mt-1">
                {normalized.business_model.why_plausible}
              </p>
            )}
          </div>
        )}

        {/* MVP Scope */}
        {normalized.mvp && (normalized.mvp.in_scope?.length || normalized.mvp.out_of_scope?.length) && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" />
              MVP Scope
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              {normalized.mvp.in_scope && normalized.mvp.in_scope.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">In Scope</span>
                  <ul className="mt-1 space-y-1">
                    {normalized.mvp.in_scope.map((item, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {normalized.mvp.out_of_scope && normalized.mvp.out_of_scope.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Out of Scope</span>
                  <ul className="mt-1 space-y-1">
                    {normalized.mvp.out_of_scope.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground/50">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assumptions Ranked */}
        {normalized.assumptions_ranked && normalized.assumptions_ranked.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Key Assumptions
            </h4>
            <div className="space-y-2">
              {normalized.assumptions_ranked.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <Badge variant={getRiskVariant(item.risk)} className="text-xs capitalize flex-shrink-0">
                    {item.risk}
                  </Badge>
                  <span>{item.assumption}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Questions */}
        {normalized.open_questions && normalized.open_questions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              Open Questions
            </h4>
            <ul className="space-y-1">
              {normalized.open_questions.map((question, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence Map */}
        {normalized.confidence && Object.values(normalized.confidence).some(v => v) && (
          <div className="space-y-2">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wide">AI Confidence Levels</h4>
            <div className="flex flex-wrap gap-2">
              {normalized.confidence.one_liner && (
                <Badge variant={getConfidenceVariant(normalized.confidence.one_liner)} className="text-xs">
                  One-liner: {normalized.confidence.one_liner}
                </Badge>
              )}
              {normalized.confidence.icp && (
                <Badge variant={getConfidenceVariant(normalized.confidence.icp)} className="text-xs">
                  ICP: {normalized.confidence.icp}
                </Badge>
              )}
              {normalized.confidence.pricing && (
                <Badge variant={getConfidenceVariant(normalized.confidence.pricing)} className="text-xs">
                  Pricing: {normalized.confidence.pricing}
                </Badge>
              )}
              {normalized.confidence.mvp && (
                <Badge variant={getConfidenceVariant(normalized.confidence.mvp)} className="text-xs">
                  MVP: {normalized.confidence.mvp}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
