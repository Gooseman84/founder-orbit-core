import { useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { ProUpgradeModal } from "./ProUpgradeModal";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

interface UpgradeButtonProps {
  variant?: "sidebar" | "compact" | "full";
  className?: string;
}

export function UpgradeButton({ variant = "full", className }: UpgradeButtonProps) {
  const { plan } = useSubscription();
  const [showModal, setShowModal] = useState(false);

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
            "font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase",
            "border border-primary/35 text-primary bg-primary/10",
            "hover:bg-primary/20 transition-all duration-200",
            className
          )}
        >
          <Crown className="w-4 h-4 shrink-0" />
          <span className="truncate">UPGRADE TO PRO</span>
        </button>
        <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={cn(
            "flex items-center gap-1.5 font-mono-tb text-[0.62rem] tracking-[0.08em] uppercase text-primary hover:text-accent transition-colors px-2 py-1",
            className
          )}
        >
          <Sparkles className="w-3 h-3" />
          UPGRADE
        </button>
        <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          "flex items-center gap-2 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 transition-opacity hover:opacity-90",
          className
        )}
      >
        <Crown className="w-4 h-4" />
        UPGRADE TO PRO
      </button>
      <ProUpgradeModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
