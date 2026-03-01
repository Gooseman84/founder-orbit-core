// supabase/functions/venture-debugger/index.ts
// Mavrik Diagnostic Mode — structured four-step root cause analysis

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { fetchFrameworks } from "../_shared/fetchFrameworks.ts";
import { selectInterviewContext } from "../_shared/selectInterviewContext.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Founder Moment State (inlined from compute-founder-moment-state) ──

type MomentState =
  | "STUCK"
  | "BUILDING_MOMENTUM"
  | "SCOPE_CREEPING"
  | "EXECUTION_PARALYSIS"
  | "APPROACHING_LAUNCH";

const MAVRIK_INTENTS: Record<MomentState, string> = {
  STUCK: "UNBLOCK this founder. One blocker, one fix, one task.",
  BUILDING_MOMENTUM: "ACCELERATE what's working. Push harder, not broader.",
  SCOPE_CREEPING: "REFOCUS this founder. Recommend from existing plan scope only.",
  EXECUTION_PARALYSIS: "ACTIVATE this founder. Smallest possible next action — under 60 minutes.",
  APPROACHING_LAUNCH: "FINALIZE this founder's launch. Only launch-critical actions.",
};

function countConsecutiveNo(checkins: any[]): number {
  let count = 0;
  for (const c of checkins) {
    if (c.completion_status === "no") count++;
    else break;
  }
  return count;
}

