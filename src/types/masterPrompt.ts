// Master Prompt Platform Modes
export type PlatformMode = 'strategy' | 'lovable' | 'cursor' | 'v0';

// Master Prompt Data from database
export interface MasterPromptData {
  id: string;
  user_id: string;
  idea_id: string;
  prompt_body: string;
  platform_target: string | null;
  platform_mode: PlatformMode;
  context_hash: string | null;
  source_updated_at: string | null;
  created_at: string;
}

// Context for generating master prompts
export interface MasterPromptContext {
  // Core (existing)
  founderProfile: any;
  chosenIdea: any;
  ideaAnalysis: any;
  
  // Extended context (new)
  extendedIntake: any | null;
  recentDocs: Array<{
    title: string;
    content: string | null;
    updated_at: string;
    doc_type: string | null;
  }>;
  recentReflections: Array<{
    reflection_date: string;
    energy_level: number | null;
    stress_level: number | null;
    mood_tags: string[] | null;
    ai_theme: string | null;
    blockers: string | null;
    what_did: string | null;
  }>;
  recentTasks: Array<{
    title: string;
    category: string | null;
    completed_at: string | null;
  }>;
  streakData: {
    current_streak: number;
    longest_streak: number;
  } | null;
  totalXp: number;
  blueprintSummary: {
    ai_summary: string | null;
    validation_stage: string | null;
    north_star_one_liner: string | null;
    updated_at: string | null;
  } | null;
  
  // Computed summaries
  executionState: {
    topDocs: string[];
    topBlockers: string[];
    topWins: string[];
    energyTrend: number | null;
    stressTrend: number | null;
  };
}

// Platform mode labels for UI
export const PLATFORM_MODE_LABELS: Record<PlatformMode, string> = {
  strategy: 'Strategy Prompt',
  lovable: 'Lovable Build',
  cursor: 'Cursor Build',
  v0: 'v0 UI',
};

// Platform mode descriptions
export const PLATFORM_MODE_DESCRIPTIONS: Record<PlatformMode, string> = {
  strategy: 'AI coaching & strategic guidance',
  lovable: 'Full-stack MVP build prompt',
  cursor: 'IDE-optimized code generation',
  v0: 'UI component generation',
};
