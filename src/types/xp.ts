// Type definitions for XP system, leveling, and achievements

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: string;
  amount: number;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface LevelDefinition {
  level: number;
  minXp: number;
  maxXp: number;
  title: string;
}

export interface XpSummary {
  totalXp: number;
  level: number;
  nextLevelXp: number;
  currentLevelMinXp: number;
  progressPercent: number; // 0-100
}

// Event types for XP rewards
export const XP_EVENT_TYPES = {
  PROFILE_COMPLETED: 'profile_completed',
  IDEA_GENERATED: 'idea_generated',
  IDEA_ANALYZED: 'idea_analyzed',
  IDEA_CHOSEN: 'idea_chosen',
  TASK_COMPLETED: 'task_completed',
  FEED_VIEW: 'feed_view',
  DAILY_CHECK_IN: 'daily_check_in',
  MASTER_PROMPT_GENERATED: 'master_prompt_generated',
} as const;

export type XpEventType = typeof XP_EVENT_TYPES[keyof typeof XP_EVENT_TYPES];

// Level progression: exponential growth with milestone titles
export const LEVELS: LevelDefinition[] = [
  { level: 1, minXp: 0, maxXp: 100, title: 'Aspiring Founder' },
  { level: 2, minXp: 100, maxXp: 250, title: 'Ideation Explorer' },
  { level: 3, minXp: 250, maxXp: 500, title: 'Market Researcher' },
  { level: 4, minXp: 500, maxXp: 1000, title: 'Validated Visionary' },
  { level: 5, minXp: 1000, maxXp: 1750, title: 'Strategic Builder' },
  { level: 6, minXp: 1750, maxXp: 2750, title: 'MVP Architect' },
  { level: 7, minXp: 2750, maxXp: 4000, title: 'Launch Ready' },
  { level: 8, minXp: 4000, maxXp: 5500, title: 'Growth Hacker' },
  { level: 9, minXp: 5500, maxXp: 7500, title: 'Scale Master' },
  { level: 10, minXp: 7500, maxXp: 10000, title: 'Seasoned Entrepreneur' },
];

// Standard XP rewards for different actions
export const XP_REWARDS = {
  PROFILE_COMPLETED: 50,
  IDEA_GENERATED: 10,
  IDEA_ANALYZED: 25,
  IDEA_CHOSEN: 100,
  TASK_COMPLETED_BASE: 15, // Base amount, actual varies by task
  FEED_VIEW: 2,
  DAILY_CHECK_IN: 20,
  MASTER_PROMPT_GENERATED: 75,
} as const;
