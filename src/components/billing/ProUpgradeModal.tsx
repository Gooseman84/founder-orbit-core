import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getPaywallCopy, type PaywallReasonCode } from "@/config/paywallCopy";
import { toast } from "sonner";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { Loader2, X } from "lucide-react";

const PRO_FEATURES = [
  "Unlimited ideas — generate until you find the one",
  "Cross-industry pattern matching & adjacent opportunities",
  "CFA-level Financial Viability Scores on every idea",
  "Implementation Kit — build specs for Lovable, Cursor, v0",
  "30-day plans, daily tasks, and AI workspace",
];

const PRICING = {
  monthly: { amount: 29, label: "MONTHLY" },
  yearly: { amount: 199, label: "YEARLY", monthlyEquivalent: 16.58, discount: 43 },
};

interface ProUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reasonCode?: PaywallReasonCode | string;
  context?: Record<string, unknown>;
}

export function ProUpgradeModal({ open, onClose, reasonCode, context }: ProUpgradeModalProps) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");

  const copy = getPaywallCopy(reasonCode);
  const isExpiredTrial = reasonCode === "TRIAL_EXPIRED";

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to upgrade your account.");
      return;
    }
    setLoading(true);
    track("upgrade_clicked", { reasonCode, plan: selectedPlan, ...context });
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>("create-checkout-session", {
        body: {
          plan: selectedPlan,
          successUrl: `${window.location.origin}/billing?status=success`,
          cancelUrl: `${window.location.origin}/billing?status=cancelled`,
        },
      });
      if (error) { toast.error("Failed to start checkout. Please try again."); return; }
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) { track("checkout_started", { reasonCode, plan: selectedPlan }); window.location.href = data.url; }
      else { toast.error("No checkout URL returned. Please try again."); }
    } catch (err) {
      console.error("Error in handleUpgrade:", err);
      if (err instanceof AuthSessionMissingError) { toast.error("Session expired. Please sign in again."); }
      else { toast.error("Something went wrong. Please try again."); }
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    if (open && reasonCode) {
      track("paywall_shown", { reasonCode, ...context });
    }
  });

  const ctaText = isExpiredTrial ? "SUBSCRIBE TO PRO" : copy.cta.toUpperCase();

  if (!open) return null;

  // Split headline to italicize last 2 words
  const words = copy.headline.split(" ");
  const headlineMain = words.length > 3 ? words.slice(0, -2).join(" ") : "";
  const headlineItalic = words.length > 3 ? words.slice(-2).join(" ") : copy.headline;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsl(240 14% 4% / 0.85)", backdropFilter: "blur(8px)" }}>
      <div
        className="relative w-full max-w-[480px] mx-4 border"
        style={{
          background: "hsl(240 12% 7%)",
          borderColor: "hsl(43 52% 54% / 0.35)",
          padding: "48px 40px",
        }}
      >
        {/* Top gold accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, hsl(43 52% 54%), transparent)" }} />

        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at top center, hsl(43 52% 54% / 0.06) 0%, transparent 60%)" }} />

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Headline */}
        <h2 className="font-display font-bold text-[1.8rem] leading-[1.1] text-foreground relative z-10">
          {headlineMain && <>{headlineMain}{" "}</>}
          <em className="text-primary" style={{ fontStyle: "italic" }}>{headlineItalic}</em>
        </h2>

        {/* Subhead */}
        <p className="text-[0.95rem] font-light text-muted-foreground mt-4 relative z-10" style={{ lineHeight: "1.7" }}>
          {copy.subhead}
        </p>

        {/* Feature list */}
        <div className="mt-6 space-y-2.5 relative z-10">
          {PRO_FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-primary text-[0.5rem] mt-[5px] shrink-0">◆</span>
              <span className="text-[0.82rem] font-light text-muted-foreground" style={{ lineHeight: "1.5" }}>
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing toggle */}
        <div className="flex gap-0 mt-6 relative z-10">
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`flex-1 py-2.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase border transition-colors ${
              selectedPlan === "monthly"
                ? "border-primary/35 text-primary bg-primary/10"
                : "border-border text-muted-foreground bg-transparent hover:text-foreground"
            }`}
          >
            ${PRICING.monthly.amount}/MO
          </button>
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`flex-1 py-2.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase border transition-colors relative ${
              selectedPlan === "yearly"
                ? "border-primary/35 text-primary bg-primary/10"
                : "border-border text-muted-foreground bg-transparent hover:text-foreground"
            }`}
          >
            ${PRICING.yearly.amount}/YR
            <span className="absolute -top-2 right-2 font-mono-tb text-[0.55rem] text-primary bg-primary/20 px-1.5 py-0.5">
              -{PRICING.yearly.discount}%
            </span>
          </button>
        </div>

        {/* CTA */}
        {user ? (
          <div className="relative z-10">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full mt-6 py-4 bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:bg-accent disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : ctaText}
            </button>

            <p className="font-mono-tb text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground text-center mt-3">
              7-DAY FREE TRIAL · CARD REQUIRED · CANCEL ANYTIME
            </p>
            <p className="font-mono-tb text-[0.6rem] text-muted-foreground/60 text-center mt-2">
              ◆ CFA-LEVEL FINANCIAL METHODOLOGY ◆
            </p>
          </div>
        ) : (
          <p className="text-center text-muted-foreground mt-8 text-sm relative z-10">
            Please sign in to upgrade your account.
          </p>
        )}
      </div>
    </div>
  );
}
