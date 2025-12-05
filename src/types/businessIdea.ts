import type { RiskTolerance } from "./founderProfile";

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
}
