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
  "generate-blueprint": ["ventureIntelligence", "constraints", "energyDrainers", "founderSummary"],
  "generate-venture-plan": ["constraints", "ventureIntelligence", "founderSummary", "networkStrength"],
  "generate-daily-execution-tasks": ["constraints", "energyDrainers", "founderSummary", "transferablePatterns"],
  "refresh-blueprint": ["founderSummary", "constraints", "ventureIntelligence", "extractedInsights"],
  "dynamic-founder-interview": ["founderSummary", "extractedInsights", "ventureIntelligence"],
  "calculate-financial-viability": ["constraints", "networkStrength", "ventureIntelligence", "founderSummary"],
  "generate-implementation-kit": ["ventureIntelligence", "constraints", "founderSummary"],
  "venture-debugger": ["constraints", "energyDrainers", "founderSummary", "transferablePatterns", "ventureIntelligence", "extractedInsights"],
};

export function selectInterviewContext(
  functionName: string,
  interviewContext: any
): InterviewContextSlice | null {
  if (!interviewContext) return null;

  const fields = FUNCTION_FIELD_MAP[functionName];
  if (!fields) return interviewContext; // unknown function: pass full context

  const slice: InterviewContextSlice = {};

  for (const field of fields) {
    // Handle nested paths in context_summary
    const value =
      interviewContext[field] ??
      interviewContext.extractedInsights?.[field] ??
      interviewContext.ventureIntelligence?.[field] ??
      null;

    if (value !== null && value !== undefined) {
      (slice as any)[field] = value;
    }
  }

  return Object.keys(slice).length > 0 ? slice : null;
}
