// src/components/onboarding/PassionsStep.tsx
import { Label } from "@/components/ui/label";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import { TagInput } from "./TagInput";
import { OnboardingData } from "@/types/onboarding";

interface PassionsStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const PassionsStep = ({ data, onUpdate }: PassionsStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">What are you passionate about?</h2>
        <p className="text-muted-foreground">
          Tell us what excites you, what you love talking about, and what keeps you engaged.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="passions_text">Your Passions</Label>
          <TextareaWithVoice
            id="passions_text"
            value={data.passions_text}
            onChange={(e) => onUpdate({ passions_text: e.target.value })}
            placeholder="Example: I'm passionate about sustainable living, helping small businesses grow, and making technology accessible to everyone..."
            rows={5}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Quick Tags (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">Add quick tags to highlight key passions</p>
          <TagInput
            tags={data.passions_tags}
            onTagsChange={(tags) => onUpdate({ passions_tags: tags })}
            placeholder="e.g., sustainability, education, health..."
          />
        </div>
      </div>
    </div>
  );
};
