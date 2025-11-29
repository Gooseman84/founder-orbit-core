import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Wallet, Zap, Pencil } from "lucide-react";
import { FounderBlueprint } from "@/types/blueprint";

interface LifeBlueprintProps {
  blueprint: FounderBlueprint;
  onEditSection: (section: string) => void;
}

export const LifeBlueprint = ({ blueprint, onEditSection }: LifeBlueprintProps) => {
  return (
    <div className="space-y-4">
      {/* Life Vision Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <CardTitle className="text-sm font-medium">Life Vision</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("life_vision")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <BlueprintField label="Vision" value={blueprint.life_vision} />
          <BlueprintField label="Time Horizon" value={blueprint.life_time_horizon} />
        </CardContent>
      </Card>

      {/* Constraints & Resources Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Constraints & Resources</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("constraints")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <BlueprintField
              label="Hours/Week"
              value={blueprint.time_available_hours_per_week?.toString()}
              suffix=" hrs"
              icon={<Clock className="h-3 w-3" />}
            />
            <BlueprintField
              label="Capital"
              value={blueprint.capital_available?.toString()}
              prefix="$"
            />
          </div>
          <BlueprintField label="Non-Negotiables" value={blueprint.non_negotiables} />
          <BlueprintField label="Current Commitments" value={blueprint.current_commitments} />
          <BlueprintField label="Strengths" value={blueprint.strengths} />
        </CardContent>
      </Card>

      {/* Work Style Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-medium">Work Style</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("work_style")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <BlueprintField label="Preferred Style" value={blueprint.preferred_work_style} />
          <BlueprintField label="Energy Pattern" value={blueprint.energy_pattern} />
        </CardContent>
      </Card>
    </div>
  );
};

interface BlueprintFieldProps {
  label: string;
  value: string | null | undefined;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
}

const BlueprintField = ({ label, value, prefix, suffix, icon }: BlueprintFieldProps) => {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      {value ? (
        <p className="text-sm">
          {prefix}{value}{suffix}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/50 italic">Not set</p>
      )}
    </div>
  );
};

export default LifeBlueprint;
