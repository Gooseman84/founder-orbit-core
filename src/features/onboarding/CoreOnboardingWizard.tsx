// src/features/onboarding/CoreOnboardingWizard.tsx
// EPIC v6 Onboarding — Wildness & Modes
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { upsertFounderProfile, normalizeFounderProfile } from "@/lib/founderProfileApi";
import type { RiskTolerance, Runway, WorkPersonality, CreatorPlatform, EdgyMode } from "@/types/founderProfile";

const TOTAL_STEPS = 5;

// v6 Industry / Domain options
const INDUSTRY_OPTIONS = [
  "Health & fitness",
  "Money & investing",
  "E-commerce & retail",
  "SaaS & software",
  "Real estate",
  "Education & coaching",
  "Content & media",
  "AI & automation",
  "Local services",
  "B2B services",
  "Consumer apps",
  "Other",
];

// v6 Business model options
const BUSINESS_MODEL_OPTIONS = [
  "SaaS",
  "Agency",
  "Automation studio",
  "Content empire",
  "Creator brand",
  "Productized service",
  "Marketplace",
  "E-commerce",
  "Consulting",
  "Hybrid",
];

// v6 Work personality options
const WORK_PERSONALITY_OPTIONS: { value: WorkPersonality; label: string; description: string }[] = [
  { value: "builder", label: "Builder / Operator", description: "You love building systems and shipping products" },
  { value: "creator", label: "Creator / Face of Brand", description: "You're comfortable being visible and creating content" },
  { value: "faceless", label: "Faceless Architect", description: "You prefer systems & automation, staying behind the scenes" },
  { value: "dealmaker", label: "Deal Maker / Sales", description: "You thrive on relationships and closing deals" },
  { value: "quiet_assassin", label: "Quiet Assassin", description: "High leverage, low visibility — you get results silently" },
  { value: "automation", label: "Automation Obsessed", description: "You want machines doing the work while you sleep" },
];

// v6 Creator platform options
const CREATOR_PLATFORM_OPTIONS: { value: CreatorPlatform; label: string }[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X (Twitter)" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email / Newsletter" },
  { value: "none", label: "None — I prefer faceless" },
];

// v6 Edgy mode options
const EDGY_MODE_OPTIONS: { value: EdgyMode; label: string; description: string }[] = [
  { value: "safe", label: "Safe", description: "Keep it professional and conventional" },
  { value: "bold", label: "Bold", description: "Willing to push boundaries and stand out" },
  { value: "unhinged", label: "Unhinged", description: "Give me the wildest, most unconventional ideas" },
];

type V6FormState = {
  // Step 1: Industries & Business Models
  industries: string[];
  industriesOther: string;
  businessModels: string[];
  
  // Step 2: Work Personality & Platforms  
  workPersonality: WorkPersonality[];
  creatorPlatforms: CreatorPlatform[];
  
  // Step 3: Wildness Preferences
  openToPersonas: boolean;
  edgyMode: EdgyMode;
  wantsMoneySystems: "businesses" | "money_systems" | "both";
  
  // Step 4: Constraints (existing fields)
  hoursPerWeek: number | undefined;
  availableCapital: number | undefined;
  riskTolerance: RiskTolerance | "";
  runway: Runway | "";
  
  // Step 5: Vision (simplified)
  visionOfSuccessText: string;
  
  // Legacy fields we still capture for compatibility
  passionsText: string;
  skillsText: string;
};

const initialForm: V6FormState = {
  industries: [],
  industriesOther: "",
  businessModels: [],
  workPersonality: [],
  creatorPlatforms: [],
  openToPersonas: false,
  edgyMode: "bold",
  wantsMoneySystems: "both",
  hoursPerWeek: undefined,
  availableCapital: undefined,
  riskTolerance: "",
  runway: "",
  visionOfSuccessText: "",
  passionsText: "",
  skillsText: "",
};

function ChipMultiSelect<T extends string>({
  options,
  value,
  onChange,
  max,
  renderLabel,
}: {
  options: T[];
  value: T[];
  onChange: (next: T[]) => void;
  max?: number;
  renderLabel?: (option: T) => string;
}) {
  const toggleValue = (option: T) => {
    const exists = value.includes(option);
    if (exists) {
      onChange(value.filter((v) => v !== option));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            className="rounded-full"
            onClick={() => toggleValue(option)}
          >
            {renderLabel ? renderLabel(option) : option}
          </Button>
        );
      })}
    </div>
  );
}

