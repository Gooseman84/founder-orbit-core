import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
      <SheetContent className="w-full sm:max-w-lg bg-background border-l border-border">
        <SheetHeader className="border-b border-border pb-4">
          <span className="label-mono-gold">{sectionTitles[section].toUpperCase()}</span>
          <SheetTitle className="font-display text-lg">{sectionTitles[section]}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)] pr-4 mt-6">
          <div className="space-y-6">
            {section === "life" && <LifeFields formData={formData} updateField={updateField} />}
            {section === "business" && <BusinessFields formData={formData} updateField={updateField} />}
            {section === "traction" && <TractionFields formData={formData} updateField={updateField} />}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? "SAVING…" : "SAVE CHANGES"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

/* ── Field groups ── */

interface FieldProps {
  formData: Partial<FounderBlueprint>;
  updateField: (field: keyof FounderBlueprint, value: unknown) => void;
}

const LifeFields = ({ formData, updateField }: FieldProps) => (
  <>
    <FormField label="LIFE VISION">
      <Textarea value={formData.life_vision || ""} onChange={(e) => updateField("life_vision", e.target.value)} placeholder="What does your ideal life look like?" rows={3} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="TIME HORIZON">
      <Select value={formData.life_time_horizon || ""} onValueChange={(v) => updateField("life_time_horizon", v)}>
        <SelectTrigger className="border-border bg-card"><SelectValue placeholder="Select time horizon" /></SelectTrigger>
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
      <FormField label="INCOME TARGET ($)">
        <Input type="number" value={formData.income_target || ""} onChange={(e) => updateField("income_target", Number(e.target.value) || null)} placeholder="100000" className="border-border bg-card focus:border-primary" />
      </FormField>
      <FormField label="HOURS/WEEK">
        <Input type="number" value={formData.time_available_hours_per_week || ""} onChange={(e) => updateField("time_available_hours_per_week", Number(e.target.value) || null)} placeholder="20" className="border-border bg-card focus:border-primary" />
      </FormField>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FormField label="CAPITAL AVAILABLE ($)">
        <Input type="number" value={formData.capital_available || ""} onChange={(e) => updateField("capital_available", Number(e.target.value) || null)} placeholder="5000" className="border-border bg-card focus:border-primary" />
      </FormField>
      <FormField label="RISK PROFILE">
        <Select value={formData.risk_profile || ""} onValueChange={(v) => updateField("risk_profile", v)}>
          <SelectTrigger className="border-border bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="conservative">Conservative</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
          </SelectContent>
        </Select>
      </FormField>
    </div>
    <FormField label="NON-NEGOTIABLES">
      <Textarea value={formData.non_negotiables || ""} onChange={(e) => updateField("non_negotiables", e.target.value)} placeholder="What boundaries won't you cross?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="CURRENT COMMITMENTS">
      <Textarea value={formData.current_commitments || ""} onChange={(e) => updateField("current_commitments", e.target.value)} placeholder="Job, family, other responsibilities..." rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="STRENGTHS">
      <Textarea value={formData.strengths || ""} onChange={(e) => updateField("strengths", e.target.value)} placeholder="What are you naturally good at?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="WEAKNESSES">
      <Textarea value={formData.weaknesses || ""} onChange={(e) => updateField("weaknesses", e.target.value)} placeholder="Where do you struggle?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="PREFERRED WORK STYLE">
      <Select value={formData.preferred_work_style || ""} onValueChange={(v) => updateField("preferred_work_style", v)}>
        <SelectTrigger className="border-border bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="solo">Solo / Independent</SelectItem>
          <SelectItem value="small_team">Small Team</SelectItem>
          <SelectItem value="collaborative">Highly Collaborative</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
    <FormField label="ENERGY PATTERN">
      <Select value={formData.energy_pattern || ""} onValueChange={(v) => updateField("energy_pattern", v)}>
        <SelectTrigger className="border-border bg-card"><SelectValue placeholder="Select" /></SelectTrigger>
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
    <FormField label="NORTH STAR ONE-LINER">
      <Textarea value={formData.north_star_one_liner || ""} onChange={(e) => updateField("north_star_one_liner", e.target.value)} placeholder="One sentence that captures your mission" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="TARGET AUDIENCE">
      <Textarea value={formData.target_audience || ""} onChange={(e) => updateField("target_audience", e.target.value)} placeholder="Who are you building for?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="PROBLEM STATEMENT">
      <Textarea value={formData.problem_statement || ""} onChange={(e) => updateField("problem_statement", e.target.value)} placeholder="What painful problem are you solving?" rows={3} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="PROMISE STATEMENT">
      <Textarea value={formData.promise_statement || ""} onChange={(e) => updateField("promise_statement", e.target.value)} placeholder="What transformation do you deliver?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="OFFER MODEL">
      <Textarea value={formData.offer_model || ""} onChange={(e) => updateField("offer_model", e.target.value)} placeholder="How is your offer structured?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="MONETIZATION STRATEGY">
      <Textarea value={formData.monetization_strategy || ""} onChange={(e) => updateField("monetization_strategy", e.target.value)} placeholder="How will you make money?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="DISTRIBUTION CHANNELS">
      <Textarea value={formData.distribution_channels || ""} onChange={(e) => updateField("distribution_channels", e.target.value)} placeholder="How will you reach customers?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="UNFAIR ADVANTAGE">
      <Textarea value={formData.unfair_advantage || ""} onChange={(e) => updateField("unfair_advantage", e.target.value)} placeholder="What makes you uniquely positioned to win?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
  </>
);

const TractionFields = ({ formData, updateField }: FieldProps) => (
  <>
    <FormField label="TRACTION DEFINITION">
      <Textarea value={formData.traction_definition || ""} onChange={(e) => updateField("traction_definition", e.target.value)} placeholder="What does traction mean for your business?" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="VALIDATION STAGE">
      <Select value={formData.validation_stage || ""} onValueChange={(v) => updateField("validation_stage", v)}>
        <SelectTrigger className="border-border bg-card"><SelectValue placeholder="Select stage" /></SelectTrigger>
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
    <FormField label="SUCCESS METRICS (JSON)">
      <Textarea
        value={formData.success_metrics ? JSON.stringify(formData.success_metrics, null, 2) : ""}
        onChange={(e) => { try { updateField("success_metrics", e.target.value ? JSON.parse(e.target.value) : null); } catch { /* typing */ } }}
        placeholder='{"mrr": 10000, "users": 100}'
        rows={4}
        className="border-border bg-card focus:border-primary font-mono-tb text-xs"
      />
    </FormField>
    <FormField label="RUNWAY NOTES">
      <Textarea value={formData.runway_notes || ""} onChange={(e) => updateField("runway_notes", e.target.value)} placeholder="Financial runway and burn rate notes" rows={2} className="border-border bg-card focus:border-primary font-light" />
    </FormField>
    <FormField label="FOCUS QUARTERS (JSON)">
      <Textarea
        value={formData.focus_quarters ? JSON.stringify(formData.focus_quarters, null, 2) : ""}
        onChange={(e) => { try { updateField("focus_quarters", e.target.value ? JSON.parse(e.target.value) : null); } catch { /* typing */ } }}
        placeholder='[{"quarter": "Q1", "focus": "Validation"}]'
        rows={4}
        className="border-border bg-card focus:border-primary font-mono-tb text-xs"
      />
    </FormField>
  </>
);

const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="label-mono-gold">{label}</label>
    {children}
  </div>
);

export default EditBlueprintDrawer;
