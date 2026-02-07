// src/components/discover/DiscoverResultsLoading.tsx
import { useState, useEffect } from "react";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const PROGRESS_STEPS = [
  "Evaluating your expertise...",
  "Matching market opportunities...",
  "Scoring founder-market fit...",
  "Finalizing recommendations...",
];

interface DiscoverResultsLoadingProps {
  className?: string;
}

export function DiscoverResultsLoading({ className }: DiscoverResultsLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < PROGRESS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center min-h-[60vh] px-4", className)}>
      {/* Animated Mavrik Avatar */}
      <div className="relative mb-8">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Compass className="h-10 w-10 text-primary animate-spin" style={{ animationDuration: "3s" }} />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      {/* Main text */}
      <h2 className="text-lg sm:text-xl font-semibold text-center mb-8 max-w-md">
        Mavrik is analyzing your profile and finding ventures that fit you...
      </h2>

      {/* Progress steps */}
      <div className="space-y-3 w-full max-w-xs">
        {PROGRESS_STEPS.map((step, index) => (
          <div
            key={step}
            className={cn(
              "flex items-center gap-3 transition-all duration-500",
              index <= currentStep ? "opacity-100" : "opacity-0"
            )}
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full transition-colors duration-300",
                index < currentStep
                  ? "bg-primary"
                  : index === currentStep
                  ? "bg-primary animate-pulse"
                  : "bg-muted"
              )}
            />
            <span
              className={cn(
                "text-sm transition-colors duration-300",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
            {index < currentStep && (
              <span className="text-xs text-primary ml-auto">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
