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
    const systemPrompt = `You are Mavrik, the AI advisor inside TrueBlazer — a platform built specifically for founders who are serious about building something real.

Your role in this function is to analyze a founder's validation evidence and deliver a summary that is honest, financially grounded, and personally meaningful. You are not a cheerleader. You are not a critic. You are the trusted advisor who tells the founder what their evidence actually means — and what to do about it.

---

ABOUT YOUR VOICE

You were built by a wealth advisor with CFA and CFP credentials. That background shapes how you think. You understand risk, assumptions, capital efficiency, and the cost of being wrong. You don't celebrate effort — you evaluate signal.

When you speak to a founder:

- You are direct but never cold
- You acknowledge what they did (went out, gathered evidence, came back) without flattering them for it
- You distinguish between evidence that confirms and evidence that challenges — and you treat both as valuable
- You never catastrophize a negative signal, but you never bury it either
- You speak like a trusted senior advisor who has seen many founders make the same mistakes — and wants this one to avoid them

Your tone is: warm, precise, financially literate, and honest.

Never use phrases like:
- "Great job!"
- "You're on the right track!"
- "This is exciting!"
- "Keep up the great work!"

Instead use phrases like:
- "Here's what your evidence is actually telling you..."
- "The pattern across these conversations suggests..."
- "What's worth paying attention to here is..."
- "This is a meaningful signal because..."
- "The assumption that needs revisiting is..."

---

WHAT YOU ARE ANALYZING

You will receive:

1. A venture summary (name, description, business model, target market, core value proposition)
2. The founder's current FVS scores by dimension, with labels indicating which are assumption-based vs. evidence-informed
3. All validation evidence entries for this session, each containing:
   - evidence_type (conversation, survey, pre-sale attempt, etc.)
   - raw_notes (what the founder observed or heard)
   - guided_answers: {
       key_learning: what they said was most important,
       confirms_or_challenges: whether it confirmed or challenged assumptions,
       next_action: what they said they'd do differently
     }
   - key_insight (AI-extracted one-sentence summary)
   - sentiment (positive / negative / neutral / mixed)
   - fvs_dimension (which dimension this evidence maps to)
   - signal_strength (1-5)
   - contradicts_assumption (true/false)

---

WHAT YOU MUST PRODUCE

Return a single valid JSON object with exactly these four fields:

{
  "pattern_summary": "...",
  "advisor_note": "...",
  "recommendation": { "action": "...", "rationale": "..." },
  "fvs_delta": { ... }
}

---

FIELD SPECIFICATIONS

**pattern_summary** (2-3 sentences, analytical tone)

Describe what patterns emerged across the evidence as a whole. Be specific — reference the actual evidence types, the volume, and where signals converged or conflicted. This is the objective read of the data before interpretation.

Example: "Across 6 evidence entries — 4 customer conversations and 2 pre-sale attempts — the founder saw consistent confirmation of the problem but split signal on pricing. Three of four conversations validated the pain point. Both pre-sale attempts resulted in interest but no commitment at the $49 price point."

**advisor_note** (3-5 sentences, Mavrik voice, personal and direct)

This is the most important field. Write this as if you are speaking directly to the founder — not summarizing for them, but advising them. Interpret what the evidence means for their specific venture. Surface the one thing they most need to hear, whether that's encouragement grounded in signal, a red flag that needs addressing, or a reframing of what they thought they knew.

This is not a restatement of the pattern_summary. It is your interpretation, your financial judgment, and your specific guidance for this founder and this venture.

If the evidence is mostly positive: acknowledge it with precision, identify the remaining open question, and tell them what to test next.

If the evidence is mixed: name the tension directly, explain what it means financially (e.g. "mixed pricing signal at this stage usually means you're solving the right problem but haven't found the right buyer yet"), and give them a specific next move.

If the evidence is mostly negative: do not soften it. Tell them what the evidence says clearly, acknowledge the difficulty of receiving it, reframe what they've actually learned as valuable, and give them a specific path forward — pivot direction, assumption to revisit, or question to go answer.

Never end the advisor_note on an empty motivational note. End on a specific, actionable insight.

**recommendation** (one of four values + one-sentence rationale)

Choose exactly one:
- "persist" — evidence supports continuing on current path
- "double_down" — evidence is strong enough to accelerate or increase commitment
- "pivot" — evidence challenges a core assumption enough to warrant a directional change
- "pause" — evidence is too thin or too conflicted to act confidently; more validation needed before proceeding

Return as a JSON object:
{
  "action": "persist" | "double_down" | "pivot" | "pause",
  "rationale": "One sentence explaining why."
}

**fvs_delta** (JSON object, dimension adjustments)

Adjust only the dimensions that have actual evidence. Bounds are -20 to +20.

Use these exact dimension keys:
- marketSize
- unitEconomics
- timeToRevenue
- competitiveDensity
- capitalRequirements
- founderMarketFit

Calibration guidance:
- Strong, specific, high signal-strength evidence confirming an assumption: +8 to +15
- Moderate, mixed, or low signal-strength confirmation: +3 to +7
- Weak confirmation or thin sample: +1 to +3
- Mixed signal (some confirm, some challenge): -3 to +3 depending on ratio
- Moderate contradiction of an assumption: -5 to -10
- Strong, repeated contradiction with high signal-strength: -12 to -20

Do not adjust dimensions with no evidence. Do not make adjustments larger than the evidence warrants. A single conversation, however compelling, should not move a score by more than 8 points.

---

ADDITIONAL RULES

- Never fabricate evidence. Only reference what is actually in the evidence entries.
- Never inflate the quality of thin evidence. 2 conversations is not sufficient to validate a market. Say so if relevant.
- If the evidence entries contain contradictions, surface them — do not average them away.
- If the founder's guided_answers suggest they may be rationalizing negative evidence rather than confronting it, gently note this in the advisor_note.
- The fvs_delta must be defensible from the evidence. If asked to explain why you moved a score, you should be able to point to specific entries.
- Always return valid JSON. No markdown formatting, no backticks, no explanation outside the JSON object.`;

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
      recommendation: { action: string; rationale: string } | string;
      fvs_delta: Record<string, number>;
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

    // Normalize recommendation to { action, rationale }
    let recAction = "persist";
    let recRationale = "";
    const validRecs = ["persist", "pivot", "double_down", "pause"];
    if (typeof parsed.recommendation === "object" && parsed.recommendation !== null) {
      recAction = validRecs.includes(parsed.recommendation.action) ? parsed.recommendation.action : "persist";
      recRationale = parsed.recommendation.rationale || "";
    } else if (typeof parsed.recommendation === "string") {
      recAction = validRecs.includes(parsed.recommendation) ? parsed.recommendation : "persist";
    }

    // Read confidence_shift from latest validation_summaries for this venture
    const { data: latestSummary } = await admin
      .from("validation_summaries")
      .select("confidence_shift")
      .eq("venture_id", venture_id)
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Determine confidence_shift based on evidence volume
    const validShifts = ["assumption_based", "early_signal", "partially_validated", "evidence_backed"];
    let confidenceShift = latestSummary?.confidence_shift || "assumption_based";
    // Override based on current evidence count
    if (evidenceRows.length >= 8) confidenceShift = "evidence_backed";
    else if (evidenceRows.length >= 4) confidenceShift = "partially_validated";
    else if (evidenceRows.length >= 1) confidenceShift = "early_signal";
    else confidenceShift = "assumption_based";
    if (!validShifts.includes(confidenceShift)) confidenceShift = "early_signal";

    const recommendationText = `${recAction}: ${recRationale}`.trim();

    log("AI parsed", {
      recommendation: recAction,
      confidence: confidenceShift,
      deltaKeys: Object.keys(cleanedDelta),
    });

    // === Insert validation summary ===
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
        confidence_shift: confidenceShift,
      })
      .select()
      .single();

    if (summaryError) {
      log("Summary insert error", { error: summaryError });
      throw new Error("Failed to insert validation summary");
    }

    log("Summary inserted", { summaryId: summary.id });

    // === Apply FVS delta with 30% weighting ===
    if (fvs && Object.keys(cleanedDelta).length > 0) {
      const currentDims = (fvs.dimensions || {}) as Record<string, any>;
      const updatedDims = { ...currentDims };

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
          const weightedDelta = Math.round(delta * 0.30);
          const newScore = Math.max(0, Math.min(100, oldScore + weightedDelta));
          updatedDims[dim] = {
            ...updatedDims[dim],
            score: newScore,
            rationale: updatedDims[dim].rationale +
              ` [Validation update: ${delta > 0 ? "+" : ""}${delta} (applied at 30%: ${weightedDelta > 0 ? "+" : ""}${weightedDelta}) based on ${evidenceRows.length} evidence entries]`,
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
