// Centralized plan definitions and feature entitlements for TrueBlazer.AI
// This is the single source of truth for what each plan includes.

export type PlanId = "free" | "pro" | "founder";

// Standardized error codes for plan limit enforcement
export const PLAN_ERROR_CODES = {
  IDEA_LIMIT_REACHED: "IDEA_LIMIT_REACHED",
  MODE_REQUIRES_PRO: "MODE_REQUIRES_PRO",
  LIBRARY_FULL: "LIBRARY_FULL",
  BLUEPRINT_LIMIT: "BLUEPRINT_LIMIT",
  FEATURE_REQUIRES_PRO: "FEATURE_REQUIRES_PRO",
  EXPORT_REQUIRES_PRO: "EXPORT_REQUIRES_PRO",
  WORKSPACE_LIMIT: "WORKSPACE_LIMIT",
  MULTI_BLUEPRINT_TASKS: "MULTI_BLUEPRINT_TASKS",
} as const;

export type PlanErrorCode = typeof PLAN_ERROR_CODES[keyof typeof PLAN_ERROR_CODES];

// Idea generation modes
export type IdeaMode = 
  | "breadth" 
  | "focus" 
  | "creator" 
  | "automation" 
  | "persona" 
  | "boundless" 
  | "chaos" 
  | "money_printer" 
  | "memetic" 
  | "locker_room";

// Mode configuration with plan requirements
export interface ModeConfig {
  mode: IdeaMode;
  label: string;
  description: string;
  requiresPro: boolean;
}

export const IDEA_MODES: ModeConfig[] = [
  { mode: "breadth", label: "Standard", description: "Wide sampling across all sane categories", requiresPro: false },
  { mode: "focus", label: "Focus", description: "Deep exploration of one niche or theme", requiresPro: false },
  { mode: "creator", label: "Creator", description: "Content empires, creator tools, monetization", requiresPro: false },
  { mode: "automation", label: "Automation", description: "Workflow, RPA, agents, 'do it for me' backends", requiresPro: true },
  { mode: "persona", label: "Persona", description: "AI characters, avatars, companions, mentors", requiresPro: true },
  { mode: "boundless", label: "Boundless", description: "Ignore conventions; maximize creativity", requiresPro: true },
  { mode: "chaos", label: "Chaos", description: "Wild combinations; high shock, high leverage", requiresPro: true },
  { mode: "money_printer", label: "Money Printer", description: "Systems that earn while you sleep", requiresPro: true },
  { mode: "memetic", label: "Memetic", description: "Ideas that spread as jokes/memes with monetization", requiresPro: true },
  { mode: "locker_room", label: "Locker Room", description: "Bold, culture-first, 'shouldn't exist but could'", requiresPro: true },
];

// Free modes for quick lookup
export const FREE_MODES: IdeaMode[] = ["breadth", "focus", "creator"];

export interface PlanFeatures {
  // Idea Generation
  maxIdeaGenerationsPerDay: number;
  allowedIdeaModes: IdeaMode[] | "all";
  maxSavedIdeas: number;
  
  // Blueprints & Workspace
  maxBlueprints: number;
  canUseWorkspace: "limited" | "full";
  maxWorkspaceDocs: number;
  
  // Advanced Features
  canSeeOpportunityScore: boolean;
  canCompareIdeas: boolean;
  canUseRadar: boolean;
  canExport: boolean;
  canSeeFullIdeaDetails: boolean;
  
  // AI Features
  canUseAdvancedAI: boolean;
  canUseFusionLab: boolean;
  
  // Display
  displayName: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    // Idea Generation - 2 per day, limited modes
    maxIdeaGenerationsPerDay: 2,
    allowedIdeaModes: FREE_MODES,
    maxSavedIdeas: 5,
    
    // Blueprints & Workspace - 1 blueprint only
    maxBlueprints: 1,
    canUseWorkspace: "limited",
    maxWorkspaceDocs: 3,
    
    // Advanced Features - These are Pro gates
    canSeeOpportunityScore: false,
    canCompareIdeas: false,
    canUseRadar: false,
    canExport: false,
    canSeeFullIdeaDetails: false,
    
    // AI Features
    canUseAdvancedAI: false,
    canUseFusionLab: false,
    
    // Display
    displayName: "Free",
    description: "Get started with the essentials",
    monthlyPrice: null,
    yearlyPrice: null,
  },
  pro: {
    // Idea Generation - Unlimited
    maxIdeaGenerationsPerDay: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    
    // Blueprints & Workspace - Unlimited
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    
    // Advanced Features - All unlocked
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: true,
    canExport: true,
    canSeeFullIdeaDetails: true,
    
    // AI Features
    canUseAdvancedAI: true,
    canUseFusionLab: true,
    
    // Display
    displayName: "TrueBlazer Pro",
    description: "Full access to all features",
    monthlyPrice: 29,
    yearlyPrice: 199,
  },
  founder: {
    // Same as Pro
    maxIdeaGenerationsPerDay: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: true,
    canExport: true,
    canSeeFullIdeaDetails: true,
    canUseAdvancedAI: true,
    canUseFusionLab: true,
    displayName: "TrueBlazer Founder",
    description: "Everything in Pro + founder perks",
    monthlyPrice: 49,
    yearlyPrice: 349,
  },
} as const;

// Feature keys that can be gated (maps to old FEATURE_MATRIX keys for compatibility)
export const FEATURE_GATE_MAP: Record<string, keyof PlanFeatures> = {
  "idea_generation": "maxIdeaGenerationsPerDay",
  "idea_vetting": "canUseAdvancedAI",
  "opportunity_score": "canSeeOpportunityScore",
  "compare_engine": "canCompareIdeas",
  "radar": "canUseRadar",
  "workspace_unlimited": "canUseWorkspace",
  "fusion_lab": "canUseFusionLab",
  "export": "canExport",
} as const;

// Helper to check if a plan is "paid" (pro or founder)
export function isPaidPlan(plan: PlanId): boolean {
  return plan === "pro" || plan === "founder";
}

// Check if a mode requires Pro
export function modeRequiresPro(mode: IdeaMode): boolean {
  return !FREE_MODES.includes(mode);
}

// Get allowed modes for a plan
export function getAllowedModes(plan: PlanId): IdeaMode[] {
  const features = PLAN_FEATURES[plan];
  if (features.allowedIdeaModes === "all") {
    return IDEA_MODES.map(m => m.mode);
  }
  return features.allowedIdeaModes;
}

// Get list of features that are Pro-only for display
export function getProOnlyFeatures(): (keyof PlanFeatures)[] {
  return [
    "canSeeOpportunityScore",
    "canCompareIdeas", 
    "canUseRadar",
    "canExport",
    "canUseFusionLab",
    "canUseAdvancedAI",
    "canSeeFullIdeaDetails",
  ];
}
