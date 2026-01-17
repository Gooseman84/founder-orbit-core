import { Link } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, XCircle, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrialStatusBadgeProps {
  className?: string;
  compact?: boolean;
}

export function TrialStatusBadge({ className, compact = false }: TrialStatusBadgeProps) {
  const { isTrialing, isTrialExpired, isLockedOut, daysRemaining, hasPro, hasFounder, loading } = useFeatureAccess();

  if (loading) return null;

  // Pro/Founder users - subtle confirmation badge
  if (hasPro || hasFounder) {
    if (compact) return null; // Don't show on mobile for Pro users
    return (
      <Link to="/billing" className={cn("block", className)}>
        <Badge variant="outline" className="gap-1 border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors">
          <Crown className="w-3 h-3" />
          Pro
        </Badge>
      </Link>
    );
  }

  // Trial expired / locked out
  if (isTrialExpired || isLockedOut) {
    return (
      <Link to="/billing" className={cn("block", className)}>
        <Badge 
          variant="destructive" 
          className={cn(
            "gap-1 hover:bg-destructive/90 transition-colors cursor-pointer",
            compact && "text-xs py-0.5"
          )}
        >
          <XCircle className={cn("w-3 h-3", compact && "w-2.5 h-2.5")} />
          {compact ? "Expired" : "Trial ended – Subscribe"}
        </Badge>
      </Link>
    );
  }

  // Active trial with low days remaining (≤2)
  if (isTrialing && daysRemaining !== null && daysRemaining <= 2) {
    return (
      <Link to="/billing" className={cn("block", className)}>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer",
            compact && "text-xs py-0.5"
          )}
        >
          <AlertTriangle className={cn("w-3 h-3", compact && "w-2.5 h-2.5")} />
          {compact 
            ? `${daysRemaining}d left!` 
            : `Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}!`
          }
        </Badge>
      </Link>
    );
  }

  // Active trial with plenty of time (3+ days)
  if (isTrialing && daysRemaining !== null && daysRemaining > 2) {
    return (
      <Link to="/billing" className={cn("block", className)}>
        <Badge 
          variant="secondary" 
          className={cn(
            "gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer",
            compact && "text-xs py-0.5"
          )}
        >
          <Clock className={cn("w-3 h-3", compact && "w-2.5 h-2.5")} />
          {compact 
            ? `${daysRemaining}d left` 
            : `Trial: ${daysRemaining} days left`
          }
        </Badge>
      </Link>
    );
  }

  // Fallback: No badge if state is unclear
  return null;
}
