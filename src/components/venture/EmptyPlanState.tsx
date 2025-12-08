import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Sparkles, Loader2 } from "lucide-react";

interface EmptyPlanStateProps {
  onGenerate: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

export function EmptyPlanState({ onGenerate, isGenerating, disabled }: EmptyPlanStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No 30-Day Plan Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Generate a personalized 30-day execution sprint with weekly themes and micro-tasks
          tailored to your venture and constraints.
        </p>
        <Button
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          size="lg"
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate My 30-Day Plan
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
