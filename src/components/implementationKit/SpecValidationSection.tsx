import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Info } from "lucide-react";
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

const SEVERITY_STYLES: Record<string, { borderColor: string; color: string }> = {
  blocking: { borderColor: "hsl(0 65% 52% / 0.35)", color: "hsl(0 65% 52%)" },
  warning: { borderColor: "hsl(43 52% 54% / 0.35)", color: "hsl(43 52% 54%)" },
  suggestion: { borderColor: "hsl(220 12% 58% / 0.35)", color: "hsl(220 12% 58%)" },
};

function FlagRow({ flag }: { flag: SpecValidationFlag }) {
  const [open, setOpen] = useState(false);
  const severity = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.suggestion;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 px-2 hover:bg-secondary/30 transition-colors text-left">
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" style={{ color: "hsl(220 12% 58%)" }} />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" style={{ color: "hsl(220 12% 58%)" }} />
        )}
        <span className="font-mono-tb text-[0.62rem] uppercase shrink-0 text-primary">
          {DOCUMENT_LABELS[flag.document] || flag.document}
        </span>
        <span
          className="font-mono-tb text-[0.58rem] uppercase px-1.5 py-0.5 border shrink-0"
          style={{ borderColor: severity.borderColor, color: severity.color }}
        >
          {flag.severity}
        </span>
        <span className="text-xs truncate flex-1" style={{ color: "hsl(220 12% 58%)" }}>
          {flag.issue}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 pb-2 space-y-1">
        <div
          className="text-[0.75rem] font-mono-tb px-3 py-2"
          style={{
            background: "hsl(240 10% 10%)",
            borderLeft: "2px solid hsl(43 52% 54%)",
            color: "hsl(40 15% 93%)",
          }}
        >
          "{flag.ambiguousText}"
        </div>
        <p className="text-xs italic" style={{ color: "hsl(220 12% 58%)" }}>
          {flag.resolutionQuestion}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SpecValidationSection({ validation }: SpecValidationSectionProps) {
  const approvedForExecution = validation?.approvedForExecution ?? false;
  const flags = validation?.flags ?? [];

  if (flags.length === 0 && !approvedForExecution) return null;

  if (approvedForExecution && flags.length === 0) {
    return (
      <div className="px-2 pt-2">
        <span
          className="inline-flex items-center gap-1.5 font-mono-tb text-[0.62rem] uppercase border px-2 py-1"
          style={{
            borderColor: "hsl(142 50% 42% / 0.35)",
            color: "hsl(142 50% 42%)",
          }}
        >
          <CheckCircle className="h-3 w-3" />
          SPEC APPROVED
        </span>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 border p-4"
      style={{ borderColor: "hsl(240 10% 14%)", background: "hsl(240 12% 7%)" }}
    >
      <div className="flex items-center gap-2">
        {approvedForExecution ? (
          <span
            className="inline-flex items-center gap-1.5 font-mono-tb text-[0.62rem] uppercase border px-2 py-1"
            style={{ borderColor: "hsl(142 50% 42% / 0.35)", color: "hsl(142 50% 42%)" }}
          >
            <CheckCircle className="h-3 w-3" />
            SPEC APPROVED
          </span>
        ) : flags.length > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 font-mono-tb text-[0.62rem] uppercase border px-2 py-1"
            style={{ borderColor: "hsl(43 52% 54% / 0.35)", color: "hsl(43 52% 54%)" }}
          >
            <AlertTriangle className="h-3 w-3" />
            REVIEW AMBIGUITIES
          </span>
        ) : null}
      </div>

      {flags.length > 0 ? (
        <div className="space-y-0.5">
          {flags.map((flag, i) => (
            <FlagRow key={i} flag={flag} />
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-2 px-2 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "hsl(220 12% 58%)" }} />
          <p className="text-xs" style={{ color: "hsl(220 12% 58%)" }}>
            Spec validation flagged issues but details are unavailable. Review your documents manually before building.
          </p>
        </div>
      )}
    </div>
  );
}
