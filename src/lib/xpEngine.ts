// XP engine for leveling and progress tracking

import { supabase } from "@/integrations/supabase/client";
import { XpEvent, XpSummary, Level, LEVELS } from "@/types/xp";

/**
 * Add an XP event to the database
 * @param userId - The user's ID
 * @param eventType - Type of event (e.g., 'task_completed', 'idea_generated')
 * @param amount - Amount of XP to award
 * @param metadata - Optional additional data about the event
 * @returns The created XP event or null if failed
 */
export async function addXpEvent(
  userId: string,
  eventType: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<XpEvent | null> {
  try {
    const { data, error } = await supabase
      .from("xp_events")
      .insert({
        user_id: userId,
        event_type: eventType,
        amount,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding XP event:", error);
      return null;
    }

    console.log(`Added ${amount} XP for ${eventType} to user ${userId}`);
    return data as XpEvent;
  } catch (error) {
    console.error("Error in addXpEvent:", error);
    return null;
  }
}

/**
 * Get the level for a given XP amount
 * @param totalXp - Total XP amount
 * @returns The current level object
 */
export function getLevelForXp(totalXp: number): Level {
  // Find the highest level where minXp <= totalXp
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  // Default to level 1 if somehow below minimum
  return LEVELS[0];
}

/**
 * Get the next level after the current one
 * @param currentLevel - The current level object
 * @returns The next level object or null if at max level
 */
export function getNextLevel(currentLevel: Level): Level | null {
  const currentIndex = LEVELS.findIndex(l => l.level === currentLevel.level);
  if (currentIndex === -1 || currentIndex === LEVELS.length - 1) {
    return null; // At max level
  }
  return LEVELS[currentIndex + 1];
}

/**
 * Calculate progress percentage to the next level
 * @param totalXp - Total XP amount
 * @param currentLevel - Current level object
 * @param nextLevel - Next level object (or null if at max)
 * @returns Progress percentage (0-100)
 */
export function calculateProgressToNextLevel(
  totalXp: number,
  currentLevel: Level,
  nextLevel: Level | null
): number {
  if (!nextLevel) {
    return 100; // At max level
  }

  const xpInCurrentLevel = totalXp - currentLevel.minXp;
  const xpNeededForNextLevel = nextLevel.minXp - currentLevel.minXp;
  
  const progress = (xpInCurrentLevel / xpNeededForNextLevel) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
}

/**
 * Get a comprehensive XP summary for a user
 * @param userId - The user's ID
 * @returns XP summary with total XP, current level, progress, etc.
 */
export async function getUserXpSummary(userId: string): Promise<XpSummary | null> {
  try {
    // Use the database function to get total XP
    const { data, error } = await supabase.rpc("get_user_total_xp", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user XP:", error);
      return null;
    }

    const totalXp = data || 0;
    const currentLevel = getLevelForXp(totalXp);
    const nextLevel = getNextLevel(currentLevel);
    const progressToNextLevel = calculateProgressToNextLevel(totalXp, currentLevel, nextLevel);
    const xpToNextLevel = nextLevel ? nextLevel.minXp - totalXp : 0;

    return {
      totalXp,
      currentLevel,
      nextLevel,
      progressToNextLevel,
      xpToNextLevel: Math.max(xpToNextLevel, 0),
    };
  } catch (error) {
    console.error("Error in getUserXpSummary:", error);
    return null;
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
