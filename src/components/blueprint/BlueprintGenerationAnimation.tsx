import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GENERATION_STEPS = [
  "Analyzing your founder profile",
  "Mapping market opportunity",
  "Defining target audience",
  "Crafting problem & promise",
  "Building monetization strategy",
  "Identifying distribution channels",
  "Generating AI recommendations",
  "Finalizing your blueprint",
];

interface BlueprintGenerationAnimationProps {
  isGenerating: boolean;
  onStepChange?: (step: number) => void;
}

export function BlueprintGenerationAnimation({ isGenerating, onStepChange }: BlueprintGenerationAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, GENERATION_STEPS.length - 1);
        onStepChange?.(next);
        return next;
      });
    }, 2200);

    return () => clearInterval(interval);
  }, [isGenerating, onStepChange]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Building Your Blueprint</h1>
        <p className="text-muted-foreground">
          Our AI is crafting a personalized plan based on your profile and venture…
        </p>
      </div>

      {/* Progress steps */}
      <div className="space-y-3 max-w-md mx-auto">
        {GENERATION_STEPS.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500",
                isDone && "bg-primary/5",
                isActive && "bg-primary/10 scale-[1.02]",
                !isDone && !isActive && "opacity-40"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 animate-scale-in" />
              ) : isActive ? (
                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className={cn(
                "text-sm",
                isDone && "text-foreground",
                isActive && "text-foreground font-medium",
                !isDone && !isActive && "text-muted-foreground"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Skeleton preview cards */}
      <div className="space-y-4 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
