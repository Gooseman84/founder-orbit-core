// log-revenue-event
// Inserts a revenue event. Advances derived stage automatically.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
    if (error || !user) return j({ error: "Invalid token" }, 401);

    const { ventureId, amountCents, sourceChannel, notes, occurredAt, conversationId } = await req.json();
    if (!ventureId) return j({ error: "ventureId required" }, 400);
    if (!Number.isInteger(amountCents) || amountCents <= 0) return j({ error: "amountCents must be positive integer" }, 400);

    const { data: mpId, error: mpErr } = await supabase.rpc("ensure_money_path", { p_venture_id: ventureId });
    if (mpErr || !mpId) return j({ error: "money path unavailable" }, 404);

    const insert = await supabase.from("revenue_events").insert({
      user_id: user.id,
      money_path_id: mpId,
      amount_cents: amountCents,
      source_channel: sourceChannel ?? null,
      notes: notes ?? null,
      occurred_at: occurredAt ?? new Date().toISOString(),
    }).select().maybeSingle();
    if (insert.error) return j({ error: insert.error.message }, 400);

    // Link conversation → revenue if provided.
    if (conversationId) {
      await supabase.from("buyer_conversations")
        .update({ status: "won", revenue_event_id: insert.data.id })
        .eq("id", conversationId).eq("user_id", user.id);
    }
    return j({ revenue_event: insert.data });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
