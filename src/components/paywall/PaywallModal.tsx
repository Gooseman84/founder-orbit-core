import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { PLAN_ERROR_CODES, type PlanErrorCode } from "@/config/plans";

const LIMIT_MESSAGES: Record<PlanErrorCode, { title: string; description: string }> = {
  [PLAN_ERROR_CODES.IDEA_LIMIT_REACHED]: {
    title: "You're onto something. Keep going.",
    description: "You've used your 3 trial idea generations. Upgrade to Pro for unlimited ideas.",
  },
  [PLAN_ERROR_CODES.MODE_REQUIRES_PRO]: {
    title: "This mode is where the magic happens.",
    description: "This generation mode is available to Pro users. Unlock all 10 modes with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.LIBRARY_FULL]: {
    title: "Library full",
    description: "You've saved the maximum trial ideas. Upgrade to Pro for unlimited saved ideas.",
  },
  [PLAN_ERROR_CODES.BLUEPRINT_LIMIT]: {
    title: "Blueprint limit reached",
    description: "Trial accounts can create 1 blueprint. Upgrade to Pro for unlimited blueprints.",
  },
  [PLAN_ERROR_CODES.FEATURE_REQUIRES_PRO]: {
    title: "This feature is part of TrueBlazer Pro.",
    description: "This feature is available to TrueBlazer Pro users. Unlock the full toolkit today.",
  },
  [PLAN_ERROR_CODES.EXPORT_REQUIRES_PRO]: {
    title: "Export requires Pro",
    description: "Export and download features are available with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.WORKSPACE_LIMIT]: {
    title: "Workspace limit reached",
    description: "Advanced workspace features are available with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.MULTI_BLUEPRINT_TASKS]: {
    title: "Multi-blueprint tasks require Pro",
    description: "Track tasks across multiple blueprints with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.FUSION_REQUIRES_PRO]: {
    title: "Idea Fusion requires Pro",
    description: "Combine multiple ideas into powerful new concepts with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.FUSION_LIMIT_REACHED]: {
    title: "Fusion limit reached",
    description: "You've used your 2 trial fusions. Upgrade to Pro for unlimited idea fusions.",
  },
  [PLAN_ERROR_CODES.COMPARE_REQUIRES_PRO]: {
    title: "Compare Ideas requires Pro",
    description: "Unlock side-by-side opportunity score comparisons with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.RADAR_REQUIRES_PRO]: {
    title: "Niche Radar requires Pro",
    description: "Get AI-powered market signals and emerging opportunities with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.RADAR_LIMIT_REACHED]: {
    title: "Radar limit reached",
    description: "You've used your trial radar scan. Upgrade to Pro for unlimited market research.",
  },
  [PLAN_ERROR_CODES.OPPORTUNITY_SCORE_REQUIRES_PRO]: {
    title: "Opportunity Scoring requires Pro",
    description: "Get detailed market analysis and sub-scores with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.IMPLEMENTATION_KIT_REQUIRES_PRO]: {
    title: "Implementation Kit requires Pro",
    description: "Get your North Star Spec, Architecture Contract, and Vertical Slice Plan with TrueBlazer Pro.",
  },
  [PLAN_ERROR_CODES.PROMPT_TYPE_REQUIRES_PRO]: {
    title: "Build Prompts require Pro",
    description: "Access Lovable, Cursor, and v0 build prompts with TrueBlazer Pro.",
  },
};

const PRO_FEATURES = [
  "Unlimited idea generations across all modes",
  "CFA-level Financial Viability Scores",
  "Cross-industry pattern matching",
  "Implementation Kit for Lovable, Cursor, v0",
];

interface PaywallModalProps {
  featureName: string;
  open: boolean;
  onClose: () => void;
  errorCode?: PlanErrorCode;
  customMessage?: string;
}

export const PaywallModal = ({ featureName, open, onClose, errorCode, customMessage }: PaywallModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (plan: "monthly" | "yearly") => {
    if (!user) {
      toast.error("Please sign in to upgrade your account.");
      return;
    }
    setLoading(true);
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
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const message = errorCode ? LIMIT_MESSAGES[errorCode] : null;
  const title = message?.title || "Upgrade to TrueBlazer Pro";
  const description = customMessage || message?.description ||
    "Unlock unlimited workspace, Radar insights, and opportunity scoring to accelerate your founder journey.";

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

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Headline */}
        <h2 className="font-display font-bold text-[1.8rem] leading-[1.1] text-foreground relative z-10">
          {title.split(" ").length > 3 ? (
            <>
              {title.split(" ").slice(0, -2).join(" ")}{" "}
              <em className="text-primary" style={{ fontStyle: "italic" }}>
                {title.split(" ").slice(-2).join(" ")}
              </em>
            </>
          ) : (
            <em className="text-primary" style={{ fontStyle: "italic" }}>{title}</em>
          )}
        </h2>

        {/* Subhead */}
        <p className="text-[0.95rem] font-light text-muted-foreground mt-4 relative z-10" style={{ lineHeight: "1.7" }}>
          {description}
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
        {user ? (
          <div className="relative z-10">
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={loading}
              className="w-full mt-8 py-4 bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:bg-accent disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "UPGRADE TO PRO — $29/MONTH"}
            </button>

            <button
              onClick={() => handleUpgrade("yearly")}
              disabled={loading}
              className="w-full mt-2 py-4 border border-border text-muted-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "YEARLY — $199/YEAR (SAVE 43%)"}
            </button>

            {/* Microcopy */}
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
};
