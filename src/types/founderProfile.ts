// src/types/founderProfile.ts
// Normalized founder profile structure used for onboarding and downstream AI context

export type RiskTolerance = "low" | "medium" | "high";
export type Runway = "0_3_months" | "3_12_months" | "12_plus_months";

export interface FounderProfile {
  userId: string;

  // Passions
  passionsText: string;
  passionDomains: string[];
  passionDomainsOther?: string | null;

  // Skills
  skillsText: string;
  skillTags: string[];
  skillSpikes: {
    salesPersuasion: number;      // 1-5
    contentTeaching: number;      // 1-5
    opsSystems: number;           // 1-5
    productCreativity: number;    // 1-5
    numbersAnalysis: number;      // 1-5
  };

  // Constraints
  hoursPerWeek: number;
  availableCapital: number;
  riskTolerance: RiskTolerance;
  runway: Runway;
  urgencyVsUpside: number; // 1-5

  // Lifestyle & vision
  lifestyleGoalsText: string;
  visionOfSuccessText: string;
  lifestyleNonNegotiables: string[];

  // Extended – desires
  primaryDesires: string[];

  // Extended – energy
  energyGiversText: string;
  energyDrainersText: string;

  // Extended – identity
  antiVisionText: string;
  legacyStatementText: string;
  fearStatementText: string;

  // Extended – archetypes
  businessArchetypes: string[];

  // Extended – work style & founder type
  founderRoles: string[];
  workStylePreferences: string[];
  commitmentLevel: number; // 1-5

  // Extended – markets & access
  marketSegmentsUnderstood: string[];
  existingNetworkChannels: string[];

  // Extended – hell no
  hellNoFilters: string[];

  createdAt: string;
  updatedAt: string;
}
