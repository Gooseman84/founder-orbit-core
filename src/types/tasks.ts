// Type definitions for tasks, quests, and micro-actions

export interface TaskContext {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
}
