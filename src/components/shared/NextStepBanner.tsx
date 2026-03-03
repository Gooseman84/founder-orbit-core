import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useNextStep } from "@/hooks/useNextStep";
import { cn } from "@/lib/utils";

const BANNER_ROUTES = ["/dashboard", "/ideas", "/blueprint", "/workspace", "/tasks", "/discover"];
const DISMISS_PREFIX = "nextstep_dismissed_";

export function NextStepBanner() {
  const location = useLocation();
  const { data: step, isLoading } = useNextStep();
  const [dismissed, setDismissed] = useState<string | null>(null);

  // Check localStorage for dismissal on step change
  useEffect(() => {
    if (step) {
      const stored = localStorage.getItem(DISMISS_PREFIX + step.id);
      setDismissed(stored ? step.id : null);
    }
  }, [step]);

  // Only show on allowed routes
  const show = BANNER_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(r + "/")
  );

  if (!show || isLoading || !step || dismissed === step.id) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_PREFIX + step.id, "1");
    setDismissed(step.id);
  };

  return (
    <div
      className={cn(
        "mx-3 md:mx-0 mb-4 flex items-start sm:items-center gap-3 rounded-md",
        "bg-muted/40 border-l-2 border-primary px-4 py-3 text-sm text-muted-foreground"
      )}
    >
      <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
      <p className="flex-1 min-w-0">
        <span>{step.message}</span>{" "}
        <Link
          to={step.href}
          className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2 hover:text-primary/80 whitespace-nowrap"
        >
          {step.cta}
        </Link>
      </p>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
