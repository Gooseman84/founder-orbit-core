import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[detect-founder-patterns] ${step}${d}`);
};

const SEVERITY_MAP: Record<string, string> = {
  assumption_rationalization: "high",
  pivot_hesitation: "high",
  validation_avoidance: "medium",
  niche_drift: "medium",
  over_optimization: "low",
};

const ADVISOR_SYSTEM_PROMPT = `You are Mavrik, a direct and financially grounded startup advisor inside TrueBlazer. A behavioral pattern has been detected in a founder's journey. Write a 2-3 sentence advisor note that:

- Names the pattern directly without being harsh
- Explains what this pattern typically costs founders (financially or strategically) if left unaddressed
- Ends with one specific, actionable question or reframe for the founder to consider

Never use generic motivational language. Be precise and respectful.

The founder is serious about building something real — treat them that way.`;

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

    const { venture_id } = await req.json();
    if (!venture_id) {
      return new Response(
        JSON.stringify({ error: "venture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // === Fetch all context in parallel ===
    const [
      ventureRes,
      summariesRes,
      evidenceRes,
      sessionsRes,
      missionsRes,
      interviewRes,
      northStarSpecRes,
      activePatternsRes,
    ] = await Promise.all([
      admin.from("ventures").select("*").eq("id", venture_id).eq("user_id", userId).single(),
      admin.from("validation_summaries").select("venture_id, confidence_shift, recommendation, total_evidence_count, generated_at").eq("venture_id", venture_id).eq("user_id", userId).order("generated_at", { ascending: true }),
      admin.from("validation_evidence").select("id, sentiment, contradicts_assumption, guided_answers, fvs_dimension, signal_strength, created_at").eq("venture_id", venture_id).eq("user_id", userId).order("created_at", { ascending: true }),
      admin.from("validation_sessions").select("id, status, created_at, target_evidence_count").eq("venture_id", venture_id).eq("user_id", userId).order("created_at", { ascending: true }),
      admin.from("validation_missions").select("id, session_id, status, created_at, completed_at").eq("venture_id", venture_id).eq("user_id", userId),
      admin.from("founder_interviews").select("context_summary").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("workspace_documents").select("content, updated_at").eq("venture_id", venture_id).eq("user_id", userId).eq("doc_type", "north_star_spec").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("founder_patterns").select("pattern_type").eq("venture_id", venture_id).eq("user_id", userId).eq("status", "active"),
    ]);

    const venture = ventureRes.data;
    if (!venture) throw new Error("Venture not found");

    const summaries = summariesRes.data || [];
    const evidence = evidenceRes.data || [];
    const sessions = sessionsRes.data || [];
    const missions = missionsRes.data || [];
    const interview = interviewRes.data;
    const northStarSpec = northStarSpecRes.data;
    const activePatternTypes = new Set((activePatternsRes.data || []).map((p: any) => p.pattern_type));

    log("Context fetched", {
      summaries: summaries.length,
      evidence: evidence.length,
      sessions: sessions.length,
      missions: missions.length,
      hasInterview: !!interview,
      hasNorthStarSpec: !!northStarSpec,
      activePatterns: activePatternTypes.size,
    });

    // === Detection checks ===
    type DetectedPattern = {
      pattern_type: string;
      pattern_description: string;
      evidence_references: any[];
    };

    const detected: DetectedPattern[] = [];

    // Check 1 — ASSUMPTION RATIONALIZATION
    try {
      const rationalizingWords = /\b(confirmed|validates|supports|agree|agrees|confirming|validating|supporting)\b/i;
      const rationalizingEntries = evidence.filter((e: any) => {
        if (!e.contradicts_assumption) return false;
        const confirmsField = (e.guided_answers as any)?.confirms_or_challenges ?? "";
        return rationalizingWords.test(confirmsField);
      });

      if (rationalizingEntries.length >= 3 && !activePatternTypes.has("assumption_rationalization")) {
        detected.push({
          pattern_type: "assumption_rationalization",
          pattern_description: `${rationalizingEntries.length} of ${evidence.length} evidence entries contradict assumptions but guided answers frame them as confirmation.`,
          evidence_references: rationalizingEntries.map((e: any) => ({ id: e.id, created_at: e.created_at })),
        });
      }
    } catch (err) {
      log("Check 1 (assumption_rationalization) failed", { error: String(err) });
    }

    // Check 2 — PIVOT HESITATION
    try {
      const pivotSummary = summaries.find((s: any) => s.recommendation && s.recommendation.toLowerCase().startsWith("pivot"));
      if (pivotSummary && !activePatternTypes.has("pivot_hesitation")) {
        const afterPivot = evidence.filter((e: any) => new Date(e.created_at) > new Date(pivotSummary.generated_at));
        if (afterPivot.length >= 3) {
          detected.push({
            pattern_type: "pivot_hesitation",
            pattern_description: `A pivot recommendation was issued on ${new Date(pivotSummary.generated_at).toLocaleDateString()} but ${afterPivot.length} more evidence entries were logged afterward without changing direction.`,
            evidence_references: [
              { summary_generated_at: pivotSummary.generated_at },
              ...afterPivot.map((e: any) => ({ id: e.id, created_at: e.created_at })),
            ],
          });
        }
      }
    } catch (err) {
      log("Check 2 (pivot_hesitation) failed", { error: String(err) });
    }

    // Check 3 — VALIDATION AVOIDANCE
    try {
      if (!activePatternTypes.has("validation_avoidance")) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const staleSession = sessions.find((s: any) =>
          s.status === "active" && new Date(s.created_at) < sevenDaysAgo
        );
        if (staleSession && evidence.length < 2) {
          const daysSince = Math.floor((Date.now() - new Date(staleSession.created_at).getTime()) / (1000 * 60 * 60 * 24));
          detected.push({
            pattern_type: "validation_avoidance",
            pattern_description: `A validation session was created ${daysSince} days ago but only ${evidence.length} evidence ${evidence.length === 1 ? "entry has" : "entries have"} been logged for this venture.`,
            evidence_references: [{ session_id: staleSession.id, created_at: staleSession.created_at, days_since: daysSince }],
          });
        }
      }
    } catch (err) {
      log("Check 3 (validation_avoidance) failed", { error: String(err) });
    }

    // Check 4 — NICHE DRIFT
    try {
      if (!activePatternTypes.has("niche_drift") && interview?.context_summary && northStarSpec?.content) {
        log("Running niche drift AI check");
        const driftPrompt = `Compare these two descriptions of a venture's target market and core problem.

