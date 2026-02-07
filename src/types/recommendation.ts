// Types for personalized venture recommendations

export interface FitBreakdown {
  founderMarketFit: number;
  feasibility: number;
  revenueAlignment: number;
  marketTiming: number;
}

export interface Recommendation {
  name: string;
  oneLiner: string;
  whyThisFounder: string;
  targetCustomer: string;
  revenueModel: string;
  timeToFirstRevenue: string;
  capitalRequired: string;
  fitScore: number;
  fitBreakdown: FitBreakdown;
  keyRisk: string;
  firstStep: string;
}

export interface GenerationResult {
  success: boolean;
  recommendations: Recommendation[];
  generationNotes?: string;
  recommendationId?: string;
  generationTimeMs?: number;
  error?: string;
}
