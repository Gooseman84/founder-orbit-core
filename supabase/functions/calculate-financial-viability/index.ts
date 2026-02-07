import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IdeaContext {
  description?: string;
  targetCustomer?: string;
  revenueModel?: string;
  blueprintData?: Record<string, unknown>;
  title?: string;
  category?: string;
  platform?: string;
}

interface RequestBody {
  userId: string;
  ideaId: string;
  ideaContext: IdeaContext;
}

interface DimensionScore {
  score: number;
  rationale: string;
}

interface AIResponse {
  compositeScore: number;
  dimensions: {
    marketSize: DimensionScore;
    unitEconomics: DimensionScore;
    timeToRevenue: DimensionScore;
    competitiveDensity: DimensionScore;
    capitalRequirements: DimensionScore;
    founderMarketFit: DimensionScore;
  };
  summary: string;
  topRisk: string;
  topOpportunity: string;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[FINANCIAL-VIABILITY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const authenticatedUserId = userData.user.id;
    logStep("User authenticated", { userId: authenticatedUserId });

    // Parse request
    const { userId, ideaId, ideaContext }: RequestBody = await req.json();

    // Validate user matches
    if (userId !== authenticatedUserId) {
      throw new Error("User ID mismatch");
    }

    if (!ideaId) {
      throw new Error("ideaId is required");
    }

    logStep("Request validated", { ideaId });

    // Check subscription status for Pro gating
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: subscription } = await adminClient
      .from("user_subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const isPro = subscription?.plan === "pro" && subscription?.status === "active";
    logStep("Subscription checked", { isPro });

    // Build context string for AI
    const contextParts: string[] = [];
    if (ideaContext.title) contextParts.push(`Title: ${ideaContext.title}`);
    if (ideaContext.description) contextParts.push(`Description: ${ideaContext.description}`);
    if (ideaContext.targetCustomer) contextParts.push(`Target Customer: ${ideaContext.targetCustomer}`);
    if (ideaContext.revenueModel) contextParts.push(`Revenue Model: ${ideaContext.revenueModel}`);
    if (ideaContext.category) contextParts.push(`Category: ${ideaContext.category}`);
    if (ideaContext.platform) contextParts.push(`Platform: ${ideaContext.platform}`);
    if (ideaContext.blueprintData) {
      const bp = ideaContext.blueprintData;
      if (bp.income_target) contextParts.push(`Income Target: $${bp.income_target}`);
      if (bp.capital_available) contextParts.push(`Capital Available: $${bp.capital_available}`);
      if (bp.time_available_hours_per_week) contextParts.push(`Hours/Week: ${bp.time_available_hours_per_week}`);
      if (bp.target_audience) contextParts.push(`Target Audience: ${bp.target_audience}`);
      if (bp.problem_statement) contextParts.push(`Problem: ${bp.problem_statement}`);
    }

    const ideaContextStr = contextParts.join("\n");
    logStep("Context built", { contextLength: ideaContextStr.length });

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a financial analyst with CFA-level expertise evaluating early-stage business ideas. Score this idea across 6 dimensions.

SCORE EACH DIMENSION 0-100:

1. MARKET SIZE (20% weight)
   - Estimated TAM, SAM, SOM
   - Is this a growing, stable, or shrinking market?

2. UNIT ECONOMICS (25% weight)
   - Estimated price point and gross margin
   - Customer acquisition cost estimate
   - Lifetime value estimate
   - Can this idea generate profit per customer?

3. TIME TO REVENUE (15% weight)
   - How quickly can a solo founder generate first dollar?
   - Are there upfront build requirements before monetization?

4. COMPETITIVE DENSITY (15% weight)
   - How many direct competitors exist?
   - Are there dominant incumbents?
   - What defensibility does this idea have?

5. CAPITAL REQUIREMENTS (15% weight)
   - Minimum viable investment to launch
   - Can this bootstrap or does it require funding?

6. FOUNDER-MARKET FIT (10% weight)
   - Does the founder have relevant expertise?
   - Do they have access to the target market?

Return ONLY valid JSON with this exact structure:
{
  "compositeScore": <weighted_average_0_to_100>,
  "dimensions": {
    "marketSize": { "score": <0-100>, "rationale": "<1-2 sentences>" },
    "unitEconomics": { "score": <0-100>, "rationale": "<1-2 sentences>" },
    "timeToRevenue": { "score": <0-100>, "rationale": "<1-2 sentences>" },
    "competitiveDensity": { "score": <0-100>, "rationale": "<1-2 sentences>" },
    "capitalRequirements": { "score": <0-100>, "rationale": "<1-2 sentences>" },
    "founderMarketFit": { "score": <0-100>, "rationale": "<1-2 sentences>" }
  },
  "summary": "<2-3 sentence executive summary>",
  "topRisk": "<The #1 financial risk for this idea>",
  "topOpportunity": "<The #1 financial opportunity>"
}`;

    const userPrompt = `Analyze the financial viability of this business idea:

${ideaContextStr}

Calculate the weighted composite score using:
- Market Size: 20%
- Unit Economics: 25%
- Time to Revenue: 15%
- Competitive Density: 15%
- Capital Requirements: 15%
- Founder-Market Fit: 10%`;

    logStep("Calling AI Gateway");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
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
      logStep("AI Gateway error", { status, error: errorText });
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error("No content in AI response");
    }

    logStep("AI response received", { contentLength: rawContent.length });

    // Parse JSON from response
    let parsed: AIResponse;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      logStep("JSON parse error, retrying with cleanup");
      // Try to extract JSON object directly
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error("Failed to parse AI response as JSON");
      }
      parsed = JSON.parse(match[0]);
    }

    logStep("Response parsed", { compositeScore: parsed.compositeScore });

    // Store in database
    const { data: storedScore, error: storeError } = await adminClient
      .from("financial_viability_scores")
      .insert({
        user_id: userId,
        idea_id: ideaId,
        composite_score: Math.round(parsed.compositeScore),
        dimensions: parsed.dimensions,
        summary: parsed.summary,
        top_risk: parsed.topRisk,
        top_opportunity: parsed.topOpportunity,
      })
      .select()
      .single();

    if (storeError) {
      logStep("Store error", { error: storeError });
      throw new Error("Failed to store score");
    }

    logStep("Score stored", { scoreId: storedScore.id });

    // Return response based on subscription tier
    const response = isPro
      ? {
          id: storedScore.id,
          compositeScore: parsed.compositeScore,
          dimensions: parsed.dimensions,
          summary: parsed.summary,
          topRisk: parsed.topRisk,
          topOpportunity: parsed.topOpportunity,
          isPro: true,
        }
      : {
          id: storedScore.id,
          compositeScore: parsed.compositeScore,
          summary: parsed.summary,
          isPro: false,
          upgradeMessage: "Upgrade to Pro to see detailed dimension breakdowns",
        };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
