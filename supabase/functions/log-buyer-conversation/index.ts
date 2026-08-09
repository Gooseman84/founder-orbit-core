// log-buyer-conversation
// Insert or update a buyer_conversations row. Recomputes stage/bottleneck implicitly
// because both are derived views over this table.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID = ["identified","contacted","replied","call_booked","offer_sent","won","lost","ghosted"] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
    if (error || !user) return j({ error: "Invalid token" }, 401);

    const body = await req.json();
    const { ventureId, id, handle, channel, status, notes, outcome } = body;
    if (!ventureId) return j({ error: "ventureId required" }, 400);
    if (status && !VALID.includes(status)) return j({ error: "invalid status" }, 400);

    // SECURITY DEFINER RPC derives owner from auth.uid() — needs the caller's JWT.
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: mpId, error: mpErr } = await userClient.rpc("ensure_money_path", { p_venture_id: ventureId });
    if (mpErr || !mpId) return j({ error: "money path unavailable" }, 404);

    const row: Record<string, unknown> = {
      user_id: user.id,
      money_path_id: mpId,
      last_activity_at: new Date().toISOString(),
    };
    if (handle !== undefined) row.handle = handle;
    if (channel !== undefined) row.channel = channel;
    if (status !== undefined) row.status = status;
    if (notes !== undefined) row.notes = notes;
    if (outcome !== undefined) row.outcome = outcome;

    let result;
    if (id) {
      result = await supabase.from("buyer_conversations").update(row).eq("id", id).eq("user_id", user.id).select().maybeSingle();
    } else {
      if (!row.status) row.status = "identified";
      result = await supabase.from("buyer_conversations").insert(row).select().maybeSingle();
    }
    if (result.error) return j({ error: result.error.message }, 400);
    return j({ conversation: result.data });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
