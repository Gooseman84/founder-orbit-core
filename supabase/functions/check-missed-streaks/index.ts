import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { format, subDays, parseISO } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[check-missed-streaks] Starting streak check...');

    // Calculate yesterday's date
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    console.log('[check-missed-streaks] Checking for streaks older than:', yesterday);

    // Get all streaks where last_completed_date is before yesterday
    const { data: streaks, error: fetchError } = await supabase
      .from("daily_streaks")
      .select("id, user_id, current_streak, last_completed_date")
      .not("last_completed_date", "is", null)
      .lt("last_completed_date", yesterday)
      .gt("current_streak", 0);

    if (fetchError) {
      console.error('[check-missed-streaks] Error fetching streaks:', fetchError);
      throw fetchError;
    }

    console.log(`[check-missed-streaks] Found ${streaks?.length || 0} streaks to reset`);

    if (!streaks || streaks.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No streaks to reset',
          resetsCount: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Reset current_streak to 0 for all affected users
    const userIds = streaks.map(s => s.user_id);
    
    const { error: updateError } = await supabase
      .from("daily_streaks")
      .update({ 
        current_streak: 0,
        updated_at: new Date().toISOString()
      })
      .in("user_id", userIds);

    if (updateError) {
      console.error('[check-missed-streaks] Error updating streaks:', updateError);
      throw updateError;
    }

    console.log(`[check-missed-streaks] Successfully reset ${streaks.length} streaks`);

    // Log details of reset streaks
    streaks.forEach(streak => {
      console.log(`[check-missed-streaks] Reset streak for user ${streak.user_id}: was ${streak.current_streak} days, last completed ${streak.last_completed_date}`);
    });

    return new Response(
      JSON.stringify({ 
        message: 'Streaks reset successfully',
        resetsCount: streaks.length,
        resetUsers: streaks.map(s => ({
          userId: s.user_id,
          previousStreak: s.current_streak,
          lastCompletedDate: s.last_completed_date
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[check-missed-streaks] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
