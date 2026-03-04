// Reduces interview context token bloat by selecting only the fields each edge function actually needs.

export type InterviewContextSlice = {
  founderSummary?: string;
  ideaGenerationContext?: string;
  constraints?: Record<string, any>;
  energyDrainers?: string[];
  transferablePatterns?: string[];
  ventureIntelligence?: Record<string, any>;
  extractedInsights?: Record<string, any>;
  networkStrength?: string;
};

const FUNCTION_FIELD_MAP: Record<string, (keyof InterviewContextSlice)[]> = {
  "generate-ideas": ["ideaGenerationContext", "founderSummary", "transferablePatterns", "energyDrainers"],
  "generate-founder-ideas": ["founderSummary", "ventureIntelligence", "extractedInsights", "ideaGenerationContext"],
  "generate-blueprint": ["ventureIntelligence", "constraints", "energyDrainers", "founderSummary"],
  "generate-venture-plan": ["constraints", "ventureIntelligence", "founderSummary", "networkStrength"],
  "generate-daily-execution-tasks": ["constraints", "energyDrainers", "founderSummary", "transferablePatterns"],
  "refresh-blueprint": ["founderSummary", "constraints", "ventureIntelligence", "extractedInsights"],
  "dynamic-founder-interview": ["founderSummary", "extractedInsights", "ventureIntelligence"],
  "calculate-financial-viability": ["constraints", "networkStrength", "ventureIntelligence", "founderSummary"],
  "generate-implementation-kit": ["ventureIntelligence", "constraints", "founderSummary"],
  "venture-debugger": ["constraints", "energyDrainers", "founderSummary", "transferablePatterns", "ventureIntelligence", "extractedInsights"],
  "feature-builder": ["ventureIntelligence", "constraints", "founderSummary", "extractedInsights"],
};

export function selectInterviewContext(
  functionName: string,
  interviewContext: any
): InterviewContextSlice | null {
  if (!interviewContext) return null;

  // Normalize new schema to include old field names for backward compat
  const normalized = normalizeForBackend(interviewContext);

  const fields = FUNCTION_FIELD_MAP[functionName];
  if (!fields) return normalized; // unknown function: pass full context

  const slice: InterviewContextSlice = {};

  for (const field of fields) {
    // Handle nested paths in context_summary
    const value =
      normalized[field] ??
      normalized.extractedInsights?.[field] ??
      normalized.ventureIntelligence?.[field] ??
      null;

    if (value !== null && value !== undefined) {
      (slice as any)[field] = value;
    }
  }

  return Object.keys(slice).length > 0 ? slice : null;
}

/**
 * Maps new interview schema (domainExpertise, customerPain, etc.) to
 * old-style extractedInsights so downstream functions work unchanged.
 */
function normalizeForBackend(ctx: any): any {
  // If it already has extractedInsights (old schema), return as-is
  if (ctx.extractedInsights) return ctx;

  const domain = ctx.domainExpertise || {};
  const pain = ctx.customerPain || {};

  return {
    ...ctx,
    extractedInsights: {
      insiderKnowledge: domain.specificKnowledge || [],
      customerIntimacy: [pain.targetRole, pain.specificProblem].filter(Boolean),
      constraints: {},
      hardNoFilters: [],
      domainExpertise: [domain.primaryIndustry, domain.abstractExpertise].filter(Boolean),
      transferablePatterns: ctx.transferablePatterns || [],
      networkDistribution: {},
    },
    domainExpertise: domain,
    customerPain: pain,
    ventureIntelligence: ctx.ventureIntelligence || {},
    interviewSignalQuality: ctx.interviewSignalQuality || {},
  };
}
