import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[generate-validation-plan] ${step}${d}`);
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

    const { venture_id } = await req.json();
    if (!venture_id) {
      return new Response(
        JSON.stringify({ error: "venture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // --- Fetch all context in parallel ---
    const [ventureRes, interviewRes, fvsRes, northStarRes] = await Promise.all([
      // Venture record
      admin.from("ventures").select("*").eq("id", venture_id).eq("user_id", userId).single(),
      // Latest completed Mavrik interview
      admin
        .from("founder_interviews")
        .select("context_summary, transcript")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // FVS scores for the venture's idea
      admin
        .from("financial_viability_scores")
        .select("dimensions, composite_score, summary, top_risk, top_opportunity")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // North Star Spec document (from implementation kit workspace docs)
      admin
        .from("workspace_documents")
        .select("content, title")
        .eq("user_id", userId)
        .eq("venture_id", venture_id)
        .eq("doc_type", "north_star_spec")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (ventureRes.error || !ventureRes.data) {
      log("Venture not found", { error: ventureRes.error });
      return new Response(
        JSON.stringify({ error: "Venture not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const venture = ventureRes.data;
    const interview = interviewRes.data?.context_summary as any || null;
    const fvs = fvsRes.data as any || null;
    const northStarSpec = northStarRes.data?.content || null;

    log("Context fetched", {
      hasInterview: !!interview,
      hasFVS: !!fvs,
      hasNorthStar: !!northStarSpec,
    });

    // --- Create validation session ---
    const hypothesis = `The core value proposition of "${venture.name}" can be validated through real-world evidence.`;

    const { data: session, error: sessionError } = await admin
      .from("validation_sessions")
      .insert({
        venture_id,
        user_id: userId,
        status: "active",
        validation_stage: "initial",
        hypothesis,
        target_evidence_count: 3,
      })
      .select()
      .single();

    if (sessionError || !session) {
      log("Session creation failed", { error: sessionError });
      throw new Error("Failed to create validation session");
    }

    log("Session created", { sessionId: session.id });

    // --- Build AI prompt ---
    const fvsDimensionsStr = fvs?.dimensions
      ? JSON.stringify(fvs.dimensions, null, 2)
      : "No FVS dimensions available yet.";

    const interviewStr = interview
      ? `
MAVRIK INTERVIEW CONTEXT:
- Vertical: ${interview.ventureIntelligence?.verticalIdentified || "unknown"}
- Business Model: ${interview.ventureIntelligence?.businessModel || "unknown"}
- Wedge Clarity: ${interview.ventureIntelligence?.wedgeClarity || "unknown"}
- Industry Access: ${interview.ventureIntelligence?.industryAccess || "unknown"}
- Insider Knowledge: ${JSON.stringify(interview.extractedInsights?.insiderKnowledge || [])}
- Customer Intimacy: ${JSON.stringify(interview.extractedInsights?.customerIntimacy || [])}
- Hard-No Filters: ${JSON.stringify(interview.extractedInsights?.constraints || {})}
- Founder Summary: ${interview.founderSummary || "N/A"}
`
      : "No Mavrik interview data available.";

    const northStarStr = northStarSpec
      ? `\nNORTH STAR SPEC (excerpt, first 2000 chars):\n${northStarSpec.slice(0, 2000)}`
      : "";

    const systemPrompt = `You are a validation strategist for early-stage founders. Your job is to identify the highest-uncertainty assumptions in a venture and design targeted validation missions to gather real evidence.

You will be given:
1. A venture description
2. Financial Viability Score (FVS) dimensions with scores and rationales
3. Mavrik interview context (founder intelligence)
4. Optionally a North Star Spec

Your task:
- Analyze the FVS dimensions and identify the 3 that are MOST driven by assumptions rather than evidence. A low score doesn't necessarily mean high uncertainty — look for rationales that contain phrases like "estimated", "assumed", "unclear", "depends on", "unknown", or lack specificity.
- For each of those 3 dimensions, generate a validation mission that tells the founder EXACTLY what to do to gather real evidence.

Return ONLY a valid JSON array of exactly 3 mission objects with this structure:
[
  {
    "mission_title": "Short action-oriented title (e.g., 'Talk to 3 potential customers')",
    "mission_detail": "2-3 sentences of specific instruction. Tell the founder WHO to talk to, WHAT to ask, or WHAT to test. Be concrete, not generic.",
    "suggested_questions": [
      "Specific conversation starter or test prompt 1",
      "Specific conversation starter or test prompt 2",
      "Specific conversation starter or test prompt 3"
    ],
    "target_fvs_dimension": "one of: marketSize, unitEconomics, timeToRevenue, competitiveDensity, capitalRequirements, founderMarketFit"
  }
]

Rules:
- Each mission must target a DIFFERENT FVS dimension
- Questions must be specific to this venture, not generic business questions
- Mission detail must be actionable within 1-2 days
- Do NOT wrap in markdown code blocks, return raw JSON only`;

    const userPrompt = `VENTURE: ${venture.name}
STATUS: ${venture.venture_state}
SUCCESS METRIC: ${venture.success_metric || "Not defined"}

FVS DIMENSIONS:
${fvsDimensionsStr}

FVS COMPOSITE SCORE: ${fvs?.composite_score ?? "N/A"}
FVS SUMMARY: ${fvs?.summary ?? "N/A"}
FVS TOP RISK: ${fvs?.top_risk ?? "N/A"}
${interviewStr}
${northStarStr}

Identify the 3 highest-uncertainty FVS dimensions and generate validation missions.`;

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
        temperature: 0.4,
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
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Parse missions JSON
    let missions: any[];
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      missions = JSON.parse(jsonStr.trim());
    } catch {
      const match = rawContent.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Failed to parse AI response as JSON array");
      missions = JSON.parse(match[0]);
    }

    if (!Array.isArray(missions) || missions.length !== 3) {
      throw new Error(`Expected 3 missions, got ${Array.isArray(missions) ? missions.length : "non-array"}`);
    }

    log("Missions parsed", { count: missions.length });

    // --- Insert missions ---
    const missionRows = missions.map((m: any) => ({
      session_id: session.id,
      venture_id,
      user_id: userId,
      mission_title: m.mission_title,
      mission_detail: m.mission_detail,
      suggested_questions: m.suggested_questions,
      target_fvs_dimension: m.target_fvs_dimension,
      status: "pending",
    }));

    const { data: insertedMissions, error: missionError } = await admin
      .from("validation_missions")
      .insert(missionRows)
      .select();

    if (missionError) {
      log("Mission insert error", { error: missionError });
      throw new Error("Failed to insert validation missions");
    }

    log("Missions inserted", { count: insertedMissions?.length });

    return new Response(
      JSON.stringify({
        session_id: session.id,
        missions: insertedMissions,
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
