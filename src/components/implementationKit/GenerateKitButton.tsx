import { Code, FileText, Layers, Terminal, Lock, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { ProUpgradeModal } from '@/components/billing/ProUpgradeModal';
import { useState } from 'react';

interface GenerateKitButtonProps {
  blueprintId: string;
  ventureId: string;
  hasExistingKit: boolean;
  onGenerate: () => void;
}

const DOCS = [
  { icon: FileText, label: "North Star Spec (your product vision)" },
  { icon: Layers, label: "Architecture Contract (technical scaffold)" },
  { icon: Code, label: "Thin Vertical Slice Plan (week-by-week roadmap)" },
  { icon: Terminal, label: "Copy-paste AI prompts for your coding tool" },
];

export function GenerateKitButton({ blueprintId, ventureId, hasExistingKit, onGenerate }: GenerateKitButtonProps) {
  const navigate = useNavigate();
  const { hasPro, features } = useFeatureAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const canGenerate = hasPro || features.canGenerateImplementationKit;

  if (hasExistingKit) {
    return (
      <div
        className="border p-6"
        style={{ borderColor: "hsl(43 52% 54% / 0.35)", background: "hsl(240 12% 7%)" }}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 flex items-center justify-center bg-primary/10 shrink-0">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium" style={{ color: "hsl(40 15% 93%)" }}>Implementation Kit Ready</h3>
            <p className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>
              View your documents in the Workspace
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/workspace')}
          className="w-full mt-4 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90"
        >
          VIEW IN WORKSPACE
          <ArrowRight className="ml-2 h-4 w-4 inline" />
        </button>
      </div>
    );
  }

  if (!canGenerate) {
    return (
      <>
        <div
          className="border p-6"
          style={{ borderColor: "hsl(43 52% 54% / 0.35)", background: "hsl(240 12% 7%)" }}
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center bg-primary/10 shrink-0">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-medium" style={{ color: "hsl(40 15% 93%)" }}>
                  Implementation Kit — Pro Feature
                </h3>
                <p className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>
                  Upgrade to Pro to generate your complete build specifications:
                </p>
              </div>
              <ul className="space-y-2.5">
                {DOCS.map((doc, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <doc.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>{doc.label}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90"
              >
                <Lock className="mr-2 h-4 w-4 inline" />
                UPGRADE TO PRO
              </button>
            </div>
          </div>
        </div>
        <ProUpgradeModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reasonCode="IMPLEMENTATION_KIT_REQUIRES_PRO" />
      </>
    );
  }

  return (
    <div
      className="border p-6"
      style={{ borderColor: "hsl(43 52% 54% / 0.35)", background: "hsl(240 12% 7%)" }}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 flex items-center justify-center bg-primary/10 shrink-0">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="font-medium" style={{ color: "hsl(40 15% 93%)" }}>Ready to Build This?</h3>
            <p className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>
              Generate your complete Implementation Kit with:
            </p>
          </div>
          <ul className="space-y-2.5">
            {DOCS.map((doc, i) => (
              <li key={i} className="flex items-center gap-3">
                <doc.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm" style={{ color: "hsl(220 12% 58%)" }}>{doc.label}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={onGenerate}
            className="w-full bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90"
          >
            GENERATE IMPLEMENTATION KIT
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export Package for the last variant
import { Package } from 'lucide-react';
