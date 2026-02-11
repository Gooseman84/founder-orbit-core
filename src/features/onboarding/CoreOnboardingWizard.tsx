// src/features/onboarding/CoreOnboardingWizard.tsx
// Streamlined 2-step onboarding: Constraints + Wildness → Path Choice
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { upsertFounderProfile, normalizeFounderProfile } from "@/lib/founderProfileApi";
import type { RiskTolerance, Runway, EdgyMode } from "@/types/founderProfile";
import { Loader2, MessageSquare, Sparkles, Zap, ArrowRight } from "lucide-react";

const TOTAL_STEPS = 2;

// Edgy mode options
const EDGY_MODE_OPTIONS: { value: EdgyMode; label: string; description: string }[] = [
  { value: "safe", label: "Safe", description: "Keep it professional and conventional" },
  { value: "bold", label: "Bold", description: "Willing to push boundaries and stand out" },
  { value: "unhinged", label: "Unhinged", description: "Give me the wildest, most unconventional ideas" },
];

type QuickFormState = {
  // Step 1: Constraints (CRITICAL for idea filtering)
  hoursPerWeek: number | undefined;
  availableCapital: number | undefined;
  riskTolerance: RiskTolerance | "";
  runway: Runway | "";
  
  // Step 2: Wildness Preferences (CRITICAL for mode selection)
  openToPersonas: boolean;
  edgyMode: EdgyMode;
  wantsMoneySystems: "businesses" | "money_systems" | "both";
};

const initialForm: QuickFormState = {
  hoursPerWeek: undefined,
  availableCapital: undefined,
  riskTolerance: "",
  runway: "",
  openToPersonas: false,
  edgyMode: "bold",
  wantsMoneySystems: "both",
};

export function CoreOnboardingWizard() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<QuickFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPathChoice, setShowPathChoice] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const progress = (step / TOTAL_STEPS) * 100;

  const updateForm = <K extends keyof QuickFormState>(key: K, value: QuickFormState[K]) => {
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
      setStep(1);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build minimal profile for normalization
      const raw = {
        userId: user.id,
        // Minimal fields - let Mavrik discover the rest
        passionsText: "",
        passionDomains: [],
        passionDomainsOther: null,
        skillsText: "",
        skillTags: [],
        skillSpikes: {
          salesPersuasion: 3,
          contentTeaching: 3,
          opsSystems: 3,
          productCreativity: 3,
          numbersAnalysis: 3,
        },
        hoursPerWeek: form.hoursPerWeek ?? 0,
        availableCapital: form.availableCapital ?? 0,
        riskTolerance: form.riskTolerance,
        runway: form.runway,
        urgencyVsUpside: 3,
        lifestyleGoalsText: "",
        visionOfSuccessText: "",
        lifestyleNonNegotiables: [],
        
        // Wildness preferences
        workPersonality: [],
        creatorPlatforms: [],
        edgyMode: form.edgyMode,
        wantsMoneySystems: form.wantsMoneySystems === "money_systems" || form.wantsMoneySystems === "both",
        openToPersonas: form.openToPersonas,
        openToMemeticIdeas: form.edgyMode === "bold" || form.edgyMode === "unhinged",
      };

      const profile = await normalizeFounderProfile(raw);
      await upsertFounderProfile(user.id, profile);

      toast({
        title: "Profile saved",
        description: "Quick setup complete!",
      });

      // Show path choice instead of auto-navigating
      setShowPathChoice(true);
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

  // Path choice screen after completing quick setup
  if (showPathChoice) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">You're all set!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose how you want to continue. Both paths lead to personalized ideas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Option 1: Talk to Mavrik (Recommended) */}
          <Card 
            className="p-6 cursor-pointer hover:border-primary transition-all group relative overflow-hidden"
            onClick={() => navigate("/discover")}
          >
            <div className="absolute top-2 right-2">
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                Recommended
              </span>
            </div>
            <div className="flex flex-col items-center text-center pt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Talk to Mavrik</h3>
              <p className="text-sm text-muted-foreground mb-4">
                5-8 minute conversation to deeply understand your unique situation
              </p>
              <ul className="text-sm text-left space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  More personalized ideas
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Better founder-idea fit
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Discovers hidden strengths
                </li>
              </ul>
              <Button className="mt-6 w-full group-hover:bg-primary">
                Start Conversation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Option 2: Generate Ideas Now */}
          <Card 
            className="p-6 cursor-pointer hover:border-border/80 transition-all group"
            onClick={() => navigate("/ideas")}
          >
            <div className="flex flex-col items-center text-center pt-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Skip to Ideas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get ideas right now based on your constraints
              </p>
              <ul className="text-sm text-left space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Faster to start
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Basic personalization
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  Can talk to Mavrik later
                </li>
              </ul>
              <Button variant="outline" className="mt-6 w-full">
                Generate Ideas
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          You can always talk to Mavrik later from your Profile page
        </p>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Your Constraints</h2>
              <p className="text-muted-foreground">
                Be honest — this helps us filter out ideas that don't fit your life.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hoursPerWeek">Hours per week</Label>
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
                    placeholder="e.g., 0, 5000, 25000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Risk tolerance</Label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high"] as const).map((level) => {
                    const labelMap = { low: "Low — Play safe", medium: "Medium — Balanced", high: "High — Swing big" };
                    return (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={form.riskTolerance === level ? "default" : "outline"}
                        onClick={() => updateForm("riskTolerance", level)}
                        className="flex-1 min-w-[100px]"
                      >
                        {labelMap[level]}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>How long before you need income?</Label>
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
                      className="flex-1 min-w-[100px]"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-2">How wild do you want to go?</h2>
              <p className="text-muted-foreground">
                This shapes the types of ideas we'll generate for you.
              </p>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">Open to AI personas?</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Would you build with an AI character as the "face"?
                  </p>
                </div>
                <Switch
                  checked={form.openToPersonas}
                  onCheckedChange={(checked) => updateForm("openToPersonas", checked)}
                />
              </div>

              <div className="space-y-3">
                <Label>How edgy can we get?</Label>
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
                <Label>What do you want?</Label>
                <div className="grid gap-3">
                  {[
                    { value: "businesses" as const, label: "Full Businesses", description: "Products, services, startups" },
                    { value: "money_systems" as const, label: "Money Systems", description: "Automated income engines" },
                    { value: "both" as const, label: "Both", description: "Show me everything" },
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

      default:
        return null;
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">
          Quick Setup • ~90 seconds
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Let's get started</h1>
        <p className="text-muted-foreground text-sm">
          Two quick steps so we can personalize your ideas.
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
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default CoreOnboardingWizard;
