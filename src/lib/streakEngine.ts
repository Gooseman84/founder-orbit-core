import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isToday, isYesterday, parseISO, differenceInDays } from "date-fns";

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

/**
 * Get the user's current streak data
 */
export async function getUserStreak(userId: string): Promise<StreakData> {
  const { data, error } = await supabase
    .from("daily_streaks")
    .select("current_streak, longest_streak, last_completed_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user streak:", error);
    throw error;
  }

  if (!data) {
    return {
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    };
  }

  return data;
}

/**
 * Ensure a streak row exists for the user
 */
export async function ensureStreakRow(userId: string): Promise<void> {
  const existing = await getUserStreak(userId);
  
  // If data exists (non-zero values or last_completed_date), row already exists
  if (existing.current_streak > 0 || existing.longest_streak > 0 || existing.last_completed_date) {
    return;
  }

  // Check if row exists in DB but with all defaults
  const { data: checkData } = await supabase
    .from("daily_streaks")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (checkData) {
    return; // Row exists
  }

  // Create new row with defaults
  const { error } = await supabase
    .from("daily_streaks")
    .insert({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    });

  if (error) {
    console.error("Error creating streak row:", error);
    throw error;
  }
}

/**
 * Mark today as complete and update streak
 */
export async function markDayComplete(userId: string): Promise<StreakData> {
  await ensureStreakRow(userId);

  const today = format(new Date(), "yyyy-MM-dd");
  const streak = await getUserStreak(userId);

  let newCurrentStreak = streak.current_streak;
  let newLongestStreak = streak.longest_streak;

  // Check if already completed today
  if (streak.last_completed_date === today) {
    return streak; // Already completed, no update needed
  }

  // Check if last completed was yesterday
  const lastDate = streak.last_completed_date ? parseISO(streak.last_completed_date) : null;
  
  if (lastDate && isYesterday(lastDate)) {
    // Continue streak
    newCurrentStreak = streak.current_streak + 1;
  } else if (lastDate && isToday(lastDate)) {
    // Already completed today (shouldn't reach here due to check above)
    return streak;
  } else {
    // Reset streak (missed days or first completion)
    newCurrentStreak = 1;
  }

  // Update longest streak if current is now higher
  newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);

  // Update in database
  const { data, error } = await supabase
    .from("daily_streaks")
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_completed_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("current_streak, longest_streak, last_completed_date")
    .single();

  if (error) {
    console.error("Error updating streak:", error);
    throw error;
  }

  return data;
}

/**
 * Calculate the current reflection streak from daily_reflections table
 * This is the "live" streak based on consecutive days of reflections
 */
export async function calculateReflectionStreak(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Fetch the last 60 days of reflections ordered by date desc
  const { data, error } = await supabase
    .from("daily_reflections")
    .select("reflection_date")
    .eq("user_id", userId)
    .order("reflection_date", { ascending: false })
    .limit(60);

  if (error) {
    console.error("Error calculating reflection streak:", error);
    return 0;
  }

  if (!data || data.length === 0) {
    return 0;
  }

  // Convert to date objects and sort descending
  const dates = data
    .map(r => parseISO(r.reflection_date))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let currentDate = today;

  for (const reflectionDate of dates) {
    reflectionDate.setHours(0, 0, 0, 0);
    const daysDiff = differenceInDays(currentDate, reflectionDate);
    
    if (daysDiff === 0) {
      // Same day - count it
      streak++;
      currentDate = subDays(currentDate, 1);
    } else if (daysDiff === 1) {
      // Yesterday - this is expected, count it
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      // Gap found - stop counting
      break;
    }
  }

  return streak;
}

/**
 * Streak milestone definitions
 */
export const STREAK_MILESTONES = [
  { days: 3, xp: 10, eventType: "daily_reflection_streak_3", emoji: "🔥", message: "3-day streak!" },
  { days: 7, xp: 25, eventType: "daily_reflection_streak_7", emoji: "💪", message: "7-day streak!" },
  { days: 30, xp: 100, eventType: "daily_reflection_streak_30", emoji: "🏆", message: "30-day streak!" },
];

/**
 * Check if a streak milestone bonus has already been awarded
 */
export async function hasReceivedStreakBonus(userId: string, eventType: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("xp_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .limit(1);

  if (error) {
    console.error("Error checking streak bonus:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Get the next milestone the user can earn
 */
export function getNextMilestone(currentStreak: number): typeof STREAK_MILESTONES[0] | null {
  for (const milestone of STREAK_MILESTONES) {
    if (currentStreak < milestone.days) {
      return milestone;
    }
  }
  return null;
}
