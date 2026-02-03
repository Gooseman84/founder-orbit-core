export type PaywallReasonCode =
  | "IDEA_LIMIT_REACHED"
  | "LIBRARY_FULL_TRIAL"
  | "BLUEPRINT_LIMIT_TRIAL"
  | "MODE_REQUIRES_PRO"
  | "IDEA_DETAIL_PRO"
  | "WORKSPACE_LIMIT"
  | "EXPORT_REQUIRES_PRO"
  | "MULTI_BLUEPRINT_TASKS"
  | "TRIAL_EXPIRED"
  | "FUSION_REQUIRES_PRO"
  | "FUSION_LIMIT_REACHED"
  | "COMPARE_REQUIRES_PRO"
  | "RADAR_REQUIRES_PRO"
  | "RADAR_LIMIT_REACHED"
  | "OPPORTUNITY_SCORE_REQUIRES_PRO"
  | "FEATURE_REQUIRES_PRO"
  | "IMPORT_REQUIRES_PRO"
  | "MARKET_SIGNAL_REQUIRES_PRO"
  | "IMPLEMENTATION_KIT_REQUIRES_PRO"
  | "PROMPT_TYPE_REQUIRES_PRO";

export interface PaywallCopy {
  headline: string;
  subhead: string;
  cta: string;
  microcopy?: string;
}

