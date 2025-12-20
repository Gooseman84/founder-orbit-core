// supabase/functions/generate-market-signal-ideas/index.ts
// Generates ideas from market signal domains (pattern inference, no scraping)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are TrueBlazer MARKET SIGNAL ENGINE — expert at inferring pain patterns from topic clusters.

Your mission: Analyze the provided topic domains and generate business ideas based on INFERRED pain patterns.

CRITICAL RULES:
- Do NOT mention Reddit, posts, threads, or any scraping.
- Do NOT quote or reference specific posts.
- Treat the subreddit names as "topic clusters" representing areas of interest.
- Infer recurring PAIN PATTERNS that would exist in these communities.
- Generate ideas that solve REAL problems these audiences face.

PROCESS:
1. Analyze the topic clusters to understand the target audiences
2. Identify 3-6 recurring pain themes these communities experience
3. Generate 5-7 business ideas that address these pain points

OUTPUT SCHEMA (STRICT JSON - use EXACT field names):
{
  "painThemes": [
    "Theme 1: Brief description of the pain pattern",
    "Theme 2: Brief description of the pain pattern"
  ],
  "ideas": [
    {
      "title": "Punchy, memorable title",
      "summary": "One sentence hook explaining the solution",
      "problem": "What specific pain does this solve? (1-2 sentences)",
      "target_customer": "Who desperately needs this (specific persona)",
      "why_it_fits": "Why this founder should build this (1 sentence)",
      "first_steps": ["Step 1 (action)", "Step 2 (action)", "Step 3 (action)"],
      "business_model_type": "saas" | "content" | "agency" | "marketplace" | "tool" | "community" | null,
      "time_to_first_dollar": "7 days" | "14 days" | "30 days" | null,
      "complexity": "Low" | "Medium" | "High" | null,
      "category": "saas" | "content" | "agency" | "marketplace" | "tool" | "community" | null,
      "shock_factor": 0-100 or null,
      "virality_potential": 0-100 or null,
      "leverage_score": 0-100 or null,
      "automation_density": 0-100 or null
    }
  ]
}

CRITICAL: Use EXACTLY these field names. Include summary, problem, why_it_fits, and first_steps for each idea.

