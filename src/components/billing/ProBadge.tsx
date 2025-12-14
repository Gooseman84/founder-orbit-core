import { Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  variant?: "pill" | "icon" | "inline";
  locked?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * A reusable "Pro" badge component for marking premium features.
 * 
 * Variants:
 * - pill: Full "PRO" pill badge (default)
 * - icon: Just a crown icon
 * - inline: Small inline text badge
 * 
 * Use `locked={true}` to show a lock icon for disabled/gated features.
 */
export function ProBadge({ 
  variant = "pill", 
  locked = false, 
  size = "sm",
  className 
}: ProBadgeProps) {
  if (variant === "icon") {
    return (
      <div className={cn(
        "flex items-center justify-center",
        size === "sm" ? "w-4 h-4" : "w-5 h-5",
        className
      )}>
        {locked ? (
          <Lock className="w-full h-full text-primary" />
        ) : (
          <Crown className="w-full h-full text-primary" />
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <span className={cn(
        "text-primary font-semibold",
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}>
        PRO
      </span>
    );
  }

  // Default pill variant
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold uppercase tracking-wide",
      "bg-primary/20 text-primary rounded-full border border-primary/30",
      size === "sm" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5",
      className
    )}>
      {locked ? (
        <Lock className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      ) : (
        <Crown className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      )}
      PRO
    </span>
  );
}
