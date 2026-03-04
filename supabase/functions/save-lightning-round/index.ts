import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Lightning Round question keys and their DB column mappings ────────────
// Each question_id maps to one or more founder_profiles columns.

const FIELD_MAPPING: Record<string, string[]> = {
  hours_per_week: ["hours_per_week", "time_per_week"],
  capital_available: ["capital_available"],
  risk_tolerance: ["risk_tolerance"],
  lifestyle_goals: ["lifestyle_goals"],
  success_vision: ["success_vision"],
  work_personality: ["work_personality"],
  creator_platforms: ["creator_platforms"],
  edgy_mode: ["edgy_mode"],
  wants_money_systems: ["wants_money_systems"],
  open_to_personas: ["open_to_personas"],
  open_to_memetic_ideas: ["open_to_memetic_ideas"],
  hell_no_filters: ["hell_no_filters"],
  commitment_level: ["commitment_level"],
};

const REQUIRED_QUESTIONS = [
  "hours_per_week",
  "risk_tolerance",
  "work_personality",
];

// ─── Validation ────────────────────────────────────────────────────────────

const responseSchema = z.object({
  question_id: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
  ]),
});

const bodySchema = z.object({
  interview_id: z.string().uuid(),
  responses: z.array(responseSchema).min(1).max(30),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse & validate body ────────────────────────────────────────────
    const json = await req.json().catch(() => null);
    if (!json) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = bodySchema.parse(json);

    // Check required questions are present
    const answeredIds = new Set(parsed.responses.map((r) => r.question_id));
    const missing = REQUIRED_QUESTIONS.filter((q) => !answeredIds.has(q));
    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Missing required questions: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verify interview belongs to user ─────────────────────────────────
    const { data: interview, error: intError } = await supabase
      .from("founder_interviews")
      .select("id, user_id, status")
      .eq("id", parsed.interview_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (intError || !interview) {
      return new Response(
        JSON.stringify({ error: "Interview not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Build update payload from responses ──────────────────────────────
    const profileUpdate: Record<string, any> = {
      lightning_round_completed_at: new Date().toISOString(),
    };

    // Columns that are integer in the DB and may arrive as string
    const INTEGER_COLUMNS = new Set(["hours_per_week", "commitment_level", "time_per_week"]);

    for (const response of parsed.responses) {
      const columns = FIELD_MAPPING[response.question_id];
      if (!columns) {
        console.warn(`save-lightning-round: unknown question_id "${response.question_id}", skipping`);
        continue;
      }
      for (const col of columns) {
        let val = response.value;
        // Coerce string-encoded numbers to integers for integer columns
        if (INTEGER_COLUMNS.has(col) && typeof val === "string") {
          const parsed = parseInt(val, 10);
          val = isNaN(parsed) ? null : parsed;
        }
        profileUpdate[col] = val;
      }
    }

    // ── Also update the nested profile JSONB ─────────────────────────────
    // Read existing profile blob, merge lightning round data into it
    const { data: existingProfile } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile?.profile) {
      const blob = typeof existingProfile.profile === "object"
        ? existingProfile.profile
        : {};

      // Map lightning round responses into the profile JSONB
      const jsonbUpdates: Record<string, any> = {};
      for (const response of parsed.responses) {
        // Use camelCase keys in the JSONB blob
        const camelKey = snakeToCamel(response.question_id);
        jsonbUpdates[camelKey] = response.value;
      }

      profileUpdate.profile = { ...blob, ...jsonbUpdates, updatedAt: new Date().toISOString() };
    }

    // ── Upsert founder_profiles ──────────────────────────────────────────
    const { error: updateError } = await supabase
      .from("founder_profiles")
      .update(profileUpdate)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("save-lightning-round: update error", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save lightning round data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`save-lightning-round: saved ${parsed.responses.length} responses for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, saved_count: parsed.responses.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("save-lightning-round error:", err);

    if (err instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: err.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
