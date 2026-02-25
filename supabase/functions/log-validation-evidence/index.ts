import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[log-validation-evidence] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

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

    const { session_id, venture_id, mission_id, evidence_type, raw_notes, guided_answers } =
      await req.json();

    if (!session_id || !venture_id || !evidence_type || !raw_notes) {
      return new Response(
        JSON.stringify({ error: "session_id, venture_id, evidence_type, and raw_notes are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Request parsed", { session_id, venture_id, mission_id, evidence_type });

    // === Call AI to extract structured insights ===
    const systemPrompt = `You are an evidence analysis engine for startup validation. Given a founder's raw observation notes and guided answers, extract structured insights.

The 6 FVS (Financial Viability Score) dimensions are:
- marketSize: TAM/SAM/SOM, market growth signals
- unitEconomics: pricing, margins, CAC, LTV indicators
- timeToRevenue: speed to first dollar, monetization readiness
- competitiveDensity: competitor landscape, defensibility signals
- capitalRequirements: investment needed, bootstrappability
- founderMarketFit: founder's access, expertise, and network in this market

Analyze the evidence and return ONLY valid JSON with this structure:
{
  "key_insight": "One sentence summary of the most important thing learned",
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "fvs_dimension": "one of: marketSize, unitEconomics, timeToRevenue, competitiveDensity, capitalRequirements, founderMarketFit",
  "signal_strength": <1-5 integer, where 1=vague/anecdotal, 5=specific/actionable/from target customer>,
  "contradicts_assumption": <true|false>,
  "assumption_reference": "If contradicts_assumption is true, describe which assumption is being challenged. Otherwise empty string."
}

Rules:
- fvs_dimension must be the dimension this evidence MOST directly affects
- signal_strength should be high (4-5) only if evidence is from a target customer, includes specific numbers, or describes concrete behavior
- contradicts_assumption should be true if the guided answers indicate the evidence challenged the original hypothesis
- Do NOT wrap in markdown code blocks`;

    const userPrompt = `EVIDENCE TYPE: ${evidence_type}

RAW NOTES:
${raw_notes}

GUIDED ANSWERS:
- Key learning: ${guided_answers?.key_learning || "Not provided"}
- Confirms or challenges assumption: ${guided_answers?.confirms_or_challenges || "Not provided"}
- Next action: ${guided_answers?.next_action || "Not provided"}`;

    log("Calling AI Gateway");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      log("AI Gateway error", { status, error: errorText });
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("No content in AI response");

    log("AI response received", { contentLength: rawContent.length });

    let parsed: {
      key_insight: string;
      sentiment: string;
      fvs_dimension: string;
      signal_strength: number;
      contradicts_assumption: boolean;
      assumption_reference: string;
    };
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Failed to parse AI response as JSON");
      parsed = JSON.parse(match[0]);
    }

    // Clamp signal_strength
    parsed.signal_strength = Math.max(1, Math.min(5, Math.round(parsed.signal_strength)));

    // Validate fvs_dimension
    const validDimensions = [
      "marketSize", "unitEconomics", "timeToRevenue",
      "competitiveDensity", "capitalRequirements", "founderMarketFit",
    ];
    if (!validDimensions.includes(parsed.fvs_dimension)) {
      parsed.fvs_dimension = "marketSize"; // safe fallback
    }

    log("AI parsed", { dimension: parsed.fvs_dimension, sentiment: parsed.sentiment });

    // === Insert evidence record ===
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: evidence, error: insertError } = await admin
      .from("validation_evidence")
      .insert({
        session_id,
        venture_id,
        user_id: userId,
        evidence_type,
        raw_notes,
        guided_answers,
        key_insight: parsed.key_insight,
        sentiment: parsed.sentiment,
        fvs_dimension: parsed.fvs_dimension,
        signal_strength: parsed.signal_strength,
        contradicts_assumption: parsed.contradicts_assumption,
        assumption_reference: parsed.contradicts_assumption
          ? parsed.assumption_reference
          : null,
      })
      .select()
      .single();

    if (insertError) {
      log("Insert error", { error: insertError });
      throw new Error("Failed to insert evidence");
    }

    log("Evidence inserted", { evidenceId: evidence.id });

    // === Fire detect-founder-patterns (non-blocking) ===
    try {
      const detectUrl = `${supabaseUrl}/functions/v1/detect-founder-patterns`;
      fetch(detectUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ venture_id, user_id: userId }),
      }).catch((e) => log("detect-founder-patterns fire-and-forget error", { error: String(e) }));
    } catch (e) {
      log("detect-founder-patterns trigger error (non-fatal)", { error: String(e) });
    }

    return new Response(JSON.stringify(evidence), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
