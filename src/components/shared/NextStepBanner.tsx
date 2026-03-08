import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { useNextStep } from "@/hooks/useNextStep";
import { MavrikLabel } from "@/components/shared/MavrikLabel";

const BANNER_ROUTES = ["/dashboard", "/ideas", "/blueprint", "/workspace", "/tasks", "/discover"];

const STEP_ORDER = [
  "complete_interview",
  "complete_lightning_round",
  "generate_ideas",
  "calculate_fvs",
  "start_venture",
  "generate_blueprint",
  "generate_kit",
  "generate_tasks",
  "checkin_today",
];
const TOTAL_STEPS = STEP_ORDER.length;

export function NextStepBanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: step, isLoading } = useNextStep();
  const [dismissed, setDismissed] = useState(false);

  const show = BANNER_ROUTES.some(
    (r) => location.pathname === r || location.pathname.startsWith(r + "/")
  );

  if (!show || isLoading || !step || dismissed) return null;

  const stepNumber = STEP_ORDER.indexOf(step.id) + 1;
  const stepLabel = stepNumber > 0 ? `Step ${stepNumber} of ${TOTAL_STEPS}` : null;

  return (
    <div className="mb-6 card-gold-accent p-5">
      <div className="flex items-start justify-between gap-3">
        <MavrikLabel suffix={stepLabel ? `Your Next Move · ${stepLabel}` : "Your Next Move"} />
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 hover:bg-muted rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <p className="mt-3 text-sm text-foreground leading-relaxed">{step.message}</p>

      <button
        onClick={() => navigate(step.href)}
        className="mt-4 py-2.5 px-5 bg-primary text-primary-foreground font-sans font-medium text-[0.8rem] tracking-[0.06em] uppercase inline-flex items-center gap-2 hover:brightness-110 transition-all"
      >
        {step.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
