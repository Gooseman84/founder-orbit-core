import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[analyze-validation-session] ${step}${d}`);
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

    const { session_id, venture_id } = await req.json();
    if (!session_id || !venture_id) {
      return new Response(
        JSON.stringify({ error: "session_id and venture_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // === Fetch all context in parallel ===
    const [evidenceRes, sessionRes, fvsRes, ventureRes] = await Promise.all([
      admin
        .from("validation_evidence")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      admin
        .from("validation_sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", userId)
        .single(),
      admin
        .from("financial_viability_scores")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("ventures")
        .select("name, status, venture_state, success_metric")
        .eq("id", venture_id)
        .eq("user_id", userId)
        .single(),
    ]);

    const evidenceRows = evidenceRes.data || [];
    const session = sessionRes.data;
    const fvs = fvsRes.data as any;
    const venture = ventureRes.data;

    if (!session) throw new Error("Validation session not found");
    if (!venture) throw new Error("Venture not found");

    log("Context fetched", {
      evidenceCount: evidenceRows.length,
      hasFVS: !!fvs,
    });

    // Tally sentiments
    let positive = 0, negative = 0, neutral = 0;
    for (const e of evidenceRows) {
      if (e.sentiment === "positive") positive++;
      else if (e.sentiment === "negative") negative++;
      else neutral++;
    }

    // Build evidence summary for AI
    const evidenceSummary = evidenceRows.map((e: any, i: number) => {
      return `Evidence ${i + 1}:
  Type: ${e.evidence_type}
  Dimension: ${e.fvs_dimension}
  Insight: ${e.key_insight}
  Sentiment: ${e.sentiment}
  Signal Strength: ${e.signal_strength}/5
  Contradicts Assumption: ${e.contradicts_assumption ? "YES — " + e.assumption_reference : "No"}
  Raw Notes: ${(e.raw_notes || "").slice(0, 300)}`;
    }).join("\n\n");

    const currentDimensions = fvs?.dimensions
      ? JSON.stringify(fvs.dimensions, null, 2)
      : "No current FVS dimensions available";

    // === Call AI ===
    const systemPrompt = `You are Mavrik, a warm but financially grounded startup advisor. You analyze validation evidence and provide actionable synthesis.

The 6 FVS dimensions (exact keys) are:
- marketSize
- unitEconomics
- timeToRevenue
- competitiveDensity
- capitalRequirements
- founderMarketFit

Given all validation evidence for a session plus the current FVS scores, generate a comprehensive analysis.

Return ONLY valid JSON with this structure:
{
  "pattern_summary": "2-3 sentences describing what patterns emerged across all evidence. Reference specific evidence types and dimensions.",
  "advisor_note": "A personal, direct note in Mavrik's voice (warm but financially grounded) telling the founder what the evidence means for their venture. 3-4 sentences. Use 'you' and 'your'. Be honest but encouraging.",
  "recommendation": "persist" | "pivot" | "double_down" | "pause",
  "recommendation_rationale": "One sentence explaining why this recommendation.",
  "fvs_delta": {
    "<dimension_key>": <integer between -20 and +20>,
    ...only include dimensions with actual evidence...
  },
  "confidence_shift": "assumption_based" | "early_signal" | "partially_validated" | "evidence_backed"
}

Guidelines for fvs_delta:
- Only include dimensions that have direct evidence
- Positive delta = evidence supports/strengthens this dimension
- Negative delta = evidence weakens confidence in this dimension  
- Magnitude reflects strength: 1-5 = minor signal, 6-12 = moderate evidence, 13-20 = strong evidence
- Bound between -20 and +20

Guidelines for confidence_shift:
- assumption_based: <3 evidence entries, mostly weak signals
- early_signal: 3-4 entries with at least one strong signal
- partially_validated: 5+ entries with consistent patterns
- evidence_backed: 5+ entries with strong signals and consistent direction

Guidelines for recommendation:
- persist: mixed signals, keep going but stay alert
- pivot: strong negative signals in critical dimensions
- double_down: strong positive signals, evidence supports the thesis
- pause: insufficient or contradictory evidence, need more data`;

    const userPrompt = `VENTURE: ${venture.name}
HYPOTHESIS: ${session.hypothesis}

