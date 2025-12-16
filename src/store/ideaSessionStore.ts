// Zustand store for session-level v7 idea persistence
import { create } from "zustand";
import type { BusinessIdeaV6, RawIdeaV7, RefinedIdeaV7, GenerationTone } from "@/types/businessIdea";
import type { IdeaGenerationMode } from "@/types/idea";
import type { PlanErrorCode } from "@/config/plans";

interface PlanLimitError {
  code: PlanErrorCode;
  mode?: string;
  limit?: number;
  plan?: string;
}

// Union type for backwards compatibility
type SessionIdea = BusinessIdeaV6 | (BusinessIdeaV6 & { 
  ideaModeV7?: string; 
  tone?: GenerationTone;
  problem?: string;
  solution?: string;
  pricingAnchor?: string;
  distributionWedge?: string;
  delightFactor?: string;
  firstDollarPath?: string;
});

interface IdeaSessionState {
  // Session-generated ideas (not yet saved to DB)
  sessionIdeas: SessionIdea[];
  currentMode: IdeaGenerationMode | null;
  focusArea: string;
  currentTone: GenerationTone;
  
  // v7 two-pass data
  rawIdeas: RawIdeaV7[];
  refinedIdeas: RefinedIdeaV7[];
  generationVersion: string | null;
  
  // Track which ideas have been saved to library
  savedIdeaIds: Set<string>;
  savedIdeaDbIds: Map<string, string>;
  
  // Plan limit error tracking
  planError: PlanLimitError | null;
  
  // Actions
  setSessionIdeas: (ideas: SessionIdea[]) => void;
  addSessionIdeas: (ideas: SessionIdea[]) => void;
  clearSessionIdeas: () => void;
  setCurrentMode: (mode: IdeaGenerationMode | null) => void;
  setFocusArea: (area: string) => void;
  setCurrentTone: (tone: GenerationTone) => void;
  
  // v7 specific
  setRawIdeas: (ideas: RawIdeaV7[]) => void;
  setRefinedIdeas: (ideas: RefinedIdeaV7[]) => void;
  setGenerationVersion: (version: string | null) => void;
  setTwoPassData: (raw: RawIdeaV7[], refined: RefinedIdeaV7[], version: string) => void;
  
  // Saved tracking
  markIdeaAsSaved: (sessionId: string, dbId: string) => void;
  isIdeaSaved: (sessionId: string) => boolean;
  getDbId: (sessionId: string) => string | undefined;
  clearSavedTracking: () => void;
  
  // Plan error
  setPlanError: (error: PlanLimitError | null) => void;
  clearPlanError: () => void;
}

export const useIdeaSessionStore = create<IdeaSessionState>((set, get) => ({
  sessionIdeas: [],
  currentMode: null,
  focusArea: "",
  currentTone: "exciting",
  rawIdeas: [],
  refinedIdeas: [],
  generationVersion: null,
  savedIdeaIds: new Set(),
  savedIdeaDbIds: new Map(),
  planError: null,

  setSessionIdeas: (ideas) => set({ sessionIdeas: ideas }),
  
  addSessionIdeas: (ideas) => set((state) => ({ 
    sessionIdeas: [...state.sessionIdeas, ...ideas] 
  })),
  
  clearSessionIdeas: () => set({ 
    sessionIdeas: [],
    rawIdeas: [],
    refinedIdeas: [],
    generationVersion: null,
    savedIdeaIds: new Set(),
    savedIdeaDbIds: new Map(),
  }),
  
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setFocusArea: (area) => set({ focusArea: area }),
  setCurrentTone: (tone) => set({ currentTone: tone }),
  
  // v7 specific actions
  setRawIdeas: (ideas) => set({ rawIdeas: ideas }),
  setRefinedIdeas: (ideas) => set({ refinedIdeas: ideas }),
  setGenerationVersion: (version) => set({ generationVersion: version }),
  setTwoPassData: (raw, refined, version) => set({
    rawIdeas: raw,
    refinedIdeas: refined,
    generationVersion: version,
  }),
  
  markIdeaAsSaved: (sessionId, dbId) => set((state) => {
    const newSavedIds = new Set(state.savedIdeaIds);
    newSavedIds.add(sessionId);
    const newDbIds = new Map(state.savedIdeaDbIds);
    newDbIds.set(sessionId, dbId);
    return { savedIdeaIds: newSavedIds, savedIdeaDbIds: newDbIds };
  }),
  
  isIdeaSaved: (sessionId) => get().savedIdeaIds.has(sessionId),
  getDbId: (sessionId) => get().savedIdeaDbIds.get(sessionId),
  
  clearSavedTracking: () => set({
    savedIdeaIds: new Set(),
    savedIdeaDbIds: new Map(),
  }),
  
  setPlanError: (error) => set({ planError: error }),
  clearPlanError: () => set({ planError: null }),
}));
