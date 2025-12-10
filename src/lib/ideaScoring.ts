/**
 * Idea scoring utilities for TrueBlazer.
 * Computes fit scores between a BusinessIdea and FounderProfile.
 */

import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";
import type { FounderProfile } from "@/types/founderProfile";
import { clampScore, weightedAverage } from "./scoring";

export interface IdeaScoreBreakdown {
  founderFit: number;     // 0-100
  constraintsFit: number; // 0-100
  marketFit: number;      // 0-100
  economics: number;      // 0-100
  overall: number;        // 0-100
}

/**
 * Calculate overlap ratio between two string arrays (case-insensitive).
 */
function overlapScore(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const setA = new Set(a.map(s => s.toLowerCase().trim()));
  const setB = new Set(b.map(s => s.toLowerCase().trim()));
  let matches = 0;
  for (const item of setA) {
    if (setB.has(item)) matches++;
  }
  // Score based on how many of A are found in B
  return (matches / setA.size) * 100;
}

/**
 * Score founder fit based on passions and skills alignment.
 */
function scoreFounderFit(idea: BusinessIdea, founder: FounderProfile): number {
  // Passion overlap: idea.primaryPassionDomains vs founder.passionDomains
  const passionOverlap = overlapScore(
    idea.primaryPassionDomains || [],
    founder.passionDomains || []
  );

  // Skill overlap: idea.primarySkillNeeds vs founder.skillTags
  const skillOverlap = overlapScore(
    idea.primarySkillNeeds || [],
    founder.skillTags || []
  );

  // Archetype match: idea.businessArchetype vs founder.businessArchetypes
  const archetypeMatch = founder.businessArchetypes?.some(
    a => a.toLowerCase() === idea.businessArchetype?.toLowerCase()
  ) ? 100 : 0;

  // Sales intensity vs skill spike
  const salesFit = founder.skillSpikes?.salesPersuasion
    ? Math.max(0, 100 - Math.abs(idea.salesIntensity - founder.skillSpikes.salesPersuasion) * 20)
    : 50;

  return weightedAverage([
    { value: passionOverlap, weight: 0.35 },
    { value: skillOverlap, weight: 0.35 },
    { value: archetypeMatch, weight: 0.15 },
    { value: salesFit, weight: 0.15 },
  ]);
}

/**
 * Score constraints fit based on time, capital, and risk alignment.
 */
function scoreConstraintsFit(idea: BusinessIdea, founder: FounderProfile): number {
  // Time fit: check if founder.hoursPerWeek falls within idea's range
  const founderHours = founder.hoursPerWeek || 10;
  const minHours = idea.hoursPerWeekMin || 0;
  const maxHours = idea.hoursPerWeekMax || 40;
  
  let timeFit = 100;
  if (founderHours < minHours) {
    // Not enough time - penalty based on gap
    timeFit = Math.max(0, 100 - (minHours - founderHours) * 10);
  } else if (founderHours > maxHours) {
    // Extra time is fine, slight bonus
    timeFit = 100;
  }

  // Capital fit: founder.availableCapital vs idea.capitalRequired
  const availableCapital = founder.availableCapital || 0;
  const requiredCapital = idea.capitalRequired || 0;
  
  let capitalFit = 100;
  if (requiredCapital > availableCapital) {
    // Not enough capital - penalty based on gap percentage
    const gap = (requiredCapital - availableCapital) / Math.max(requiredCapital, 1);
    capitalFit = Math.max(0, 100 - gap * 100);
  }

  // Risk tolerance fit
  const riskMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const founderRisk = riskMap[founder.riskTolerance] || 2;
  const ideaRisk = riskMap[idea.riskLevel] || 2;
  
  // Perfect match = 100, each level difference = -25
  const riskFit = Math.max(0, 100 - Math.abs(founderRisk - ideaRisk) * 25);

  // Runway consideration: if urgent, prefer faster time to revenue
  const urgency = founder.urgencyVsUpside || 3;
  const timeToRevenue = idea.timeToFirstRevenueMonths || 3;
  
  let runwayFit = 100;
  if (urgency >= 4 && timeToRevenue > 3) {
    // Urgent founder + slow revenue = penalty
    runwayFit = Math.max(0, 100 - (timeToRevenue - 3) * 15);
  }

  return weightedAverage([
    { value: timeFit, weight: 0.3 },
    { value: capitalFit, weight: 0.3 },
    { value: riskFit, weight: 0.25 },
    { value: runwayFit, weight: 0.15 },
  ]);
}

/**
 * Score market fit based on market understanding and network alignment.
 */
