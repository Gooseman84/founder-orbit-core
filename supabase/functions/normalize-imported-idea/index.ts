import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a business idea normalization and variant generation engine for TrueBlazer.AI.

Given a raw business idea description (and optional title), you must:
1. Normalize the idea into a structured format with high/medium/low confidence indicators
2. Generate EXACTLY 3 variants (minimum 2 if you truly cannot find a third angle):
   - Variant A: Most literal interpretation of the founder's original intent
   - Variant B: Best business wedge - most monetizable, clearest path to revenue
   - Variant C: Adjacent niche or alternate ICP/model - a creative pivot

## OUTPUT SCHEMA (strict JSON only, no markdown):

{
  "normalized": {
    "one_liner": "One sentence pitch (max 100 chars)",
    "icp": {
      "primary_buyer": "Who writes the check",
      "end_user": "Who uses it daily",
      "industry": "Target industry/vertical",
      "company_size": "SMB/Mid-market/Enterprise/Consumer"
    },
    "pain": {
      "problem": "The core problem being solved",
      "trigger": "What event makes them seek a solution",
      "cost_of_inaction": "What happens if they don't solve it"
    },
    "alternatives": ["Current solution 1", "Current solution 2"],
    "uvp": "Unique value proposition - why this is better",
    "business_model": {
      "type": "SaaS/Marketplace/Agency/Product/Service/etc",
      "pricing_guess": "Estimated price point or range",
      "why_plausible": "Why this pricing makes sense"
    },
    "mvp": {
      "in_scope": ["Feature 1", "Feature 2", "Feature 3"],
      "out_of_scope": ["Future feature 1", "Future feature 2"]
    },
    "founder_fit": {
      "why_you": "Why this founder should build this",
      "unfair_advantages": ["Advantage 1", "Advantage 2"]
    },
    "assumptions_ranked": [
      { "assumption": "Key assumption 1", "risk": "high" },
      { "assumption": "Key assumption 2", "risk": "medium" }
    ],
    "open_questions": ["Question 1", "Question 2"],
    "confidence": {
      "one_liner": "high|medium|low",
      "icp": "high|medium|low",
      "pricing": "high|medium|low",
      "mvp": "high|medium|low"
    }
  },
  "variants": [
    {
      "variant_label": "A",
      "title": "Clear, punchy title",
      "summary": "2-3 sentence description",
      "problem": "The specific problem this variant solves",
      "target_customer": "Who this variant targets",
      "why_it_fits": "Why this makes sense for the founder",
      "first_steps": ["Step 1", "Step 2", "Step 3"],
      "business_model_type": "SaaS|Marketplace|Agency|Product|Service|null",
      "time_to_first_dollar": "1 week|2 weeks|1 month|3 months|null",
      "complexity": "low|medium|high|null",
      "category": "saas|automation|creator|agency|marketplace|productized|null",
      "shock_factor": 0-100,
      "virality_potential": 0-100,
      "leverage_score": 0-100,
      "automation_density": 0-100
    }
  ]
}

RULES:
- Return ONLY valid JSON, no markdown code blocks, no commentary
- ALWAYS generate 3 variants if at all possible (minimum 2)
- Make variants meaningfully different, not just slight rewording
- Be concrete and actionable, not generic
- Use short, punchy language
- Fill in reasonable guesses rather than leaving things vague`;

function extractJSON(content: string): any {
  // Try parsing directly first
  try {
    return JSON.parse(content);
  } catch {
    // Look for JSON object using brace counting
    const start = content.indexOf('{');
    if (start === -1) throw new Error("No JSON object found in response");
    
    let depth = 0;
    let end = start;
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    
    const jsonStr = content.slice(start, end);
    return JSON.parse(jsonStr);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("normalize-imported-idea: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = user.id;

    // Parse and validate input
    const { title, description } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (description.length > 8000) {
      return new Response(JSON.stringify({ error: "Description too long (max 8000 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawText = title ? `Title: ${title}\n\nDescription: ${description}` : description;

    // Service role client for DB operations
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: founderProfile } = await supabase
      .from("founder_profiles")
      .select("passions_text, skills_text, lifestyle_goals, success_vision, risk_tolerance, hours_per_week")
      .eq("user_id", userId)
      .single();

    // Build user prompt
    let userPrompt = `## Raw Idea Input:\n${rawText}`;
    
    if (founderProfile) {
      userPrompt += `\n\n## Founder Context (use to tailor variants):
- Passions: ${founderProfile.passions_text || "Not specified"}
- Skills: ${founderProfile.skills_text || "Not specified"}
- Goals: ${founderProfile.lifestyle_goals || founderProfile.success_vision || "Not specified"}
- Risk tolerance: ${founderProfile.risk_tolerance || "medium"}
- Hours/week: ${founderProfile.hours_per_week || "10-20"}`;
    }

    userPrompt += `\n\nNormalize this idea and generate 3 distinct variants. Return ONLY valid JSON.`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Calling AI for idea normalization...");
    
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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required - AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error(`AI request failed: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("AI returned empty response");
    }

    console.log("AI response received, parsing JSON...");
    
    const parsed = extractJSON(content);
    
    if (!parsed.normalized || !parsed.variants || !Array.isArray(parsed.variants)) {
      console.error("Invalid AI response structure:", JSON.stringify(parsed).slice(0, 500));
      throw new Error("AI response missing required fields");
    }

    if (parsed.variants.length < 2) {
      throw new Error("AI did not generate enough variants");
    }

    const { normalized, variants } = parsed;
    const importTimestamp = new Date().toISOString();

    // Insert each variant as a separate idea row
    const ideasToInsert = variants.map((variant: any) => ({
      user_id: userId,
      source_type: "imported",
      title: variant.title,
      description: variant.summary,
      target_customer: variant.target_customer,
      business_model_type: variant.business_model_type || null,
      time_to_first_dollar: variant.time_to_first_dollar || null,
      complexity: variant.complexity || null,
      category: variant.category || null,
      shock_factor: typeof variant.shock_factor === "number" ? variant.shock_factor : null,
      virality_potential: typeof variant.virality_potential === "number" ? variant.virality_potential : null,
      leverage_score: typeof variant.leverage_score === "number" ? variant.leverage_score : null,
      automation_density: typeof variant.automation_density === "number" ? variant.automation_density : null,
      normalized: normalized,
      source_meta: {
        import_source: "manual",
        import_timestamp: importTimestamp,
        import_raw_text: rawText,
        variant_label: variant.variant_label,
        idea_payload: {
          summary: variant.summary,
          problem: variant.problem,
          why_it_fits: variant.why_it_fits,
          first_steps: variant.first_steps,
        },
      },
      engine_version: "v6",
      status: "candidate",
    }));

    console.log(`Inserting ${ideasToInsert.length} variant ideas...`);

    const { data: insertedIdeas, error: insertError } = await supabase
      .from("ideas")
      .insert(ideasToInsert)
      .select("*");

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save ideas: ${insertError.message}`);
    }

    console.log(`Successfully created ${insertedIdeas?.length} imported idea variants`);

    return new Response(
      JSON.stringify({
        success: true,
        normalized,
        ideas: insertedIdeas,
        variantCount: insertedIdeas?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("normalize-imported-idea error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
