import { Pencil } from "lucide-react";
import { FounderBlueprint } from "@/types/blueprint";

interface LifeBlueprintProps {
  blueprint: FounderBlueprint;
  onEditSection: (section: string) => void;
}

export const LifeBlueprint = ({ blueprint, onEditSection }: LifeBlueprintProps) => {
  return (
    <div className="space-y-0">
      {/* Life Vision */}
      <BlueprintSection
        label="LIFE VISION"
        editKey="life_vision"
        onEdit={onEditSection}
      >
        <BlueprintField label="VISION" value={blueprint.life_vision} />
        <BlueprintField label="TIME HORIZON" value={blueprint.life_time_horizon} />
      </BlueprintSection>

      {/* Constraints & Resources */}
      <BlueprintSection
        label="CONSTRAINTS & RESOURCES"
        editKey="constraints"
        onEdit={onEditSection}
      >
        <div className="grid grid-cols-2 gap-0">
          <DataRow label="HOURS / WEEK" value={blueprint.time_available_hours_per_week != null ? `${blueprint.time_available_hours_per_week}` : null} />
          <DataRow label="CAPITAL" value={blueprint.capital_available != null ? `$${blueprint.capital_available.toLocaleString()}` : null} />
          <DataRow label="INCOME TARGET" value={blueprint.income_target != null ? `$${blueprint.income_target.toLocaleString()}` : null} />
          <DataRow label="RISK PROFILE" value={blueprint.risk_profile} />
        </div>
        <BlueprintField label="NON-NEGOTIABLES" value={blueprint.non_negotiables} />
        <BlueprintField label="CURRENT COMMITMENTS" value={blueprint.current_commitments} />
        <BlueprintField label="STRENGTHS" value={blueprint.strengths} />
      </BlueprintSection>

      {/* Work Style */}
      <BlueprintSection
        label="WORK STYLE"
        editKey="work_style"
        onEdit={onEditSection}
      >
        <BlueprintField label="PREFERRED STYLE" value={blueprint.preferred_work_style} />
        <BlueprintField label="ENERGY PATTERN" value={blueprint.energy_pattern} />
      </BlueprintSection>
    </div>
  );
};

/* ── Sub-components ── */

const BlueprintSection = ({
  label,
  editKey,
  onEdit,
  children,
}: {
  label: string;
  editKey: string;
  onEdit: (s: string) => void;
  children: React.ReactNode;
}) => (
  <div className="border border-border bg-card group hover:border-l-2 hover:border-l-primary transition-all">
    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
      <span className="label-mono-gold">{label}</span>
      <button
        onClick={() => onEdit(editKey)}
        className="flex items-center gap-1 label-mono opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground"
      >
        <Pencil className="h-3 w-3" />
        EDIT
      </button>
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </div>
);

const BlueprintField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <span className="label-mono block mb-1">{label}</span>
    {value ? (
      <p className="text-sm font-light text-foreground leading-relaxed">{value}</p>
    ) : (
      <p className="text-sm font-light text-muted-foreground/50 italic">Not set</p>
    )}
  </div>
);

const DataRow = ({ label, value }: { label: string; value: string | null }) => (
  <div className="data-row">
    <span className="label-mono">{label}</span>
    {value ? (
      <span className="font-display font-bold text-[1.4rem] text-foreground">{value}</span>
    ) : (
      <span className="text-sm text-muted-foreground/50 italic">—</span>
    )}
  </div>
);

export default LifeBlueprint;
