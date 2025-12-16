import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useExtendedIntake } from "@/hooks/useExtendedIntake";
import { StepProgressBar } from "@/components/onboarding/extended/StepProgressBar";
import { DeepDesiresStep } from "@/components/onboarding/extended/DeepDesiresStep";
import { EnergyProfileStep } from "@/components/onboarding/extended/EnergyProfileStep";
import { IdentityStep } from "@/components/onboarding/extended/IdentityStep";
import { ArchetypesStep } from "@/components/onboarding/extended/ArchetypesStep";
import { WorkPreferencesStep } from "@/components/onboarding/extended/WorkPreferencesStep";
import { PersonalityFlagsStep } from "@/components/onboarding/extended/PersonalityFlagsStep";
import { toast } from "sonner";

const TOTAL_STEPS = 6;
const STEP_LABELS = [
  "Desires",
  "Energy",
  "Identity",
  "Archetypes",
  "Work Style",
  "Personality",
];

export default function ExtendedOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { data, updateField, save, loading, saving } = useExtendedIntake();

  const handleNext = async () => {
    // Save progress on each step
    const success = await save();
    if (!success) return;

    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Final step - complete onboarding
      toast.success("Extended profile complete!");
      navigate("/ideas");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Deep Dive Profile</h1>
          </div>
          <p className="text-muted-foreground">
            Optional: Share more about yourself for even better personalized ideas
          </p>
        </div>

        {/* Progress Bar */}
        <StepProgressBar
          currentStep={step}
          totalSteps={TOTAL_STEPS}
          stepLabels={STEP_LABELS}
        />

        {/* Step Content */}
        <Card className="p-6 md:p-8">
          {step === 1 && (
            <DeepDesiresStep
              value={data.deep_desires}
              onChange={(value) => updateField("deep_desires", value)}
            />
          )}

          {step === 2 && (
            <EnergyProfileStep
              energyGivers={data.energy_givers}
              energyDrainers={data.energy_drainers}
              onChangeGivers={(value) => updateField("energy_givers", value)}
              onChangeDrainers={(value) => updateField("energy_drainers", value)}
            />
          )}

          {step === 3 && (
            <IdentityStep
              value={data.identity_statements}
              onChange={(value) => updateField("identity_statements", value)}
              fears={data.fears}
              onChangeFears={(value) => updateField("fears", value)}
            />
          )}

          {step === 4 && (
            <ArchetypesStep
              selected={data.business_archetypes}
              onChange={(value) => updateField("business_archetypes", value)}
            />
          )}

          {step === 5 && (
            <WorkPreferencesStep
              selected={data.work_preferences}
              onChange={(value) => updateField("work_preferences", value)}
            />
          )}

          {step === 6 && (
            <PersonalityFlagsStep
              flags={data.personality_flags}
              onChange={(value) => updateField("personality_flags", value)}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || saving}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button onClick={handleNext} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : step === TOTAL_STEPS ? (
                <>
                  Complete
                  <Sparkles className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Skip Link */}
        <div className="text-center mt-4">
          <Button
            variant="link"
            onClick={() => navigate("/ideas")}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
}
