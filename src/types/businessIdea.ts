import type { RiskTolerance } from "./founderProfile";
import type { IdeaGenerationMode } from "./idea";

// EPIC v6 idea categories
export type IdeaCategory = 
  | "business" 
  | "money_system" 
  | "creator" 
  | "automation" 
  | "persona" 
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

  // EPIC v6 fields
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
