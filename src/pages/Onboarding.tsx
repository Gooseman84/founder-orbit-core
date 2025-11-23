import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingData, INITIAL_ONBOARDING_DATA } from "@/types/onboarding";
import { PassionsStep } from "@/components/onboarding/PassionsStep";
import { SkillsStep } from "@/components/onboarding/SkillsStep";
import { ConstraintsStep } from "@/components/onboarding/ConstraintsStep";
import { VisionStep } from "@/components/onboarding/VisionStep";
import { SummaryStep } from "@/components/onboarding/SummaryStep";

const TOTAL_STEPS = 5;

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const updateFormData = (data: Partial<OnboardingData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to save your profile.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("founder_profiles")
        .upsert({
          user_id: user.id,
          ...formData,
        });

      if (error) throw error;

      toast({
        title: "Profile Saved!",
        description: "Your founder profile has been created successfully.",
      });

      navigate("/ideas");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PassionsStep data={formData} onUpdate={updateFormData} />;
      case 2:
        return <SkillsStep data={formData} onUpdate={updateFormData} />;
      case 3:
        return <ConstraintsStep data={formData} onUpdate={updateFormData} />;
      case 4:
        return <VisionStep data={formData} onUpdate={updateFormData} />;
      case 5:
        return <SummaryStep data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome to FounderOS</h1>
        <p className="text-muted-foreground">
          Let's build your founder profile to generate personalized ideas
        </p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Step {currentStep} of {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="bg-card border border-border rounded-lg p-8 mb-6">
        {renderStep()}
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          Back
        </Button>

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save and Continue"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
