// Zustand store for session-level v6 idea persistence
import { create } from "zustand";
import type { BusinessIdeaV6 } from "@/types/businessIdea";
import type { IdeaGenerationMode } from "@/types/idea";

interface IdeaSessionState {
  // Session-generated ideas (not yet saved to DB)
  sessionIdeas: BusinessIdeaV6[];
  currentMode: IdeaGenerationMode | null;
  focusArea: string;
  
  // Track which ideas have been saved to library (by original session id)
  savedIdeaIds: Set<string>;
  // Map session idea id -> database id after save
  savedIdeaDbIds: Map<string, string>;
  
  // Actions
  setSessionIdeas: (ideas: BusinessIdeaV6[]) => void;
  addSessionIdeas: (ideas: BusinessIdeaV6[]) => void;
  clearSessionIdeas: () => void;
  setCurrentMode: (mode: IdeaGenerationMode | null) => void;
  setFocusArea: (area: string) => void;
  
  // Saved tracking
  markIdeaAsSaved: (sessionId: string, dbId: string) => void;
  isIdeaSaved: (sessionId: string) => boolean;
  getDbId: (sessionId: string) => string | undefined;
  clearSavedTracking: () => void;
}

export const useIdeaSessionStore = create<IdeaSessionState>((set, get) => ({
  sessionIdeas: [],
  currentMode: null,
  focusArea: "",
  savedIdeaIds: new Set(),
  savedIdeaDbIds: new Map(),

  setSessionIdeas: (ideas) => set({ sessionIdeas: ideas }),
  
  addSessionIdeas: (ideas) => set((state) => ({ 
    sessionIdeas: [...state.sessionIdeas, ...ideas] 
  })),
  
  clearSessionIdeas: () => set({ 
    sessionIdeas: [],
    savedIdeaIds: new Set(),
    savedIdeaDbIds: new Map(),
  }),
  
  setCurrentMode: (mode) => set({ currentMode: mode }),
  
  setFocusArea: (area) => set({ focusArea: area }),
  
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
}));
