import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('record-xp-event: received');

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get('authorization') ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('record-xp-event: auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse request body - userId is now ignored, we use authenticated user
    const { eventType, amount, metadata } = await req.json();

    if (!eventType) {
      return new Response(
        JSON.stringify({ error: 'eventType is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('record-xp-event: inserting', { userId, eventType, amount });

    // Insert XP event for authenticated user only
    const { data, error } = await supabase
      .from('xp_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        amount: amount,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('record-xp-event: error', error);
      return new Response(
        JSON.stringify({ error: 'Failed to record XP event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('record-xp-event: success', data);

    return new Response(
      JSON.stringify({
        success: true,
        event: data,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('record-xp-event: error', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
