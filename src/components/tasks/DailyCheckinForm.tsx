import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyCheckinFormProps {
  onSubmit: (data: {
    completionStatus: "yes" | "partial" | "no";
    explanation?: string;
    reflection: string;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
}

export function DailyCheckinForm({ onSubmit, isSubmitting }: DailyCheckinFormProps) {
  const [completionStatus, setCompletionStatus] = useState<"yes" | "partial" | "no" | null>(null);
  const [explanation, setExplanation] = useState("");
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState<string | null>(null);

  const needsExplanation = completionStatus === "partial" || completionStatus === "no";

  const handleSubmit = async () => {
    setError(null);
    
    if (!completionStatus) {
      setError("Please select a completion status");
      return;
    }
    
    if (!reflection.trim()) {
      setError("Please answer the reflection question");
      return;
    }
    
    if (needsExplanation && !explanation.trim()) {
      setError("Please explain what happened");
      return;
    }

    const success = await onSubmit({
      completionStatus,
      explanation: needsExplanation ? explanation : undefined,
      reflection,
    });

    if (!success) {
      setError("Failed to submit check-in. Please try again.");
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          End of Day Check-In
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Did you complete today's tasks?</Label>
          <RadioGroup
            value={completionStatus || ""}
            onValueChange={(val) => setCompletionStatus(val as "yes" | "partial" | "no")}
            className="flex gap-4"
          >
            <label 
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                completionStatus === "yes" 
                  ? "border-green-500 bg-green-500/10" 
                  : "border-border hover:bg-secondary"
              )}
            >
              <RadioGroupItem value="yes" id="yes" className="sr-only" />
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span>Yes</span>
            </label>
            <label 
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                completionStatus === "partial" 
                  ? "border-amber-500 bg-amber-500/10" 
                  : "border-border hover:bg-secondary"
              )}
            >
              <RadioGroupItem value="partial" id="partial" className="sr-only" />
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span>Partially</span>
            </label>
            <label 
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors",
                completionStatus === "no" 
                  ? "border-red-500 bg-red-500/10" 
                  : "border-border hover:bg-secondary"
              )}
            >
              <RadioGroupItem value="no" id="no" className="sr-only" />
              <XCircle className="h-5 w-5 text-red-500" />
              <span>No</span>
            </label>
          </RadioGroup>
        </div>

        {needsExplanation && (
          <div className="space-y-2">
            <Label htmlFor="explanation">What happened?</Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value.slice(0, 200))}
              placeholder="Brief explanation (max 200 characters)"
              className="h-20 resize-none"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground text-right">{explanation.length}/200</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reflection">What blocked you today?</Label>
          <Textarea
            id="reflection"
            value={reflection}
            onChange={(e) => setReflection(e.target.value.slice(0, 300))}
            placeholder="Quick reflection (max 300 characters)"
            className="h-24 resize-none"
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground text-right">{reflection.length}/300</p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !completionStatus || !reflection.trim()}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Complete Today"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