TONE: Write like a sharp founder friend. Punchy, direct, no corporate jargon.
Return ONLY valid JSON. No markdown, no commentary.`;

// Helper to extract valid JSON from AI response
function extractJSON(content: string): any {
  try {
    return JSON.parse(content);
  } catch {}
  
  const firstBrace = content.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("No JSON object found in response");
  }
  
  let depth = 0;
  let endIndex = -1;
  for (let i = firstBrace; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  if (endIndex === -1) {
    throw new Error("No matching closing brace found");
  }
  
  const jsonStr = content.slice(firstBrace, endIndex + 1);
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.error("generate-market-signal-ideas: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Security: derive userId from Authorization header ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("generate-market-signal-ideas: Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== VERIFY USER via supabaseAuth.auth.getUser(token) =====
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader.trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("generate-market-signal-ideas: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;
    console.log("generate-market-signal-ideas: authenticated user", userId);

    // Parse body for selectedDomainIds only (ignore any user_id in body)
    const body = await req.json().catch(() => ({}));
    const selectedDomainIds: string[] = body.selectedDomainIds || [];

    if (!selectedDomainIds.length || selectedDomainIds.length > 2) {
      return new Response(
        JSON.stringify({ error: "Please select 1-2 domains" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-market-signal-ideas: user=${userId}, domains=${selectedDomainIds.length}`);

    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load selected domains
    const { data: domains, error: domainsError } = await supabase
      .from("market_signal_domains")
      .select("*")
      .in("id", selectedDomainIds)
      .eq("is_active", true);

    if (domainsError || !domains?.length) {
      console.error("generate-market-signal-ideas: domains not found", domainsError);
      return new Response(
        JSON.stringify({ error: "Selected domains not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Flatten domain names and subreddits
    const domainNames = domains.map(d => d.domain);
    const allSubreddits = domains.flatMap(d => d.subreddits || []);

    // Load founder profile for context (optional)
    const { data: profileRow } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", userId)
      .maybeSingle();

    const founderProfileSnapshot = profileRow?.profile || null;

    // Insert market_signal_runs record
    const { data: runData, error: runError } = await supabase
      .from("market_signal_runs")
      .insert({
        user_id: userId,
        selected_domains: domainNames,
        selected_subreddits: allSubreddits,
        founder_profile_snapshot: founderProfileSnapshot,
      })
      .select("id")
      .single();

    if (runError) {
      console.error("generate-market-signal-ideas: failed to create run", runError);
      return new Response(
        JSON.stringify({ error: "Failed to record signal run" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const signalRunId = runData.id;
    console.log(`generate-market-signal-ideas: created run ${signalRunId}`);

    // Build AI prompt
    const userMessage = `TOPIC DOMAINS: ${domainNames.join(", ")}
TOPIC CLUSTERS: ${allSubreddits.join(", ")}

${founderProfileSnapshot ? `FOUNDER CONTEXT (optional alignment):
${JSON.stringify(founderProfileSnapshot, null, 2)}` : ""}

Analyze these topic clusters and:
1. Identify 3-6 pain themes that people in these domains commonly experience
2. Generate 5-7 business ideas that solve these pain points
3. For each idea, include: title, summary, problem, target_customer, why_it_fits, first_steps (3 actions), and metrics

Return ONLY valid JSON with exact field names as specified.`;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("generate-market-signal-ideas: AI error", status, text);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please try again.", code: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted, please add funds.", code: "payment_required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!aiContent) {
      console.error("generate-market-signal-ideas: empty AI response");
      return new Response(
        JSON.stringify({ error: "AI returned empty response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: { painThemes: string[]; ideas: any[] };
    try {
      parsed = extractJSON(aiContent);
    } catch (e) {
      console.error("generate-market-signal-ideas: JSON parse error", e);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const painThemes = parsed.painThemes || [];
    const rawIdeas = parsed.ideas || [];

    if (!rawIdeas.length) {
      console.error("generate-market-signal-ideas: no ideas returned");
      return new Response(
        JSON.stringify({ error: "AI returned no ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-market-signal-ideas: ${painThemes.length} themes, ${rawIdeas.length} ideas`);

    // Insert ideas into ideas table with source_type='market_signal'
    // Put rich fields into source_meta.idea_payload
    const ideasToInsert = rawIdeas.map((idea: any) => ({
      user_id: userId,
      title: idea.title || "Untitled Idea",
      description: idea.summary || idea.problem || "",
      business_model_type: idea.business_model_type || null,
      target_customer: idea.target_customer || null,
      time_to_first_dollar: idea.time_to_first_dollar || null,
      complexity: idea.complexity || null,
      category: idea.category || null,
      mode: "market_signal",
      engine_version: "v6",
      status: "candidate",
      source_type: "market_signal",
      source_meta: {
        domains: domainNames,
        subreddits: allSubreddits,
        signal_run_id: signalRunId,
        inferred_pain_themes: painThemes,
        idea_payload: {
          summary: idea.summary || null,
          problem: idea.problem || null,
          why_it_fits: idea.why_it_fits || null,
          first_steps: idea.first_steps || [],
        },
      },
      // v6 metrics
      shock_factor: idea.shock_factor ?? null,
      virality_potential: idea.virality_potential ?? null,
      leverage_score: idea.leverage_score ?? null,
      automation_density: idea.automation_density ?? null,
    }));

    const { data: insertedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(ideasToInsert)
      .select("*");

    if (insertError) {
      console.error("generate-market-signal-ideas: insert error", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`generate-market-signal-ideas: inserted ${insertedIdeas?.length} ideas`);

    return new Response(
      JSON.stringify({
        success: true,
        painThemes,
        ideas: insertedIdeas,
        signalRunId,
        domainsUsed: domainNames,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("generate-market-signal-ideas: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
