// supabase/functions/generate-variants/index.ts
// Generates idea variants with proper auth and error handling
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VariantType = "chaos" | "money_printer" | "memetic" | "creator" | "automation" | "persona";

const VARIANT_PROMPTS: Record<VariantType, string> = {
  chaos: "Transform this into a CHAOS variant: wild combinations, category mashups, high shock value, unexpected angles. Make it weird and memorable.",
  money_printer: "Transform this into a MONEY PRINTER variant: automated revenue systems, passive income focused, runs while you sleep, minimal ongoing effort.",
  memetic: "Transform this into a MEMETIC variant: spreads like memes, humor-driven, cultural hooks, high shareability. Must still make money.",
  creator: "Transform this into a CREATOR variant: content empire version, audience monetization, personal brand leverage, creator economy tools.",
  automation: "Transform this into an AUTOMATION variant: AI agents, background services, workflow automation, minimal human intervention.",
  persona: "Transform this into a PERSONA variant: AI characters, digital avatars, virtual companions, personality-driven interaction.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { ideaId, variantType } = body;

    // Validate required fields
    if (!ideaId || typeof ideaId !== "string") {
      console.log("generate-variants: Missing or invalid ideaId");
      return new Response(
        JSON.stringify({ error: "Missing ideaId", code: "INVALID_REQUEST" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!variantType || !VARIANT_PROMPTS[variantType as VariantType]) {
      console.log(`generate-variants: Invalid variantType: ${variantType}`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid variantType. Must be one of: ${Object.keys(VARIANT_PROMPTS).join(", ")}`,
          code: "INVALID_REQUEST" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("generate-variants: No authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user session
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.log("generate-variants: Auth failed", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid session", code: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`generate-variants: user=${userId}, idea=${ideaId}, type=${variantType}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check subscription for gating (variants are Pro feature)
    const { data: subData } = await supabase
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const plan = (subData?.status === "active" && subData?.plan) || "free";
    const isPro = plan === "pro" || plan === "founder";

    if (!isPro) {
      console.log(`generate-variants: User ${userId} needs upgrade (plan=${plan})`);
      return new Response(
        JSON.stringify({ 
          error: "Variant generation requires TrueBlazer Pro",
          code: "UPGRADE_REQUIRED",
          plan 
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the idea - ensure it belongs to the user
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("id", ideaId)
      .eq("user_id", userId)
      .single();

    if (ideaError || !idea) {
      console.log(`generate-variants: Idea not found or unauthorized`, ideaError?.message);
      return new Response(
        JSON.stringify({ error: "Idea not found or you don't have access", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile for context
    const { data: profile } = await supabase
      .from("founder_profiles")
      .select("profile, work_personality, creator_platforms")
      .eq("user_id", userId)
      .maybeSingle();

    // Build AI prompt
    const variantPrompt = VARIANT_PROMPTS[variantType as VariantType];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("generate-variants: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", code: "SERVICE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are TrueBlazer Variant Generator. Generate 3 unique variant ideas based on the original concept.

${variantPrompt}

OUTPUT FORMAT (STRICT JSON):
{
  "variants": [
    {
      "title": "Catchy variant title",
      "one_liner": "One punchy sentence",
      "description": "2-3 sentences describing the variant",
      "why_different": "What makes this variant unique",
      "business_model": "How it makes money",
      "target_customer": "Who pays",
      "time_to_first_dollar": "How fast to revenue",
      "shock_factor": 0-100,
      "virality_potential": 0-100,
      "leverage_score": 0-100,
      "automation_density": 0-100,
      "chaos_factor": 0-100
    }
  ]
}

Return ONLY valid JSON. No markdown, no commentary.`;

    const userMessage = `ORIGINAL IDEA:
Title: ${idea.title}
Description: ${idea.description || "No description"}
Business Model: ${idea.business_model_type || "Not specified"}
Target Customer: ${idea.target_customer || "Not specified"}
Category: ${idea.category || "general"}
Platform: ${idea.platform || "any"}

FOUNDER CONTEXT:
${JSON.stringify(profile?.profile || {}, null, 2)}

Generate 3 ${variantType.replace("_", " ")} variants now.`;

    console.log(`generate-variants: Calling AI for ${variantType} variants`);

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
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error(`generate-variants: AI error ${status}`, text);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, try again shortly", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI generation failed", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      console.error("generate-variants: Empty AI response");
      return new Response(
        JSON.stringify({ error: "AI returned empty response", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse AI response
    let variants: any[];
    try {
      const parsed = JSON.parse(content);
      variants = parsed.variants;
    } catch {
      // Try to extract JSON
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
        variants = parsed.variants;
      } else {
        throw new Error("No valid JSON in response");
      }
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      console.error("generate-variants: No variants in response");
      return new Response(
        JSON.stringify({ error: "Failed to generate variants", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map variants to response format
    const mappedVariants = variants.map((v: any, i: number) => ({
      id: `variant-${variantType}-${ideaId}-${i}`,
      title: v.title || `${variantType} Variant ${i + 1}`,
      oneLiner: v.one_liner || "",
      description: v.description || "",
      whyDifferent: v.why_different || "",
      businessModel: v.business_model || "",
      targetCustomer: v.target_customer || "",
      timeToFirstDollar: v.time_to_first_dollar || "",
      parentIdeaId: ideaId,
      variantType,
      shockFactor: v.shock_factor ?? 50,
      viralityPotential: v.virality_potential ?? 50,
      leverageScore: v.leverage_score ?? 50,
      automationDensity: v.automation_density ?? 50,
      chaosFactor: v.chaos_factor ?? 50,
    }));

    console.log(`generate-variants: Successfully generated ${mappedVariants.length} variants`);

    return new Response(
      JSON.stringify({ variants: mappedVariants }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-variants: Unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", code: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
