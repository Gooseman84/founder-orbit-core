import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FunnelStep = "discover" | "summary" | "results" | "commit" | "blueprint";

interface FunnelStepperProps {
  currentStep: FunnelStep;
}

const STEPS: { key: FunnelStep; label: string }[] = [
  { key: "discover", label: "Interview" },
  { key: "summary", label: "Profile" },
  { key: "results", label: "Ideas" },
  { key: "commit", label: "Commit" },
  { key: "blueprint", label: "Blueprint" },
];

export function FunnelStepper({ currentStep }: FunnelStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="w-full bg-background border-b border-border px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors shrink-0",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary animate-pulse",
                    !isCompleted && !isCurrent && "border-muted-foreground/40 text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[10px] leading-tight hidden sm:block",
                    isCompleted && "text-primary",
                    isCurrent && "text-primary font-semibold",
                    !isCompleted && !isCurrent && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full",
                    i < currentIndex ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
