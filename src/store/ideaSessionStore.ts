// Zustand store for session-level v6 idea persistence
import { create } from "zustand";
import type { BusinessIdeaV6 } from "@/types/businessIdea";
import type { IdeaGenerationMode } from "@/types/idea";

interface IdeaSessionState {
  sessionIdeas: BusinessIdeaV6[];
  currentMode: IdeaGenerationMode | null;
  focusArea: string;
  
  // Actions
  setSessionIdeas: (ideas: BusinessIdeaV6[]) => void;
  addSessionIdeas: (ideas: BusinessIdeaV6[]) => void;
  clearSessionIdeas: () => void;
  setCurrentMode: (mode: IdeaGenerationMode | null) => void;
  setFocusArea: (area: string) => void;
}

export const useIdeaSessionStore = create<IdeaSessionState>((set) => ({
  sessionIdeas: [],
  currentMode: null,
  focusArea: "",

  setSessionIdeas: (ideas) => set({ sessionIdeas: ideas }),
  
  addSessionIdeas: (ideas) => set((state) => ({ 
    sessionIdeas: [...state.sessionIdeas, ...ideas] 
  })),
  
  clearSessionIdeas: () => set({ sessionIdeas: [] }),
  
  setCurrentMode: (mode) => set({ currentMode: mode }),
  
  setFocusArea: (area) => set({ focusArea: area }),
}));