function scoreMarketFit(idea: BusinessIdea, founder: FounderProfile): number {
  // Market overlap: idea.markets vs founder.marketSegmentsUnderstood
  const marketOverlap = overlapScore(
    idea.markets || [],
    founder.marketSegmentsUnderstood || []
  );

  // Network channels that might help reach these markets
  const networkRelevance = overlapScore(
    idea.markets || [],
    founder.existingNetworkChannels || []
  );

  // Base score if no specific markets defined
  const baseScore = (idea.markets?.length || 0) === 0 ? 50 : 0;

  return weightedAverage([
    { value: Math.max(marketOverlap, baseScore), weight: 0.6 },
    { value: Math.max(networkRelevance, baseScore / 2), weight: 0.4 },
  ]);
}

/**
 * Score economic attractiveness based on capital efficiency and revenue potential.
 */
function scoreEconomics(idea: BusinessIdea): number {
  // Capital efficiency: lower capital = better (for bootstrapping)
  const capitalRequired = idea.capitalRequired || 0;
  let capitalEfficiency = 100;
  if (capitalRequired > 20000) capitalEfficiency = 40;
  else if (capitalRequired > 10000) capitalEfficiency = 60;
  else if (capitalRequired > 5000) capitalEfficiency = 75;
  else if (capitalRequired > 1000) capitalEfficiency = 90;

  // Time to first revenue: faster = better
  const timeToRevenue = idea.timeToFirstRevenueMonths || 3;
  let revenueSpeed = 100;
  if (timeToRevenue > 6) revenueSpeed = 40;
  else if (timeToRevenue > 4) revenueSpeed = 60;
  else if (timeToRevenue > 2) revenueSpeed = 80;

  // Revenue model keywords check for recurring revenue
  const revenueModel = (idea.revenueModel || "").toLowerCase();
  const hasRecurring = /subscription|recurring|saas|membership|monthly|annual/i.test(revenueModel);
  const recurringBonus = hasRecurring ? 100 : 50;

  // Check for public brand requirement (some founders prefer no-face)
  const brandPenalty = idea.requiresPublicPersonalBrand ? 0 : 10;

  return weightedAverage([
    { value: capitalEfficiency, weight: 0.3 },
    { value: revenueSpeed, weight: 0.3 },
    { value: recurringBonus, weight: 0.25 },
    { value: 50 + brandPenalty, weight: 0.15 },
  ]);
}

/**
 * Compute a comprehensive fit score breakdown for an idea against a founder profile.
 */
export function scoreIdeaForFounder(
  idea: BusinessIdea,
  founder: FounderProfile
): IdeaScoreBreakdown {
  const founderFit = clampScore(scoreFounderFit(idea, founder));
  const constraintsFit = clampScore(scoreConstraintsFit(idea, founder));
  const marketFit = clampScore(scoreMarketFit(idea, founder));
  const economics = clampScore(scoreEconomics(idea));

  // Weighted overall score
  const overall = clampScore(
    founderFit * 0.4 +
    constraintsFit * 0.25 +
    marketFit * 0.2 +
    economics * 0.15
  );

  return {
    founderFit,
    constraintsFit,
    marketFit,
    economics,
    overall,
  };
}

/**
 * EPIC v6: Score a v6 idea using new scoring dimensions.
 */
export function scoreV6IdeaForFounder(
  idea: BusinessIdeaV6,
  founder: FounderProfile
): IdeaScoreBreakdown {
  // For v6, use the built-in scores with some founder adjustments
  
  // Leverage score adjusted by founder's automation preference
  const hasAutomationPersonality = founder.workPersonality?.includes("automation") || 
                                   founder.workPersonality?.includes("faceless");
  const leverageBonus = hasAutomationPersonality ? 10 : 0;
  const founderFit = clampScore((idea.leverageScore + idea.autonomyLevel) / 2 + leverageBonus);
  
  // Constraints fit based on difficulty and solo fit
  const difficultyMap: Record<string, number> = { easy: 100, medium: 70, hard: 40 };
  const difficultyScore = difficultyMap[idea.difficulty] || 70;
  const soloBonus = idea.soloFit ? 20 : 0;
  const constraintsFit = clampScore(difficultyScore + soloBonus - 10);
  
  // Market fit based on platform alignment and culture tailwind
  const platformMatch = founder.creatorPlatforms?.includes(idea.platform as any) ? 30 : 0;
  const marketFit = clampScore((idea.cultureTailwind + platformMatch + idea.viralityPotential) / 2);
  
  // Economics based on automation density and autonomy
  const economics = clampScore((idea.automationDensity + idea.autonomyLevel + idea.leverageScore) / 3);
  
  // Overall weighted score
  const overall = clampScore(
    founderFit * 0.3 +
    constraintsFit * 0.2 +
    marketFit * 0.25 +
    economics * 0.25
  );

  return {
    founderFit,
    constraintsFit,
    marketFit,
    economics,
    overall,
  };
}
