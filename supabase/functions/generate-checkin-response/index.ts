// supabase/functions/generate-checkin-response/index.ts
// Mavrik generates a real-time, personalized response immediately after a founder submits their daily check-in.
// This is what makes the post-paywall experience feel like a co-pilot, not a task manager.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { injectCognitiveMode } from "../_shared/cognitiveMode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function detectStagnation(recentCheckins: any[]): boolean {
  if (!recentCheckins || recentCheckins.length < 3) return false;
  return recentCheckins.slice(0, 3).every((c: any) => ["partial", "no"].includes(c.completion_status));
}

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
    const LOVABLE_AI_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { ventureId, completionStatus, explanation, reflection, completedTaskCount, totalTaskCount } = body;

    if (!ventureId || !completionStatus) {
      return new Response(JSON.stringify({ error: "ventureId and completionStatus required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch Context ─────────────────────────────────────────
    const [
      { data: venture },
      { data: recentCheckins },
      { data: interviewData },
    ] = await Promise.all([
      supabaseService.from("ventures").select("name, success_metric, commitment_start_at, commitment_window_days, idea_id").eq("id", ventureId).single(),
      supabaseService.from("venture_daily_checkins").select("checkin_date, completion_status, explanation").eq("venture_id", ventureId).order("checkin_date", { ascending: false }).limit(7),
      supabaseService.from("founder_interviews").select("context_summary").eq("user_id", user.id).eq("status", "completed").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (!venture) {
      return new Response(JSON.stringify({ error: "Venture not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isStagnating = detectStagnation(recentCheckins || []);
    const interviewContext = interviewData?.context_summary as any ?? null;
    const founderName = interviewContext?.founderSummary ? "founder" : "founder";

    // Calculate day in commitment
    const dayInCommitment = venture.commitment_start_at
      ? Math.max(1, Math.ceil((Date.now() - new Date(venture.commitment_start_at).getTime()) / 86400000))
      : 1;
    const totalDays = venture.commitment_window_days || 30;
    const daysRemaining = Math.max(0, totalDays - dayInCommitment);

    // ── Compute Founder Moment State ──────────────────────────
    let founderMomentState = "BUILDING_MOMENTUM";
    let mavrikIntent = "";
    let mavrikRoleBlock = "";
    try {
      const momentResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/compute-founder-moment-state`,
        {
          method: "POST",
          headers: {
            "Authorization": authHeader!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ventureId }),
        }
      );
      if (momentResponse.ok) {
        const momentData = await momentResponse.json();
        founderMomentState = momentData.state || "BUILDING_MOMENTUM";
        mavrikIntent = momentData.mavrikIntent || "";
        mavrikRoleBlock = momentData.mavrikRoleBlock || "";
        console.log(`[generate-checkin-response] MomentState: ${founderMomentState}, Role: ${momentData.mavrikRole || "unknown"}`);
      } else {
        console.warn(`[generate-checkin-response] Moment state call failed: ${momentResponse.status}`);
      }
    } catch (momentError) {
      console.warn("[generate-checkin-response] Moment state error (defaulting):", momentError);
    }

    // ── Build Prompt ──────────────────────────────────────────
    const systemPrompt = injectCognitiveMode(`You are Mavrik, an AI co-founder and execution coach. You just received a founder's daily check-in.

${mavrikRoleBlock ? `${mavrikRoleBlock}\n\n` : ""}${mavrikIntent ? `## MAVRIK INTENT\n${mavrikIntent}\n\nFounder Moment State: ${founderMomentState}\n` : ""}
Your job is to write a SHORT, PERSONAL, DIRECT response — like a co-founder who genuinely cares about their success.

TONE RULES:
- Never generic. Always specific to what they said and where they are.
- No corporate speak. No "Great job!" No hollow encouragement.
- Match the founder's energy. If they're struggling, be steady and real. If they're crushing it, match that energy.
- 2-4 sentences maximum. Punchy. Useful.
- End with one clear statement about what matters most tomorrow. Not a question.

SITUATION AWARENESS:
- Venture: ${venture.name}
- Day ${dayInCommitment} of ${totalDays} (${daysRemaining} days remaining)
- Today's Status: ${completionStatus}
- Tasks Completed: ${completedTaskCount ?? "unknown"} of ${totalTaskCount ?? "unknown"}
- Founder Explanation: "${explanation || "none provided"}"
- Founder Reflection: "${reflection || "none provided"}"
- Stagnation Pattern: ${isStagnating ? "YES — 3+ consecutive days of incomplete execution. This needs a real response." : "No — normal variance."}
- Recent Pattern (last 7 days): ${recentCheckins?.map((c: any) => c.completion_status).join(", ") || "first check-in"}

${isStagnating ? `
STAGNATION RESPONSE PROTOCOL:
This founder has been struggling for 3+ consecutive days. Do NOT:
- Offer empty encouragement
- Tell them to "keep going"
- Ask them what's wrong in your response

DO:
- Acknowledge the pattern directly and briefly ("Three tough days in a row — something is off.")
- Name ONE likely root cause based on their explanation (scope too big, external blocker, motivation shift)
- Give ONE clear, tiny action that resets momentum for tomorrow
- Be the steady co-founder who has seen this before and knows how to get out of it
` : ""}

${interviewContext?.founderSummary ? `Founder Context: ${interviewContext.founderSummary}` : ""}

Respond with STRICT JSON only:
{
  "message": "Your 2-4 sentence Mavrik response here",
  "tomorrowFocus": "One sentence: the single most important thing to focus on tomorrow",
  "tone": "steady|energized|concerned|direct",
  "isStagnationIntervention": ${isStagnating}
}`, 'converge');

    // ── Call AI ───────────────────────────────────────────────
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate Mavrik's check-in response for this founder's submission.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    // ── Parse Response ────────────────────────────────────────
    let mavrikResponse = {
      message: "Good work logging in today. Come back tomorrow ready to execute.",
      tomorrowFocus: "Pick one thing and finish it.",
      tone: "steady",
      isStagnationIntervention: false,
    };

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mavrikResponse = { ...mavrikResponse, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (e) {
      console.warn("[generate-checkin-response] Parse fallback used");
    }

    // ── Optionally Persist Response ───────────────────────────
    // Store on the check-in row for future reference (non-blocking)
    const today = new Date().toISOString().split("T")[0];
    supabaseService
      .from("venture_daily_checkins")
      .update({ mavrik_response: mavrikResponse })
      .eq("venture_id", ventureId)
      .eq("checkin_date", today)
      .then(({ error }) => {
        if (error) console.warn("[generate-checkin-response] Could not persist response:", error.message);
      });

    return new Response(
      JSON.stringify({
        success: true,
        response: mavrikResponse,
        isStagnating,
        dayInCommitment,
        daysRemaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-checkin-response] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