export const PAYWALL_COPY: Record<PaywallReasonCode, PaywallCopy> = {
  IDEA_LIMIT_REACHED: {
    headline: "You've used your trial idea generations.",
    subhead:
      "You've generated 3 ideas during your trial. Unlock unlimited idea generations and explore every possibility your future could hold.",
    cta: "Go Pro — Generate Without Limits",
    microcopy: "Upgrade anytime. Cancel anytime.",
  },
  LIBRARY_FULL_TRIAL: {
    headline: "Your Library is full because your potential is bigger than the trial.",
    subhead:
      "You've saved your trial limit of ideas. Now unlock unlimited saves so you can collect, refine, and build out your entire vision.",
    cta: "Unlock Unlimited Ideas",
    microcopy: "Your best idea might be the next one you save.",
  },
  BLUEPRINT_LIMIT_TRIAL: {
    headline: "You've built your first Blueprint. Ready to build your future?",
    subhead:
      "Trial lets you create one Blueprint. Pro lets you turn every idea into a real plan — offers, audiences, validation, content, and step-by-step execution.",
    cta: "Go Pro — Build Every Idea",
    microcopy: "Blueprints are where dreams become plans.",
  },
  MODE_REQUIRES_PRO: {
    headline: "This mode is where the magic happens. It's Pro only.",
    subhead:
      "Persona, Chaos, Memetic, and Fusion unlock wild, high-potential business angles you won't find anywhere else. Upgrade to explore the ideas that change everything.",
    cta: "Unlock All Idea Modes",
    microcopy: "Pro gives you the full creative engine of TrueBlazer.",
  },
  IDEA_DETAIL_PRO: {
    headline: "Want the full breakdown? Go deeper with Pro.",
    subhead:
      "Monetization paths, validation playbooks, hooks, audience insights, content angles, and execution steps are part of the Pro-level idea deep dive.",
    cta: "Unlock Full Idea Details",
    microcopy: "The difference between dabbling and building is clarity.",
  },
  WORKSPACE_LIMIT: {
    headline: "The real building happens here — and it's Pro.",
    subhead:
      "The Workspace is your AI cofounder's command center. Strategy refinement, offer creation, content planning, naming exploration — all unlocked in Pro.",
    cta: "Unlock the Full Workspace",
    microcopy: "Build with direction. Create with momentum.",
  },
  EXPORT_REQUIRES_PRO: {
    headline: "Ready to share your vision? That's a Pro move.",
    subhead:
      "Export Blueprints, share plans, and generate presentation-ready assets with Pro tools designed for real execution.",
    cta: "Upgrade to Pro — Export Your Work",
    microcopy: "Your future should be something you can hold in your hands.",
  },
  MULTI_BLUEPRINT_TASKS: {
    headline: "One Blueprint gets you started. Pro takes you further.",
    subhead:
      "Track tasks, progress, quests, and execution across every idea you're developing. Build multiple paths. Explore multiple futures.",
    cta: "Go Pro — Unlock Multi-Blueprint Tasks",
    microcopy:
      "Your next breakthrough is waiting in the Blueprint you haven't created yet.",
  },
  TRIAL_EXPIRED: {
    headline: "Your 7-day trial has ended.",
    subhead:
      "You've explored TrueBlazer's potential. Now unlock the full experience with Pro to continue your founder journey.",
    cta: "Subscribe to Pro",
    microcopy: "Don't let your momentum stop here.",
  },
  FUSION_REQUIRES_PRO: {
    headline: "Idea Fusion is a Pro feature.",
    subhead:
      "Combine multiple ideas into powerful new concepts. Fusion Lab helps you discover unexpected synergies and create breakthrough business models.",
    cta: "Unlock Idea Fusion",
    microcopy: "The best ideas often come from combining others.",
  },
  COMPARE_REQUIRES_PRO: {
    headline: "Compare Ideas is a Pro feature.",
    subhead:
      "Unlock side-by-side opportunity score comparisons to make data-driven decisions about which idea to pursue.",
    cta: "Unlock Idea Comparison",
    microcopy: "Make confident decisions with data.",
  },
  RADAR_REQUIRES_PRO: {
    headline: "Niche Radar is a Pro feature.",
    subhead:
      "Get AI-powered market signals and emerging opportunities tailored to your chosen idea. Stay ahead of trends.",
    cta: "Unlock Niche Radar",
    microcopy: "Know what's coming before everyone else.",
  },
  OPPORTUNITY_SCORE_REQUIRES_PRO: {
    headline: "Opportunity Scoring is a Pro feature.",
    subhead:
      "Get detailed market analysis with sub-scores for market size, competition, timing, and more. Make informed decisions.",
    cta: "Unlock Opportunity Scoring",
    microcopy: "Turn intuition into data-driven decisions.",
  },
  FEATURE_REQUIRES_PRO: {
    headline: "This is a Pro feature.",
    subhead:
      "Unlock the full TrueBlazer toolkit with Pro. Get access to advanced features designed to accelerate your founder journey.",
    cta: "Upgrade to Pro",
    microcopy: "Upgrade anytime. Cancel anytime.",
  },
  IMPORT_REQUIRES_PRO: {
    headline: "Import Ideas is a Pro feature.",
    subhead:
      "Bring your existing business ideas into TrueBlazer and get AI-powered scoring, analysis, and execution plans.",
    cta: "Unlock Idea Import",
    microcopy: "Your ideas deserve the TrueBlazer treatment.",
  },
  MARKET_SIGNAL_REQUIRES_PRO: {
    headline: "Market Pain Signals is a Pro feature.",
    subhead:
      "Discover real problems people are facing and generate ideas tailored to solve them. Find opportunities hiding in plain sight.",
    cta: "Unlock Market Signals",
    microcopy: "The best businesses solve real problems.",
  },
  FUSION_LIMIT_REACHED: {
    headline: "You've used your 2 trial fusions.",
    subhead:
      "You've combined 2 idea fusions during your trial. Upgrade to Pro for unlimited idea fusions and discover powerful hybrid ventures.",
    cta: "Unlock Unlimited Fusions",
    microcopy: "The best ideas often come from combining others.",
  },
  RADAR_LIMIT_REACHED: {
    headline: "You've used your trial radar scan.",
    subhead:
      "You've generated 1 radar scan during your trial. Upgrade to Pro for unlimited market research and stay ahead of emerging opportunities.",
    cta: "Unlock Unlimited Radar",
    microcopy: "Know what's coming before everyone else.",
  },
  IMPLEMENTATION_KIT_REQUIRES_PRO: {
    headline: "Unlock Your Build Specs",
    subhead:
      "The Implementation Kit includes your North Star Spec, Architecture Contract, and Thin Vertical Slice Plan — everything you need to start building.",
    cta: "Upgrade to Pro",
    microcopy: "Turn your idea into implementation-ready specs.",
  },
  PROMPT_TYPE_REQUIRES_PRO: {
    headline: "Unlock Build Prompts",
    subhead:
      "Get implementation-ready prompts for Lovable, Cursor, and v0 to accelerate your build. Copy-paste and start building immediately.",
    cta: "Upgrade to Pro",
    microcopy: "Build faster with AI-ready prompts.",
  },
};

// Default fallback copy
export const DEFAULT_PAYWALL_COPY: PaywallCopy = {
  headline: "Unlock TrueBlazer Pro",
  subhead:
    "Get unlimited ideas, full Blueprints, advanced Workspace, and more.",
  cta: "Upgrade to Pro",
  microcopy: "Upgrade anytime. Cancel anytime.",
};

// Helper to get copy with fallback
export function getPaywallCopy(reasonCode?: PaywallReasonCode | string): PaywallCopy {
  if (reasonCode && reasonCode in PAYWALL_COPY) {
    return PAYWALL_COPY[reasonCode as PaywallReasonCode];
  }
  return DEFAULT_PAYWALL_COPY;
}
