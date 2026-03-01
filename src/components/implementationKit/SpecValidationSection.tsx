import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { SpecValidationResult, SpecValidationFlag } from "@/types/implementationKit";

interface SpecValidationSectionProps {
  validation: SpecValidationResult;
}

const DOCUMENT_LABELS: Record<string, string> = {
  north_star_spec: "North Star Spec",
  architecture_contract: "Architecture Contract",
  thin_vertical_slice: "Vertical Slice Plan",
  launch_playbook: "Launch Playbook",
};

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  blocking: "destructive",
  warning: "secondary",
  suggestion: "outline",
};

function FlagRow({ flag }: { flag: SpecValidationFlag }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-1.5 px-1 rounded hover:bg-muted/50 transition-colors text-left">
        {open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
        <span className="text-xs text-primary font-medium shrink-0">
          {DOCUMENT_LABELS[flag.document] || flag.document}
        </span>
        <Badge variant={SEVERITY_VARIANT[flag.severity] || "outline"} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {flag.severity}
        </Badge>
        <span className="text-xs text-muted-foreground truncate flex-1">{flag.issue}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pb-2 space-y-1">
        <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono block">
          "{flag.ambiguousText}"
        </code>
        <p className="text-xs text-muted-foreground italic">{flag.resolutionQuestion}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SpecValidationSection({ validation }: SpecValidationSectionProps) {
  const { approvedForExecution, flags } = validation;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center gap-2 px-1">
        {approvedForExecution ? (
          <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/30 gap-1">
            <CheckCircle className="h-3 w-3" />
            Spec Approved
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Review Ambiguities
          </Badge>
        )}
      </div>
      {flags.length > 0 && (
        <div className="space-y-0.5">
          {flags.map((flag, i) => (
            <FlagRow key={i} flag={flag} />
          ))}
        </div>
      )}
    </div>
  );
}
