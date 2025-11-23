import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OnboardingData } from "@/types/onboarding";

interface ConstraintsStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
}

export const ConstraintsStep = ({ data, onUpdate }: ConstraintsStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">What are your constraints?</h2>
        <p className="text-muted-foreground">
          Understanding your time, budget, and risk tolerance helps us match you with realistic opportunities.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="time_per_week">Hours Available Per Week</Label>
          <Input
            id="time_per_week"
            type="number"
            min="0"
            max="168"
            value={data.time_per_week || ""}
            onChange={(e) => onUpdate({ time_per_week: parseInt(e.target.value) || 0 })}
            placeholder="e.g., 20"
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            How many hours can you dedicate to your venture each week?
          </p>
        </div>

        <div>
          <Label htmlFor="capital_available">Available Capital ($)</Label>
          <Input
            id="capital_available"
            type="number"
            min="0"
            value={data.capital_available || ""}
            onChange={(e) => onUpdate({ capital_available: parseInt(e.target.value) || 0 })}
            placeholder="e.g., 5000"
            className="mt-2"
          />
          <p className="text-sm text-muted-foreground mt-1">
            How much can you invest in starting your business?
          </p>
        </div>

        <div>
          <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
          <Select
            value={data.risk_tolerance}
            onValueChange={(value) => onUpdate({ risk_tolerance: value })}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select your risk tolerance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low - Prefer safe, proven opportunities</SelectItem>
              <SelectItem value="medium">Medium - Balance between risk and reward</SelectItem>
              <SelectItem value="high">High - Willing to take bigger risks for bigger rewards</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
