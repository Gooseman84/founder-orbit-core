/**
 * Prompt builder utilities for TrueBlazer.
 *
 * Centralizes LLM prompt construction for:
 * - Idea generation
 * - Idea vetting
 * - Opportunity scoring
 * - Blueprint generation
 *
 * All functions return a { system, user } pair you can pass to edge functions.
 */

import type { FounderProfileLite, IdeaLite } from "./ideaEngine";

export interface IdeaAnalysisPayload {
  customer?: string | null;
  problem?: string | null;
  solution?: string | null;
  revenue_model?: string | null;
  channels?: string | null;
}

export interface OpportunityScorePayload {
  idea: IdeaLite;
  founderProfile: FounderProfileLite;
  marketNotes?: string | null;
}

/**
 * Truncate text safely to a maximum length in characters.
 */
export function sanitizeText(
  text: string | null | undefined,
  maxLength: number
): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Build prompt for idea generation based on founder profile and constraints.
 */
export function buildIdeaGenerationPrompt(params: {
  founderProfile: FounderProfileLite;
  maxIdeas?: number;
}): { system: string; user: string } {
  const { founderProfile, maxIdeas = 10 } = params;

  const passions = sanitizeText(founderProfile.passions_text, 800);
  const skills = sanitizeText(founderProfile.skills_text, 800);
  const lifestyle = sanitizeText(founderProfile.lifestyle_goals, 400);
  const vision = sanitizeText(founderProfile.success_vision, 400);

  const system = `
You are TrueBlazer's Idea Engine.

Your job:
Generate ${maxIdeas} aligned business ideas for a founder based on their passions, skills,
constraints, and lifestyle vision. You prioritize founder–idea fit and realistic execution,
not generic "billion dollar" fantasies.

Return ideas that are:
- Specific
- Aligned with the founder's life and resources
- Monetizable within 6–24 months
  `.trim();

  const user = JSON.stringify({
    passions,
    skills,
    time_per_week: founderProfile.time_per_week ?? null,
    capital_available: founderProfile.capital_available ?? null,
    risk_tolerance: founderProfile.risk_tolerance ?? null,
    lifestyle_goals: lifestyle,
    success_vision: vision,
    max_ideas: maxIdeas,
  });

  return { system, user };
}

/**
 * Build prompt for idea vetting / analysis.
 */
export function buildIdeaVettingPrompt(params: {
  founderProfile: FounderProfileLite;
  idea: IdeaLite;
}): { system: string; user: string } {
  const { founderProfile, idea } = params;

  const system = `
You are TrueBlazer's Idea Vetting Engine.

Your job:
Analyze a single business idea for a specific founder. You assess founder–idea fit,
market potential, monetization options, risks, and next steps. You are honest but constructive.
  `.trim();

  const userPayload = {
    founder_profile: {
      passions_text: sanitizeText(founderProfile.passions_text, 1000),
      skills_text: sanitizeText(founderProfile.skills_text, 1000),
      time_per_week: founderProfile.time_per_week ?? null,
      capital_available: founderProfile.capital_available ?? null,
      risk_tolerance: founderProfile.risk_tolerance ?? null,
      lifestyle_goals: sanitizeText(
        founderProfile.lifestyle_goals,
        600
      ),
      success_vision: sanitizeText(founderProfile.success_vision, 600),
    },
    idea: {
      id: idea.id,
      title: sanitizeText(idea.title, 200),
      summary: sanitizeText(idea.summary ?? "", 2000),
      tags: idea.tags ?? [],
    },
  };

  return {
    system,
    user: JSON.stringify(userPayload),
  };
}

/**
 * Build prompt for opportunity scoring.
 */
export function buildOpportunityScorePrompt(
  payload: OpportunityScorePayload
): { system: string; user: string } {
  const { idea, founderProfile, marketNotes } = payload;

  const system = `
You are TrueBlazer's Opportunity Scoring Engine.

Your job:
Score a single business idea from 0–100 and provide sub-scores for:
- founder_fit
- market_size
- pain_intensity
- competition
- difficulty
- tailwinds

You return STRICT JSON with:
{
  "total_score": number,
  "sub_scores": {
    "founder_fit": number,
    "market_size": number,
    "pain_intensity": number,
    "competition": number,
    "difficulty": number,
    "tailwinds": number
  },
  "reasoning": string
}
  `.trim();

  const userPayload = {
    idea: {
      id: idea.id,
      title: sanitizeText(idea.title, 200),
      summary: sanitizeText(idea.summary ?? "", 2000),
      tags: idea.tags ?? [],
      stage: idea.stage ?? null,
    },
    founder_profile: {
      passions_text: sanitizeText(founderProfile.passions_text, 800),
      skills_text: sanitizeText(founderProfile.skills_text, 800),
      time_per_week: founderProfile.time_per_week ?? null,
      capital_available: founderProfile.capital_available ?? null,
      risk_tolerance: founderProfile.risk_tolerance ?? null,
      lifestyle_goals: sanitizeText(
        founderProfile.lifestyle_goals,
        600
      ),
      success_vision: sanitizeText(
        founderProfile.success_vision,
        600
      ),
    },
    market_notes: sanitizeText(marketNotes ?? "", 1000),
  };

  return {
    system,
    user: JSON.stringify(userPayload),
  };
}

/**
 * Build prompt for initial Blueprint generation.
 * (This pairs with src/prompts/generateBlueprint.txt)
 */
export function buildBlueprintGenerationPrompt(params: {
  founderProfile: FounderProfileLite;
  chosenIdea: IdeaLite | null;
  ideaAnalysis?: IdeaAnalysisPayload | null;
}): { system: string; user: string } {
  const { founderProfile, chosenIdea, ideaAnalysis } = params;

  const system = `
You are TrueBlazer's Blueprint Generator.

Your job:
Create a complete Founder Blueprint object that captures both the founder's life context
and their current North Star idea, including target audience, problem, promise, offer model,
monetization strategy, distribution channels, traction definition, and quarterly focus.

You MUST return strict JSON matching the FounderBlueprint structure (minus ids and timestamps).
  `.trim();

  const userPayload = {
    founder_profile: {
      passions_text: sanitizeText(founderProfile.passions_text, 1000),
      skills_text: sanitizeText(founderProfile.skills_text, 1000),
      time_per_week: founderProfile.time_per_week ?? null,
      capital_available: founderProfile.capital_available ?? null,
      risk_tolerance: founderProfile.risk_tolerance ?? null,
      lifestyle_goals: sanitizeText(
        founderProfile.lifestyle_goals,
        800
      ),
      success_vision: sanitizeText(
        founderProfile.success_vision,
        800
      ),
    },
    chosen_idea: chosenIdea
      ? {
          id: chosenIdea.id,
          title: sanitizeText(chosenIdea.title, 200),
          summary: sanitizeText(chosenIdea.summary ?? "", 2000),
        }
      : null,
    idea_analysis: ideaAnalysis ?? null,
  };

  return {
    system,
    user: JSON.stringify(userPayload),
  };
}