SOURCE 1 — Founder Interview Context Summary:
${JSON.stringify(interview.context_summary)}

SOURCE 2 — North Star Spec (implementation document):
${(northStarSpec.content as string).slice(0, 3000)}

Has the target customer or core problem shifted meaningfully between these two documents? A meaningful shift means the WHO (target customer segment) or the WHAT (core problem being solved) has changed — not just refinements in language or scope.

Return ONLY valid JSON:
{
  "has_drifted": true | false,
  "drift_description": "One sentence describing what shifted, or empty string if no drift"
}`;

        const driftResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a startup analyst. Compare two venture descriptions and determine if the target market or core problem has meaningfully shifted. Return only JSON." },
              { role: "user", content: driftPrompt },
            ],
            temperature: 0.1,
          }),
        });

        if (driftResponse.ok) {
          const driftData = await driftResponse.json();
          const rawDrift = driftData.choices?.[0]?.message?.content ?? "";
          try {
            const jsonMatch = rawDrift.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const driftResult = JSON.parse(jsonMatch[0]);
              if (driftResult.has_drifted) {
                detected.push({
                  pattern_type: "niche_drift",
                  pattern_description: driftResult.drift_description || "Target customer or core problem has shifted between founder interview and implementation spec.",
                  evidence_references: [
                    { source: "founder_interview", has_context_summary: true },
                    { source: "north_star_spec", updated_at: northStarSpec.updated_at },
                  ],
                });
              }
            }
          } catch {
            log("Niche drift JSON parse failed");
          }
        } else {
          log("Niche drift AI call failed", { status: driftResponse.status });
          await driftResponse.text(); // consume body
        }
      }
    } catch (err) {
      log("Check 4 (niche_drift) failed", { error: String(err) });
    }

    // Check 5 — OVER OPTIMIZATION
    try {
      if (!activePatternTypes.has("over_optimization")) {
        if (summaries.length >= 4) {
          const hasDoubleDown = summaries.some((s: any) =>
            s.recommendation && s.recommendation.toLowerCase().includes("double_down")
          );
          if (!hasDoubleDown) {
            detected.push({
              pattern_type: "over_optimization",
              pattern_description: `${summaries.length} validation analysis sessions have been run without a "double down" recommendation — this may indicate over-analysis without progressing conviction.`,
              evidence_references: summaries.map((s: any) => ({
                generated_at: s.generated_at,
                recommendation: s.recommendation,
              })),
            });
          }
        }
      }
    } catch (err) {
      log("Check 5 (over_optimization) failed", { error: String(err) });
    }

    log("Detection complete", { detected: detected.length, types: detected.map(d => d.pattern_type) });

    if (detected.length === 0) {
      return new Response(
        JSON.stringify({ patterns_detected: 0, pattern_types: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === Generate advisor notes and insert patterns ===
    const insertedTypes: string[] = [];

    for (const pattern of detected) {
      try {
        const notePrompt = `Pattern detected: ${pattern.pattern_type.replace(/_/g, " ")}

Description: ${pattern.pattern_description}

Venture: ${venture.name}

Generate the advisor note for this founder.`;

        const noteResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: ADVISOR_SYSTEM_PROMPT },
              { role: "user", content: notePrompt },
            ],
            temperature: 0.4,
          }),
        });

        let advisorNote = "A behavioral pattern has been detected in your venture journey. Review the details and consider whether a course correction is needed.";

        if (noteResponse.ok) {
          const noteData = await noteResponse.json();
          const rawNote = noteData.choices?.[0]?.message?.content;
          if (rawNote) advisorNote = rawNote.trim();
        } else {
          log("Advisor note AI failed", { status: noteResponse.status, pattern: pattern.pattern_type });
          await noteResponse.text(); // consume body
        }

        const { error: insertError } = await admin
          .from("founder_patterns")
          .insert({
            user_id: userId,
            venture_id,
            pattern_type: pattern.pattern_type,
            pattern_description: pattern.pattern_description,
            advisor_note: advisorNote,
            evidence_references: pattern.evidence_references,
            severity: SEVERITY_MAP[pattern.pattern_type] || "medium",
            status: "active",
          });

        if (insertError) {
          // Unique constraint violation means pattern already exists — skip
          if (insertError.code === "23505") {
            log("Pattern already exists (unique constraint)", { pattern: pattern.pattern_type });
          } else {
            log("Insert error", { pattern: pattern.pattern_type, error: insertError });
          }
        } else {
          insertedTypes.push(pattern.pattern_type);
          log("Pattern inserted", { pattern: pattern.pattern_type });
        }
      } catch (err) {
        log("Pattern processing failed", { pattern: pattern.pattern_type, error: String(err) });
      }
    }

    return new Response(
      JSON.stringify({ patterns_detected: insertedTypes.length, pattern_types: insertedTypes }),
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
