import { cn } from "@/lib/utils";

type StepProgressBarProps = {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
};

export function StepProgressBar({ currentStep, totalSteps, stepLabels }: StepProgressBarProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                i + 1 < currentStep && "bg-primary text-primary-foreground",
                i + 1 === currentStep && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                i + 1 > currentStep && "bg-muted text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            <span className={cn(
              "text-xs mt-1 text-center hidden sm:block",
              i + 1 === currentStep ? "text-foreground font-medium" : "text-muted-foreground"
            )}>
              {stepLabels[i]}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