function PersonalityCard({
  personality,
  selected,
  onToggle,
}: {
  personality: { value: WorkPersonality; label: string; description: string };
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-4 rounded-lg border text-left transition-all ${
        selected
          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
    >
      <div className="font-medium">{personality.label}</div>
      <div className="text-sm text-muted-foreground mt-1">{personality.description}</div>
    </button>
  );
}

export function CoreOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<V6FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { track } = useAnalytics();

  const progress = (step / TOTAL_STEPS) * 100;

  const updateForm = <K extends keyof V6FormState>(key: K, value: V6FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const togglePersonality = (personality: WorkPersonality) => {
    const current = form.workPersonality;
    if (current.includes(personality)) {
      updateForm("workPersonality", current.filter((p) => p !== personality));
    } else {
      updateForm("workPersonality", [...current, personality]);
    }
  };

  const togglePlatform = (platform: CreatorPlatform) => {
    const current = form.creatorPlatforms;
    if (current.includes(platform)) {
      updateForm("creatorPlatforms", current.filter((p) => p !== platform));
    } else {
      // If selecting "none", clear others. If selecting others, clear "none"
      if (platform === "none") {
        updateForm("creatorPlatforms", ["none"]);
      } else {
        updateForm("creatorPlatforms", [...current.filter(p => p !== "none"), platform]);
      }
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save your profile.",
        variant: "destructive",
      });
      return;
    }

    if (!form.riskTolerance || !form.runway) {
      setError("Please complete your constraints before saving.");
      setStep(4);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build the raw profile data for normalization
      const raw = {
        userId: user.id,
        // Legacy compatibility fields
        passionsText: form.passionsText || form.industries.join(", "),
        passionDomains: form.industries,
        passionDomainsOther: form.industriesOther || null,
        skillsText: form.skillsText || form.workPersonality.join(", "),
        skillTags: form.businessModels,
        skillSpikes: {
          salesPersuasion: form.workPersonality.includes("dealmaker") ? 5 : 3,
          contentTeaching: form.workPersonality.includes("creator") ? 5 : 3,
          opsSystems: form.workPersonality.includes("builder") || form.workPersonality.includes("automation") ? 5 : 3,
          productCreativity: form.workPersonality.includes("builder") ? 5 : 3,
          numbersAnalysis: 3,
        },
        hoursPerWeek: form.hoursPerWeek ?? 0,
        availableCapital: form.availableCapital ?? 0,
        riskTolerance: form.riskTolerance,
        runway: form.runway,
        urgencyVsUpside: 3,
        lifestyleGoalsText: "",
        visionOfSuccessText: form.visionOfSuccessText,
        lifestyleNonNegotiables: [],
        
        // EPIC v6 new fields
        workPersonality: form.workPersonality,
        creatorPlatforms: form.creatorPlatforms,
        edgyMode: form.edgyMode,
        wantsMoneySystems: form.wantsMoneySystems === "money_systems" || form.wantsMoneySystems === "both",
        openToPersonas: form.openToPersonas,
        openToMemeticIdeas: form.edgyMode === "bold" || form.edgyMode === "unhinged",
      };

      const profile = await normalizeFounderProfile(raw);

      await upsertFounderProfile(user.id, profile);

      toast({
        title: "Profile saved",
        description: "Your founder profile has been created.",
      });

      navigate("/onboarding/interview");
    } catch (e) {
      console.error("Error saving founder profile:", e);
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">What worlds do you understand?</h2>
              <p className="text-muted-foreground">
                Pick industries where you have insight, experience, or genuine interest.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Industries you know (pick up to 5)</Label>
                <ChipMultiSelect
                  options={INDUSTRY_OPTIONS}
                  value={form.industries}
                  onChange={(next) => updateForm("industries", next)}
                  max={5}
                />
                {form.industries.includes("Other") && (
                  <Input
                    className="mt-2"
                    placeholder="What else?"
                    value={form.industriesOther}
                    onChange={(e) => updateForm("industriesOther", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>What types of businesses sound fun to you?</Label>
                <p className="text-sm text-muted-foreground mb-2">Pick all that excite you</p>
                <ChipMultiSelect
                  options={BUSINESS_MODEL_OPTIONS}
                  value={form.businessModels}
                  onChange={(next) => updateForm("businessModels", next)}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">How do you work best?</h2>
              <p className="text-muted-foreground">
                Pick the work personalities that fit you. This shapes what kind of businesses we suggest.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Your work personality (pick 1-3)</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {WORK_PERSONALITY_OPTIONS.map((p) => (
                    <PersonalityCard
                      key={p.value}
                      personality={p}
                      selected={form.workPersonality.includes(p.value)}
                      onToggle={() => togglePersonality(p.value)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <Label>Which platforms are you open to building on?</Label>
                <p className="text-sm text-muted-foreground mb-2">Where might you show up or create content?</p>
                <div className="flex flex-wrap gap-2">
                  {CREATOR_PLATFORM_OPTIONS.map((p) => {
                    const selected = form.creatorPlatforms.includes(p.value);
                    return (
                      <Button
                        key={p.value}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => togglePlatform(p.value)}
                      >
                        {p.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">How wild do you want to go?</h2>
              <p className="text-muted-foreground">
                This unlocks different idea modes — from conventional to completely unhinged.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">Open to AI personas / characters?</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Would you build something with an AI avatar or character as the "face"?
                  </p>
                </div>
                <Switch
                  checked={form.openToPersonas}
                  onCheckedChange={(checked) => updateForm("openToPersonas", checked)}
                />
              </div>

              <div className="space-y-3">
                <Label>How edgy can we get with ideas?</Label>
                <div className="grid gap-3">
                  {EDGY_MODE_OPTIONS.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => updateForm("edgyMode", mode.value)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        form.edgyMode === mode.value
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>What do you want me to prioritize?</Label>
                <div className="grid gap-3">
                  {[
                    { value: "businesses" as const, label: "Full Businesses", description: "Traditional startups with products/services" },
                    { value: "money_systems" as const, label: "Money-Making Systems", description: "Automated income engines, cash machines" },
                    { value: "both" as const, label: "Both", description: "Show me everything — I'll decide" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateForm("wantsMoneySystems", opt.value)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        form.wantsMoneySystems === opt.value
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Your Constraints</h2>
              <p className="text-muted-foreground">
                Be honest — this helps us filter out ideas that would break your life.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hoursPerWeek">Hours available per week</Label>
                <Input
                  id="hoursPerWeek"
                  type="number"
                  min={0}
                  max={80}
                  value={form.hoursPerWeek ?? ""}
                  onChange={(e) => updateForm("hoursPerWeek", e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 10, 20, 40"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableCapital">Available capital ($)</Label>
                <Input
                  id="availableCapital"
                  type="number"
                  min={0}
                  value={form.availableCapital ?? ""}
                  onChange={(e) =>
                    updateForm("availableCapital", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Roughly how much could you invest?"
                />
              </div>

              <div className="space-y-2">
                <Label>Risk tolerance</Label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high"] as const).map((level) => {
                    const labelMap = { low: "Low — Play it safe", medium: "Medium — Balanced", high: "High — Swing big" };
                    return (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={form.riskTolerance === level ? "default" : "outline"}
                        onClick={() => updateForm("riskTolerance", level)}
                      >
                        {labelMap[level]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>How long can you go before needing income?</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "0_3_months" as const, label: "0–3 months" },
                    { value: "3_12_months" as const, label: "3–12 months" },
                    { value: "12_plus_months" as const, label: "12+ months" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={form.runway === opt.value ? "default" : "outline"}
                      onClick={() => updateForm("runway", opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">One Last Thing</h2>
              <p className="text-muted-foreground">
                What does "winning" look like for you in 2-3 years?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="visionOfSuccessText">Your vision of success</Label>
                <Textarea
                  id="visionOfSuccessText"
                  rows={5}
                  value={form.visionOfSuccessText}
                  onChange={(e) => updateForm("visionOfSuccessText", e.target.value)}
                  placeholder="Example: Making $30k/mo from automated systems, working 20 hrs/week, traveling whenever I want, building things I'm proud of..."
                />
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h3 className="font-semibold">Quick Summary</h3>
                <div className="text-sm space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Industries:</span>
                    {form.industries.length > 0 ? form.industries.join(", ") : "None selected"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Business types:</span>
                    {form.businessModels.length > 0 ? form.businessModels.join(", ") : "None selected"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Work style:</span>
                    {form.workPersonality.length > 0 
                      ? form.workPersonality.map(p => WORK_PERSONALITY_OPTIONS.find(o => o.value === p)?.label).join(", ")
                      : "None selected"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Platforms:</span>
                    {form.creatorPlatforms.length > 0 
                      ? form.creatorPlatforms.map(p => CREATOR_PLATFORM_OPTIONS.find(o => o.value === p)?.label).join(", ")
                      : "None selected"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Wildness level:</span>
                    {EDGY_MODE_OPTIONS.find(o => o.value === form.edgyMode)?.label}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-muted-foreground">Hours/week:</span>
                    {form.hoursPerWeek ?? "Not set"} | 
                    <span className="text-muted-foreground ml-2">Capital:</span>
                    {form.availableCapital ? `$${form.availableCapital}` : "Not set"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Founder Setup
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Let's build your idea engine</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          5 quick steps to unlock personalized business ideas tailored to how you work and how wild you want to go.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="p-6 mb-6">{renderStep()}</Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 1 || saving}>
          Back
        </Button>
        {step < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={saving}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CoreOnboardingWizard;
