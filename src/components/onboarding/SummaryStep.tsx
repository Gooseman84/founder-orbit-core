// src/components/onboarding/SummaryStep.tsx
import { OnboardingData } from "@/types/onboarding";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SummaryStepProps {
  data: OnboardingData;
}

export const SummaryStep = ({ data }: SummaryStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Review Your Profile</h2>
        <p className="text-muted-foreground">
          Here's a summary of your founder profile. Click "Save and Continue" to proceed.
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Passions</h3>
          <p className="text-sm text-muted-foreground mb-2">{data.passions_text || "Not provided"}</p>
          {data.passions_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.passions_tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Skills</h3>
          <p className="text-sm text-muted-foreground mb-2">{data.skills_text || "Not provided"}</p>
          {data.skills_tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.skills_tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Constraints</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Time per week:</span>
              <span className="ml-2 font-medium">{data.time_per_week} hours</span>
            </div>
            <div>
              <span className="text-muted-foreground">Available capital:</span>
              <span className="ml-2 font-medium">${data.capital_available.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Risk tolerance:</span>
              <span className="ml-2 font-medium capitalize">{data.risk_tolerance || "Not set"}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Lifestyle Goals</h3>
          <p className="text-sm text-muted-foreground">{data.lifestyle_goals || "Not provided"}</p>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Vision of Success</h3>
          <p className="text-sm text-muted-foreground">{data.success_vision || "Not provided"}</p>
        </div>
      </div>
    </div>
  );
};
