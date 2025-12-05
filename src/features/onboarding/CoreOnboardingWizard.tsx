// src/features/onboarding/CoreOnboardingWizard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { upsertFounderProfile } from "@/lib/founderProfileApi";
import type { FounderProfile, RiskTolerance, Runway } from "@/types/founderProfile";

const TOTAL_STEPS = 5;

const PASSION_DOMAIN_OPTIONS = [
  "Health & fitness",
  "Money & investing",
  "Parenting & family",
  "Relationships",
  "Career & performance",
  "Spirituality / meaning",
  "DIY / home / real estate",
  "Tech & AI",
  "Sports & outdoors",
  "Travel & experiences",
  "Creativity & art",
  "Other",
];

const SKILL_TAG_OPTIONS = [
  "Strategy & planning",
  "Sales & persuasion",
  "Marketing & content",
  "Product / design",
  "Tech / data / coding",
  "Operations & systems",
  "People leadership / coaching",
  "Finance / deals / numbers",
  "Creative / storytelling",
  "Other",
];

const LIFESTYLE_NON_NEGOTIABLES = [
  "Location freedom",
  "Flexible hours",
  "In-person work is fine",
  "No employees",
  "Happy to build a team",
  "No social media / content",
  "Happy to be the face of the brand",
  "Must strongly align with my values / faith",
  "Okay with intense 2–3 year push",
];

type CoreFormState = {
  passionsText: string;
  passionDomains: string[];
  passionDomainsOther: string;
  skillsText: string;
  skillTags: string[];
  skillSpikes: {
    salesPersuasion: number;
    contentTeaching: number;
    opsSystems: number;
    productCreativity: number;
    numbersAnalysis: number;
  };
  hoursPerWeek: number | undefined;
  availableCapital: number | undefined;
  riskTolerance: RiskTolerance | "";
  runway: Runway | "";
  urgencyVsUpside: number;
  lifestyleGoalsText: string;
  visionOfSuccessText: string;
  lifestyleNonNegotiables: string[];
};

const initialForm: CoreFormState = {
  passionsText: "",
  passionDomains: [],
  passionDomainsOther: "",
  skillsText: "",
  skillTags: [],
  skillSpikes: {
    salesPersuasion: 3,
    contentTeaching: 3,
    opsSystems: 3,
    productCreativity: 3,
    numbersAnalysis: 3,
  },
  hoursPerWeek: undefined,
  availableCapital: undefined,
  riskTolerance: "",
  runway: "",
  urgencyVsUpside: 3,
  lifestyleGoalsText: "",
  visionOfSuccessText: "",
  lifestyleNonNegotiables: [],
};

function ChipMultiSelect({
  options,
  value,
  onChange,
  max,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const toggleValue = (option: string) => {
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
            {option}
          </Button>
        );
      })}
    </div>
  );
}

