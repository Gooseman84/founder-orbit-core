import type { RiskTolerance } from "./founderProfile";
import type { IdeaGenerationMode } from "./idea";

// EPIC v6 idea categories
export type IdeaCategory = 
  | "saas" 
  | "automation" 
  | "content" 
  | "creator" 
  | "avatar" 
  | "locker_room" 
  | "system" 
  | "memetic";

// EPIC v6 platform options
export type CreatorPlatform = 
  | "tiktok" 
  | "instagram" 
  | "youtube" 
  | "x" 
  | "linkedin" 
  | "email" 
  | "none";

// EPIC v6 difficulty levels
export type IdeaDifficulty = "easy" | "medium" | "hard";

// EPIC v6 time to revenue
export type TimeToRevenue = "0-30d" | "30-90d" | "90-180d" | "6mo+";

// Legacy BusinessIdea interface (for backwards compatibility)
export interface BusinessIdea {
  id: string;
  title: string;
  oneLiner: string;
  description: string;

  problemStatement: string;
  targetCustomer: string;
  revenueModel: string;
  mvpApproach: string;
  goToMarket: string;
  competitiveAdvantage: string;

  financialTrajectory: {
    month3: string;
    month6: string;
    month12: string;
    mrrCeiling: string;
  };

  requiredToolsSkills: string;
  risksMitigation: string;
  whyItFitsFounder: string;

  primaryPassionDomains: string[];
  primarySkillNeeds: string[];
  markets: string[];
  businessArchetype: string;

  hoursPerWeekMin: number;
  hoursPerWeekMax: number;
  capitalRequired: number;
  riskLevel: RiskTolerance;
  timeToFirstRevenueMonths: number;

  requiresPublicPersonalBrand: boolean;
  requiresTeamSoon: boolean;
  requiresCoding: boolean;
  salesIntensity: 1 | 2 | 3 | 4 | 5;
  asyncDepthWork: 1 | 2 | 3 | 4 | 5;

  firstSteps: string[];

  // EPIC v6 fields (optional for backward compat)
  category?: IdeaCategory;
  mode?: IdeaGenerationMode;
  platform?: CreatorPlatform;
  shockFactor?: number;          // 0-100
  viralityPotential?: number;    // 0-100
  leverageScore?: number;        // 0-100
  automationDensity?: number;    // 0-100
  autonomyLevel?: number;        // 0-100
  cultureTailwind?: number;      // 0-100
  chaosFactor?: number;          // 0-100
  engineVersion?: string;        // e.g., "v6"
}

// EPIC v6 BusinessIdea interface (new format from v6 engine)
export interface BusinessIdeaV6 {
  id: string;
  title: string;
  oneLiner: string;
  description: string;
  
  // v6 Classification
  category: IdeaCategory;
  industry: string;
  model: string;                    // "subscription", "revshare", "affiliate", etc.
  aiPattern: string;                // "AI Agent Swarm", "AI Copilot", etc.
  platform: CreatorPlatform | null;
  difficulty: IdeaDifficulty;
  soloFit: boolean;
  timeToRevenue: TimeToRevenue;
  
  // v6 Context
  whyNow: string;
  whyItFitsFounder: string;
  problemStatement: string;
  targetCustomer: string;
  mvpApproach: string;
  goToMarket: string;
  firstSteps: string[];
  
  // v6 Scores (0-100)
  shockFactor: number;
  viralityPotential: number;
  leverageScore: number;
  automationDensity: number;
  autonomyLevel: number;
  cultureTailwind: number;
  chaosFactor: number;
  
  // v6 Metadata
  engineVersion: string;
  mode: IdeaGenerationMode;
}

// Type guard to check if idea is v6 format
// Accepts both camelCase (frontend) and snake_case (DB) versions
export function isV6Idea(idea: BusinessIdea | BusinessIdeaV6 | any): idea is BusinessIdeaV6 {
  const engineVer = idea.engineVersion || idea.engine_version;
  return engineVer === "v6" && ("category" in idea || "aiPattern" in idea || "ai_pattern" in idea);
}

// Helper to calculate overall v6 score
export function calculateV6Score(idea: BusinessIdeaV6): number {
  const weights = {
    leverageScore: 0.25,
    automationDensity: 0.20,
    viralityPotential: 0.15,
    autonomyLevel: 0.15,
    cultureTailwind: 0.15,
    chaosFactor: 0.05,
    shockFactor: 0.05,
  };
  
  return Math.round(
    idea.leverageScore * weights.leverageScore +
    idea.automationDensity * weights.automationDensity +
    idea.viralityPotential * weights.viralityPotential +
    idea.autonomyLevel * weights.autonomyLevel +
    idea.cultureTailwind * weights.cultureTailwind +
    idea.chaosFactor * weights.chaosFactor +
    idea.shockFactor * weights.shockFactor
  );
}
