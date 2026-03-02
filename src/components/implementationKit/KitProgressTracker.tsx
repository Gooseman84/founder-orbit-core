import { cn } from '@/lib/utils';

type ProgressStepId = 'blueprint' | 'kit' | 'vertical' | 'feature1' | 'launch';
type ProgressStatus = 'complete' | 'current' | 'pending';

interface ProgressStep {
  id: ProgressStepId;
  label: string;
  status: ProgressStatus;
}

interface KitProgressTrackerProps {
  currentStep: ProgressStepId;
  className?: string;
}

export function KitProgressTracker({ currentStep, className }: KitProgressTrackerProps) {
  const getStepStatus = (stepId: ProgressStepId): ProgressStatus => {
    const steps: ProgressStepId[] = ['blueprint', 'kit', 'vertical', 'feature1', 'launch'];
    const currentIndex = steps.indexOf(currentStep);
    const stepIndex = steps.indexOf(stepId);
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const steps: ProgressStep[] = [
    { id: 'blueprint', label: 'BLUEPRINT', status: getStepStatus('blueprint') },
    { id: 'kit', label: 'KIT', status: getStepStatus('kit') },
    { id: 'vertical', label: 'SLICE', status: getStepStatus('vertical') },
    { id: 'feature1', label: 'FEATURE', status: getStepStatus('feature1') },
    { id: 'launch', label: 'LAUNCH', status: getStepStatus('launch') },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <p
        className="font-mono-tb text-[0.68rem] uppercase tracking-wider pb-2"
        style={{
          color: "hsl(43 52% 54%)",
          borderBottom: "1px solid hsl(240 10% 14%)",
        }}
      >
        DEVELOPMENT PROGRESS
      </p>

      <div className="flex gap-4">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <div
              className={step.status === 'current' ? 'animate-pulse' : ''}
              style={{
                width: "10px",
                height: "10px",
                background:
                  step.status === 'complete'
                    ? "hsl(43 52% 54%)"
                    : "transparent",
                border:
                  step.status === 'complete'
                    ? "none"
                    : step.status === 'current'
                      ? "1px solid hsl(43 52% 54%)"
                      : "1px solid hsl(220 12% 58%)",
              }}
            />
            <span
              className="font-mono-tb text-[0.58rem] uppercase"
              style={{ color: "hsl(220 12% 58%)" }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
