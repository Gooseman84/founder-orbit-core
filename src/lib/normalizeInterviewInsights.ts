// Normalizes interview context_summary from either the old schema or new schema
// into a consistent format the frontend can safely render.

export interface NormalizedInsights {
  insiderKnowledge: string[];
  customerIntimacy: string[];
  constraints: {
    hoursPerWeek: number | string | "unclear";
    availableCapital: string;
    timeline?: string | null;
    otherConstraints?: string[];
  };
  financialTarget: {
    type: string;
    minimumMonthlyRevenue: number | string;
    description: string;
  };
  hardNoFilters: string[];
  emotionalDrivers: string[];
  domainExpertise: string[];
  customerPain: {
    targetRole: string;
    specificProblem: string;
    currentWorkflow: string[];
    painPoints: string[];
    toolsCurrentlyUsed: string[];
  };
  ventureIntelligence: {
    verticalIdentified: string | null;
    businessModel: string | null;
    wedgeClarity: string;
    workflowDepthLevel: string;
    industryAccess: string;
  };
  transferablePatterns: Array<{
    coreSkill?: string;
    abstractSkill?: string;
    sourceIndustry?: string;
    sourceContext?: string;
    targetIndustries?: string[];
    adjacentIndustries?: string[];
  }>;
}

export interface NormalizedConfidence {
  insiderKnowledge: "high" | "medium" | "low" | "none";
  customerIntimacy: "high" | "medium" | "low" | "none";
  constraints: "high" | "medium" | "low" | "none";
  financialTarget: "high" | "medium" | "low" | "none";
  workflowDepth: "high" | "medium" | "low" | "none";
  overall: "high" | "medium" | "low";
}

export interface AuthorityAssessment {
  tier: 1 | 2 | 3;
  tierLabel: "borrowed" | "operational" | "earned";
  earnedAuthorityEvidence: string[];
  borrowedAuthorityFlags: string[];
  consensusDeviation: string | null;
  defensibilitySummary: string;
}

export interface NormalizedInterviewData {
  extractedInsights: NormalizedInsights;
  confidenceLevel: NormalizedConfidence;
  founderSummary: string;
  ideaGenerationContext: string;
  keyQuotes: string[];
  redFlags: string[];
  authorityAssessment: AuthorityAssessment | null;
  routingSignal: {
    suggestedArchetype: string;
    buyerAccess: {
      hasDirectAccess: boolean;
      reachabilityDescription: string;
      namedBuyerOrChannel: string | null;
    };
    confidenceForRouting: string;
  } | null;
}

export function normalizeInterviewInsights(raw: any): NormalizedInterviewData {
  if (!raw) return getEmptyNormalized();

  const isNewSchema = !!raw.domainExpertise || !!raw.interviewSignalQuality;
  const isOldSchema = !!raw.extractedInsights;

  if (isNewSchema) return normalizeNewSchema(raw);
  if (isOldSchema) return normalizeOldSchema(raw);

  console.warn("normalizeInterviewInsights: unrecognized schema format", Object.keys(raw));
  return getEmptyNormalized();
}

