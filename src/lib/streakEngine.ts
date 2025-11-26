import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isToday, isYesterday, parseISO } from "date-fns";

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
