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

// v7 Execution difficulty
export type ExecutionDifficulty = "Low" | "Medium" | "High";

// v7 Idea modes for Pass A
export type IdeaModeV7 = "Standard" | "Persona" | "Chaos" | "Memetic" | "Fusion";

// v7 Tone control
export type GenerationTone = "standard" | "exciting";

// ============================================
// V7 TWO-PASS IDEA GENERATION TYPES
// ============================================

// Pass A: Raw creative idea (unfiltered divergence)
export interface RawIdeaV7 {
  raw_title: string;
  raw_hook: string;                // 1 punchy sentence
  novel_twist: string;             // why this is different
  target_persona: string;
  why_this_is_interesting: string;
  idea_mode: IdeaModeV7;
}

// Pass B: Refined commercial idea (with excitement insurance)
export interface RefinedIdeaV7 {
  id: string;
  title: string;
  one_liner_pitch: string;         // punchy hook (non-corporate)
  problem: string;
  solution: string;
  ideal_customer: string;
  business_model: string;
  pricing_anchor: string;          // clear pricing
  time_to_first_dollar: string;    // path within 7 days
  distribution_wedge: string;      // how it spreads/compounds
  why_now: string;
  execution_difficulty: ExecutionDifficulty;
  risk_notes: string;
  
  // Excitement insurance fields
  delight_factor: string;          // what makes this novel/fun
  first_dollar_path: string;       // concrete 7-day revenue path
  
  // Metadata for downstream compatibility
  idea_mode: IdeaModeV7;
  
  // v6 compatibility scores (generated for downstream systems)
  shock_factor: number;            // 0-100
  virality_potential: number;      // 0-100
  leverage_score: number;          // 0-100
  automation_density: number;      // 0-100
  autonomy_level: number;          // 0-100
  culture_tailwind: number;        // 0-100
  chaos_factor: number;            // 0-100
}

// Full v7 generation response
export interface IdeaGenerationV7Response {
  generation_version: "v6.1+v2.0";
  tone: GenerationTone;
  pass_a_raw_ideas: RawIdeaV7[];
  final_ranked_ideas: RefinedIdeaV7[];
}

// ============================================
// LEGACY / BACKWARDS COMPATIBILITY TYPES
// ============================================

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

// v7 BusinessIdea - unified format that maps to existing DB schema
export interface BusinessIdeaV7 {
  id: string;
  title: string;
  oneLiner: string;                // maps to one_liner_pitch
  description: string;             // constructed from problem + solution
  
  // Core fields
  category: IdeaCategory;
  industry: string;
  model: string;
  aiPattern: string;
  platform: CreatorPlatform | null;
  difficulty: IdeaDifficulty;
  soloFit: boolean;
  timeToRevenue: TimeToRevenue;
  
  // v7 specific fields
  problem: string;
  solution: string;
  idealCustomer: string;
  pricingAnchor: string;
  distributionWedge: string;
  whyNow: string;
  executionDifficulty: ExecutionDifficulty;
  riskNotes: string;
  delightFactor: string;
  firstDollarPath: string;
  
  // Legacy compat fields
  problemStatement: string;
  targetCustomer: string;
  mvpApproach: string;
  goToMarket: string;
  whyItFitsFounder: string;
  firstSteps: string[];
  
  // v6 Scores (0-100)
  shockFactor: number;
  viralityPotential: number;
  leverageScore: number;
  automationDensity: number;
  autonomyLevel: number;
  cultureTailwind: number;
  chaosFactor: number;
  
  // Metadata
  engineVersion: string;           // "v7" or "v6.1+v2.0"
  mode: IdeaGenerationMode;
  ideaModeV7: IdeaModeV7;
  tone: GenerationTone;
}

// Type guard to check if idea is v6 format
// Accepts both camelCase (frontend) and snake_case (DB) versions
export function isV6Idea(idea: BusinessIdea | BusinessIdeaV6 | any): idea is BusinessIdeaV6 {
  const engineVer = idea.engineVersion || idea.engine_version;
  return engineVer === "v6" && ("category" in idea || "aiPattern" in idea || "ai_pattern" in idea);
}

// Type guard for v7 ideas
export function isV7Idea(idea: any): idea is BusinessIdeaV7 {
  const engineVer = idea.engineVersion || idea.engine_version;
  return (engineVer === "v7" || engineVer === "v6.1+v2.0") && "pricingAnchor" in idea;
}

// Helper to calculate overall v6 score
export function calculateV6Score(idea: BusinessIdeaV6 | BusinessIdeaV7): number {
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

// Convert RefinedIdeaV7 to BusinessIdeaV7 for downstream compatibility
export function refinedToBusinessIdea(refined: RefinedIdeaV7, tone: GenerationTone): BusinessIdeaV7 {
  // Infer category from idea_mode
  const categoryMap: Record<IdeaModeV7, IdeaCategory> = {
    Standard: "saas",
    Persona: "avatar",
    Chaos: "locker_room",
    Memetic: "memetic",
    Fusion: "system",
  };
  
  // Infer generation mode
  const modeMap: Record<IdeaModeV7, IdeaGenerationMode> = {
    Standard: "breadth",
    Persona: "persona",
    Chaos: "chaos",
    Memetic: "memetic",
    Fusion: "boundless",
  };
  
  // Infer difficulty
  const difficultyMap: Record<ExecutionDifficulty, IdeaDifficulty> = {
    Low: "easy",
    Medium: "medium",
    High: "hard",
  };
  
  // Infer time to revenue
  const timeMap: Record<string, TimeToRevenue> = {
    "7 days": "0-30d",
    "1 week": "0-30d",
    "2 weeks": "0-30d",
    "1 month": "0-30d",
    "30 days": "0-30d",
  };
  
  return {
    id: refined.id,
    title: refined.title,
    oneLiner: refined.one_liner_pitch,
    description: `${refined.problem} ${refined.solution}`,
    
    category: categoryMap[refined.idea_mode] || "saas",
    industry: "",
    model: refined.business_model,
    aiPattern: "",
    platform: null,
    difficulty: difficultyMap[refined.execution_difficulty],
    soloFit: refined.execution_difficulty !== "High",
    timeToRevenue: timeMap[refined.time_to_first_dollar.toLowerCase()] || "0-30d",
    
    problem: refined.problem,
    solution: refined.solution,
    idealCustomer: refined.ideal_customer,
    pricingAnchor: refined.pricing_anchor,
    distributionWedge: refined.distribution_wedge,
    whyNow: refined.why_now,
    executionDifficulty: refined.execution_difficulty,
    riskNotes: refined.risk_notes,
    delightFactor: refined.delight_factor,
    firstDollarPath: refined.first_dollar_path,
    
    problemStatement: refined.problem,
    targetCustomer: refined.ideal_customer,
    mvpApproach: refined.solution,
    goToMarket: refined.distribution_wedge,
    whyItFitsFounder: refined.why_now,
    firstSteps: [refined.first_dollar_path],
    
    shockFactor: refined.shock_factor,
    viralityPotential: refined.virality_potential,
    leverageScore: refined.leverage_score,
    automationDensity: refined.automation_density,
    autonomyLevel: refined.autonomy_level,
    cultureTailwind: refined.culture_tailwind,
    chaosFactor: refined.chaos_factor,
    
    engineVersion: "v7",
    mode: modeMap[refined.idea_mode],
    ideaModeV7: refined.idea_mode,
    tone,
  };
}
