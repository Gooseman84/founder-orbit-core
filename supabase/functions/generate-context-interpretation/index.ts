import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get('Authorization') ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('generate-context-interpretation: auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log("Generating context interpretation for user:", userId);

    const { context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!context) {
      return new Response(
        JSON.stringify({ error: "No context provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build context summary for the prompt
    const contextSummary = buildContextSummary(context);

    const systemPrompt = `You are an AI cofounder and advisor with deep insight into this founder's journey. 
Based on all the context provided, write a thoughtful 2-3 paragraph interpretation that covers:

1. **Current Focus & Momentum**: What are they working on? Where is their energy directed? Are they making progress?

2. **Blind Spots & Risks**: What might they be missing? What patterns in their data suggest potential issues they should address?

3. **Constraints & Opportunities**: Given their time, capital, skills, and energy patterns, what opportunities align well? What constraints should they respect?

4. **Personalized Insight**: Based on their deep desires, fears, and identity, what's the most important thing they should hear right now?

Write in a warm, direct, cofounder tone. Be specific - reference actual data from their context. 
Avoid generic advice. Make it feel like you truly know them.
Do not use bullet points - write in flowing paragraphs.`;

    const userPrompt = `Here is everything I know about this founder:

${contextSummary}

Based on all of this, provide your interpretation of where they are, what they should focus on, and what they might be missing.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const interpretation = data.choices?.[0]?.message?.content || "Unable to generate interpretation.";

    return new Response(
      JSON.stringify({ interpretation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-context-interpretation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildContextSummary(context: any): string {
  const sections: string[] = [];

  // Profile
  if (context.profile) {
    const p = context.profile;
    sections.push(`## Founder Profile
- Passions: ${p.passions_text || p.passions_tags?.join(", ") || "Not specified"}
- Skills: ${p.skills_text || p.skills_tags?.join(", ") || "Not specified"}
- Time available: ${p.time_per_week ? `${p.time_per_week} hrs/week` : "Not specified"}
- Capital: ${p.capital_available ? `$${p.capital_available}` : "Not specified"}
- Risk tolerance: ${p.risk_tolerance || "Not specified"}
- Vision: ${p.success_vision?.slice(0, 300) || "Not specified"}`);
  }

  // Extended intake
  if (context.extendedIntake) {
    const e = context.extendedIntake;
    const parts: string[] = [];
    if (e.deep_desires) parts.push(`Deep Desires: ${e.deep_desires.slice(0, 200)}`);
    if (e.fears) parts.push(`Fears: ${e.fears.slice(0, 200)}`);
    if (e.energy_givers) parts.push(`Energized by: ${e.energy_givers.slice(0, 150)}`);
    if (e.energy_drainers) parts.push(`Drained by: ${e.energy_drainers.slice(0, 150)}`);
    if (e.identity_statements) parts.push(`Identity: ${e.identity_statements.slice(0, 150)}`);
    if (parts.length) {
      sections.push(`## Deeper Self-Knowledge\n${parts.join("\n")}`);
    }
  }

  // Chosen idea
  if (context.chosenIdea) {
    const i = context.chosenIdea;
    sections.push(`## Current Focus Idea
- Title: ${i.title}
- Description: ${i.description?.slice(0, 300) || "No description"}
- Business model: ${i.business_model_type || "Not specified"}
- Target customer: ${i.target_customer || "Not specified"}
- Fit score: ${i.overall_fit_score || "Not scored"}/100`);
  }

  // Idea analysis
  if (context.ideaAnalysis) {
    const a = context.ideaAnalysis;
    sections.push(`## Idea Analysis
- Niche score: ${a.niche_score || "N/A"}/100
- Market insight: ${a.market_insight?.slice(0, 200) || "N/A"}
- Problem intensity: ${a.problem_intensity || "N/A"}
- Elevator pitch: ${a.elevator_pitch?.slice(0, 200) || "N/A"}
- Biggest risks: ${a.biggest_risks?.slice(0, 3)?.join("; ") || "N/A"}`);
  }

  // Workspace docs
  if (context.recentDocs?.length) {
    const docsText = context.recentDocs
      .map((d: any) => `- ${d.title} (${d.doc_type || "note"}): ${(d.content || "").slice(0, 200)}...`)
      .join("\n");
    sections.push(`## Recent Workspace Documents\n${docsText}`);
  }

  // Reflections
  if (context.recentReflections?.length) {
    const avgEnergy = context.recentReflections
      .filter((r: any) => r.energy_level)
      .reduce((sum: number, r: any, _: number, arr: any[]) => sum + r.energy_level / arr.length, 0);
    const avgStress = context.recentReflections
      .filter((r: any) => r.stress_level)
      .reduce((sum: number, r: any, _: number, arr: any[]) => sum + r.stress_level / arr.length, 0);
    const themes = context.recentReflections
      .filter((r: any) => r.ai_theme)
      .map((r: any) => r.ai_theme)
      .slice(0, 3);
    const moodTags = [...new Set(context.recentReflections.flatMap((r: any) => r.mood_tags || []))].slice(0, 5);
    
    sections.push(`## Recent Reflection Patterns (Last 7 Days)
- Average energy: ${avgEnergy.toFixed(1)}/5
- Average stress: ${avgStress.toFixed(1)}/5
- Recent themes: ${themes.join(", ") || "None"}
- Common moods: ${moodTags.join(", ") || "None"}`);
  }

  // Tasks
  if (context.recentTasks?.length) {
    const completed = context.recentTasks.filter((t: any) => t.status === "completed").length;
    const pending = context.recentTasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").length;
    const categories = [...new Set(context.recentTasks.map((t: any) => t.category || t.type).filter(Boolean))].slice(0, 4);
    
    sections.push(`## Execution Patterns
- Tasks completed recently: ${completed}
- Tasks pending: ${pending}
- Task categories: ${categories.join(", ") || "Various"}`);
  }

  // Streak & XP
  if (context.streakData || context.xpTotal) {
    sections.push(`## Engagement
- Current streak: ${context.streakData?.current_streak || 0} days
- Longest streak: ${context.streakData?.longest_streak || 0} days
- Total XP: ${context.xpTotal || 0}`);
  }

  return sections.join("\n\n");
}
