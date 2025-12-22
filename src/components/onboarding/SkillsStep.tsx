// src/components/onboarding/SkillsStep.tsx
import { Label } from "@/components/ui/label";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import { TagInput } from "./TagInput";
import { OnboardingData } from "@/types/onboarding";

interface SkillsStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const SkillsStep = ({ data, onUpdate }: SkillsStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">What are your skills?</h2>
        <p className="text-muted-foreground">
          What have you been paid to do? What are you naturally good at? Include both hard and soft skills.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="skills_text">Your Skills & Experience</Label>
          <TextareaWithVoice
            id="skills_text"
            value={data.skills_text}
            onChange={(e) => onUpdate({ skills_text: e.target.value })}
            placeholder="Example: I've worked in marketing for 5 years, managed social media campaigns, and have strong writing skills. I'm also great at problem-solving and connecting with people..."
            rows={5}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Skill Tags (Optional)</Label>
          <p className="text-sm text-muted-foreground mb-2">Add quick tags for your key skills</p>
          <TagInput
            tags={data.skills_tags}
            onTagsChange={(tags) => onUpdate({ skills_tags: tags })}
            placeholder="e.g., marketing, design, coding..."
          />
        </div>
      </div>
    </div>
  );
};