function average(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function hasDuplicateTaskTitles(taskSets: any[][]): boolean {
  const titleCounts = new Map<string, number>();
  for (const tasks of taskSets) {
    const setTitles = new Set<string>();
    for (const t of tasks) {
      const title = (t.title || "").toLowerCase().trim();
      if (title) setTitles.add(title);
    }
    for (const title of setTitles) {
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    }
  }
  for (const count of titleCounts.values()) {
    if (count >= 2) return true;
  }
  return false;
}

function calculateDayInCommitment(startAt: string | null): number {
  if (!startAt) return 1;
  const diffMs = Date.now() - new Date(startAt).getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

interface Signals {
  recentCompletionRate: number;
  consecutiveNo: number;
  avgEnergy: number | null;
  avgStress: number | null;
  hasBlockers: boolean;
  daysInCommitment: number;
  isApproachingEnd: boolean;
  hasDuplicateTasks: boolean;
}

function classifyState(signals: Signals): { state: MomentState; rationale: string } {
  if (signals.consecutiveNo >= 3 || (signals.avgEnergy !== null && signals.avgEnergy < 2 && signals.recentCompletionRate < 0.2)) {
    return { state: "EXECUTION_PARALYSIS", rationale: `ConsecutiveNo: ${signals.consecutiveNo}, Energy: ${signals.avgEnergy}, Completion: ${(signals.recentCompletionRate * 100).toFixed(0)}%` };
  }
  if (signals.consecutiveNo >= 2 || (signals.hasBlockers && signals.recentCompletionRate < 0.4)) {
    return { state: "STUCK", rationale: `ConsecutiveNo: ${signals.consecutiveNo}, Blockers: ${signals.hasBlockers}` };
  }
  if (signals.isApproachingEnd && signals.recentCompletionRate >= 0.5) {
    return { state: "APPROACHING_LAUNCH", rationale: `Day ${signals.daysInCommitment}, past 75% of window` };
  }
  if (signals.hasDuplicateTasks && signals.recentCompletionRate >= 0.6) {
    return { state: "SCOPE_CREEPING", rationale: "Duplicate tasks detected" };
  }
  if (signals.recentCompletionRate >= 0.6 && (signals.avgEnergy === null || signals.avgEnergy >= 3.5)) {
    return { state: "BUILDING_MOMENTUM", rationale: `Completion: ${(signals.recentCompletionRate * 100).toFixed(0)}%` };
  }
  return { state: "BUILDING_MOMENTUM", rationale: "No negative signals — default." };
}

// ── System Prompt ──

const VENTURE_DEBUGGER_SYSTEM_PROMPT = `You are Mavrik in diagnostic mode. 
Your job is to run a structured four-step diagnostic on a founder's reported 
problem using TrueBlazer's actual data about this founder. You are clinical, 
precise, and honest. This is not encouragement mode.

{{FRAMEWORKS_INJECTION_POINT}}

## DIAGNOSTIC PROTOCOL

Step 1 — SYMPTOM PARSING
Identify what the founder thinks is wrong (stated symptom) and classify:
- root_problem: the stated issue IS the actual problem
- surface_manifestation: the stated issue is a symptom of something deeper  
- misdiagnosis: the founder is solving the wrong problem entirely

Step 2 — ROOT CAUSE HYPOTHESES
Generate exactly 2-3 hypotheses. Every hypothesis MUST cite a specific 
TrueBlazer data point provided in context. Not generic startup advice.
Example: "Your last 3 checkins show no completions — this suggests..."
Example: "Your FVS has been flat for 7 days because..."

Step 3 — MINIMAL INTERVENTION
One intervention only. Specific and time-bound. Not "talk to customers" 
but "Contact 3 CFO-titled prospects via LinkedIn this week using this 
exact opening: [generate based on their idea]. Report response rate in 48h."

Step 4 — EXECUTABLE OUTPUT
Generate either a validation_mission or workspace_task object the founder 
can accept into their dashboard with one click.

## OUTPUT CONTRACT
Return ONLY valid JSON matching this exact schema:

{
  "symptomParsing": {
    "statedSymptom": "the problem as the founder described it",
    "actualProblemType": "root_problem" | "surface_manifestation" | "misdiagnosis",
    "reframe": "one sentence restating the real problem — same as statedSymptom if root_problem"
  },
  "rootCauseHypotheses": [
    {
      "hypothesis": "one sentence root cause",
      "confidence": "high" | "medium" | "low",
      "dataSignal": "the specific TrueBlazer data point supporting this",
      "ifTrue": "what this implies about what needs to change"
    }
  ],
  "primaryRootCause": 0,
  "intervention": {
    "action": "specific, time-bound action with template copy if applicable",
    "rationale": "one sentence: why this and not the obvious fix",
    "timeToResult": "24h" | "48h" | "1 week" | "2 weeks",
    "successCriteria": "binary pass/fail statement"
  },
  "executableOutput": {
    "type": "validation_mission" | "workspace_task",
    "title": "string",
    "description": "string",
    "estimatedMinutes": number,
    "category": "validation" | "build" | "distribute" | "admin",
    "successCriteria": "string"
  },
  "mavrikNote": "2-3 sentences. Second person. Clinical not encouraging. References specific data points."
}

## ANTI-PATTERNS
- Do NOT generate a diagnosis that could apply to any founder
- Do NOT suggest vague actions like "talk to more customers" without 
  specifying who, how many, what to ask, which channel
- Do NOT produce more than one intervention
- Do NOT use encouraging language in mavrikNote
- Do NOT return empty hypotheses — if data is sparse, say so explicitly 
  in the dataSignal field`;

// ── Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { ventureId, symptomDescription } = body;

    if (!ventureId || !symptomDescription) {
      return new Response(JSON.stringify({ error: "ventureId and symptomDescription required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // ── Fetch All Data in Parallel ──
    const [
      { data: venture },
      { data: recentCheckins },
      { data: recentTaskRows },
      { data: fvsData },
      { data: recentReflections },
      { data: founderProfile },
      frameworksText,
    ] = await Promise.all([
      supabaseService
        .from("ventures")
        .select("name, venture_state, commitment_window_days, commitment_start_at, success_metric, idea_id")
        .eq("id", ventureId)
        .eq("user_id", user.id)
        .single(),
      supabaseService
        .from("venture_daily_checkins")
        .select("checkin_date, completion_status, explanation")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .order("checkin_date", { ascending: false })
        .limit(10),
      supabaseService
        .from("venture_daily_tasks")
        .select("tasks")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseService
        .from("financial_viability_scores")
        .select("composite_score, summary, top_risk, top_opportunity, dimensions")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseService
        .from("daily_reflections")
        .select("energy_level, stress_level, mood_tags, blockers")
        .eq("user_id", user.id)
        .order("reflection_date", { ascending: false })
        .limit(3),
      supabaseService
        .from("founder_profiles")
        .select("context_summary")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchFrameworks(supabaseService, {
        functions: ["venture-debugger"],
        injectionRole: "core",
        maxTokens: 600,
      }),
    ]);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch idea details if venture has an idea_id
    let ideaData: any = null;
    if (venture.idea_id) {
      const { data } = await supabaseService
        .from("ideas")
        .select("title, description, business_model_type")
        .eq("id", venture.idea_id)
        .maybeSingle();
      ideaData = data;
    }

    // ── Compute Founder Moment State (inlined) ──
    const checkins = recentCheckins || [];
    const reflections = recentReflections || [];
    const taskRows = recentTaskRows || [];

    let totalTasks = 0;
    let completedTasks = 0;
    for (const row of taskRows) {
      const tasks = Array.isArray(row.tasks) ? row.tasks : [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter((t: any) => t.completed).length;
    }

    const last3TaskSets = taskRows.slice(0, 3).map((r: any) =>
      Array.isArray(r.tasks) ? r.tasks : []
    );

    const dayInCommitment = calculateDayInCommitment(venture.commitment_start_at);
    const commitmentDays = venture.commitment_window_days || 30;

    const signals: Signals = {
      recentCompletionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      consecutiveNo: countConsecutiveNo(checkins),
      avgEnergy: average(reflections.map((r: any) => r.energy_level)),
      avgStress: average(reflections.map((r: any) => r.stress_level)),
      hasBlockers: reflections.some((r: any) => r.blockers && r.blockers.trim().length > 0),
      daysInCommitment: dayInCommitment,
      isApproachingEnd: dayInCommitment > commitmentDays * 0.75,
      hasDuplicateTasks: hasDuplicateTaskTitles(last3TaskSets),
    };

    const { state: founderMomentState } = classifyState(signals);

    // ── Build Interview Context ──
    const rawContext = founderProfile?.context_summary || {};
    const interviewContext = selectInterviewContext("venture-debugger", rawContext);

    // ── Build System Prompt ──
    const systemPrompt = VENTURE_DEBUGGER_SYSTEM_PROMPT.replace(
      "{{FRAMEWORKS_INJECTION_POINT}}",
      frameworksText || ""
    );

    // ── Build User Prompt ──
    const userPrompt = `## FOUNDER'S STATED PROBLEM
"${symptomDescription}"

## VENTURE CONTEXT
- Venture: ${venture.name}
- State: ${venture.venture_state}
- Day ${dayInCommitment} of ${commitmentDays}-day commitment
- Success Metric: ${venture.success_metric || "Not set"}
- Founder Moment State: ${founderMomentState} (${MAVRIK_INTENTS[founderMomentState]})

## CHOSEN IDEA
${ideaData ? `- Title: ${ideaData.title}\n- Description: ${ideaData.description || "N/A"}\n- Business Model: ${ideaData.business_model_type || "N/A"}` : "No idea linked to venture."}

## RECENT CHECK-INS (last 10, newest first)
${checkins.length > 0 ? checkins.map((c: any) => `- ${c.checkin_date}: ${c.completion_status}${c.explanation ? ` — "${c.explanation}"` : ""}`).join("\n") : "No check-ins recorded."}

## RECENT TASK COMPLETION
- Total tasks (last 5 days): ${totalTasks}
- Completed: ${completedTasks}
- Completion rate: ${totalTasks > 0 ? (signals.recentCompletionRate * 100).toFixed(0) : 0}%

## FINANCIAL VIABILITY SCORE
${fvsData ? `- Composite: ${fvsData.composite_score}/100\n- Top Risk: ${fvsData.top_risk || "N/A"}\n- Top Opportunity: ${fvsData.top_opportunity || "N/A"}\n- Summary: ${fvsData.summary || "N/A"}` : "No FVS computed yet."}

## REFLECTIONS (last 3)
${reflections.length > 0 ? reflections.map((r: any) => `- Energy: ${r.energy_level ?? "?"}/5, Stress: ${r.stress_level ?? "?"}/5${r.blockers ? `, Blocker: "${r.blockers}"` : ""}`).join("\n") : "No reflections recorded."}

## FOUNDER CONTEXT
${interviewContext ? JSON.stringify(interviewContext, null, 2) : "No interview context available."}

Run the four-step diagnostic protocol now. Return ONLY the JSON object.`;

    // ── AI Call ──
    console.log("[venture-debugger] Calling AI for diagnostic...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[venture-debugger] AI gateway error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Diagnostic analysis failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const text = aiData.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();

    let diagnosis;
    try {
      diagnosis = JSON.parse(clean);
    } catch (parseError) {
      console.error("[venture-debugger] JSON parse failed:", parseError, "Raw:", text);
      return new Response(JSON.stringify({ error: "Failed to parse diagnostic results. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate shape
    if (!diagnosis.symptomParsing || !diagnosis.rootCauseHypotheses || !diagnosis.intervention) {
      console.error("[venture-debugger] Unexpected diagnosis shape:", Object.keys(diagnosis));
      return new Response(JSON.stringify({ error: "Diagnostic returned incomplete results. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[venture-debugger] Diagnostic complete. State:", founderMomentState);

    return new Response(
      JSON.stringify({
        diagnosis,
        founderMomentState,
        ventureContext: {
          name: venture.name,
          dayInCommitment,
          ventureState: venture.venture_state,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[venture-debugger] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
