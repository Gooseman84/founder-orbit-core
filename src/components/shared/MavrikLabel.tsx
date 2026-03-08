import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MavrikLabelProps {
  suffix?: string;
  className?: string;
}

/**
 * Consistent Mavrik attribution header.
 * Use this wherever Mavrik's AI output is displayed so users
 * recognize the same voice throughout the app.
 */
export function MavrikLabel({ suffix, className }: MavrikLabelProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
      <span className="label-mono-gold">Mavrik</span>
      {suffix && (
        <span className="label-mono text-muted-foreground">&mdash; {suffix}</span>
      )}
    </div>
  );
}
