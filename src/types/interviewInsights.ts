// Types for Mavrik interview insights/context_summary

export interface ExtractedInsights {
  insiderKnowledge: string[];
  customerIntimacy: string[];
  constraints: {
    hoursPerWeek: number | "unclear";
    availableCapital: string;
    timeline?: string;
    otherConstraints?: string[];
  };
  financialTarget: {
    type: "side_income" | "salary_replacement" | "wealth_building";
    minimumMonthlyRevenue: number | "unspecified";
    description: string;
  };
  hardNoFilters: string[];
  emotionalDrivers: string[];
  domainExpertise: string[];
}

export interface ConfidenceLevel {
  insiderKnowledge: "high" | "medium" | "low";
  customerIntimacy: "high" | "medium" | "low";
  constraints: "high" | "medium" | "low";
  financialTarget: "high" | "medium" | "low";
}

export interface InterviewInsights {
  extractedInsights: ExtractedInsights;
  founderSummary: string;
  confidenceLevel: ConfidenceLevel;
  ideaGenerationContext: string;
}
