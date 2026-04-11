import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";

export type SortMode = "fit_desc" | "fit_asc" | "title_asc";

export const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "fit_desc", label: "Highest Fit First" },
  { value: "fit_asc", label: "Lowest Fit First" },
  { value: "title_asc", label: "Alphabetical (Title)" },
];

export function isV6Idea(idea: BusinessIdea | BusinessIdeaV6): idea is BusinessIdeaV6 {
  return "engineVersion" in idea && idea.engineVersion === "v6";
}

export function convertV6ToLegacy(idea: BusinessIdeaV6): BusinessIdea {
  return {
    id: idea.id,
    title: idea.title,
    oneLiner: idea.oneLiner,
    description: idea.description,
    problemStatement: idea.problemStatement,
    targetCustomer: idea.targetCustomer,
    revenueModel: idea.model,
    mvpApproach: idea.mvpApproach,
    goToMarket: idea.goToMarket,
    competitiveAdvantage: idea.whyNow,
    financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
    requiredToolsSkills: idea.aiPattern,
    risksMitigation: "",
    whyItFitsFounder: idea.whyItFitsFounder,
    primaryPassionDomains: [idea.industry],
    primarySkillNeeds: [],
    markets: [idea.industry],
    businessArchetype: idea.category,
    hoursPerWeekMin: 5,
    hoursPerWeekMax: 20,
    capitalRequired: 0,
    riskLevel: idea.difficulty === "easy" ? "low" : idea.difficulty === "hard" ? "high" : "medium",
    timeToFirstRevenueMonths: idea.timeToRevenue === "0-30d" ? 1 : idea.timeToRevenue === "30-90d" ? 3 : 6,
    requiresPublicPersonalBrand: idea.platform !== null,
    requiresTeamSoon: !idea.soloFit,
    requiresCoding: false,
    salesIntensity: 3,
    asyncDepthWork: 3,
    firstSteps: idea.firstSteps,
    category: idea.category,
    mode: idea.mode,
    platform: idea.platform,
    shockFactor: idea.shockFactor,
    viralityPotential: idea.viralityPotential,
    leverageScore: idea.leverageScore,
    automationDensity: idea.automationDensity,
    autonomyLevel: idea.autonomyLevel,
    cultureTailwind: idea.cultureTailwind,
    chaosFactor: idea.chaosFactor,
    engineVersion: idea.engineVersion,
  };
}
