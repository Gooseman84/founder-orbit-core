// XP engine for leveling and progress tracking

import { supabase } from "@/integrations/supabase/client";
import { XpEvent, XpSummary, LEVELS } from "@/types/xp";

/**
 * Record an XP event to the database
 * @param userId - The user's ID
 * @param eventType - Type of event (e.g., 'task_completed', 'idea_generated')
 * @param amount - Amount of XP to award
 * @param metadata - Optional additional data about the event
 */
export async function recordXpEvent(
  userId: string,
  eventType: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<void> {
  // Ignore if amount is 0 or negative
  if (amount <= 0) {
    return;
  }

  try {
    const { error } = await supabase
      .from("xp_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        amount,
        metadata: metadata || null,
      });

    if (error) {
      console.error("Error recording XP event:", error);
      return;
    }

    console.log(`Recorded ${amount} XP for ${eventType} to user ${userId}`);
  } catch (error) {
    console.error("Error in recordXpEvent:", error);
  }
}

/**
 * Get level info for a given XP amount
 * @param totalXp - Total XP amount
 * @returns Level info with progress
 */
export function getLevelForXp(totalXp: number): {
  level: number;
  nextLevelXp: number;
  currentLevelMinXp: number;
  progressPercent: number;
} {
  // Find the highest level where minXp <= totalXp
  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      break;
    }
  }

  // Find next level
  const currentIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  const nextLevel = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

  // Calculate progress
  let progressPercent = 100;
  if (nextLevel) {
    const xpInCurrentLevel = totalXp - currentLevel.minXp;
    const xpNeededForNextLevel = nextLevel.minXp - currentLevel.minXp;
    progressPercent = Math.min(Math.max((xpInCurrentLevel / xpNeededForNextLevel) * 100, 0), 100);
  }

  return {
    level: currentLevel.level,
    nextLevelXp: nextLevel ? nextLevel.minXp : currentLevel.maxXp,
    currentLevelMinXp: currentLevel.minXp,
    progressPercent,
  };
}

/**
 * Get comprehensive XP summary for a user
 * @param userId - The user's ID
 * @returns XP summary with total XP, current level, and progress
 */
export async function getXpSummary(userId: string): Promise<XpSummary> {
  try {
    // Use the database function to get total XP
    const { data, error } = await supabase.rpc("get_user_total_xp", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user XP:", error);
      return {
        totalXp: 0,
        level: 1,
        nextLevelXp: LEVELS[1].minXp,
        currentLevelMinXp: LEVELS[0].minXp,
        progressPercent: 0,
      };
    }

    const totalXp = data || 0;
    const levelInfo = getLevelForXp(totalXp);

    return {
      totalXp,
      ...levelInfo,
    };
  } catch (error) {
    console.error("Error in getXpSummary:", error);
    return {
      totalXp: 0,
      level: 1,
      nextLevelXp: LEVELS[1].minXp,
      currentLevelMinXp: LEVELS[0].minXp,
      progressPercent: 0,
    };
  }
}

/**
 * Get recent XP events for a user
 * @param userId - The user's ID
 * @param limit - Maximum number of events to return (default: 10)
 * @returns Array of XP events, newest first
 */
export async function getRecentXpEvents(
  userId: string,
  limit: number = 10
): Promise<XpEvent[]> {
  try {
    const { data, error } = await supabase
      .from("xp_events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching XP events:", error);
      return [];
    }

    return (data || []) as XpEvent[];
  } catch (error) {
    console.error("Error in getRecentXpEvents:", error);
    return [];
  }
}
