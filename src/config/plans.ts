// Centralized plan definitions and feature entitlements for TrueBlazer.AI
// This is the single source of truth for what each plan includes.

export type PlanId = "trial" | "pro" | "founder";

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
  TRIAL_EXPIRED: "TRIAL_EXPIRED",
  FUSION_REQUIRES_PRO: "FUSION_REQUIRES_PRO",
  FUSION_LIMIT_REACHED: "FUSION_LIMIT_REACHED",
  COMPARE_REQUIRES_PRO: "COMPARE_REQUIRES_PRO",
  RADAR_REQUIRES_PRO: "RADAR_REQUIRES_PRO",
  RADAR_LIMIT_REACHED: "RADAR_LIMIT_REACHED",
  OPPORTUNITY_SCORE_REQUIRES_PRO: "OPPORTUNITY_SCORE_REQUIRES_PRO",
  IMPLEMENTATION_KIT_REQUIRES_PRO: "IMPLEMENTATION_KIT_REQUIRES_PRO",
  PROMPT_TYPE_REQUIRES_PRO: "PROMPT_TYPE_REQUIRES_PRO",
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

// Trial modes for quick lookup
export const TRIAL_MODES: IdeaMode[] = ["breadth", "focus", "creator"];

// Prompt types for North Star prompts
export type PromptType = "strategy" | "lovable" | "cursor" | "v0";
export const TRIAL_PROMPT_TYPES: PromptType[] = ["strategy"];
export const ALL_PROMPT_TYPES: PromptType[] = ["strategy", "lovable", "cursor", "v0"];

export interface PlanFeatures {
  // Idea Generation
  maxIdeaGenerationsTotal: number; // Total for trial, Infinity for paid
  allowedIdeaModes: IdeaMode[] | "all";
  maxSavedIdeas: number;
  
  // Blueprints & Workspace
  maxBlueprints: number;
  canUseWorkspace: "limited" | "full";
  maxWorkspaceDocs: number;
  
  // Advanced Features
  canSeeOpportunityScore: boolean;
  canCompareIdeas: boolean;
  canUseRadar: "none" | "basic" | "full";
  canExport: boolean;
  canSeeFullIdeaDetails: boolean;
  
  // AI Features
  canUseAdvancedAI: boolean;
  canUseFusionLab: boolean;
  
  // Fusion Lab
  maxFusions: number;
  
  // Radar
  maxRadarScans: number;
  
  // Implementation Kit
  canGenerateImplementationKit: boolean;
  
  // North Star Prompts
  allowedPromptTypes: PromptType[] | "all";
  
  // Display
  displayName: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  trial: {
    // Idea Generation - 3 total during trial
    maxIdeaGenerationsTotal: 3,
    allowedIdeaModes: TRIAL_MODES,
    maxSavedIdeas: 3,
    
    // Blueprints & Workspace - Very limited
    maxBlueprints: 1,
    canUseWorkspace: "limited",
    maxWorkspaceDocs: 2,
    
    // Advanced Features - Limited access
    canSeeOpportunityScore: false,
    canCompareIdeas: false,
    canUseRadar: "basic",
    canExport: false,
    canSeeFullIdeaDetails: false,
    
    // AI Features
    canUseAdvancedAI: false,
    canUseFusionLab: false,
    
    // Fusion Lab - 2 fusions during trial
    maxFusions: 2,
    
    // Radar - 1 scan during trial
    maxRadarScans: 1,
    
    // Implementation Kit - Pro only
    canGenerateImplementationKit: false,
    
    // North Star Prompts - Strategy only
    allowedPromptTypes: TRIAL_PROMPT_TYPES,
    
    // Display
    displayName: "Trial",
    description: "7-day trial with limited features",
    monthlyPrice: null,
    yearlyPrice: null,
  },
  pro: {
    // Idea Generation - Unlimited
    maxIdeaGenerationsTotal: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    
    // Blueprints & Workspace - Unlimited
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    
    // Advanced Features - All unlocked
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: "full",
    canExport: true,
    canSeeFullIdeaDetails: true,
    
    // AI Features
    canUseAdvancedAI: true,
    canUseFusionLab: true,
    
    // Fusion Lab - Unlimited
    maxFusions: Infinity,
    
    // Radar - Unlimited
    maxRadarScans: Infinity,
    
    // Implementation Kit - Full access
    canGenerateImplementationKit: true,
    
    // North Star Prompts - All types
    allowedPromptTypes: "all",
    
    // Display
    displayName: "TrueBlazer Pro",
    description: "Full access to all features",
    monthlyPrice: 29,
    yearlyPrice: 199,
  },
  founder: {
    // Same as Pro
    maxIdeaGenerationsTotal: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: "full",
    canExport: true,
    canSeeFullIdeaDetails: true,
    canUseAdvancedAI: true,
    canUseFusionLab: true,
    maxFusions: Infinity,
    maxRadarScans: Infinity,
    canGenerateImplementationKit: true,
    allowedPromptTypes: "all",
    displayName: "TrueBlazer Founder",
    description: "Everything in Pro + founder perks",
    monthlyPrice: 49,
    yearlyPrice: 349,
  },
} as const;

// Feature keys that can be gated (maps to old FEATURE_MATRIX keys for compatibility)
export const FEATURE_GATE_MAP: Record<string, keyof PlanFeatures> = {
  "idea_generation": "maxIdeaGenerationsTotal",
  "idea_vetting": "canUseAdvancedAI",
  "opportunity_score": "canSeeOpportunityScore",
  "compare_engine": "canCompareIdeas",
  "radar": "canUseRadar",
  "workspace_unlimited": "canUseWorkspace",
  "fusion_lab": "canUseFusionLab",
  "export": "canExport",
  "implementation_kit": "canGenerateImplementationKit",
} as const;

// Helper to check if a plan is "paid" (pro or founder)
export function isPaidPlan(plan: PlanId): boolean {
  return plan === "pro" || plan === "founder";
}

// Check if a mode requires Pro
export function modeRequiresPro(mode: IdeaMode): boolean {
  return !TRIAL_MODES.includes(mode);
}

// Check if a prompt type requires Pro
export function promptTypeRequiresPro(promptType: PromptType): boolean {
  return !TRIAL_PROMPT_TYPES.includes(promptType);
}

// Get allowed modes for a plan
export function getAllowedModes(plan: PlanId): IdeaMode[] {
  const features = PLAN_FEATURES[plan];
  if (features.allowedIdeaModes === "all") {
    return IDEA_MODES.map(m => m.mode);
  }
  return features.allowedIdeaModes;
}

// Get allowed prompt types for a plan
export function getAllowedPromptTypes(plan: PlanId): PromptType[] {
  const features = PLAN_FEATURES[plan];
  if (features.allowedPromptTypes === "all") {
    return ALL_PROMPT_TYPES;
  }
  return features.allowedPromptTypes;
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
    "canGenerateImplementationKit",
  ];
}

// Trial duration in days
export const TRIAL_DURATION_DAYS = 7;