export function CoreOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CoreFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [showExtendedPrompt, setShowExtendedPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const progress = (step / TOTAL_STEPS) * 100;

  const updateForm = <K extends keyof CoreFormState>(key: K, value: CoreFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      setStep(3);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      const profile: FounderProfile = {
        userId: user.id,
        passionsText: form.passionsText,
        passionDomains: form.passionDomains,
        passionDomainsOther: form.passionDomainsOther || null,
        skillsText: form.skillsText,
        skillTags: form.skillTags,
        skillSpikes: { ...form.skillSpikes },
        hoursPerWeek: form.hoursPerWeek ?? 0,
        availableCapital: form.availableCapital ?? 0,
        riskTolerance: form.riskTolerance,
        runway: form.runway,
        urgencyVsUpside: form.urgencyVsUpside,
        lifestyleGoalsText: form.lifestyleGoalsText,
        visionOfSuccessText: form.visionOfSuccessText,
        lifestyleNonNegotiables: form.lifestyleNonNegotiables,
        // Extended fields start empty – filled in by ExtendedProfileWizard later
        primaryDesires: [],
        energyGiversText: "",
        energyDrainersText: "",
        antiVisionText: "",
        legacyStatementText: "",
        fearStatementText: "",
        businessArchetypes: [],
        founderRoles: [],
        workStylePreferences: [],
        commitmentLevel: 0,
        marketSegmentsUnderstood: [],
        existingNetworkChannels: [],
        hellNoFilters: [],
        createdAt: now,
        updatedAt: now,
      };

      await upsertFounderProfile(user.id, profile);

      toast({
        title: "Profile saved",
        description: "Your founder profile has been created.",
      });

      setShowExtendedPrompt(true);
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

  if (showExtendedPrompt) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">✨</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Profile created!</h2>
            <p className="text-muted-foreground">
              Want sharper, more personalized ideas? Complete your extended profile so we can factor in
              your deeper motivations, energy patterns, and work style.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/onboarding/extended")}> 
              Complete Extended Profile
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/ideas")}>
              Skip for now
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can always finish this later from your Profile page.
          </p>
        </Card>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Passions</h2>
              <p className="text-muted-foreground">
                Tell us what you care about so we can steer you toward ideas you&apos;ll actually love.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passionsText">What are you passionate about?</Label>
                <Textarea
                  id="passionsText"
                  rows={5}
                  value={form.passionsText}
                  onChange={(e) => updateForm("passionsText", e.target.value)}
                  placeholder="Examples: Helping people get unstuck in their careers, fitness and performance, simplifying money decisions..."
                />
              </div>

              <div className="space-y-2">
                <Label>Which domains light you up the most? (max 5)</Label>
                <ChipMultiSelect
                  options={PASSION_DOMAIN_OPTIONS}
                  value={form.passionDomains}
                  onChange={(next) => updateForm("passionDomains", next)}
                  max={5}
                />
                {form.passionDomains.includes("Other") && (
                  <Input
                    className="mt-2"
                    placeholder="What else?"
                    value={form.passionDomainsOther}
                    onChange={(e) => updateForm("passionDomainsOther", e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Skills & Experience</h2>
              <p className="text-muted-foreground">
                What have you actually done, and where do you have unfair advantage?
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="skillsText">What have you been paid to do or are naturally good at?</Label>
                <Textarea
                  id="skillsText"
                  rows={5}
                  value={form.skillsText}
                  onChange={(e) => updateForm("skillsText", e.target.value)}
                  placeholder="Examples: 5 years in B2B sales, ran ads for local businesses, strong writer, good at simplifying complex topics..."
                />
              </div>

              <div className="space-y-2">
                <Label>Skill tags</Label>
                <ChipMultiSelect
                  options={SKILL_TAG_OPTIONS}
                  value={form.skillTags}
                  onChange={(next) => updateForm("skillTags", next)}
                />
              </div>

              <div className="space-y-4">
                <Label>Where are your strongest spikes? (1 = weak, 5 = very strong)</Label>
                {([
                  "salesPersuasion",
                  "contentTeaching",
                  "opsSystems",
                  "productCreativity",
                  "numbersAnalysis",
                ] as const).map((key) => {
                  const labelMap: Record<typeof key, string> = {
                    salesPersuasion: "Sales & persuasion",
                    contentTeaching: "Content & teaching",
                    opsSystems: "Ops & systems",
                    productCreativity: "Product & creativity",
                    numbersAnalysis: "Numbers & analysis",
                  } as const;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{labelMap[key]}</span>
                        <span className="text-muted-foreground">{form.skillSpikes[key]}</span>
                      </div>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[form.skillSpikes[key]]}
                        onValueChange={([val]) =>
                          updateForm("skillSpikes", { ...form.skillSpikes, [key]: val })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Constraints</h2>
              <p className="text-muted-foreground">
                Be honest about your real constraints so we don&apos;t recommend ideas that break your life.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hoursPerWeek">Hours available per week</Label>
                <Input
                  id="hoursPerWeek"
                  type="number"
                  min={0}
                  max={168}
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
                    updateForm(
                      "availableCapital",
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  placeholder="Roughly how much could you invest?"
                />
              </div>

              <div className="space-y-2">
                <Label>Risk tolerance</Label>
                <div className="flex flex-wrap gap-2">
                  {["low", "medium", "high"].map((level) => {
                    const labelMap: Record<string, string> = {
                      low: "Low",
                      medium: "Medium",
                      high: "High",
                    };
                    return (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={form.riskTolerance === level ? "default" : "outline"}
                        onClick={() => updateForm("riskTolerance", level as RiskTolerance)}
                      >
                        {labelMap[level]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Runway</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "0_3_months", label: "0–3 months" },
                    { value: "3_12_months", label: "3–12 months" },
                    { value: "12_plus_months", label: "12+ months" },
                  ].map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={form.runway === opt.value ? "default" : "outline"}
                      onClick={() => updateForm("runway", opt.value as Runway)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Urgency vs upside</Label>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 = Cash ASAP</span>
                  <span>5 = Max upside, okay if slower</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[form.urgencyVsUpside]}
                  onValueChange={([val]) => updateForm("urgencyVsUpside", val)}
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Lifestyle & Vision</h2>
              <p className="text-muted-foreground">
                Describe the life you want this business to support.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lifestyleGoalsText">Lifestyle goals</Label>
                <Textarea
                  id="lifestyleGoalsText"
                  rows={4}
                  value={form.lifestyleGoalsText}
                  onChange={(e) => updateForm("lifestyleGoalsText", e.target.value)}
                  placeholder="How do you want your days and weeks to feel?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visionOfSuccessText">Vision of success</Label>
                <Textarea
                  id="visionOfSuccessText"
                  rows={4}
                  value={form.visionOfSuccessText}
                  onChange={(e) => updateForm("visionOfSuccessText", e.target.value)}
                  placeholder="In 3–5 years, what does &quot;this worked&quot; look like for you?"
                />
              </div>

              <div className="space-y-2">
                <Label>Non‑negotiables (max 3)</Label>
                <ChipMultiSelect
                  options={LIFESTYLE_NON_NEGOTIABLES}
                  value={form.lifestyleNonNegotiables}
                  onChange={(next) => updateForm("lifestyleNonNegotiables", next)}
                  max={3}
                />
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Review</h2>
              <p className="text-muted-foreground">
                Quick snapshot of what you&apos;ve told us. You can tweak any section before saving.
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-semibold mb-1">Passions</h3>
                <p className="text-muted-foreground mb-1">{form.passionsText || "Not provided"}</p>
                {form.passionDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.passionDomains.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-1">Skills</h3>
                <p className="text-muted-foreground mb-1">{form.skillsText || "Not provided"}</p>
                {form.skillTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.skillTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-1">Constraints</h3>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Hours/week:</span>
                  <span>{form.hoursPerWeek ?? "—"}</span>
                  <span className="text-muted-foreground">Available capital:</span>
                  <span>{form.availableCapital != null ? `$${form.availableCapital}` : "—"}</span>
                  <span className="text-muted-foreground">Risk tolerance:</span>
                  <span className="capitalize">{form.riskTolerance || "—"}</span>
                  <span className="text-muted-foreground">Runway:</span>
                  <span>{form.runway || "—"}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-1">Lifestyle & vision</h3>
                <p className="text-muted-foreground mb-1">
                  {form.lifestyleGoalsText || "No lifestyle goals added"}
                </p>
                <p className="text-muted-foreground">
                  {form.visionOfSuccessText || "No success vision added"}
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Founder Onboarding
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s understand how you&apos;re wired</h1>
        <p className="text-muted-foreground text-sm max-w-xl">
          We&apos;ll use this to filter out bad-fit ideas and surface opportunities that match your
          passions, skills, and real-world constraints.
        </p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
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
