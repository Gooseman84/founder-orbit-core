/**
 * Idea engine utilities for TrueBlazer.
 *
 * These functions handle:
 * - Fit scoring between founder and idea
 * - Sorting and filtering ideas
 * - Validating idea objects before DB operations
 */

import { weightedAverage, toScore } from "./scoring";

export interface FounderProfileLite {
  passions_text?: string | null;
  skills_text?: string | null;
  time_per_week?: number | null;
  capital_available?: number | null;
  risk_tolerance?: string | null; // e.g. "low" | "medium" | "high"
  lifestyle_goals?: string | null;
  success_vision?: string | null;
}

export interface IdeaLite {
  id: string;
  title: string;
  summary?: string | null;
  tags?: string[] | null;
  stage?: string | null; // e.g. "idea" | "validation" | "offer" | "revenue"
  opportunity_score?: number | null;
  founder_fit_score?: number | null;
  created_at?: string | null;
}

/**
 * Compute a founder–idea fit score (0–100) based on rough heuristics.
 *
 * This is intentionally simple and explainable; deeper logic can be layered
 * on top later without breaking the interface.
 */
export function computeFitScore(
  idea: IdeaLite,
  founder: FounderProfileLite
): number {
  // Basic heuristics:
  // - More overlap between passions/skills and idea summary/title = higher score
  // - Respect time and capital constraints lightly
  // - Adjust for risk tolerance based on idea stage

  const title = (idea.title ?? "").toLowerCase();
  const summary = (idea.summary ?? "").toLowerCase();
  const passions = (founder.passions_text ?? "").toLowerCase();
  const skills = (founder.skills_text ?? "").toLowerCase();

  let passionMatch = 0;
  if (passions && (title.includesAny(passions) || summary.includesAny(passions))) {
    passionMatch = 80;
  }

  let skillMatch = 0;
  if (skills && (title.includesAny(skills) || summary.includesAny(skills))) {
    skillMatch = 70;
  }

  // Time/Capital heuristic (very light, just reduces fit if constraints very low)
  const time = founder.time_per_week ?? 0;
  const capital = founder.capital_available ?? 0;

  let constraintScore = 70;
  if (time < 3) constraintScore -= 20;
  if (time < 1) constraintScore -= 20;
  if (capital < 500) constraintScore -= 10;

  constraintScore = toScore(constraintScore, 50);

  // Risk tolerance vs stage
  const risk = (founder.risk_tolerance ?? "medium").toLowerCase();
  const stage = (idea.stage ?? "idea").toLowerCase();

  let riskScore = 70;
  if (risk === "low" && stage === "idea") riskScore -= 10;
  if (risk === "low" && stage === "revenue") riskScore += 10;
  if (risk === "high" && stage === "idea") riskScore += 10;

  riskScore = toScore(riskScore, 60);

  const passionScore = passionMatch || (passions ? 60 : 50);
  const skillScore = skillMatch || (skills ? 60 : 50);

  return weightedAverage([
    { value: passionScore, weight: 0.35 },
    { value: skillScore, weight: 0.30 },
    { value: constraintScore, weight: 0.20 },
    { value: riskScore, weight: 0.15 },
  ]);
}

/**
 * Helper: naive "includes any keyword" detection.
 * This extends String in a non-destructive way by using a helper pattern.
 */
declare global {
  interface String {
    includesAny(other: string): boolean;
  }
}

if (!String.prototype.includesAny) {
  // eslint-disable-next-line no-extend-native
  String.prototype.includesAny = function (this: string, other: string) {
    const tokens = other.split(/[,;\n]/).map((t) => t.trim()).filter(Boolean);
    if (!tokens.length) return false;
    const lower = this.toLowerCase();
    return tokens.some((token) => lower.includes(token.toLowerCase()));
  };
}

/**
 * Rank ideas using a combination of opportunity_score, founder fit, and recency.
 *
 * options:
 * - sortBy: "opportunity" | "fit" | "recent"
 * - founderProfile: optional founder profile to compute fit on the fly
 */
export function rankIdeas(
  ideas: IdeaLite[],
  options?: {
    sortBy?: "opportunity" | "fit" | "recent";
    founderProfile?: FounderProfileLite;
  }
): IdeaLite[] {
  const { sortBy = "opportunity", founderProfile } = options || {};

  const withComputedFit = ideas.map((idea) => {
    const fit =
      idea.founder_fit_score ??
      (founderProfile ? computeFitScore(idea, founderProfile) : null);

    return { ...idea, founder_fit_score: fit ?? undefined };
  });

  const sorted = [...withComputedFit].sort((a, b) => {
    if (sortBy === "recent") {
      const da = a.created_at ? Date.parse(a.created_at) : 0;
      const db = b.created_at ? Date.parse(b.created_at) : 0;
      return db - da;
    }

    if (sortBy === "fit") {
      const fa = toScore(a.founder_fit_score ?? 0);
      const fb = toScore(b.founder_fit_score ?? 0);
      return fb - fa;
    }

    // default: opportunity
    const oa = toScore(a.opportunity_score ?? 0);
    const ob = toScore(b.opportunity_score ?? 0);
    return ob - oa;
  });

  return sorted;
}

/**
 * Filter ideas using simple criteria.
 */
export function filterIdeas(
  ideas: IdeaLite[],
  filters?: {
    stage?: string[];
    minOpportunityScore?: number;
    minFitScore?: number;
    tags?: string[];
  }
): IdeaLite[] {
  if (!filters) return ideas;

  const {
    stage,
    minOpportunityScore = 0,
    minFitScore = 0,
    tags,
  } = filters;

  return ideas.filter((idea) => {
    if (stage && stage.length && idea.stage && !stage.includes(idea.stage)) {
      return false;
    }

    const oppScore = toScore(idea.opportunity_score ?? 0);
    if (oppScore < minOpportunityScore) return false;

    const fitScore = toScore(idea.founder_fit_score ?? 0);
    if (fitScore < minFitScore) return false;

    if (tags && tags.length && idea.tags?.length) {
      const tagSet = new Set(idea.tags.map((t) => t.toLowerCase()));
      const hasTag = tags.some((t) => tagSet.has(t.toLowerCase()));
      if (!hasTag) return false;
    }

    return true;
  });
}

/**
 * Validate an idea object before saving it.
 */
export function validateIdea(
  idea: Partial<IdeaLite>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!idea.title || !idea.title.trim()) {
    errors.push("Title is required.");
  }

  if (idea.title && idea.title.length > 200) {
    errors.push("Title is too long (max 200 characters).");
  }

  if (idea.summary && idea.summary.length > 5000) {
    errors.push("Summary is too long (max 5000 characters).");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