function normalizeNewSchema(raw: any): NormalizedInterviewData {
  const domain = raw.domainExpertise || {};
  const pain = raw.customerPain || {};
  const venture = raw.ventureIntelligence || {};
  const signal = raw.interviewSignalQuality || {};
  const patterns = raw.transferablePatterns || [];

  return {
    extractedInsights: {
      insiderKnowledge: domain.specificKnowledge || [],
      customerIntimacy: [pain.targetRole, pain.specificProblem].filter(Boolean),
      constraints: {
        hoursPerWeek: "unclear",
        availableCapital: "See profile",
        timeline: null,
        otherConstraints: [],
      },
      financialTarget: {
        type: "see_profile",
        minimumMonthlyRevenue: "See profile",
        description: "Financial targets are now captured in the Lightning Round",
      },
      hardNoFilters: [],
      emotionalDrivers: [],
      domainExpertise: [domain.primaryIndustry, domain.abstractExpertise].filter(Boolean),
      customerPain: {
        targetRole: pain.targetRole || "",
        specificProblem: pain.specificProblem || "",
        currentWorkflow: pain.currentWorkflow || [],
        painPoints: pain.painPoints || [],
        toolsCurrentlyUsed: pain.toolsCurrentlyUsed || [],
      },
      ventureIntelligence: {
        verticalIdentified: venture.verticalIdentified || null,
        businessModel: venture.businessModel || null,
        wedgeClarity: venture.wedgeClarity || "unclear",
        workflowDepthLevel: venture.workflowDepthLevel || "tourist",
        industryAccess: venture.industryAccess || "none",
      },
      transferablePatterns: patterns,
    },
    confidenceLevel: {
      insiderKnowledge: signal.insiderKnowledge || "low",
      customerIntimacy: signal.customerPain || "low",
      constraints: "high",
      financialTarget: "high",
      workflowDepth: signal.workflowDepth || "low",
      overall: signal.overallConfidence || "low",
    },
    founderSummary: raw.founderSummary || "",
    ideaGenerationContext: raw.ideaGenerationContext || "",
    keyQuotes: raw.keyQuotes || [],
    redFlags: raw.redFlags || [],
    authorityAssessment: raw.authorityAssessment ?? null,
    routingSignal: raw.routingSignal ?? null,
  };
}

function normalizeOldSchema(raw: any): NormalizedInterviewData {
  const ei = raw.extractedInsights || {};
  const cl = raw.confidenceLevel || {};

  return {
    extractedInsights: {
      insiderKnowledge: ei.insiderKnowledge || [],
      customerIntimacy: ei.customerIntimacy || [],
      constraints: ei.constraints || { hoursPerWeek: "unclear", availableCapital: "unknown" },
      financialTarget: ei.financialTarget || { type: "unknown", minimumMonthlyRevenue: 0, description: "" },
      hardNoFilters: ei.hardNoFilters || [],
      emotionalDrivers: ei.emotionalDrivers || [],
      domainExpertise: ei.domainExpertise || [],
      customerPain: { targetRole: "", specificProblem: "", currentWorkflow: [], painPoints: [], toolsCurrentlyUsed: [] },
      ventureIntelligence: { verticalIdentified: null, businessModel: null, wedgeClarity: "unclear", workflowDepthLevel: "tourist", industryAccess: "none" },
      transferablePatterns: ei.transferablePatterns || [],
    },
    confidenceLevel: {
      insiderKnowledge: cl.insiderKnowledge || "low",
      customerIntimacy: cl.customerIntimacy || "low",
      constraints: cl.constraints || "low",
      financialTarget: cl.financialTarget || "low",
      workflowDepth: "low",
      overall: "medium",
    },
    founderSummary: raw.founderSummary || "",
    ideaGenerationContext: raw.ideaGenerationContext || "",
    keyQuotes: raw.keyQuotes || [],
    redFlags: raw.redFlags || [],
    authorityAssessment: null,
    routingSignal: null,
  };
}

function getEmptyNormalized(): NormalizedInterviewData {
  return {
    extractedInsights: {
      insiderKnowledge: [],
      customerIntimacy: [],
      constraints: { hoursPerWeek: "unclear", availableCapital: "unknown" },
      financialTarget: { type: "unknown", minimumMonthlyRevenue: 0, description: "" },
      hardNoFilters: [],
      emotionalDrivers: [],
      domainExpertise: [],
      customerPain: { targetRole: "", specificProblem: "", currentWorkflow: [], painPoints: [], toolsCurrentlyUsed: [] },
      ventureIntelligence: { verticalIdentified: null, businessModel: null, wedgeClarity: "unclear", workflowDepthLevel: "tourist", industryAccess: "none" },
      transferablePatterns: [],
    },
    confidenceLevel: {
      insiderKnowledge: "none",
      customerIntimacy: "none",
      constraints: "none",
      financialTarget: "none",
      workflowDepth: "none",
      overall: "low",
    },
    founderSummary: "",
    ideaGenerationContext: "",
    keyQuotes: [],
    redFlags: [],
    authorityAssessment: null,
    routingSignal: null,
  };
}
