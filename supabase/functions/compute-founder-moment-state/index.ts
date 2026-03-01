// supabase/functions/compute-founder-moment-state/index.ts
// Deterministic founder state classifier — no AI needed.
// Computes psychological/execution state from behavioral signals.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MomentState =
  | "STUCK"
  | "BUILDING_MOMENTUM"
  | "SCOPE_CREEPING"
  | "EXECUTION_PARALYSIS"
  | "APPROACHING_LAUNCH";

const MAVRIK_ROLE_DEFINITIONS: Record<string, string> = {
  SKEPTIC: `## MAVRIK ROLE: THE SKEPTIC
You are Mavrik in Skeptic mode. Your worldview: founders systematically overestimate validation quality and underestimate confirmation bias. Your job is to stress-test reasoning, not destroy confidence.
- Question whether evidence is truly independent or self-selected
- Ask if the founder has talked to people who had no reason to be polite
- Surface the assumption most likely to be wrong
- Never validate unless the evidence genuinely warrants it
Do NOT be cruel. Be the trusted advisor who asks the hard question before the founder embarrasses themselves in front of customers.`,

  OPERATOR: `## MAVRIK ROLE: THE OPERATOR
You are Mavrik in Operator mode. Your worldview: most founder problems are execution problems, not strategy problems. Think in systems, processes, and elimination.
- Ask what can be cut, not what can be added
- Identify the fastest path to a working thing
- Flag anything the founder is doing that a tool or process could do instead
- Focus on this week, not this quarter
Do NOT introduce new strategic considerations. The strategy is set. Execute against it.`,

  ADVISOR: `## MAVRIK ROLE: THE TRUSTED ADVISOR
You are Mavrik in Trusted Advisor mode. Your worldview: this founder knows their domain better than you do — your job is to help them think clearly, not to tell them what to do.
- Ask questions that surface their own best thinking
- Reflect back what you're hearing to check understanding
- Offer frameworks only when the founder is genuinely stuck
- Celebrate genuine progress without empty encouragement
Balance honesty with respect for their expertise and judgment.`,

  EXIT_INTERVIEWER: `## MAVRIK ROLE: THE EXIT INTERVIEWER
You are Mavrik in Exit Interviewer mode. This founder's venture is ending or pivoting. Your worldview: the most valuable output of a failed venture is the lessons extracted from it.
- Ask what they would have needed to know on Day 1 to decide differently
- Identify which assumptions proved wrong and which proved right
- Extract the transferable patterns to carry into their next venture
- Make closure feel meaningful, not like defeat
Do NOT minimize what happened. Acknowledge it fully before extracting the learning.`,
};

const MAVRIK_INTENTS: Record<MomentState, string> = {
  STUCK:
    "Mavrik's intent for this session: UNBLOCK this founder. One blocker, one fix, one task. Do not introduce new strategic considerations or growth ideas.",
  BUILDING_MOMENTUM:
    "Mavrik's intent: ACCELERATE what's working. Identify the highest-leverage continuation of recent momentum. Push harder, not broader.",
  SCOPE_CREEPING:
    "Mavrik's intent: REFOCUS this founder. They are busy but not progressing. Recommend from existing plan scope only. Do not validate new ideas or features.",
  EXECUTION_PARALYSIS:
    "Mavrik's intent: ACTIVATE this founder. Generate the smallest possible next action — under 60 minutes. Success is motion, not outcomes.",
  APPROACHING_LAUNCH:
    "Mavrik's intent: FINALIZE this founder's launch. Only launch-critical actions. No new features, no new research, no new strategy.",
};

// ── Signal Computation Helpers ─────────────────────────────────

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
    // Track unique titles per set to count across sets, not within
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

// ── State Classifier ───────────────────────────────────────────

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
  // Priority 1: EXECUTION_PARALYSIS
  if (
    signals.consecutiveNo >= 3 ||
    (signals.avgEnergy !== null && signals.avgEnergy < 2 && signals.recentCompletionRate < 0.2)
  ) {
    return {
      state: "EXECUTION_PARALYSIS",
      rationale:
        signals.consecutiveNo >= 3
          ? `Founder has logged "no" completion for ${signals.consecutiveNo} consecutive days.`
          : `Energy critically low (${signals.avgEnergy?.toFixed(1)}) combined with near-zero completion rate (${(signals.recentCompletionRate * 100).toFixed(0)}%).`,
    };
  }

  // Priority 2: STUCK
  if (
    signals.consecutiveNo >= 2 ||
    (signals.hasBlockers && signals.recentCompletionRate < 0.4)
  ) {
    return {
      state: "STUCK",
      rationale:
        signals.consecutiveNo >= 2
          ? `Founder logged "no" completion for ${signals.consecutiveNo} consecutive days.`
          : `Active blockers reported with low completion rate (${(signals.recentCompletionRate * 100).toFixed(0)}%).`,
    };
  }

  // Priority 3: APPROACHING_LAUNCH
  if (signals.isApproachingEnd && signals.recentCompletionRate >= 0.5) {
    return {
      state: "APPROACHING_LAUNCH",
      rationale: `Day ${signals.daysInCommitment} — past 75% of commitment window with healthy completion rate. Launch mode activated.`,
    };
  }

  // Priority 4: SCOPE_CREEPING
  if (signals.hasDuplicateTasks && signals.recentCompletionRate >= 0.6) {
    return {
      state: "SCOPE_CREEPING",
      rationale: `Repeated task titles detected across recent days despite good completion rate — busy but not progressing.`,
    };
  }

  // Priority 5: BUILDING_MOMENTUM
  if (signals.recentCompletionRate >= 0.6 && (signals.avgEnergy === null || signals.avgEnergy >= 3.5)) {
    return {
      state: "BUILDING_MOMENTUM",
      rationale: `Solid completion rate (${(signals.recentCompletionRate * 100).toFixed(0)}%) with good energy. Momentum is real.`,
    };
  }

  // Default
  return {
    state: "BUILDING_MOMENTUM",
    rationale: "No negative signals detected — defaulting to momentum state.",
  };
}

