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

// New schema types (post-refactor)
export interface NewSchemaInterviewInsights {
  interviewSignalQuality: {
    insiderKnowledge: "none" | "low" | "medium" | "high";
    customerPain: "none" | "low" | "medium" | "high";
    workflowDepth: "none" | "low" | "medium" | "high";
    overallConfidence: "low" | "medium" | "high";
  };
  domainExpertise: {
    primaryIndustry: string;
    yearsOfExposure: string | null;
    specificKnowledge: string[];
    abstractExpertise: string;
    insiderAccessLevel: "worked_in" | "served_as_client" | "observed" | "researched";
  };
  customerPain: {
    targetRole: string;
    specificProblem: string;
    currentWorkflow: string[];
    painPoints: string[];
    toolsCurrentlyUsed: string[];
    frequencyOfPain: string | null;
    costOfPain: string | null;
  };
  ventureIntelligence: {
    verticalIdentified: string | null;
    businessModel: string | null;
    wedgeClarity: "clear" | "emerging" | "unclear";
    workflowDepthLevel: "native" | "informed" | "tourist";
    industryAccess: "direct" | "indirect" | "none";
    patternTransferPotential: string | null;
    abstractExpertise: string | null;
  };
  transferablePatterns: Array<{
    coreSkill: string;
    sourceIndustry: string;
    targetIndustries: string[];
    structuralSimilarity: string;
  }>;
  keyQuotes: string[];
  redFlags: string[];
  founderSummary: string;
  ideaGenerationContext: string;
}
