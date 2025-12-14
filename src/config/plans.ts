// Centralized plan definitions and feature entitlements for TrueBlazer.AI
// This is the single source of truth for what each plan includes.

export type PlanId = "free" | "pro" | "founder";

export interface PlanFeatures {
  // Idea Generation
  maxIdeaGenerationsPerDay: number;
  allowedIdeaModes: "standard" | "all";
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
  
  // AI Features
  canUseAdvancedAI: boolean;
  canUseFusionLab: boolean;
  
  // Display
  displayName: string;
  description: string;
  monthlyPrice: number | null; // null = free
  yearlyPrice: number | null;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    // Idea Generation
    maxIdeaGenerationsPerDay: Infinity, // Currently unlimited for free
    allowedIdeaModes: "standard",
    maxSavedIdeas: Infinity,
    
    // Blueprints & Workspace
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    
    // Advanced Features - These are the Pro gates
    canSeeOpportunityScore: false,
    canCompareIdeas: false,
    canUseRadar: false,
    canExport: false,
    
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
    // Idea Generation
    maxIdeaGenerationsPerDay: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    
    // Blueprints & Workspace
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    
    // Advanced Features
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: true,
    canExport: true,
    
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
    // Idea Generation
    maxIdeaGenerationsPerDay: Infinity,
    allowedIdeaModes: "all",
    maxSavedIdeas: Infinity,
    
    // Blueprints & Workspace
    maxBlueprints: Infinity,
    canUseWorkspace: "full",
    maxWorkspaceDocs: Infinity,
    
    // Advanced Features
    canSeeOpportunityScore: true,
    canCompareIdeas: true,
    canUseRadar: true,
    canExport: true,
    
    // AI Features
    canUseAdvancedAI: true,
    canUseFusionLab: true,
    
    // Display
    displayName: "TrueBlazer Founder",
    description: "Everything in Pro + founder perks",
    monthlyPrice: 49,
    yearlyPrice: 349,
  },
} as const;

// Feature keys that can be gated (maps to old FEATURE_MATRIX keys for compatibility)
export const FEATURE_GATE_MAP: Record<string, keyof PlanFeatures> = {
  "idea_generation": "maxIdeaGenerationsPerDay",
  "idea_vetting": "canUseAdvancedAI", // Free for now
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

// Get list of features that are Pro-only for display
export function getProOnlyFeatures(): (keyof PlanFeatures)[] {
  return [
    "canSeeOpportunityScore",
    "canCompareIdeas", 
    "canUseRadar",
    "canExport",
    "canUseFusionLab",
    "canUseAdvancedAI",
  ];
}
