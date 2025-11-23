import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingData } from "@/types/onboarding";

interface VisionStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const VisionStep = ({ data, onUpdate }: VisionStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Your Lifestyle & Vision</h2>
        <p className="text-muted-foreground">
          Help us understand what success looks like for you and the lifestyle you want to create.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="lifestyle_goals">Lifestyle Goals</Label>
          <Textarea
            id="lifestyle_goals"
            value={data.lifestyle_goals}
            onChange={(e) => onUpdate({ lifestyle_goals: e.target.value })}
            placeholder="Example: I want to work remotely, travel 3 months a year, have flexibility for family time, and avoid long commutes..."
            rows={5}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            What kind of lifestyle do you want your business to support?
          </p>
        </div>

        <div>
          <Label htmlFor="success_vision">Vision of Success</Label>
          <Textarea
            id="success_vision"
            value={data.success_vision}
            onChange={(e) => onUpdate({ success_vision: e.target.value })}
            placeholder="Example: In 3 years, I see myself running a profitable business that helps 10,000+ people, generating $200K/year in revenue, with a small team I enjoy working with..."
            rows={5}
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            What does success look like for you in the next 3-5 years?
          </p>
        </div>
      </div>
    </div>
  );
};
