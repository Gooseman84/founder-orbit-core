// Type definitions for XP system, leveling, and achievements

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: string;
  amount: number;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface Level {
  level: number;
  minXp: number;
  maxXp: number;
  title: string;
}

export interface XpSummary {
  totalXp: number;
  currentLevel: Level;
  nextLevel: Level | null;
  progressToNextLevel: number; // 0-100 percentage
  xpToNextLevel: number;
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
export const LEVELS: Level[] = [
  { level: 1, minXp: 0, maxXp: 100, title: 'Aspiring Founder' },
  { level: 2, minXp: 100, maxXp: 250, title: 'Ideation Explorer' },
  { level: 3, minXp: 250, maxXp: 500, title: 'Market Researcher' },
  { level: 4, minXp: 500, maxXp: 850, title: 'Validated Visionary' },
  { level: 5, minXp: 850, maxXp: 1300, title: 'Strategic Builder' },
  { level: 6, minXp: 1300, maxXp: 1900, title: 'MVP Architect' },
  { level: 7, minXp: 1900, maxXp: 2650, title: 'Launch Ready' },
  { level: 8, minXp: 2650, maxXp: 3600, title: 'Growth Hacker' },
  { level: 9, minXp: 3600, maxXp: 4800, title: 'Scale Master' },
  { level: 10, minXp: 4800, maxXp: 6300, title: 'Seasoned Entrepreneur' },
  { level: 11, minXp: 6300, maxXp: 8200, title: 'Industry Leader' },
  { level: 12, minXp: 8200, maxXp: 10500, title: 'Ecosystem Builder' },
  { level: 13, minXp: 10500, maxXp: 13300, title: 'Innovation Pioneer' },
  { level: 14, minXp: 13300, maxXp: 16700, title: 'Venture Expert' },
  { level: 15, minXp: 16700, maxXp: 20700, title: 'Legendary Founder' },
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
