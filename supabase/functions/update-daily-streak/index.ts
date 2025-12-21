import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { format, subDays, isToday, isYesterday, parseISO } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Badge definitions
const BADGE_DEFINITIONS = [
  {
    badge_code: "streak_3",
    title: "3-Day Streak",
    description: "You kept the momentum for 3 days!",
    icon: "🔥",
    xp_reward: 30,
    checkTrigger: (stats: any) => (stats.current_streak || 0) >= 3,
  },
  {
    badge_code: "streak_7",
    title: "7-Day Streak",
    description: "One full week of growth!",
    icon: "⚡",
    xp_reward: 50,
    checkTrigger: (stats: any) => (stats.current_streak || 0) >= 7,
  },
  {
    badge_code: "streak_30",
    title: "30-Day Streak",
    description: "A month of consistency!",
    icon: "🌙",
    xp_reward: 100,
    checkTrigger: (stats: any) => (stats.current_streak || 0) >= 30,
  },
  {
    badge_code: "task_master_10",
    title: "Task Master",
    description: "Completed 10 tasks.",
    icon: "🛠️",
    xp_reward: 40,
    checkTrigger: (stats: any) => (stats.tasks_completed || 0) >= 10,
  },
  {
    badge_code: "task_champion_50",
    title: "Task Champion",
    description: "Completed 50 tasks!",
    icon: "🏆",
    xp_reward: 100,
    checkTrigger: (stats: any) => (stats.tasks_completed || 0) >= 50,
  },
  {
    badge_code: "xp_500",
    title: "Rising Star",
    description: "Earned 500 XP!",
    icon: "⭐",
    xp_reward: 50,
    checkTrigger: (stats: any) => (stats.xp_total || 0) >= 500,
  },
  {
    badge_code: "xp_1000",
    title: "Power User",
    description: "Earned 1000 XP!",
    icon: "💎",
    xp_reward: 100,
    checkTrigger: (stats: any) => (stats.xp_total || 0) >= 1000,
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get('Authorization') ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('[update-daily-streak] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('[update-daily-streak] Processing for authenticated userId:', userId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Ensure streak row exists
    console.log('[update-daily-streak] Ensuring streak row exists...');
    await ensureStreakRow(supabase, userId);

    // Mark day complete
    console.log('[update-daily-streak] Marking day complete...');
    const streak = await markDayComplete(supabase, userId);
    console.log('[update-daily-streak] Updated streak:', streak);

    // Award XP for daily streak check-in
    console.log('[update-daily-streak] Recording XP for daily streak check...');
    await recordXpEvent(supabase, userId, "daily_streak_check", 10, { 
      current_streak: streak.current_streak 
    });

    // Load user stats
    console.log('[update-daily-streak] Loading user stats...');
    const stats = await loadUserStats(supabase, userId, streak.current_streak);
    console.log('[update-daily-streak] User stats:', stats);

    // Check and award badges
    console.log('[update-daily-streak] Checking for badges...');
    const badgesEarned = await checkAndAwardBadges(supabase, userId, stats);
    console.log('[update-daily-streak] Badges earned:', badgesEarned.length);

    return new Response(
      JSON.stringify({ 
        streak,
        badgesEarned 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[update-daily-streak] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions

async function ensureStreakRow(supabase: any, userId: string) {
  const { data: existing } = await supabase
    .from("daily_streaks")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error } = await supabase
    .from("daily_streaks")
    .insert({
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      last_completed_date: null,
    });

  if (error) {
    console.error('[ensureStreakRow] Error creating streak row:', error);
    throw error;
  }
}

async function markDayComplete(supabase: any, userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Get current streak
  const { data: streak } = await supabase
    .from("daily_streaks")
    .select("current_streak, longest_streak, last_completed_date")
    .eq("user_id", userId)
    .single();

  if (!streak) {
    throw new Error('Streak row not found');
  }

  // Check if already completed today
  if (streak.last_completed_date === today) {
    return streak;
  }

  let newCurrentStreak = streak.current_streak;
  let newLongestStreak = streak.longest_streak;

  // Check if last completed was yesterday
  const lastDate = streak.last_completed_date ? parseISO(streak.last_completed_date) : null;
  
  if (lastDate && isYesterday(lastDate)) {
    newCurrentStreak = streak.current_streak + 1;
  } else if (lastDate && isToday(lastDate)) {
    return streak;
  } else {
    newCurrentStreak = 1;
  }

  newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);

  // Update in database
  const { data: updated, error } = await supabase
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
    console.error('[markDayComplete] Error updating streak:', error);
    throw error;
  }

  return updated;
}

async function loadUserStats(supabase: any, userId: string, currentStreak: number) {
  // Get tasks completed count
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed");

  if (tasksError) {
    console.error('[loadUserStats] Error loading tasks:', tasksError);
  }

  // Get total XP
  const { data: xpEvents, error: xpError } = await supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);

  if (xpError) {
    console.error('[loadUserStats] Error loading XP:', xpError);
  }

  const xpTotal = xpEvents?.reduce((sum: number, event: any) => sum + event.amount, 0) || 0;

  return {
    current_streak: currentStreak,
    tasks_completed: tasks?.length || 0,
    xp_total: xpTotal,
  };
}

async function recordXpEvent(
  supabase: any,
  userId: string,
  eventType: string,
  amount: number,
  metadata: any
) {
  if (amount <= 0) {
    console.log(`[recordXpEvent] Skipping event with amount <= 0: ${amount}`);
    return;
  }

  const { error } = await supabase
    .from("xp_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      amount: amount,
      metadata: metadata,
    });

  if (error) {
    console.error('[recordXpEvent] Error recording XP:', error);
    throw error;
  }

  console.log(`[recordXpEvent] Recorded ${amount} XP for ${eventType}`);
}

async function checkAndAwardBadges(supabase: any, userId: string, stats: any) {
  const newlyEarned = [];

  for (const def of BADGE_DEFINITIONS) {
    // Check if criteria met
    if (!def.checkTrigger(stats)) {
      continue;
    }

    // Get badge from database
    const { data: badge } = await supabase
      .from("badges")
      .select("*")
      .eq("badge_code", def.badge_code)
      .maybeSingle();

    if (!badge) {
      console.log(`[checkAndAwardBadges] Badge ${def.badge_code} not found in database`);
      continue;
    }

    // Check if already earned
    const { data: existing } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_id", badge.id)
      .maybeSingle();

    if (existing) {
      continue;
    }

    // Award badge
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
        earned_at
      `)
      .single();

    if (insertError) {
      console.error(`[checkAndAwardBadges] Error awarding badge ${def.badge_code}:`, insertError);
      continue;
    }

    // Record XP event for badge
    await recordXpEvent(supabase, userId, "badge_earned", badge.xp_reward, {
      badge_code: def.badge_code,
      badge_title: badge.title,
    });

    newlyEarned.push({
      ...userBadge,
      badge: badge,
    });
  }

  return newlyEarned;
}
