import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TrialExpiredModalProps {
  open: boolean;
  onDismiss: () => void;
}

const PRO_FEATURES = [
  "Unlimited idea generation — explore every angle",
  "Cross-industry opportunities from your expertise",
  "CFA-level Financial Viability Scores",
  "Full Blueprint with 30-day execution plan",
  "Implementation Kit for Lovable, Cursor, or v0",
  "AI workspace that writes in your domain language",
  "Market radar, idea fusion & comparison tools",
];

export const TrialExpiredModal = ({ open, onDismiss }: TrialExpiredModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<"monthly" | "yearly" | null>(null);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    if (!user) {
      toast.error("Please sign in to subscribe.");
      navigate("/auth");
      return;
    }
    setLoading(plan);
    try {
      const { data, error } = await invokeAuthedFunction<{ url?: string; error?: string }>(
        "create-checkout-session",
        {
          body: {
            plan,
            successUrl: `${window.location.origin}/billing?status=success`,
            cancelUrl: `${window.location.origin}/billing?status=cancelled`,
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
      setLoading(null);
    }
  };

  if (!open) return null;

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

        {/* Headline */}
        <h2 className="font-display font-bold text-[1.8rem] leading-[1.1] text-foreground relative z-10">
          Your trial is over. Your{" "}
          <em className="text-primary" style={{ fontStyle: "italic" }}>momentum doesn't have to be.</em>
        </h2>

        {/* Subhead */}
        <p className="text-[0.95rem] font-light text-muted-foreground mt-4 relative z-10" style={{ lineHeight: "1.7" }}>
          You've seen what Mavrik found in your expertise. Don't lose that momentum — unlock the full toolkit to go from clarity to execution.
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

        {/* CTAs */}
        <div className="relative z-10">
          <button
            onClick={() => handleUpgrade("monthly")}
            disabled={loading !== null}
            className="w-full mt-8 py-4 bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:bg-accent disabled:opacity-50"
          >
            {loading === "monthly" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "SUBSCRIBE TO PRO — $29/MONTH"}
          </button>

          <button
            onClick={() => handleUpgrade("yearly")}
            disabled={loading !== null}
            className="w-full mt-2 py-4 border border-border text-muted-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {loading === "yearly" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "YEARLY — $199/YEAR (SAVE 43%)"}
          </button>

          <p className="font-mono-tb text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground text-center mt-3">
            7-DAY FREE TRIAL · CARD REQUIRED · CANCEL ANYTIME
          </p>
          <p className="font-mono-tb text-[0.6rem] text-muted-foreground/60 text-center mt-2">
            ◆ CFA-LEVEL FINANCIAL METHODOLOGY ◆
          </p>
        </div>

        {/* Dismiss */}
        <div className="text-center mt-6 pt-4 border-t border-border relative z-10">
          <button onClick={onDismiss} className="label-mono hover:text-foreground transition-colors">
            I'LL CONTINUE WITH LIMITED ACCESS
          </button>
        </div>
      </div>
    </div>
  );
};
