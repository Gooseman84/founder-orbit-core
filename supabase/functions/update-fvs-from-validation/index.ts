import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[update-fvs-from-validation] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    // === JWT Authentication ===
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    log("Authenticated", { userId });

    const { venture_id, fvs_delta, confidence_shift } = await req.json();
    if (!venture_id || !fvs_delta) {
      return new Response(
        JSON.stringify({ error: "venture_id and fvs_delta are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch current FVS
    const { data: fvs, error: fvsError } = await admin
      .from("financial_viability_scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fvsError || !fvs) {
      log("No FVS found", { error: fvsError });
      return new Response(
        JSON.stringify({ error: "No FVS record found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply 30% weighted blend
    const validDimensions = [
      "marketSize", "unitEconomics", "timeToRevenue",
      "competitiveDensity", "capitalRequirements", "founderMarketFit",
    ];

    const weights: Record<string, number> = {
      marketSize: 0.20,
      unitEconomics: 0.25,
      timeToRevenue: 0.15,
      competitiveDensity: 0.15,
      capitalRequirements: 0.15,
      founderMarketFit: 0.10,
    };

    const currentDims = (fvs.dimensions || {}) as Record<string, any>;
    const updatedDims = { ...currentDims };
    let compositeShift = 0;

    for (const [dim, rawDelta] of Object.entries(fvs_delta)) {
      if (!validDimensions.includes(dim) || typeof rawDelta !== "number") continue;
      const delta = Math.max(-20, Math.min(20, Math.round(rawDelta)));
      const weightedDelta = Math.round(delta * 0.30);

      if (updatedDims[dim]) {
        const oldScore = updatedDims[dim].score || 50;
        const newScore = Math.max(0, Math.min(100, oldScore + weightedDelta));
        updatedDims[dim] = {
          ...updatedDims[dim],
          score: newScore,
          rationale: updatedDims[dim].rationale +
            ` [Validation: ${delta > 0 ? "+" : ""}${delta} applied at 30% → ${weightedDelta > 0 ? "+" : ""}${weightedDelta}]`,
        };
        compositeShift += weightedDelta * (weights[dim] || 0.15);
      }
    }

    const newComposite = Math.max(0, Math.min(100, Math.round((fvs.composite_score || 0) + compositeShift)));

    const { error: updateError } = await admin
      .from("financial_viability_scores")
      .update({
        dimensions: updatedDims,
        composite_score: newComposite,
      })
      .eq("id", fvs.id);

    if (updateError) {
      log("FVS update error", { error: updateError });
      throw new Error("Failed to update FVS");
    }

    log("FVS updated", { newComposite, confidence_shift });

    return new Response(
      JSON.stringify({
        updated_scores: updatedDims,
        composite_score: newComposite,
        confidence_shift: confidence_shift || "early_signal",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
