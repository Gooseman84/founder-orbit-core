import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  trigger: string;
  ideaTitle?: string;
}

const PRO_FEATURES = [
  "Full Financial Viability analysis with top risk & opportunity",
  "Blueprint with 30-day execution plan and daily tasks",
  "Implementation Kit for Lovable, Cursor, or v0",
  "Mavrik co-pilot check-ins that adapt to your momentum",
  "Unlimited idea generation across all 10 modes",
  "Opportunity scoring, idea comparison & market radar",
];

export const PaywallModal = ({ open, onClose, trigger, ideaTitle }: PaywallModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe.");
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>(
        "create-checkout-session",
        {
          body: {
            plan: "monthly",
            successUrl: `${window.location.origin}/billing?status=success`,
            cancelUrl: `${window.location.origin}${window.location.pathname}`,
          },
        }
      );
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.url) { window.location.href = data.url; }
      else { toast.error("No checkout URL returned. Please try again."); }
    } catch (err) {
      console.error("Error in handleUpgrade:", err);
      if (err instanceof AuthSessionMissingError) {
        toast.error("Session expired. Please sign in again.");
        navigate("/auth");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const headline = ideaTitle
    ? `Your Financial Viability Score for "${ideaTitle}" is ready.`
    : "Your Financial Viability Score is ready.";

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
          Your <em className="text-primary" style={{ fontStyle: "italic" }}>Score is Ready</em>
        </h2>

        {/* Subhead */}
        <p className="text-[0.95rem] font-light text-muted-foreground mt-4 relative z-10" style={{ lineHeight: "1.7" }}>
          Upgrade to see the full breakdown — including the biggest risk, top opportunity, and what makes this idea financially viable (or not).
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

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full mt-8 py-4 bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:bg-accent disabled:opacity-50 relative z-10"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "UNLOCK PRO — $29/MONTH"}
        </button>

        {/* Microcopy */}
        <p className="font-mono-tb text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground text-center mt-3 relative z-10">
          7-DAY FREE TRIAL · CARD REQUIRED · CANCEL ANYTIME
        </p>
        <p className="font-mono-tb text-[0.6rem] text-muted-foreground/60 text-center mt-2 relative z-10">
          ◆ CFA-LEVEL FINANCIAL METHODOLOGY ◆
        </p>

        {/* Dismiss */}
        <div className="text-center mt-6 pt-4 border-t border-border relative z-10">
          <button onClick={onClose} className="label-mono hover:text-foreground transition-colors">
            MAYBE LATER
          </button>
        </div>
      </div>
    </div>
  );
};
