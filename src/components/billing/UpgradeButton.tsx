import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface UpgradeButtonProps {
  variant?: "sidebar" | "compact" | "full";
  className?: string;
}

/**
 * A reusable upgrade button that opens the Pro upgrade modal.
 * Only shows for free users.
 */
export function UpgradeButton({ variant = "full", className }: UpgradeButtonProps) {
  const { plan } = useSubscription();
  const [showModal, setShowModal] = useState(false);

  // Don't show for Pro/Founder users
  if (plan === "pro" || plan === "founder") {
    return null;
  }

  if (variant === "sidebar") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 w-full",
            "text-sm font-medium rounded-lg",
            "bg-gradient-to-r from-primary/20 to-primary/5",
            "border border-primary/30 hover:border-primary/50",
            "text-primary hover:text-primary",
            "transition-all duration-200",
            className
          )}
        >
          <Crown className="w-5 h-5 shrink-0" />
          <span className="truncate">Upgrade to Pro</span>
        </button>
        <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <Button
          onClick={() => setShowModal(true)}
          size="sm"
          variant="ghost"
          className={cn(
            "gap-1.5 text-primary hover:text-primary hover:bg-primary/10",
            className
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Upgrade
        </Button>
        <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  // Full variant
  return (
    <>
      <Button
        onClick={() => setShowModal(true)}
        className={cn("btn-gradient gap-2", className)}
      >
        <Crown className="w-4 h-4" />
        Upgrade to Pro
      </Button>
      <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
