import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PulseFormProps {
  onSubmit: (data: {
    energy_level: number;
    stress_level: number;
    emotional_state: string;
    reflection: string;
  }) => void;
  isLoading?: boolean;
}

export const PulseForm = ({ onSubmit, isLoading = false }: PulseFormProps) => {
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(3);
  const [emotionalState, setEmotionalState] = useState("");
  const [reflection, setReflection] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emotionalState.trim()) {
      return;
    }

    onSubmit({
      energy_level: energyLevel,
      stress_level: stressLevel,
      emotional_state: emotionalState.trim(),
      reflection: reflection.trim(),
    });
  };

  const getEnergyLabel = (value: number) => {
    const labels = ["Very Low", "Low", "Moderate", "High", "Very High"];
    return labels[value - 1] || "Moderate";
  };

  const getStressLabel = (value: number) => {
    const labels = ["Very Low", "Low", "Moderate", "High", "Very High"];
    return labels[value - 1] || "Moderate";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Daily Pulse Check</CardTitle>
        <CardDescription>
          Take a moment to check in with yourself. How are you feeling today?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Energy Level */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="energy-level" className="text-base font-medium">
                Energy Level
              </Label>
              <div className="text-sm text-muted-foreground">
                {getEnergyLabel(energyLevel)}
              </div>
            </div>
            <Slider
              id="energy-level"
              min={1}
              max={5}
              step={1}
              value={[energyLevel]}
              onValueChange={(value) => setEnergyLevel(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Low</span>
              <span>Very High</span>
            </div>
          </div>

          {/* Stress Level */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stress-level" className="text-base font-medium">
                Stress Level
              </Label>
              <div className="text-sm text-muted-foreground">
                {getStressLabel(stressLevel)}
              </div>
            </div>
            <Slider
              id="stress-level"
              min={1}
              max={5}
              step={1}
              value={[stressLevel]}
              onValueChange={(value) => setStressLevel(value[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very Low</span>
              <span>Very High</span>
            </div>
          </div>

          {/* Emotional State */}
          <div className="space-y-2">
            <Label htmlFor="emotional-state" className="text-base font-medium">
              How are you feeling? <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emotional-state"
              placeholder="e.g., motivated, overwhelmed, excited, stuck..."
              value={emotionalState}
              onChange={(e) => setEmotionalState(e.target.value)}
              required
              disabled={isLoading}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Describe your emotional state in a few words
            </p>
          </div>

          {/* Reflection */}
          <div className="space-y-2">
            <Label htmlFor="reflection" className="text-base font-medium">
              Reflection (optional)
            </Label>
            <Textarea
              id="reflection"
              placeholder="What's on your mind? What happened today? What are you working through?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              disabled={isLoading}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Share any thoughts or context that might be helpful
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isLoading || !emotionalState.trim()}
          >
            {isLoading ? "Processing..." : "Log Today's Pulse"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
