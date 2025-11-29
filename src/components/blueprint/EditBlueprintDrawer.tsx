import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FounderBlueprint } from "@/types/blueprint";

type SectionType = "life" | "business" | "northstar" | "traction";

interface EditBlueprintDrawerProps {
  open: boolean;
  onClose: () => void;
  section: SectionType;
  blueprint: FounderBlueprint;
  onSave: (data: Partial<FounderBlueprint>) => void;
}

const sectionTitles: Record<SectionType, string> = {
  life: "Edit Life Blueprint",
  business: "Edit Business Blueprint",
  northstar: "Edit North Star",
  traction: "Edit Traction & Metrics",
};

const sectionDescriptions: Record<SectionType, string> = {
  life: "Update your personal foundation and constraints",
  business: "Define your business model and positioning",
  northstar: "Refine your guiding direction",
  traction: "Set your validation stage and success metrics",
};

export const EditBlueprintDrawer = ({
  open,
  onClose,
  section,
  blueprint,
  onSave,
}: EditBlueprintDrawerProps) => {
  const [formData, setFormData] = useState<Partial<FounderBlueprint>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Initialize form data based on section
      const initialData: Partial<FounderBlueprint> = {};
      
      if (section === "life") {
        initialData.life_vision = blueprint.life_vision;
        initialData.life_time_horizon = blueprint.life_time_horizon;
        initialData.income_target = blueprint.income_target;
        initialData.time_available_hours_per_week = blueprint.time_available_hours_per_week;
        initialData.capital_available = blueprint.capital_available;
        initialData.risk_profile = blueprint.risk_profile;
        initialData.non_negotiables = blueprint.non_negotiables;
        initialData.current_commitments = blueprint.current_commitments;
        initialData.strengths = blueprint.strengths;
        initialData.weaknesses = blueprint.weaknesses;
        initialData.preferred_work_style = blueprint.preferred_work_style;
        initialData.energy_pattern = blueprint.energy_pattern;
      } else if (section === "business") {
        initialData.north_star_one_liner = blueprint.north_star_one_liner;
        initialData.target_audience = blueprint.target_audience;
        initialData.problem_statement = blueprint.problem_statement;
        initialData.promise_statement = blueprint.promise_statement;
        initialData.offer_model = blueprint.offer_model;
        initialData.monetization_strategy = blueprint.monetization_strategy;
        initialData.distribution_channels = blueprint.distribution_channels;
        initialData.unfair_advantage = blueprint.unfair_advantage;
      } else if (section === "traction") {
        initialData.traction_definition = blueprint.traction_definition;
        initialData.success_metrics = blueprint.success_metrics;
        initialData.runway_notes = blueprint.runway_notes;
        initialData.validation_stage = blueprint.validation_stage;
        initialData.focus_quarters = blueprint.focus_quarters;
      }
      
      setFormData(initialData);
    }
  }, [open, section, blueprint]);

  const updateField = (field: keyof FounderBlueprint, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{sectionTitles[section]}</SheetTitle>
          <SheetDescription>{sectionDescriptions[section]}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4 mt-6">
          <div className="space-y-6">
            {section === "life" && (
              <LifeFields formData={formData} updateField={updateField} />
            )}
            {section === "business" && (
              <BusinessFields formData={formData} updateField={updateField} />
            )}
            {section === "traction" && (
              <TractionFields formData={formData} updateField={updateField} />
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

interface FieldProps {
  formData: Partial<FounderBlueprint>;
  updateField: (field: keyof FounderBlueprint, value: unknown) => void;
}

const LifeFields = ({ formData, updateField }: FieldProps) => (
  <>
    <FormField label="Life Vision">
      <Textarea
        value={formData.life_vision || ""}
        onChange={(e) => updateField("life_vision", e.target.value)}
        placeholder="What does your ideal life look like?"
        rows={3}
      />
    </FormField>

    <FormField label="Time Horizon">
      <Select
        value={formData.life_time_horizon || ""}
        onValueChange={(v) => updateField("life_time_horizon", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select time horizon" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="6_months">6 Months</SelectItem>
          <SelectItem value="1_year">1 Year</SelectItem>
          <SelectItem value="3_years">3 Years</SelectItem>
          <SelectItem value="5_years">5 Years</SelectItem>
          <SelectItem value="10_years">10+ Years</SelectItem>
        </SelectContent>
      </Select>
    </FormField>

    <div className="grid grid-cols-2 gap-4">
      <FormField label="Income Target ($)">
        <Input
          type="number"
          value={formData.income_target || ""}
          onChange={(e) => updateField("income_target", Number(e.target.value) || null)}
          placeholder="100000"
        />
      </FormField>

      <FormField label="Hours/Week Available">
        <Input
          type="number"
          value={formData.time_available_hours_per_week || ""}
          onChange={(e) => updateField("time_available_hours_per_week", Number(e.target.value) || null)}
          placeholder="20"
        />
      </FormField>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <FormField label="Capital Available ($)">
        <Input
          type="number"
          value={formData.capital_available || ""}
          onChange={(e) => updateField("capital_available", Number(e.target.value) || null)}
          placeholder="5000"
        />
      </FormField>

      <FormField label="Risk Profile">
        <Select
          value={formData.risk_profile || ""}
          onValueChange={(v) => updateField("risk_profile", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conservative">Conservative</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </div>

    <FormField label="Non-Negotiables">
      <Textarea
        value={formData.non_negotiables || ""}
        onChange={(e) => updateField("non_negotiables", e.target.value)}
        placeholder="What boundaries won't you cross?"
        rows={2}
      />
    </FormField>

    <FormField label="Current Commitments">
      <Textarea
        value={formData.current_commitments || ""}
        onChange={(e) => updateField("current_commitments", e.target.value)}
        placeholder="Job, family, other responsibilities..."
        rows={2}
      />
    </FormField>

    <FormField label="Strengths">
      <Textarea
        value={formData.strengths || ""}
        onChange={(e) => updateField("strengths", e.target.value)}
        placeholder="What are you naturally good at?"
        rows={2}
      />
    </FormField>

    <FormField label="Weaknesses">
      <Textarea
        value={formData.weaknesses || ""}
        onChange={(e) => updateField("weaknesses", e.target.value)}
        placeholder="Where do you struggle?"
        rows={2}
      />
    </FormField>

    <FormField label="Preferred Work Style">
      <Select
        value={formData.preferred_work_style || ""}
        onValueChange={(v) => updateField("preferred_work_style", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select work style" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solo">Solo / Independent</SelectItem>
          <SelectItem value="small_team">Small Team</SelectItem>
          <SelectItem value="collaborative">Highly Collaborative</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
        </SelectContent>
      </Select>
    </FormField>

    <FormField label="Energy Pattern">
      <Select
        value={formData.energy_pattern || ""}
        onValueChange={(v) => updateField("energy_pattern", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select energy pattern" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="morning">Morning Person</SelectItem>
          <SelectItem value="afternoon">Afternoon Peak</SelectItem>
          <SelectItem value="night">Night Owl</SelectItem>
          <SelectItem value="variable">Variable / Flexible</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  </>
);

const BusinessFields = ({ formData, updateField }: FieldProps) => (
  <>
    <FormField label="North Star One-Liner">
      <Textarea
        value={formData.north_star_one_liner || ""}
        onChange={(e) => updateField("north_star_one_liner", e.target.value)}
        placeholder="One sentence that captures your mission"
        rows={2}
      />
    </FormField>

    <FormField label="Target Audience">
      <Textarea
        value={formData.target_audience || ""}
        onChange={(e) => updateField("target_audience", e.target.value)}
        placeholder="Who are you building for?"
        rows={2}
      />
    </FormField>

    <FormField label="Problem Statement">
      <Textarea
        value={formData.problem_statement || ""}
        onChange={(e) => updateField("problem_statement", e.target.value)}
        placeholder="What painful problem are you solving?"
        rows={3}
      />
    </FormField>

    <FormField label="Promise Statement">
      <Textarea
        value={formData.promise_statement || ""}
        onChange={(e) => updateField("promise_statement", e.target.value)}
        placeholder="What transformation do you deliver?"
        rows={2}
      />
    </FormField>

    <FormField label="Offer Model">
      <Textarea
        value={formData.offer_model || ""}
        onChange={(e) => updateField("offer_model", e.target.value)}
        placeholder="How is your offer structured?"
        rows={2}
      />
    </FormField>

    <FormField label="Monetization Strategy">
      <Textarea
        value={formData.monetization_strategy || ""}
        onChange={(e) => updateField("monetization_strategy", e.target.value)}
        placeholder="How will you make money?"
        rows={2}
      />
    </FormField>

    <FormField label="Distribution Channels">
      <Textarea
        value={formData.distribution_channels || ""}
        onChange={(e) => updateField("distribution_channels", e.target.value)}
        placeholder="How will you reach customers?"
        rows={2}
      />
    </FormField>

    <FormField label="Unfair Advantage">
      <Textarea
        value={formData.unfair_advantage || ""}
        onChange={(e) => updateField("unfair_advantage", e.target.value)}
        placeholder="What makes you uniquely positioned to win?"
        rows={2}
      />
    </FormField>
  </>
);

const TractionFields = ({ formData, updateField }: FieldProps) => (
  <>
    <FormField label="Traction Definition">
      <Textarea
        value={formData.traction_definition || ""}
        onChange={(e) => updateField("traction_definition", e.target.value)}
        placeholder="What does traction mean for your business?"
        rows={2}
      />
    </FormField>

    <FormField label="Validation Stage">
      <Select
        value={formData.validation_stage || ""}
        onValueChange={(v) => updateField("validation_stage", v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select validation stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="idea">Idea Stage</SelectItem>
          <SelectItem value="problem_validated">Problem Validated</SelectItem>
          <SelectItem value="solution_validated">Solution Validated</SelectItem>
          <SelectItem value="mvp">MVP Built</SelectItem>
          <SelectItem value="first_customers">First Customers</SelectItem>
          <SelectItem value="product_market_fit">Product-Market Fit</SelectItem>
          <SelectItem value="scaling">Scaling</SelectItem>
        </SelectContent>
      </Select>
    </FormField>

    <FormField label="Success Metrics (JSON)">
      <Textarea
        value={formData.success_metrics ? JSON.stringify(formData.success_metrics, null, 2) : ""}
        onChange={(e) => {
          try {
            const parsed = e.target.value ? JSON.parse(e.target.value) : null;
            updateField("success_metrics", parsed);
          } catch {
            // Allow invalid JSON while typing
          }
        }}
        placeholder='{"mrr": 10000, "users": 100}'
        rows={4}
        className="font-mono text-xs"
      />
    </FormField>

    <FormField label="Runway Notes">
      <Textarea
        value={formData.runway_notes || ""}
        onChange={(e) => updateField("runway_notes", e.target.value)}
        placeholder="Financial runway and burn rate notes"
        rows={2}
      />
    </FormField>

    <FormField label="Focus Quarters (JSON)">
      <Textarea
        value={formData.focus_quarters ? JSON.stringify(formData.focus_quarters, null, 2) : ""}
        onChange={(e) => {
          try {
            const parsed = e.target.value ? JSON.parse(e.target.value) : null;
            updateField("focus_quarters", parsed);
          } catch {
            // Allow invalid JSON while typing
          }
        }}
        placeholder='[{"quarter": "Q1", "focus": "Validation"}]'
        rows={4}
        className="font-mono text-xs"
      />
    </FormField>
  </>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    {children}
  </div>
);

export default EditBlueprintDrawer;
