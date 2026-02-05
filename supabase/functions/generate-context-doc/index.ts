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
      console.error('generate-context-doc: auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log("Generating context document for user:", userId);

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

    const systemPrompt = `You are an expert business strategist and personal coach creating a comprehensive founder snapshot document.

Based on all the context provided, generate a well-structured markdown document with these exact sections:

# Founder Snapshot
A 2-3 paragraph executive summary of who this founder is, their background, strengths, and current situation.

# Current North Star Idea
Details about their chosen business idea including:
- What it is and who it serves
- Business model approach
- Key analysis insights (if available)
- Current validation stage

# Strengths & Constraints
- Core strengths and skills they bring
- Passions and energy sources
- Time, capital, and risk constraints
- Work style preferences

# Recent Work & Focus
- Summary of recent workspace documents and what they're working on
- Recent reflection patterns (energy, stress, themes)
- Task completion patterns and momentum

# Recommended Areas of Focus
Based on everything above, 3-5 specific areas they should prioritize in the coming weeks. Be concrete and actionable.

Write in a warm but professional tone. This document should feel like a comprehensive brief that could be handed to a business coach or advisor.
Make it specific to this founder - reference actual data, don't be generic.
Use proper markdown formatting with headers, bullet points, and emphasis where appropriate.`;

    const userPrompt = `Here is the founder's complete context:

${contextSummary}

Generate a comprehensive Founder Snapshot document based on this data.`;

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
    const content = data.choices?.[0]?.message?.content || "Unable to generate document.";

    console.log("Context document generated successfully");

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-context-doc:", error);
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
- Vision: ${p.success_vision || "Not specified"}`);
  }

  // Extended intake
  if (context.extendedIntake) {
    const e = context.extendedIntake;
    const parts: string[] = [];
    if (e.deep_desires) parts.push(`Deep Desires: ${e.deep_desires}`);
    if (e.fears) parts.push(`Fears: ${e.fears}`);
    if (e.energy_givers) parts.push(`Energized by: ${e.energy_givers}`);
    if (e.energy_drainers) parts.push(`Drained by: ${e.energy_drainers}`);
    if (e.identity_statements) parts.push(`Identity: ${e.identity_statements}`);
    if (parts.length) {
      sections.push(`## Deeper Self-Knowledge\n${parts.join("\n")}`);
    }
  }

  // Chosen idea
  if (context.chosenIdea) {
    const i = context.chosenIdea;
    sections.push(`## Current North Star Idea
- Title: ${i.title}
- Description: ${i.description || "No description"}
- Business model: ${i.business_model_type || "Not specified"}
- Target customer: ${i.target_customer || "Not specified"}
- Fit score: ${i.overall_fit_score || "Not scored"}/100`);
  }

  // Idea analysis
  if (context.ideaAnalysis) {
    const a = context.ideaAnalysis;
    sections.push(`## Idea Analysis
- Niche score: ${a.niche_score || "N/A"}/100
- Market insight: ${a.market_insight || "N/A"}
- Problem intensity: ${a.problem_intensity || "N/A"}
- Elevator pitch: ${a.elevator_pitch || "N/A"}
- Biggest risks: ${a.biggest_risks?.slice(0, 3)?.join("; ") || "N/A"}`);
  }

  // Workspace docs
  if (context.recentDocs?.length) {
    const docsText = context.recentDocs
      .map((d: any) => `- ${d.title} (${d.doc_type || "note"}): ${(d.content || "").slice(0, 300)}...`)
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
