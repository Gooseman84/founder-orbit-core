import { Check, Clock, Code, FileText, Sparkles, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ProgressStepId = 'blueprint' | 'kit' | 'vertical' | 'feature1' | 'launch';
type ProgressStatus = 'complete' | 'current' | 'pending';

interface ProgressStep {
  id: ProgressStepId;
  label: string;
  status: ProgressStatus;
  icon: typeof Check;
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
    { 
      id: 'blueprint', 
      label: 'Blueprint Complete', 
      status: getStepStatus('blueprint'), 
      icon: Check 
    },
    { 
      id: 'kit', 
      label: 'Implementation Kit Generated', 
      status: getStepStatus('kit'), 
      icon: FileText 
    },
    { 
      id: 'vertical', 
      label: 'Building Thin Vertical Slice', 
      status: getStepStatus('vertical'), 
      icon: Code 
    },
    { 
      id: 'feature1', 
      label: 'Feature #1: Core Workflow', 
      status: getStepStatus('feature1'), 
      icon: Sparkles 
    },
    { 
      id: 'launch', 
      label: 'Launch', 
      status: getStepStatus('launch'), 
      icon: Rocket 
    },
  ];
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Development Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3 pb-6 last:pb-0">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute left-[15px] top-[28px] w-0.5 h-6",
                    step.status === 'complete' ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ top: `${index * 48 + 28}px` }}
                />
              )}
              
              {/* Step content */}
              <div className="flex items-start gap-3 relative z-10">
                <div 
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 flex-shrink-0",
                    step.status === 'complete' && "bg-primary border-primary text-primary-foreground",
                    step.status === 'current' && "border-primary bg-primary/10 text-primary",
                    step.status === 'pending' && "border-muted bg-muted/50 text-muted-foreground"
                  )}
                >
                  <step.icon className="h-4 w-4" />
                </div>
                <div className="pt-1">
                  <span 
                    className={cn(
                      "text-sm font-medium",
                      step.status === 'complete' && "text-foreground",
                      step.status === 'current' && "text-primary",
                      step.status === 'pending' && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