// ── Edge Function Handler ──────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { ventureId } = body;

    if (!ventureId) {
      return new Response(JSON.stringify({ error: "ventureId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch All Data in Parallel ─────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    const [
      { data: venture },
      { data: recentCheckins },
      { data: recentReflections },
      { data: recentTaskRows },
    ] = await Promise.all([
      supabaseService
        .from("ventures")
        .select("venture_state, commitment_window_days, commitment_start_at")
        .eq("id", ventureId)
        .eq("user_id", user.id)
        .single(),
      supabaseService
        .from("venture_daily_checkins")
        .select("completion_status, explanation")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .order("checkin_date", { ascending: false })
        .limit(5),
      supabaseService
        .from("daily_reflections")
        .select("energy_level, stress_level, mood_tags, blockers")
        .eq("user_id", user.id)
        .order("reflection_date", { ascending: false })
        .limit(3),
      supabaseService
        .from("venture_daily_tasks")
        .select("tasks, task_date")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .gte("task_date", sevenDaysAgo)
        .order("task_date", { ascending: false })
        .limit(7),
    ]);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Compute Signals ────────────────────────────────────────
    const checkins = recentCheckins || [];
    const reflections = recentReflections || [];
    const taskRows = recentTaskRows || [];

    // Completion rate over last 7 days
    let totalTasks = 0;
    let completedTasks = 0;
    for (const row of taskRows) {
      const tasks = Array.isArray(row.tasks) ? row.tasks : [];
      totalTasks += tasks.length;
      completedTasks += tasks.filter((t: any) => t.completed).length;
    }

    // Duplicate task detection across last 3 task sets
    const last3TaskSets = taskRows.slice(0, 3).map((r: any) =>
      Array.isArray(r.tasks) ? r.tasks : []
    );

    const signals: Signals = {
      recentCompletionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
      consecutiveNo: countConsecutiveNo(checkins),
      avgEnergy: average(reflections.map((r: any) => r.energy_level)),
      avgStress: average(reflections.map((r: any) => r.stress_level)),
      hasBlockers: reflections.some(
        (r: any) => r.blockers && r.blockers.trim().length > 0
      ),
      daysInCommitment: calculateDayInCommitment(venture.commitment_start_at),
      isApproachingEnd:
        calculateDayInCommitment(venture.commitment_start_at) >
        (venture.commitment_window_days || 30) * 0.75,
      hasDuplicateTasks: hasDuplicateTaskTitles(last3TaskSets),
    };

    const { state, rationale } = classifyState(signals);

    // Determine mavrikRole based on state and venture phase
    let mavrikRole: string;
    if (venture.venture_state === 'reviewed') {
      mavrikRole = 'EXIT_INTERVIEWER';
    } else if (state === 'SCOPE_CREEPING' || state === 'BUILDING_MOMENTUM') {
      mavrikRole = 'SKEPTIC';
    } else if (state === 'STUCK' || state === 'EXECUTION_PARALYSIS') {
      mavrikRole = 'OPERATOR';
    } else if (state === 'APPROACHING_LAUNCH') {
      mavrikRole = 'ADVISOR';
    } else {
      mavrikRole = 'ADVISOR';
    }

    const mavrikRoleBlock = MAVRIK_ROLE_DEFINITIONS[mavrikRole] || MAVRIK_ROLE_DEFINITIONS.ADVISOR;

    console.log(
      `[compute-founder-moment-state] State: ${state}, Role: ${mavrikRole}, Completion: ${(signals.recentCompletionRate * 100).toFixed(0)}%, ConsecutiveNo: ${signals.consecutiveNo}`
    );

    return new Response(
      JSON.stringify({
        state,
        signals,
        stateRationale: rationale,
        mavrikIntent: MAVRIK_INTENTS[state],
        mavrikRole,
        mavrikRoleBlock,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[compute-founder-moment-state] Error:", error);
    // Default to BUILDING_MOMENTUM on any failure
    return new Response(
      JSON.stringify({
        state: "BUILDING_MOMENTUM",
        signals: {},
        stateRationale: "Classifier error — defaulting to momentum state.",
        mavrikIntent: MAVRIK_INTENTS.BUILDING_MOMENTUM,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