CURRENT FVS DIMENSIONS:
${currentDimensions}
COMPOSITE SCORE: ${fvs?.composite_score ?? "N/A"}

EVIDENCE SUMMARY (${evidenceRows.length} entries):
Positive: ${positive} | Negative: ${negative} | Neutral/Mixed: ${neutral}

${evidenceSummary}

Analyze all evidence and generate the validation summary.`;

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
        temperature: 0.3,
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
      pattern_summary: string;
      advisor_note: string;
      recommendation: string;
      recommendation_rationale: string;
      fvs_delta: Record<string, number>;
      confidence_shift: string;
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

    // Validate and clamp fvs_delta
    const validDimensions = [
      "marketSize", "unitEconomics", "timeToRevenue",
      "competitiveDensity", "capitalRequirements", "founderMarketFit",
    ];
    const cleanedDelta: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed.fvs_delta || {})) {
      if (validDimensions.includes(key) && typeof val === "number") {
        cleanedDelta[key] = Math.max(-20, Math.min(20, Math.round(val)));
      }
    }

    // Validate recommendation
    const validRecs = ["persist", "pivot", "double_down", "pause"];
    if (!validRecs.includes(parsed.recommendation)) {
      parsed.recommendation = "persist";
    }

    // Validate confidence_shift
    const validShifts = ["assumption_based", "early_signal", "partially_validated", "evidence_backed"];
    if (!validShifts.includes(parsed.confidence_shift)) {
      parsed.confidence_shift = "early_signal";
    }

    log("AI parsed", {
      recommendation: parsed.recommendation,
      confidence: parsed.confidence_shift,
      deltaKeys: Object.keys(cleanedDelta),
    });

    // === Insert validation summary ===
    const recommendationText = `${parsed.recommendation}: ${parsed.recommendation_rationale || ""}`.trim();

    const { data: summary, error: summaryError } = await admin
      .from("validation_summaries")
      .insert({
        session_id,
        venture_id,
        user_id: userId,
        total_evidence_count: evidenceRows.length,
        positive_count: positive,
        negative_count: negative,
        neutral_count: neutral,
        pattern_summary: parsed.pattern_summary,
        advisor_note: parsed.advisor_note,
        recommendation: recommendationText,
        fvs_delta: cleanedDelta,
        confidence_shift: parsed.confidence_shift,
      })
      .select()
      .single();

    if (summaryError) {
      log("Summary insert error", { error: summaryError });
      throw new Error("Failed to insert validation summary");
    }

    log("Summary inserted", { summaryId: summary.id });

    // === Apply FVS delta to existing scores ===
    if (fvs && Object.keys(cleanedDelta).length > 0) {
      const currentDims = (fvs.dimensions || {}) as Record<string, any>;
      const updatedDims = { ...currentDims };
      let newComposite = fvs.composite_score || 0;

      const weights: Record<string, number> = {
        marketSize: 0.20,
        unitEconomics: 0.25,
        timeToRevenue: 0.15,
        competitiveDensity: 0.15,
        capitalRequirements: 0.15,
        founderMarketFit: 0.10,
      };

      let compositeShift = 0;
      for (const [dim, delta] of Object.entries(cleanedDelta)) {
        if (updatedDims[dim]) {
          const oldScore = updatedDims[dim].score || 50;
          const newScore = Math.max(0, Math.min(100, oldScore + delta));
          updatedDims[dim] = {
            ...updatedDims[dim],
            score: newScore,
            rationale: updatedDims[dim].rationale +
              ` [Validation update: ${delta > 0 ? "+" : ""}${delta} based on ${evidenceRows.length} evidence entries]`,
          };
          compositeShift += delta * (weights[dim] || 0.15);
        }
      }

      newComposite = Math.max(0, Math.min(100, Math.round(newComposite + compositeShift)));

      const { error: updateError } = await admin
        .from("financial_viability_scores")
        .update({
          dimensions: updatedDims,
          composite_score: newComposite,
        })
        .eq("id", fvs.id);

      if (updateError) {
        log("FVS update error (non-fatal)", { error: updateError });
      } else {
        log("FVS updated", { newComposite, deltaApplied: cleanedDelta });
      }
    }

    return new Response(JSON.stringify(summary), {
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
