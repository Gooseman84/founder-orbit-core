// Types for founder interview corrections

export interface CorrectionFields {
  insiderKnowledge: string | null;
  customerIntimacy: string | null;
  constraints: string | null;
  financialTarget: string | null;
  hardNoFilters: string | null;
}

export interface CorrectionsPayload {
  corrections: CorrectionFields;
  additionalContext: string | null;
}
