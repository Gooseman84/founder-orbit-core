import { Pencil } from "lucide-react";
import { FounderBlueprint } from "@/types/blueprint";

interface BusinessBlueprintProps {
  blueprint: FounderBlueprint;
  onEditSection: (section: string) => void;
}

const SECTIONS = [
  { key: "target_audience", label: "TARGET AUDIENCE", field: "target_audience" as const },
  { key: "problem_promise", label: "PROBLEM & PROMISE", fields: ["problem_statement", "promise_statement"] as const },
  { key: "offer_model", label: "OFFER MODEL", field: "offer_model" as const },
  { key: "monetization", label: "MONETIZATION STRATEGY", field: "monetization_strategy" as const },
  { key: "distribution", label: "DISTRIBUTION CHANNELS", field: "distribution_channels" as const },
  { key: "unfair_advantage", label: "UNFAIR ADVANTAGE", field: "unfair_advantage" as const },
] as const;

export const BusinessBlueprint = ({ blueprint, onEditSection }: BusinessBlueprintProps) => {
  return (
    <div className="space-y-0">
      {SECTIONS.map((section) => (
        <div
          key={section.key}
          className="border border-border bg-card group hover:border-l-2 hover:border-l-primary transition-all"
        >
          {/* Section header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <span className="label-mono-gold">{section.label}</span>
            <button
              onClick={() => onEditSection(section.key)}
              className="flex items-center gap-1 label-mono opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
              EDIT
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {"fields" in section ? (
              <div className="space-y-4">
                <div>
                  <span className="label-mono block mb-1">PROBLEM</span>
                  <BlueprintValue value={blueprint.problem_statement} />
                </div>
                <div>
                  <span className="label-mono block mb-1">PROMISE</span>
                  <BlueprintValue value={blueprint.promise_statement} />
                </div>
              </div>
            ) : (
              <BlueprintValue value={blueprint[section.field]} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const BlueprintValue = ({ value }: { value: string | null | undefined }) => {
  if (!value) {
    return <p className="text-sm font-light text-muted-foreground/50 italic">Not set</p>;
  }
  return <p className="text-sm font-light text-foreground leading-relaxed">{value}</p>;
};

export default BusinessBlueprint;
