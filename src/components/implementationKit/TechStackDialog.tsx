import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import type {
  TechStack,
  FrontendFramework,
  BackendPlatform,
  AICodingTool,
  DeploymentPlatform,
} from '@/types/implementationKit';

interface TechStackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (techStack: TechStack) => void;
  isGenerating?: boolean;
}

const STACKS = [
  {
    key: 'frontend' as const,
    label: 'FRONTEND FRAMEWORK',
    options: [
      { value: 'react', label: 'React + TypeScript', desc: 'Most popular, great ecosystem' },
      { value: 'nextjs', label: 'Next.js 14+ (App Router)', desc: 'Full-stack React framework' },
      { value: 'vue', label: 'Vue 3 + TypeScript', desc: 'Progressive framework' },
    ],
  },
  {
    key: 'backend' as const,
    label: 'BACKEND PLATFORM',
    options: [
      { value: 'supabase', label: 'Supabase', desc: 'PostgreSQL + Auth + Storage' },
      { value: 'firebase', label: 'Firebase', desc: 'Firestore + Auth + Cloud Functions' },
      { value: 'nodejs', label: 'Node.js + PostgreSQL', desc: 'Full control, more setup' },
    ],
  },
  {
    key: 'aiTool' as const,
    label: 'AI CODING TOOL',
    options: [
      { value: 'cursor', label: 'Cursor', desc: 'AI-first code editor' },
      { value: 'lovable', label: 'Lovable', desc: 'Prompt-to-app platform' },
      { value: 'claude', label: 'Claude (Anthropic)', desc: 'Best for complex reasoning' },
      { value: 'copilot', label: 'GitHub Copilot', desc: 'Integrated with VS Code' },
    ],
  },
  {
    key: 'deployment' as const,
    label: 'DEPLOYMENT PLATFORM',
    options: [
      { value: 'vercel', label: 'Vercel', desc: 'Best for Next.js, easy deploys' },
      { value: 'netlify', label: 'Netlify', desc: 'Great for static sites' },
      { value: 'railway', label: 'Railway', desc: 'Full-stack deployments' },
    ],
  },
];

export function TechStackDialog({ open, onOpenChange, onSubmit, isGenerating = false }: TechStackDialogProps) {
  const [techStack, setTechStack] = useState<TechStack>({
    frontend: 'react',
    backend: 'supabase',
    aiTool: 'cursor',
    deployment: 'vercel',
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "hsl(240 14% 4% / 0.85)", backdropFilter: "blur(8px)" }}
    >
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

        {/* Close */}
        <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Headline */}
        <h2 className="font-display font-bold text-xl mb-2" style={{ color: "hsl(40 15% 93%)" }}>
          Choose Your <em className="text-primary" style={{ fontStyle: "italic" }}>Tech Stack</em>
        </h2>
        <p className="text-sm font-light mb-6" style={{ color: "hsl(220 12% 58%)", lineHeight: "1.7" }}>
          Select the technologies you want to use. We'll generate implementation guides and AI prompts specific to your choices.
        </p>

        <div className="space-y-5">
          {STACKS.map((stack) => (
            <div key={stack.key} className="space-y-2">
              <label
                className="font-mono-tb text-[0.65rem] uppercase tracking-wider block"
                style={{ color: "hsl(43 52% 54%)" }}
              >
                {stack.label}
              </label>
              <Select
                value={techStack[stack.key]}
                onValueChange={(value) =>
                  setTechStack({ ...techStack, [stack.key]: value })
                }
                disabled={isGenerating}
              >
                <SelectTrigger
                  className="w-full border"
                  style={{
                    borderRadius: 0,
                    borderColor: "hsl(240 10% 14%)",
                    background: "hsl(240 12% 7%)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={{ borderRadius: 0 }}>
                  {stack.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="flex-1 py-3 border font-medium text-[0.78rem] tracking-[0.06em] uppercase transition-colors hover:text-foreground disabled:opacity-50"
            style={{
              borderColor: "hsl(240 10% 14%)",
              color: "hsl(220 12% 58%)",
              background: "transparent",
            }}
          >
            CANCEL
          </button>
          <button
            onClick={() => onSubmit(techStack)}
            disabled={isGenerating}
            className="flex-1 py-3 bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              "GENERATE KIT"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
