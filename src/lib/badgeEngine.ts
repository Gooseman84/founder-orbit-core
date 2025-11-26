import { supabase } from "@/integrations/supabase/client";
import { recordXpEvent } from "./xpEngine";

export interface BadgeDefinition {
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  checkTrigger: (stats: UserStats) => boolean;
}

export interface UserStats {
  current_streak?: number;
  tasks_completed?: number;
  xp_total?: number;
  ideas_generated?: number;
  workspace_docs?: number;
}

export interface Badge {
  id: string;
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    badge_code: "streak_3",
    title: "3-Day Streak",
    description: "You kept the momentum for 3 days!",
    icon: "🔥",
    xp_reward: 30,
    checkTrigger: (stats) => (stats.current_streak || 0) >= 3,
  },
  {
    badge_code: "streak_7",
    title: "7-Day Streak",
    description: "One full week of growth!",
    icon: "⚡",
    xp_reward: 50,
    checkTrigger: (stats) => (stats.current_streak || 0) >= 7,
  },
  {
    badge_code: "streak_30",
    title: "30-Day Streak",
    description: "A month of consistency!",
    icon: "🌙",
    xp_reward: 100,
    checkTrigger: (stats) => (stats.current_streak || 0) >= 30,
  },
  {
    badge_code: "task_master_10",
    title: "Task Master",
    description: "Completed 10 tasks.",
    icon: "🛠️",
    xp_reward: 40,
    checkTrigger: (stats) => (stats.tasks_completed || 0) >= 10,
  },
  {
    badge_code: "task_champion_50",
    title: "Task Champion",
    description: "Completed 50 tasks!",
    icon: "🏆",
    xp_reward: 100,
    checkTrigger: (stats) => (stats.tasks_completed || 0) >= 50,
  },
  {
    badge_code: "idea_generator",
    title: "Idea Generator",
    description: "Generated your first batch of ideas.",
    icon: "💡",
    xp_reward: 25,
    checkTrigger: (stats) => (stats.ideas_generated || 0) >= 1,
  },
  {
    badge_code: "xp_500",
    title: "Rising Star",
    description: "Earned 500 XP!",
    icon: "⭐",
    xp_reward: 50,
    checkTrigger: (stats) => (stats.xp_total || 0) >= 500,
  },
  {
    badge_code: "xp_1000",
    title: "Power User",
    description: "Earned 1000 XP!",
    icon: "💎",
    xp_reward: 100,
    checkTrigger: (stats) => (stats.xp_total || 0) >= 1000,
  },
];

/**
 * Seed badge definitions into the badges table
 * Call this once during setup
 */
export async function seedBadges(): Promise<void> {
  for (const def of BADGE_DEFINITIONS) {
    const { error } = await supabase
      .from("badges")
      .upsert(
        {
          badge_code: def.badge_code,
          title: def.title,
          description: def.description,
          icon: def.icon,
          xp_reward: def.xp_reward,
        },
        { onConflict: "badge_code" }
      );

    if (error) {
      console.error(`Error seeding badge ${def.badge_code}:`, error);
    }
  }
}

/**
 * Get a badge definition by code
 */
export function getBadgeDefinition(badgeCode: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((def) => def.badge_code === badgeCode);
}

/**
 * Get all badges from the database
 */
export async function getAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .order("xp_reward", { ascending: true });

  if (error) {
    console.error("Error fetching badges:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get user's earned badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const { data, error } = await supabase
    .from("user_badges")
    .select(`
      id,
      user_id,
      badge_id,
      earned_at,
      badge:badges(*)
    `)
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) {
    console.error("Error fetching user badges:", error);
    throw error;
  }

  return data || [];
}

/**
 * Check if user has already earned a specific badge
 */
async function hasBadge(userId: string, badgeCode: string): Promise<boolean> {
  const { data: badge } = await supabase
    .from("badges")
    .select("id")
    .eq("badge_code", badgeCode)
    .maybeSingle();

  if (!badge) return false;

  const { data } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .maybeSingle();

  return !!data;
}

/**
 * Award a badge to a user
 */
async function awardBadge(userId: string, badgeCode: string): Promise<UserBadge | null> {
  // Get badge from database
  const { data: badge, error: badgeError } = await supabase
    .from("badges")
    .select("*")
    .eq("badge_code", badgeCode)
    .single();

  if (badgeError || !badge) {
    console.error(`Badge ${badgeCode} not found in database:`, badgeError);
    return null;
  }

  // Insert user_badge via edge function (service role)
  const { data: userBadge, error: insertError } = await supabase
    .from("user_badges")
    .insert({
      user_id: userId,
      badge_id: badge.id,
    })
    .select(`
      id,
      user_id,
      badge_id,
      earned_at,
      badge:badges(*)
    `)
    .single();

  if (insertError) {
    console.error(`Error awarding badge ${badgeCode}:`, insertError);
    return null;
  }

  // Award XP
  try {
    await recordXpEvent(userId, "badge_earned", badge.xp_reward, {
      badge_code: badgeCode,
      badge_title: badge.title,
    });
  } catch (xpError) {
    console.error("Error recording XP for badge:", xpError);
  }

  return userBadge;
}

/**
 * Check and award badges based on user stats
 * Returns newly earned badges
 */
export async function checkAndAwardBadges(
  userId: string,
  stats: UserStats
): Promise<UserBadge[]> {
  const newlyEarned: UserBadge[] = [];

  for (const def of BADGE_DEFINITIONS) {
    // Check if criteria met
    if (!def.checkTrigger(stats)) {
      continue;
    }

    // Check if already earned
    const alreadyHas = await hasBadge(userId, def.badge_code);
    if (alreadyHas) {
      continue;
    }

    // Award badge
    const awarded = await awardBadge(userId, def.badge_code);
    if (awarded) {
      newlyEarned.push(awarded);
    }
  }

  return newlyEarned;
}
